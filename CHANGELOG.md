# plist

## 5.1.0

### Minor Changes

- 821e16c: Add `headless` option to `build()` to omit XML declaration and DOCTYPE
- e7c4025: Add `invalidCharReplacement` option to `build()` to replace characters that are not valid in XML. The browser `build()` now also throws on invalid XML characters by default, matching the Node `build()`.

### Patch Changes

- 1b1212d: Preserve U+0085, U+2028 and U+2029 in strings and keys when parsing XML plists in Node, using XML 1.0 line-ending normalization to match the browser build

## 5.0.1

### Patch Changes

- 7780aec: Emit empty strings as `<string/>` in the browser `build()` to match the Node `build()` output
- 5d5a064: Escape carriage returns in the browser `build()` so strings and keys containing CR survive a round-trip
- ac871e6: Fix uncontrolled resource consumption in binary plist parser. Objects referenced multiple times are now parsed only once, circular references are rejected, and trailer/offset table/object references are validated against the input bounds.
- fcf0a9f: Preserve sub-second precision when serializing `Date` values in XML `build()`

  Both XML builders stripped any fractional-second group from a `Date`, so
  non-zero milliseconds were silently dropped. The binary format keeps them, so
  `build(parseBinary(bplist))` and `parse(build(date))` lost up to 999 ms.
  Whole-second dates are still emitted without a `.000` fraction, unchanged.

- 2a85a82: Fix double indentation in browser `build()` output
- e76f1ec: Add `default` condition to `exports` map for VSCode compatibility
- ce9b503: Emit large integer-valued numbers (`|x| >= 1e21`) as `<real>` instead of `<integer>`. `Number.prototype.toString()` renders them in exponential notation (`(1e21).toString() === "1e+21"`), which the `<integer>` parse path truncated at the `e`, silently corrupting the value on a `build` → `parse` round-trip.

## 5.0.0

### Major Changes

- 982349e: BREAKING: `null` values are now skipped during `build()`, matching `undefined` behavior and aligning with Apple's plist DTD which does not include a `<null/>` element. Parsing `<null/>` on read is still supported for backwards compatibility.

### Minor Changes

- 592f243: Added binary plist (bplist00) support: `parseBinary()` and `buildBinary()` for reading and writing binary plists. `parse()` now auto-detects binary format.
- 8f0e2cc: Add browser-native implementations using `DOMParser` and `XMLSerializer` for parsing, and native DOM APIs for building XML. Bundlers that support the `"browser"` export condition (Vite, webpack, esbuild) will automatically use these lighter implementations, dramatically reducing bundle size by eliminating the `@xmldom/xmldom` and `xmlbuilder` dependencies.
- 754240c: Added OpenStep/ASCII plist parsing support via `parseOpenStep()`. `parse()` now auto-detects all three plist formats: XML, binary, and OpenStep.
- 3463937: Rewritten in TypeScript with full type declarations. Switched to vitest for testing and pnpm for package management.

### Patch Changes

- 8ce0162: Fixed exponential parse blowup when parsing deeply nested plist files. The dict parser was eagerly evaluating error message arguments, causing every value to be parsed twice.
- f8102c0: Replaced legacy patterns with modern JS equivalents: native `toISOString()`, `Object.hasOwn()`, and direct type checks.
