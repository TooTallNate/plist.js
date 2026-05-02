import type { PlistValue } from './parse.js';

const EPOCH_2001 = 978307200000; // ms between 1970-01-01 and 2001-01-01

function writeSizedInt(
	view: DataView,
	offset: number,
	size: number,
	value: number,
) {
	switch (size) {
		case 1:
			view.setUint8(offset, value);
			break;
		case 2:
			view.setUint16(offset, value);
			break;
		case 4:
			view.setUint32(offset, value);
			break;
	}
}

function withSizeHeader(
	typeNibble: number,
	size: number,
	payload: Uint8Array,
): Uint8Array {
	if (size < 15) {
		const buf = new Uint8Array(1 + payload.length);
		buf[0] = (typeNibble << 4) | size;
		buf.set(payload, 1);
		return buf;
	}
	const pow =
		size <= 0xff ? 0 : size <= 0xffff ? 1 : 2;
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

type ObjEntry = {
	value: PlistValue;
	childRefs?: number[];
	keyRefs?: number[];
	valueRefs?: number[];
};

/**
 * Flatten a PlistValue into an object table, returning the list of entries.
 * The root object is always at index 0.
 */
function flattenObjects(root: PlistValue): ObjEntry[] {
	const objects: ObjEntry[] = [];
	// Map for deduplicating primitives (strings, numbers, booleans, null)
	const primitiveMap = new Map<string, number>();

	function addPrimitive(val: PlistValue): number {
		const key = typeof val === 'string'
			? `s:${val}`
			: typeof val === 'number'
				? `n:${val}`
				: typeof val === 'boolean'
					? `b:${val}`
					: typeof val === 'bigint'
						? `bi:${val}`
						: val === null
							? 'null'
							: null;
		if (key !== null) {
			const existing = primitiveMap.get(key);
			if (existing !== undefined) return existing;
			const idx = objects.length;
			objects.push({ value: val });
			primitiveMap.set(key, idx);
			return idx;
		}
		// Non-deduplicable
		const idx = objects.length;
		objects.push({ value: val });
		return idx;
	}

	function visit(val: PlistValue): number {
		if (val === null || typeof val === 'boolean' || typeof val === 'number' || typeof val === 'bigint' || typeof val === 'string') {
			return addPrimitive(val);
		}

		if (val instanceof Date) {
			const idx = objects.length;
			objects.push({ value: val });
			return idx;
		}

		if (val instanceof Uint8Array || val instanceof ArrayBuffer) {
			const idx = objects.length;
			objects.push({ value: val instanceof ArrayBuffer ? new Uint8Array(val) : val });
			return idx;
		}

		if (Array.isArray(val)) {
			const idx = objects.length;
			objects.push({ value: val }); // placeholder
			const childRefs = val.map((item) => visit(item));
			objects[idx].childRefs = childRefs;
			return idx;
		}

		// Check for UID
		const obj = val as { [key: string]: PlistValue };
		if ('UID' in obj && typeof obj.UID === 'number' && Object.keys(obj).length === 1) {
			const idx = objects.length;
			objects.push({ value: val });
			return idx;
		}

		// Dict
		const idx = objects.length;
		objects.push({ value: val }); // placeholder
		const keys = Object.keys(obj);
		const keyRefs = keys.map((k) => visit(k));
		const valRefs = keys.map((k) => visit(obj[k]));
		objects[idx].keyRefs = keyRefs;
		objects[idx].valueRefs = valRefs;
		return idx;
	}

	visit(root);
	return objects;
}

function serializeObject(
	entry: ObjEntry,
	refSize: number,
): Uint8Array {
	const val = entry.value;

	if (val === null) return new Uint8Array([0x00]);
	if (typeof val === 'boolean') return new Uint8Array([val ? 0x09 : 0x08]);

	if (typeof val === 'bigint') {
		// Always use 8-byte int for bigint
		const buf = new Uint8Array(9);
		const v = new DataView(buf.buffer);
		buf[0] = 0x13; // int, pow=3 (8 bytes)
		const n = Number(val);
		v.setInt32(1, Math.floor(n / 0x100000000));
		v.setUint32(5, n >>> 0);
		return buf;
	}

	if (typeof val === 'number') {
		// Check if integer
		if (Number.isInteger(val) && val >= -2147483648 && val <= 4294967295) {
			const pow = val < 0 || val > 0xff
				? (val < 0 || val > 0xffff ? (val < 0 || val > 0xffffffff ? 3 : 2) : 1)
				: 0;
			const byteCount = 1 << pow;
			const buf = new Uint8Array(1 + byteCount);
			const v = new DataView(buf.buffer);
			buf[0] = 0x10 | pow;
			if (byteCount === 1) v.setUint8(1, val);
			else if (byteCount === 2) v.setUint16(1, val);
			else if (byteCount === 4) {
				if (val < 0) v.setInt32(1, val);
				else v.setUint32(1, val);
			} else {
				v.setInt32(1, Math.floor(val / 0x100000000));
				v.setUint32(5, val >>> 0);
			}
			return buf;
		}
		// Float64
		const buf = new Uint8Array(9);
		const v = new DataView(buf.buffer);
		buf[0] = 0x23;
		v.setFloat64(1, val);
		return buf;
	}

	if (typeof val === 'string') {
		// Check if ASCII
		let isAscii = true;
		for (let i = 0; i < val.length; i++) {
			if (val.charCodeAt(i) > 127) {
				isAscii = false;
				break;
			}
		}
		if (isAscii) {
			const bytes = new Uint8Array(val.length);
			for (let i = 0; i < val.length; i++) bytes[i] = val.charCodeAt(i);
			return withSizeHeader(0x5, val.length, bytes);
		}
		// UTF-16
		const payload = new Uint8Array(val.length * 2);
		const pv = new DataView(payload.buffer);
		for (let i = 0; i < val.length; i++) {
			pv.setUint16(i * 2, val.charCodeAt(i));
		}
		return withSizeHeader(0x6, val.length, payload);
	}

	if (val instanceof Date) {
		const buf = new Uint8Array(9);
		const v = new DataView(buf.buffer);
		buf[0] = 0x33;
		v.setFloat64(1, (val.getTime() - EPOCH_2001) / 1000);
		return buf;
	}

	if (val instanceof Uint8Array) {
		return withSizeHeader(0x4, val.length, val);
	}

	if (Array.isArray(val)) {
		const refs = entry.childRefs!;
		const payload = new Uint8Array(refs.length * refSize);
		const pv = new DataView(payload.buffer);
		for (let i = 0; i < refs.length; i++) {
			writeSizedInt(pv, i * refSize, refSize, refs[i]);
		}
		return withSizeHeader(0xa, refs.length, payload);
	}

	// Check for UID
	const obj = val as { [key: string]: PlistValue };
	if ('UID' in obj && typeof obj.UID === 'number' && Object.keys(obj).length === 1) {
		const uid = obj.UID as number;
		const size = uid <= 0xff ? 1 : uid <= 0xffff ? 2 : 4;
		const buf = new Uint8Array(1 + size);
		const v = new DataView(buf.buffer);
		buf[0] = 0x80 | (size - 1);
		if (size === 1) v.setUint8(1, uid);
		else if (size === 2) v.setUint16(1, uid);
		else v.setUint32(1, uid);
		return buf;
	}

	// Dict
	const keyRefs = entry.keyRefs!;
	const valueRefs = entry.valueRefs!;
	const n = keyRefs.length;
	const payload = new Uint8Array(n * 2 * refSize);
	const pv = new DataView(payload.buffer);
	for (let i = 0; i < n; i++) {
		writeSizedInt(pv, i * refSize, refSize, keyRefs[i]);
	}
	for (let i = 0; i < n; i++) {
		writeSizedInt(pv, (n + i) * refSize, refSize, valueRefs[i]);
	}
	return withSizeHeader(0xd, n, payload);
}

/**
 * Serialize a PlistValue into binary plist format (bplist00).
 */
export function buildBinary(value: PlistValue): Uint8Array {
	const entries = flattenObjects(value);
	const objectRefSize = entries.length <= 256 ? 1 : 2;

	// Serialize each object
	const serialized: Uint8Array[] = [];
	for (const entry of entries) {
		serialized.push(serializeObject(entry, objectRefSize));
	}

	// Build offset table
	let currentOffset = 8; // header
	const offsets: number[] = [];
	for (const s of serialized) {
		offsets.push(currentOffset);
		currentOffset += s.length;
	}
	const offsetTableOffset = currentOffset;

	const maxOffset = offsetTableOffset;
	const offsetSize =
		maxOffset <= 0xff ? 1 : maxOffset <= 0xffff ? 2 : 4;

	const totalSize =
		offsetTableOffset + entries.length * offsetSize + 32;
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
	for (let i = 0; i < entries.length; i++) {
		writeSizedInt(view, pos, offsetSize, offsets[i]);
		pos += offsetSize;
	}

	// Trailer (last 32 bytes)
	const trailerStart = totalSize - 32;
	view.setUint8(trailerStart + 6, offsetSize);
	view.setUint8(trailerStart + 7, objectRefSize);
	view.setUint32(trailerStart + 8, 0);
	view.setUint32(trailerStart + 12, entries.length);
	view.setUint32(trailerStart + 16, 0);
	view.setUint32(trailerStart + 20, 0); // top object always 0
	view.setUint32(trailerStart + 24, 0);
	view.setUint32(trailerStart + 28, offsetTableOffset);

	return buf;
}
