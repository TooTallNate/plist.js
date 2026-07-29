import { describe, it, expect } from 'vitest';
import { build, parse, buildBinary, parseBinary } from '../src/index.js';
import { build as buildBrowser } from '../src/build.browser.js';

describe('plist', () => {

  describe('build()', () => {

    it('should create a plist XML string from a String', () => {
      const xml = build('test');
      expect(xml).toBe(`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <string>test</string>
</plist>`);
    });

    it('should create a plist XML integer from a whole Number', () => {
      const xml = build(3);
      expect(xml).toBe(`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <integer>3</integer>
</plist>`);
    });

    it('should create a plist XML real from a fractional Number', () => {
      const xml = build(Math.PI);
      expect(xml).toBe(`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <real>3.141592653589793</real>
</plist>`);
    });

    it('should create a plist XML real from a BigInt', () => {
      const xml = build(BigInt('0x1fffffffffffff'));
      expect(xml).toBe(`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <integer>9007199254740991</integer>
</plist>`);
    });

    it('should create a plist XML date from a Date', () => {
      const xml = build(new Date('2010-02-08T21:41:23Z'));
      expect(xml).toBe(`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <date>2010-02-08T21:41:23Z</date>
</plist>`);
    });

    it('should create a plist XML data from a Uint8Array', () => {
      const xml = build(new TextEncoder().encode('\u2603'));
      expect(xml).toBe(`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <data>4piD</data>
</plist>`);
    });

    it('should create a plist XML true from a `true` Boolean', () => {
      const xml = build(true);
      expect(xml).toBe(`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <true/>
</plist>`);
    });

    it('should create a plist XML false from a `false` Boolean', () => {
      const xml = build(false);
      expect(xml).toBe(`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <false/>
</plist>`);
    });

    it('should create a plist XML dict from an Object', () => {
      const xml = build({ foo: 'bar' });
      expect(xml).toBe(`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>foo</key>
    <string>bar</string>
  </dict>
</plist>`);
    });

    it('should create a plist XML array from an Array', () => {
      const xml = build([ 1, 'foo', false, new Date(1234) ]);
      expect(xml).toBe(`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <array>
    <integer>1</integer>
    <string>foo</string>
    <false/>
    <date>1970-01-01T00:00:01.234Z</date>
  </array>
</plist>`);
    });

    it('should properly encode an empty string', () => {
      const xml = build({ a: '' });
      expect(xml).toBe(`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>a</key>
    <string/>
  </dict>
</plist>`);
    });

    it('should skip undefined values in dict', () => {
      const xml = build({ foo: undefined } as any);
      expect(xml).toBe(build({}));
    });

    it('should skip null values in dict', () => {
      const xml = build({ foo: null });
      expect(xml).toBe(build({}));
    });

    it('should skip null values but keep other keys in dict', () => {
      const xml = build({ foo: null, bar: 'baz' });
      expect(xml).toBe(build({ bar: 'baz' }));
    });

    it('should build a plist with emoji strings', () => {
      const xml = build({ emoji: '🎉🤖💀' });
      expect(xml).toContain('<string>🎉🤖💀</string>');
    });

    it('should build a plist with flag emoji', () => {
      const xml = build({ flags: '🇺🇸🇯🇵' });
      expect(xml).toContain('<string>🇺🇸🇯🇵</string>');
    });

    it('should skip null values in arrays', () => {
      const xml = build([null, 'a', null]);
      expect(xml).toBe(`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <array>
    <string>a</string>
  </array>
</plist>`);
    });
  });

});

describe('Date sub-second precision', () => {
  // The binary format stores a Date as an exact float64 and preserves
  // sub-second precision. The XML builders previously stripped any
  // fractional-second group, so build()/parse() disagreed with
  // buildBinary()/parseBinary() on the same value and silently dropped
  // up to 999 ms on a binary -> XML conversion.
  const cases = [0, 1, 250, 999];

  for (const ms of cases) {
    const d = new Date(Date.UTC(2020, 2, 4, 5, 6, 7, ms));

    it(`XML build()/parse() round-trips ${ms} ms`, () => {
      const back = parse(build(d)) as Date;
      expect(back.getTime()).toBe(d.getTime());
    });

    it(`browser build()/parse() round-trips ${ms} ms`, () => {
      const back = parse(buildBrowser(d)) as Date;
      expect(back.getTime()).toBe(d.getTime());
    });

    it(`binary buildBinary()/parseBinary() round-trips ${ms} ms`, () => {
      const back = parseBinary(buildBinary(d)) as Date;
      expect(back.getTime()).toBe(d.getTime());
    });

    it(`XML and binary agree on ${ms} ms`, () => {
      const viaXml = (parse(build(d)) as Date).getTime();
      const viaBin = (parseBinary(buildBinary(d)) as Date).getTime();
      expect(viaXml).toBe(viaBin);
      expect(viaXml).toBe(d.getTime());
    });
  }

  // A whole-second date must serialize byte-for-byte as it did before
  // (a trailing `Z`, no `.000`) in both XML builders.
  it('emits whole-second dates without a fractional part', () => {
    const d = new Date('2010-02-08T21:41:23Z');
    expect(build(d)).toContain('<date>2010-02-08T21:41:23Z</date>');
    expect(buildBrowser(d)).toContain('<date>2010-02-08T21:41:23Z</date>');
  });

  it('emits sub-second dates with the fractional part intact', () => {
    const d = new Date('2020-03-04T05:06:07.250Z');
    expect(build(d)).toContain('<date>2020-03-04T05:06:07.250Z</date>');
    expect(buildBrowser(d)).toContain('<date>2020-03-04T05:06:07.250Z</date>');
  });
});
