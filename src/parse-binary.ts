import type { PlistValue } from './parse.js';

const EPOCH_2001 = 978307200000; // ms between 1970-01-01 and 2001-01-01

function readSizedInt(view: DataView, offset: number, size: number): number {
  switch (size) {
    case 1: return view.getUint8(offset);
    case 2: return view.getUint16(offset);
    case 4: return view.getUint32(offset);
    case 8: {
      const hi = view.getUint32(offset);
      const lo = view.getUint32(offset + 4);
      // For values that fit in safe integer range
      return hi * 0x100000000 + lo;
    }
    default:
      throw new Error(`Unsupported int size: ${size}`);
  }
}

/**
 * Parse a binary plist (bplist00 format) into a PlistValue.
 */
export function parseBinary(data: Uint8Array): PlistValue {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const len = data.byteLength;

  // Validate header
  const header = String.fromCharCode(...data.subarray(0, 8));
  if (header !== 'bplist00') {
    throw new Error('Invalid binary plist: bad magic');
  }

  if (len < 8 + 32) {
    throw new Error('Invalid binary plist: file too short');
  }

  // Read trailer (last 32 bytes)
  const trailerOffset = len - 32;
  const offsetTableOffsetSize = view.getUint8(trailerOffset + 6);
  const objectRefSize = view.getUint8(trailerOffset + 7);
  const numObjects = readSizedInt(view, trailerOffset + 8, 8);
  const topObject = readSizedInt(view, trailerOffset + 16, 8);
  const offsetTableOffset = readSizedInt(view, trailerOffset + 24, 8);

  if (![1, 2, 4, 8].includes(offsetTableOffsetSize) || ![1, 2, 4, 8].includes(objectRefSize)) {
    throw new Error('Invalid binary plist: bad trailer int size');
  }
  if (
    numObjects < 1 ||
    topObject >= numObjects ||
    offsetTableOffset < 8 ||
    offsetTableOffset + numObjects * offsetTableOffsetSize > trailerOffset
  ) {
    throw new Error('Invalid binary plist: bad trailer');
  }

  // Read offset table
  const offsets: number[] = [];
  for (let i = 0; i < numObjects; i++) {
    const objOffset = readSizedInt(view, offsetTableOffset + i * offsetTableOffsetSize, offsetTableOffsetSize);
    if (objOffset < 8 || objOffset >= offsetTableOffset) {
      throw new Error(`Invalid binary plist: bad offset for object ${i}`);
    }
    offsets.push(objOffset);
  }

  // Each object is parsed at most once. Without this, objects referenced
  // from multiple places would be re-parsed every time, allowing a small
  // input to expand exponentially. `inProgress` detects reference cycles.
  const cache = new Map<number, PlistValue>();
  const inProgress = new Set<number>();

  function readRef(offset: number): number {
    const ref = readSizedInt(view, offset, objectRefSize);
    if (ref >= numObjects) {
      throw new Error(`Invalid binary plist: object ref ${ref} out of range`);
    }
    return ref;
  }

  function parseObject(index: number): PlistValue {
    const cached = cache.get(index);
    if (cached !== undefined) return cached;
    if (inProgress.has(index)) {
      throw new Error('Invalid binary plist: circular object reference');
    }
    inProgress.add(index);
    try {
      const value = parseObjectUncached(index);
      // Date and data objects are mutable and cheap to recreate, so don't
      // share instances between references to avoid surprising aliasing
      if (!(value instanceof Date) && !(value instanceof Uint8Array)) {
        cache.set(index, value);
      }
      return value;
    } finally {
      inProgress.delete(index);
    }
  }

  function parseObjectUncached(index: number): PlistValue {
    let offset = offsets[index];
    const marker = view.getUint8(offset);
    const type = marker >> 4;
    let size = marker & 0x0f;
    offset++;

    // Read extended size
    if (type !== 0 && type !== 8 && size === 0x0f) {
      const extMarker = view.getUint8(offset);
      offset++;
      const extSize = 1 << (extMarker & 0x0f);
      size = readSizedInt(view, offset, extSize);
      offset += extSize;
    }

    switch (type) {
      case 0x0: // singletons
        if (marker === 0x00) return null;
        if (marker === 0x08) return false;
        if (marker === 0x09) return true;
        throw new Error(`Unknown singleton: 0x${marker.toString(16)}`);

      case 0x1: { // int
        const byteCount = 1 << size;
        if (byteCount <= 4) {
          return readSizedInt(view, offset, byteCount);
        }
        // 8-byte int
        const hi = view.getInt32(offset);
        const lo = view.getUint32(offset + 4);
        return hi * 0x100000000 + lo;
      }

      case 0x2: { // real
        const byteCount = 1 << size;
        if (byteCount === 4) return view.getFloat32(offset);
        if (byteCount === 8) return view.getFloat64(offset);
        throw new Error(`Unsupported real size: ${byteCount}`);
      }

      case 0x3: { // date
        const timestamp = view.getFloat64(offset);
        return new Date(timestamp * 1000 + EPOCH_2001);
      }

      case 0x4: { // data
        return new Uint8Array(data.buffer, data.byteOffset + offset, size);
      }

      case 0x5: { // ASCII string
        let s = '';
        for (let i = 0; i < size; i++) {
          s += String.fromCharCode(view.getUint8(offset + i));
        }
        return s;
      }

      case 0x6: { // UTF-16BE string
        let s = '';
        for (let i = 0; i < size; i++) {
          s += String.fromCharCode(view.getUint16(offset + i * 2));
        }
        return s;
      }

      case 0x8: { // UID
        const byteCount = size + 1;
        return { UID: readSizedInt(view, offset, byteCount) } as unknown as PlistValue;
      }

      case 0xa: { // array
        const arr: PlistValue[] = [];
        for (let i = 0; i < size; i++) {
          const ref = readRef(offset + i * objectRefSize);
          arr.push(parseObject(ref));
        }
        return arr;
      }

      case 0xd: { // dict
        const dict: { [key: string]: PlistValue } = {};
        for (let i = 0; i < size; i++) {
          const keyRef = readRef(offset + i * objectRefSize);
          const valRef = readRef(offset + (size + i) * objectRefSize);
          const key = parseObject(keyRef) as string;
          dict[key] = parseObject(valRef);
        }
        return dict;
      }

      default:
        throw new Error(`Unknown object type: 0x${type.toString(16)}`);
    }
  }

  return parseObject(topObject);
}
