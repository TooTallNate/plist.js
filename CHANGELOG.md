# plist

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
