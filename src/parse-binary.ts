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

  // Read trailer (last 32 bytes)
  const trailerOffset = len - 32;
  const offsetTableOffsetSize = view.getUint8(trailerOffset + 6);
  const objectRefSize = view.getUint8(trailerOffset + 7);
  const numObjects = readSizedInt(view, trailerOffset + 8, 8);
  const topObject = readSizedInt(view, trailerOffset + 16, 8);
  const offsetTableOffset = readSizedInt(view, trailerOffset + 24, 8);

  // Read offset table
  const offsets: number[] = [];
  for (let i = 0; i < numObjects; i++) {
    offsets.push(readSizedInt(view, offsetTableOffset + i * offsetTableOffsetSize, offsetTableOffsetSize));
  }

  function parseObject(index: number): PlistValue {
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
          const ref = readSizedInt(view, offset + i * objectRefSize, objectRefSize);
          arr.push(parseObject(ref));
        }
        return arr;
      }

      case 0xd: { // dict
        const dict: { [key: string]: PlistValue } = {};
        for (let i = 0; i < size; i++) {
          const keyRef = readSizedInt(view, offset + i * objectRefSize, objectRefSize);
          const valRef = readSizedInt(view, offset + (size + i) * objectRefSize, objectRefSize);
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
