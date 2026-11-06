---
"plist": patch
---

Preserve sub-second precision when serializing `Date` values in XML `build()`

Both XML builders stripped any fractional-second group from a `Date`, so
non-zero milliseconds were silently dropped. The binary format keeps them, so
`build(parseBinary(bplist))` and `parse(build(date))` lost up to 999 ms.
Whole-second dates are still emitted without a `.000` fraction, unchanged.
