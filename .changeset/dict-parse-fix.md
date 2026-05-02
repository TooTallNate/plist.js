---
"plist": patch
---

Fixed exponential parse blowup when parsing deeply nested plist files. The dict parser was eagerly evaluating error message arguments, causing every value to be parsed twice.
