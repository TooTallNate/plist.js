---
'plist': patch
---

Write integers outside the 32-bit range as binary plist ints instead of reals in `buildBinary()`, write bigints without going through a `Number`, and read the 16-byte ints that CoreFoundation and Python's plistlib use for values from 2^63 up to 2^64 - 1 in `parseBinary()` (they were read as `0`).
