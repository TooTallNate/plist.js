---
'plist': patch
---

Fix uncontrolled resource consumption in the binary plist parser (incomplete fix for the 5.0.1 change). Objects are now cached by byte offset rather than object index, so offset table entries that alias one offset are parsed once, and objects must lie within the object area without overlapping one another's payload bytes. Previously a ~0.7 MB input could allocate gigabytes and crash the process.
