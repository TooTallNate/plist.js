---
"plist": patch
---

Fix uncontrolled resource consumption in binary plist parser. Objects referenced multiple times are now parsed only once, circular references are rejected, and trailer/offset table/object references are validated against the input bounds.
