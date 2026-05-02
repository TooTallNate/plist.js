import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { parse, parseOpenStep } from '../src/index.js';

describe('parseOpenStep', () => {
  it('root dict', () => {
    expect(parseOpenStep('{ a = 3; b = 4; }')).toEqual({ a: '3', b: '4' });
  });

  it('root array', () => {
    expect(parseOpenStep('(3, abc)')).toEqual(['3', 'abc']);
  });

  it('root quoted string', () => {
    expect(parseOpenStep('"abc"')).toBe('abc');
  });

  it('root unquoted string', () => {
    expect(parseOpenStep('abc')).toBe('abc');
  });

  it('data (hex)', () => {
    const result = parseOpenStep('<a3 1f>') as Uint8Array;
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result[0]).toBe(0xa3);
    expect(result[1]).toBe(0x1f);
  });

  it('data hex pairs', () => {
    const result = parseOpenStep('<0a3f>') as Uint8Array;
    expect(result[0]).toBe(0x0a);
    expect(result[1]).toBe(0x3f);
  });

  it('nested dict in dict', () => {
    expect(parseOpenStep('{ a = { inner = "abc"; }; b = 4; }')).toEqual({
      a: { inner: 'abc' },
      b: '4',
    });
  });

  it('nested array in dict', () => {
    expect(parseOpenStep('{ a = ( "inner" ); b = 4; }')).toEqual({
      a: ['inner'],
      b: '4',
    });
  });

  it('nested dict in array', () => {
    expect(parseOpenStep('( a, {inner = "ggg";}, b )')).toEqual([
      'a',
      { inner: 'ggg' },
      'b',
    ]);
  });

  it('empty array', () => {
    expect(parseOpenStep('()')).toEqual([]);
  });

  it('empty dict', () => {
    expect(parseOpenStep('{}')).toEqual({});
  });

  it('complex nested', () => {
    const input = `{
      name = "test";
      items = (a, b, { nested = 1; });
      data = <0fbd77>;
      meta = { version = "2.0"; };
    }`;
    const result = parseOpenStep(input) as Record<string, unknown>;
    expect(result.name).toBe('test');
    expect(result.items).toEqual(['a', 'b', { nested: '1' }]);
    expect(result.data).toBeInstanceOf(Uint8Array);
    expect((result.data as Uint8Array)[0]).toBe(0x0f);
    expect(result.meta).toEqual({ version: '2.0' });
  });

  it('quoted string with escapes', () => {
    expect(parseOpenStep('"ab\\"c"')).toBe('ab"c');
    expect(parseOpenStep('"line\\nbreak"')).toBe('line\nbreak');
    expect(parseOpenStep('"tab\\there"')).toBe('tab\there');
  });

  it('block comments', () => {
    expect(parseOpenStep('/* comment */ { a = 1; }')).toEqual({ a: '1' });
  });

  it('line comments', () => {
    expect(parseOpenStep('// comment\n{ a = 1; }')).toEqual({ a: '1' });
  });

  it('real-world defaults read output', () => {
    const input = readFileSync(
      join(__dirname, 'fixtures', 'defaults-read.openstep'),
      'utf8'
    );
    const result = parseOpenStep(input) as Record<string, unknown>;
    expect(result.CFBundleDevelopmentRegion).toBe('en');
    expect(result.CFBundleExecutable).toBe('My App');
    expect(result.CFBundleIdentifier).toBe('com.example.myapp');
    expect(result.CFBundlePackageType).toBe('APPL');
    expect(result.NSAppTransportSecurity).toEqual({
      NSAllowsArbitraryLoads: '1',
    });
    expect(result.UISupportedInterfaceOrientations).toEqual([
      'UIInterfaceOrientationPortrait',
      'UIInterfaceOrientationLandscapeLeft',
      'UIInterfaceOrientationLandscapeRight',
    ]);
  });

  describe('error cases', () => {
    it('unterminated string', () => {
      expect(() => parseOpenStep('"abc')).toThrow('Unterminated string');
    });

    it('missing = in dict', () => {
      expect(() => parseOpenStep('{ a ; }')).toThrow("Expected '='");
    });

    it('unterminated dict', () => {
      expect(() => parseOpenStep('{ a = 1;')).toThrow('Unterminated dictionary');
    });

    it('unterminated array', () => {
      expect(() => parseOpenStep('(a, b')).toThrow('Unterminated array');
    });

    it('unterminated data', () => {
      expect(() => parseOpenStep('<0f')).toThrow('Unterminated data');
    });
  });
});

describe('parse() auto-detection of OpenStep', () => {
  it('detects OpenStep dict', () => {
    expect(parse('{ key = value; }')).toEqual({ key: 'value' });
  });

  it('detects OpenStep array', () => {
    expect(parse('(a, b, c)')).toEqual(['a', 'b', 'c']);
  });

  it('does not misdetect XML plist', () => {
    // XML plists starting with <?xml should not be parsed as OpenStep
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<string>hello</string>
</plist>`;
    expect(parse(xml)).toBe('hello');
  });
});
