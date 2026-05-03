# plist.js

Apple property list parser/builder for Node.js and browsers. Supports **XML**, **binary** (bplist00), and **OpenStep** formats.

[![CI](https://github.com/TooTallNate/plist.js/actions/workflows/ci.yml/badge.svg)](https://github.com/TooTallNate/plist.js/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/plist)](https://www.npmjs.com/package/plist)
[![npm bundle size](https://img.shields.io/bundlephobia/minzip/plist)](https://bundlephobia.com/package/plist)

**[Try it in the browser →](https://plist.n8.io/)**

## Features

- **Parse** XML, binary, and OpenStep plists — format is auto-detected
- **Build** XML and binary plists from JavaScript objects
- **TypeScript** — written in TypeScript with full type declarations
- **Browser-optimized** — uses native `DOMParser` in browsers (zero dependencies)
- **Lightweight** — ~4 KB gzipped in the browser

## Install

```bash
npm install plist
```

## Quick Start

```ts
import { parse, build } from 'plist';

// Parse any plist format (auto-detected)
const obj = parse('<plist version="1.0"><string>Hello!</string></plist>');
console.log(obj); // "Hello!"

// Build an XML plist from a JS object
const xml = build({ name: 'My App', version: 42 });
console.log(xml);
```

## Parsing

### XML Plists

```ts
import { readFileSync } from 'node:fs';
import { parse } from 'plist';

const xml = readFileSync('Info.plist', 'utf8');
const obj = parse(xml);
```

### Binary Plists

Binary plists (bplist00) are auto-detected when passed as a `Uint8Array` or `ArrayBuffer`. You can also use `parseBinary()` directly:

```ts
import { readFileSync } from 'node:fs';
import { parse, parseBinary } from 'plist';

// Auto-detected from binary data
const buf = readFileSync('Info.plist');
const obj = parse(new Uint8Array(buf));

// Or use parseBinary() directly
const obj2 = parseBinary(new Uint8Array(buf));
```

### OpenStep Plists

The old-style ASCII format (used by `defaults read` on macOS) is auto-detected when the input starts with `{` or `(`:

```ts
import { parse, parseOpenStep } from 'plist';

// Auto-detected
const obj = parse('{ CFBundleName = "My App"; CFBundleVersion = 42; }');

// Or use parseOpenStep() directly
const obj2 = parseOpenStep('( item1, item2, item3 )');
```

## Building

### XML Output

```ts
import { build } from 'plist';

const xml = build({
  CFBundleName: 'My App',
  CFBundleVersion: '1.0',
  LSRequiresIPhoneOS: true,
  UISupportedInterfaceOrientations: [
    'UIInterfaceOrientationPortrait',
    'UIInterfaceOrientationLandscapeLeft',
  ],
});
```

Output:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>CFBundleName</key>
    <string>My App</string>
    <key>CFBundleVersion</key>
    <string>1.0</string>
    <key>LSRequiresIPhoneOS</key>
    <true/>
    <key>UISupportedInterfaceOrientations</key>
    <array>
      <string>UIInterfaceOrientationPortrait</string>
      <string>UIInterfaceOrientationLandscapeLeft</string>
    </array>
  </dict>
</plist>
```

### Binary Output

```ts
import { writeFileSync } from 'node:fs';
import { buildBinary } from 'plist';

const data = buildBinary({
  CFBundleName: 'My App',
  CFBundleVersion: '1.0',
});

writeFileSync('Info.plist', data);
```

## Type Mapping

| Plist Type | JavaScript Type |
|---|---|
| `<string>` | `string` |
| `<integer>` | `number` |
| `<real>` | `number` |
| `<true/>` / `<false/>` | `boolean` |
| `<date>` | `Date` |
| `<data>` | `Uint8Array` |
| `<array>` | `Array` |
| `<dict>` | `Object` |

## Browser Usage

In bundled applications (Vite, webpack, etc.), just import normally — the browser-optimized build is selected automatically via [conditional exports](https://nodejs.org/api/packages.html#conditional-exports):

```ts
import { parse, build } from 'plist';
```

The browser build uses native `DOMParser` and string-based XML building, so `@xmldom/xmldom` and `xmlbuilder` are not included in the bundle.

**[Try the interactive playground →](https://plist.n8.io/)**

## API

### `parse(input)`

Parse a plist. Format is auto-detected.

- **input**: `string | Uint8Array | ArrayBuffer`
- **returns**: `PlistValue`

### `parseBinary(data)`

Parse a binary plist (bplist00).

- **data**: `Uint8Array`
- **returns**: `PlistValue`

### `parseOpenStep(input)`

Parse an OpenStep/ASCII plist.

- **input**: `string`
- **returns**: `PlistValue`

### `build(obj, opts?)`

Build an XML plist string.

- **obj**: `PlistValue`
- **opts.pretty**: `boolean` (default: `true`) — pretty-print with indentation
- **opts.indent**: `string` (default: `"  "`) — indentation string
- **opts.newline**: `string` (default: `"\n"`) — newline string
- **returns**: `string`

### `buildBinary(obj)`

Build a binary plist (bplist00).

- **obj**: `PlistValue`
- **returns**: `Uint8Array`

### `PlistValue`

```ts
type PlistValue =
  | string
  | number
  | boolean
  | Date
  | Uint8Array
  | PlistValue[]
  | { [key: string]: PlistValue }
  | null;
```

## License

[MIT](LICENSE)
