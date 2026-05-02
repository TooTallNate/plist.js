import { describe, it, expect } from 'vitest';
import { parseBinary, parse } from '../src/index.js';

/**
 * Build a binary plist from a list of objects.
 * Each object is described as a tuple: [type, value]
 * Types: 'null', 'bool', 'int', 'real32', 'real64', 'date', 'data',
 *        'ascii', 'utf16', 'uid', 'array', 'dict'
 * For array/dict, value is an array of object indices (refs).
 * For dict, value is [keyRefs..., valueRefs...] flattened.
 */
type ObjSpec =
  | { type: 'null' }
  | { type: 'bool'; value: boolean }
  | { type: 'int'; value: number; bytesPow?: number }
  | { type: 'real32'; value: number }
  | { type: 'real64'; value: number }
  | { type: 'date'; value: number } // seconds since 2001-01-01
  | { type: 'data'; value: Uint8Array }
  | { type: 'ascii'; value: string }
  | { type: 'utf16'; value: string }
  | { type: 'uid'; value: number; size?: number }
  | { type: 'array'; refs: number[] }
  | { type: 'dict'; keyRefs: number[]; valueRefs: number[] };

function buildBinaryPlist(objects: ObjSpec[], topObjectIndex = 0): Uint8Array {
  const objectRefSize = objects.length <= 256 ? 1 : 2;

  // Serialize each object
  const serialized: Uint8Array[] = [];
  for (const obj of objects) {
    serialized.push(serializeObject(obj, objectRefSize));
  }

  // Build offset table
  let currentOffset = 8; // header
  const offsets: number[] = [];
  for (const s of serialized) {
    offsets.push(currentOffset);
    currentOffset += s.length;
  }
  const offsetTableOffset = currentOffset;

  // Determine offset size
  const maxOffset = offsetTableOffset;
  const offsetSize = maxOffset <= 0xff ? 1 : maxOffset <= 0xffff ? 2 : 4;

  // Total size
  const totalSize = offsetTableOffset + objects.length * offsetSize + 32;
  const buf = new Uint8Array(totalSize);
  const view = new DataView(buf.buffer);

  // Header
  const header = 'bplist00';
  for (let i = 0; i < 8; i++) buf[i] = header.charCodeAt(i);

  // Objects
  let pos = 8;
  for (const s of serialized) {
    buf.set(s, pos);
    pos += s.length;
  }

  // Offset table
  for (let i = 0; i < objects.length; i++) {
    writeSizedInt(view, pos, offsetSize, offsets[i]);
    pos += offsetSize;
  }

  // Trailer (last 32 bytes)
  const trailerStart = totalSize - 32;
  // bytes 0-5: unused (0)
  view.setUint8(trailerStart + 6, offsetSize);
  view.setUint8(trailerStart + 7, objectRefSize);
  // numObjects as uint64
  view.setUint32(trailerStart + 8, 0);
  view.setUint32(trailerStart + 12, objects.length);
  // topObject as uint64
  view.setUint32(trailerStart + 16, 0);
  view.setUint32(trailerStart + 20, topObjectIndex);
  // offsetTableOffset as uint64
  view.setUint32(trailerStart + 24, 0);
  view.setUint32(trailerStart + 28, offsetTableOffset);

  return buf;
}

function writeSizedInt(view: DataView, offset: number, size: number, value: number) {
  switch (size) {
    case 1: view.setUint8(offset, value); break;
    case 2: view.setUint16(offset, value); break;
    case 4: view.setUint32(offset, value); break;
  }
}

function serializeObject(obj: ObjSpec, refSize: number): Uint8Array {
  switch (obj.type) {
    case 'null': return new Uint8Array([0x00]);
    case 'bool': return new Uint8Array([obj.value ? 0x09 : 0x08]);
    case 'int': {
      const pow = obj.bytesPow ?? (obj.value < 0 || obj.value > 0xff ? (obj.value < 0 || obj.value > 0xffff ? (obj.value < 0 || obj.value > 0xffffffff ? 3 : 2) : 1) : 0);
      const byteCount = 1 << pow;
      const buf = new Uint8Array(1 + byteCount);
      const v = new DataView(buf.buffer);
      buf[0] = 0x10 | pow;
      if (byteCount === 1) v.setUint8(1, obj.value);
      else if (byteCount === 2) v.setUint16(1, obj.value);
      else if (byteCount === 4) v.setUint32(1, obj.value);
      else if (byteCount === 8) {
        v.setInt32(1, Math.floor(obj.value / 0x100000000));
        v.setUint32(5, obj.value >>> 0);
      }
      return buf;
    }
    case 'real32': {
      const buf = new Uint8Array(5);
      const v = new DataView(buf.buffer);
      buf[0] = 0x22; // type 2, size pow 2 (4 bytes)
      v.setFloat32(1, obj.value);
      return buf;
    }
    case 'real64': {
      const buf = new Uint8Array(9);
      const v = new DataView(buf.buffer);
      buf[0] = 0x23; // type 2, size pow 3 (8 bytes)
      v.setFloat64(1, obj.value);
      return buf;
    }
    case 'date': {
      const buf = new Uint8Array(9);
      const v = new DataView(buf.buffer);
      buf[0] = 0x33;
      v.setFloat64(1, obj.value);
      return buf;
    }
    case 'data': {
      return withSizeHeader(0x4, obj.value.length, obj.value);
    }
    case 'ascii': {
      const bytes = new Uint8Array(obj.value.length);
      for (let i = 0; i < obj.value.length; i++) bytes[i] = obj.value.charCodeAt(i);
      return withSizeHeader(0x5, obj.value.length, bytes);
    }
    case 'utf16': {
      const payload = new Uint8Array(obj.value.length * 2);
      const pv = new DataView(payload.buffer);
      for (let i = 0; i < obj.value.length; i++) {
        pv.setUint16(i * 2, obj.value.charCodeAt(i));
      }
      return withSizeHeader(0x6, obj.value.length, payload);
    }
    case 'uid': {
      const size = obj.size ?? (obj.value <= 0xff ? 1 : obj.value <= 0xffff ? 2 : 4);
      const buf = new Uint8Array(1 + size);
      const v = new DataView(buf.buffer);
      buf[0] = 0x80 | (size - 1);
      if (size === 1) v.setUint8(1, obj.value);
      else if (size === 2) v.setUint16(1, obj.value);
      else v.setUint32(1, obj.value);
      return buf;
    }
    case 'array': {
      const payload = new Uint8Array(obj.refs.length * refSize);
      const pv = new DataView(payload.buffer);
      for (let i = 0; i < obj.refs.length; i++) {
        writeSizedInt(pv, i * refSize, refSize, obj.refs[i]);
      }
      return withSizeHeader(0xa, obj.refs.length, payload);
    }
    case 'dict': {
      const n = obj.keyRefs.length;
      const payload = new Uint8Array(n * 2 * refSize);
      const pv = new DataView(payload.buffer);
      for (let i = 0; i < n; i++) {
        writeSizedInt(pv, i * refSize, refSize, obj.keyRefs[i]);
      }
      for (let i = 0; i < n; i++) {
        writeSizedInt(pv, (n + i) * refSize, refSize, obj.valueRefs[i]);
      }
      return withSizeHeader(0xd, n, payload);
    }
  }
}

function withSizeHeader(typeNibble: number, size: number, payload: Uint8Array): Uint8Array {
  if (size < 15) {
    const buf = new Uint8Array(1 + payload.length);
    buf[0] = (typeNibble << 4) | size;
    buf.set(payload, 1);
    return buf;
  }
  // Extended size: marker byte with 0xF, then 0x1X size int
  const pow = size <= 0xff ? 0 : size <= 0xffff ? 1 : 2;
  const sizeBytes = 1 << pow;
  const buf = new Uint8Array(1 + 1 + sizeBytes + payload.length);
  const v = new DataView(buf.buffer);
  buf[0] = (typeNibble << 4) | 0x0f;
  buf[1] = 0x10 | pow;
  if (sizeBytes === 1) v.setUint8(2, size);
  else if (sizeBytes === 2) v.setUint16(2, size);
  else v.setUint32(2, size);
  buf.set(payload, 2 + sizeBytes);
  return buf;
}

describe('parseBinary', () => {
  it('should parse booleans', () => {
    const plist = buildBinaryPlist([
      { type: 'array', refs: [1, 2] },
      { type: 'bool', value: true },
      { type: 'bool', value: false },
    ], 0);
    expect(parseBinary(plist)).toEqual([true, false]);
  });

  it('should parse small integers', () => {
    const plist = buildBinaryPlist([
      { type: 'array', refs: [1, 2, 3] },
      { type: 'int', value: 0 },
      { type: 'int', value: 42 },
      { type: 'int', value: 255 },
    ], 0);
    expect(parseBinary(plist)).toEqual([0, 42, 255]);
  });

  it('should parse large integers', () => {
    const plist = buildBinaryPlist([
      { type: 'array', refs: [1, 2] },
      { type: 'int', value: 100000 },
      { type: 'int', value: 1000000000 },
    ], 0);
    expect(parseBinary(plist)).toEqual([100000, 1000000000]);
  });

  it('should parse float32 reals', () => {
    const plist = buildBinaryPlist([
      { type: 'real32', value: 3.140000104904175 },
    ], 0);
    expect(parseBinary(plist)).toBeCloseTo(3.14, 1);
  });

  it('should parse float64 reals', () => {
    const plist = buildBinaryPlist([
      { type: 'real64', value: 3.141592653589793 },
    ], 0);
    expect(parseBinary(plist)).toBeCloseTo(3.141592653589793, 10);
  });

  it('should parse ASCII strings', () => {
    const plist = buildBinaryPlist([
      { type: 'ascii', value: 'Hello, World!' },
    ], 0);
    expect(parseBinary(plist)).toBe('Hello, World!');
  });

  it('should parse UTF-16 strings', () => {
    const plist = buildBinaryPlist([
      { type: 'utf16', value: 'Héllo' },
    ], 0);
    expect(parseBinary(plist)).toBe('Héllo');
  });

  it('should parse data blobs', () => {
    const blob = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
    const plist = buildBinaryPlist([
      { type: 'data', value: blob },
    ], 0);
    const result = parseBinary(plist) as Uint8Array;
    expect(result).toBeInstanceOf(Uint8Array);
    expect([...result]).toEqual([0xde, 0xad, 0xbe, 0xef]);
  });

  it('should parse dates', () => {
    // 2020-01-01T00:00:00Z = 599529600 seconds since 2001-01-01
    const plist = buildBinaryPlist([
      { type: 'date', value: 599529600 },
    ], 0);
    const result = parseBinary(plist) as Date;
    expect(result).toBeInstanceOf(Date);
    expect(result.toISOString()).toBe('2020-01-01T00:00:00.000Z');
  });

  it('should parse arrays including nested', () => {
    // [1, [2, 3]]
    const plist = buildBinaryPlist([
      { type: 'array', refs: [1, 2] },        // 0: outer array
      { type: 'int', value: 1 },               // 1
      { type: 'array', refs: [3, 4] },         // 2: inner array
      { type: 'int', value: 2 },               // 3
      { type: 'int', value: 3 },               // 4
    ], 0);
    expect(parseBinary(plist)).toEqual([1, [2, 3]]);
  });

  it('should parse dicts including nested', () => {
    // { "a": { "b": 42 } }
    const plist = buildBinaryPlist([
      { type: 'dict', keyRefs: [1], valueRefs: [2] },     // 0: outer
      { type: 'ascii', value: 'a' },                       // 1
      { type: 'dict', keyRefs: [3], valueRefs: [4] },     // 2: inner
      { type: 'ascii', value: 'b' },                       // 3
      { type: 'int', value: 42 },                          // 4
    ], 0);
    expect(parseBinary(plist)).toEqual({ a: { b: 42 } });
  });

  it('should parse a realistic nested structure', () => {
    // { "name": "Test", "version": 1, "enabled": true, "tags": ["a", "b"], "nested": { "x": false } }
    const plist = buildBinaryPlist([
      { type: 'dict', keyRefs: [1, 2, 3, 4, 5], valueRefs: [6, 7, 8, 9, 12] },  // 0
      { type: 'ascii', value: 'name' },       // 1
      { type: 'ascii', value: 'version' },    // 2
      { type: 'ascii', value: 'enabled' },    // 3
      { type: 'ascii', value: 'tags' },       // 4
      { type: 'ascii', value: 'nested' },     // 5
      { type: 'ascii', value: 'Test' },       // 6
      { type: 'int', value: 1 },              // 7
      { type: 'bool', value: true },          // 8
      { type: 'array', refs: [10, 11] },      // 9
      { type: 'ascii', value: 'a' },          // 10
      { type: 'ascii', value: 'b' },          // 11
      { type: 'dict', keyRefs: [13], valueRefs: [14] },  // 12
      { type: 'ascii', value: 'x' },          // 13
      { type: 'bool', value: false },         // 14
    ], 0);
    expect(parseBinary(plist)).toEqual({
      name: 'Test',
      version: 1,
      enabled: true,
      tags: ['a', 'b'],
      nested: { x: false },
    });
  });

  it('should be callable via parse() with Uint8Array', () => {
    const plist = buildBinaryPlist([
      { type: 'ascii', value: 'hello' },
    ], 0);
    expect(parse(plist)).toBe('hello');
  });

  it('should be callable via parse() with ArrayBuffer', () => {
    const plist = buildBinaryPlist([
      { type: 'int', value: 99 },
    ], 0);
    expect(parse(plist.buffer)).toBe(99);
  });
});
