import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { parseBinary, parse, buildBinary } from '../src/index.js';
import type { PlistValue } from '../src/index.js';

describe('parseBinary', () => {
	/* CVE-2022-22912: the XML parser guards __proto__ keys; the binary parser must too. */
	it('should throw if a dict key is __proto__', () => {
		// JSON.parse creates a real own "__proto__" property, unlike an object literal.
		const evil = JSON.parse('{"__proto__": {"polluted": true}}') as PlistValue;
		const buf = buildBinary(evil);
		expect(() => parseBinary(buf)).toThrow(/__proto__/);
	});

	it('should parse booleans', () => {
		const plist = buildBinary([true, false]);
		expect(parseBinary(plist)).toEqual([true, false]);
	});

	it('should parse small integers', () => {
		const plist = buildBinary([0, 42, 255]);
		expect(parseBinary(plist)).toEqual([0, 42, 255]);
	});

	it('should parse large integers', () => {
		const plist = buildBinary([100000, 1000000000]);
		expect(parseBinary(plist)).toEqual([100000, 1000000000]);
	});

	it('should parse float64 reals', () => {
		const plist = buildBinary(3.141592653589793);
		expect(parseBinary(plist)).toBeCloseTo(3.141592653589793, 10);
	});

	it('should parse ASCII strings', () => {
		const plist = buildBinary('Hello, World!');
		expect(parseBinary(plist)).toBe('Hello, World!');
	});

	it('should parse UTF-16 strings', () => {
		const plist = buildBinary('Héllo');
		expect(parseBinary(plist)).toBe('Héllo');
	});

	it('should parse data blobs', () => {
		const blob = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
		const plist = buildBinary(blob);
		const result = parseBinary(plist) as Uint8Array;
		expect(result).toBeInstanceOf(Uint8Array);
		expect([...result]).toEqual([0xde, 0xad, 0xbe, 0xef]);
	});

	it('should parse dates', () => {
		const date = new Date('2020-01-01T00:00:00.000Z');
		const plist = buildBinary(date);
		const result = parseBinary(plist) as Date;
		expect(result).toBeInstanceOf(Date);
		expect(result.toISOString()).toBe('2020-01-01T00:00:00.000Z');
	});

	it('should parse arrays including nested', () => {
		const plist = buildBinary([1, [2, 3]]);
		expect(parseBinary(plist)).toEqual([1, [2, 3]]);
	});

	it('should parse dicts including nested', () => {
		const plist = buildBinary({ a: { b: 42 } });
		expect(parseBinary(plist)).toEqual({ a: { b: 42 } });
	});

	it('should parse a realistic nested structure', () => {
		const obj = {
			name: 'Test',
			version: 1,
			enabled: true,
			tags: ['a', 'b'],
			nested: { x: false },
		};
		const plist = buildBinary(obj);
		expect(parseBinary(plist)).toEqual(obj);
	});

	it('should be callable via parse() with Uint8Array', () => {
		const plist = buildBinary('hello');
		expect(parse(plist)).toBe('hello');
	});

	it('should be callable via parse() with ArrayBuffer', () => {
		const plist = buildBinary(99);
		expect(parse(plist.buffer)).toBe(99);
	});

	it('should parse null', () => {
		const plist = buildBinary([null, 'test']);
		expect(parseBinary(plist)).toEqual([null, 'test']);
	});
});

describe('buildBinary roundtrip', () => {
	it('should roundtrip strings', () => {
		expect(parseBinary(buildBinary('hello'))).toBe('hello');
	});

	it('should roundtrip unicode strings', () => {
		expect(parseBinary(buildBinary('héllo wörld'))).toBe('héllo wörld');
	});

	it('should roundtrip integers', () => {
		for (const n of [0, 1, 127, 255, 256, 65535, 65536, 1000000]) {
			expect(parseBinary(buildBinary(n))).toBe(n);
		}
	});

	it('should roundtrip floats', () => {
		expect(parseBinary(buildBinary(3.14))).toBeCloseTo(3.14, 10);
	});

	it('should roundtrip booleans', () => {
		expect(parseBinary(buildBinary(true))).toBe(true);
		expect(parseBinary(buildBinary(false))).toBe(false);
	});

	it('should roundtrip null', () => {
		expect(parseBinary(buildBinary(null))).toBe(null);
	});

	it('should roundtrip dates', () => {
		const d = new Date('2023-06-15T12:30:00.000Z');
		const result = parseBinary(buildBinary(d)) as Date;
		expect(result.toISOString()).toBe(d.toISOString());
	});

	it('should roundtrip data blobs', () => {
		const data = new Uint8Array([1, 2, 3, 4, 5]);
		const result = parseBinary(buildBinary(data)) as Uint8Array;
		expect([...result]).toEqual([1, 2, 3, 4, 5]);
	});

	it('should roundtrip complex objects', () => {
		const obj = {
			name: 'Test',
			count: 42,
			enabled: true,
			tags: ['a', 'b', 'c'],
			nested: { x: 1, y: 2 },
			empty_array: [] as PlistValue[],
		};
		expect(parseBinary(buildBinary(obj))).toEqual(obj);
	});

	it('should roundtrip UID objects', () => {
		const obj = { UID: 123 };
		const result = parseBinary(buildBinary(obj as unknown as PlistValue));
		expect(result).toEqual({ UID: 123 });
	});

	it('should deduplicate strings', () => {
		const obj = { a: 'shared', b: 'shared', c: 'shared' };
		const binary = buildBinary(obj);
		// Should parse correctly even with deduplication
		expect(parseBinary(binary)).toEqual(obj);
	});
});

describe('fixture files', () => {
	it('should parse Info.bplist', () => {
		const data = new Uint8Array(readFileSync(new URL('./fixtures/Info.bplist', import.meta.url)));
		const result = parseBinary(data) as Record<string, PlistValue>;
		expect(result.CFBundleName).toBe('TestApp');
		expect(result.CFBundleVersion).toBe('1.0');
		expect(result.CFBundleIdentifier).toBe('com.example.testapp');
		expect(result.LSRequiresIPhoneOS).toBe(true);
		expect(result.UISupportedInterfaceOrientations).toEqual([
			'UIInterfaceOrientationPortrait',
			'UIInterfaceOrientationLandscapeLeft',
		]);
	});

	it('should parse nested.bplist', () => {
		const data = new Uint8Array(readFileSync(new URL('./fixtures/nested.bplist', import.meta.url)));
		const result = parseBinary(data) as Record<string, PlistValue>;
		const level1 = result.level1 as Record<string, PlistValue>;
		const level2 = level1.level2 as Record<string, PlistValue>;
		expect(level2.level3).toEqual(['deep', 'values']);
		expect(level2.number).toBe(42);
		const arrayOfDicts = level1.array_of_dicts as Record<string, PlistValue>[];
		expect(arrayOfDicts[0].name).toBe('first');
		expect(arrayOfDicts[1].value).toBe(2);
		expect(result.top_array).toEqual([1, 2, [3, 4, [5]]]);
	});

	it('should parse types.bplist', () => {
		const data = new Uint8Array(readFileSync(new URL('./fixtures/types.bplist', import.meta.url)));
		const result = parseBinary(data) as Record<string, PlistValue>;
		expect(result.string).toBe('hello world');
		expect(result.unicode).toBe('héllo wörld');
		expect(result.integer).toBe(42);
		expect(result.negative).toBe(-7);
		expect(result.big_int).toBe(1000000000);
		expect(result.float).toBeCloseTo(3.141592653589793, 10);
		expect(result.true).toBe(true);
		expect(result.false).toBe(false);
		expect(result.date).toBeInstanceOf(Date);
		expect((result.date as Date).toISOString()).toBe('2020-01-01T00:00:00.000Z');
		expect(result.data).toBeInstanceOf(Uint8Array);
		expect([...(result.data as Uint8Array)]).toEqual([0xde, 0xad, 0xbe, 0xef]);
		expect(result.array).toEqual([1, 'two', true]);
		expect(result.dict).toEqual({ nested_key: 'nested_value' });
	});

	describe('malicious input', () => {
		// Build a bplist with 1-byte offsets/refs from raw object bytes
		function rawBplist(objects: number[][], topObject = 0): Uint8Array {
			const bytes: number[] = [...'bplist00'].map((c) => c.charCodeAt(0));
			const offsets: number[] = [];
			for (const obj of objects) {
				offsets.push(bytes.length);
				bytes.push(...obj);
			}
			const offsetTableOffset = bytes.length;
			bytes.push(...offsets);
			const u64 = (n: number) => [0, 0, 0, 0, 0, 0, 0, n];
			bytes.push(0, 0, 0, 0, 0, 0, 1, 1, ...u64(objects.length), ...u64(topObject), ...u64(offsetTableOffset));
			return new Uint8Array(bytes);
		}

		it('should not expand exponentially on shared references', () => {
			// Object i is a 2-element array referencing object i+1 twice
			const n = 40;
			const objects: number[][] = [];
			for (let i = 0; i < n - 1; i++) objects.push([0xa2, i + 1, i + 1]);
			objects.push([0x00]);
			const start = Date.now();
			let result = parseBinary(rawBplist(objects)) as PlistValue[];
			expect(Date.now() - start).toBeLessThan(1000);
			for (let i = 0; i < n - 1; i++) {
				expect(result).toHaveLength(2);
				expect(result[0]).toBe(result[1]);
				result = result[0] as PlistValue[];
			}
			expect(result).toBeNull();
		});

		it('should reject circular references', () => {
			expect(() => parseBinary(rawBplist([[0xa1, 0]]))).toThrow(/circular/);
			expect(() => parseBinary(rawBplist([[0xa1, 1], [0xa1, 0]]))).toThrow(/circular/);
		});

		it('should reject out-of-range object refs', () => {
			expect(() => parseBinary(rawBplist([[0xa1, 5]]))).toThrow(/out of range/);
		});

		it('should reject an out-of-range top object', () => {
			expect(() => parseBinary(rawBplist([[0x00]], 3))).toThrow(/bad trailer/);
		});

		it('should reject truncated input', () => {
			expect(() => parseBinary(new TextEncoder().encode('bplist00'))).toThrow(/too short/);
		});
	});
});
