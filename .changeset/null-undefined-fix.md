---
"plist": major
---

BREAKING: `null` values are now skipped during `build()`, matching `undefined` behavior and aligning with Apple's plist DTD which does not include a `<null/>` element. Parsing `<null/>` on read is still supported for backwards compatibility.
