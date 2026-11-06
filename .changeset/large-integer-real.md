---
"plist": patch
---

Emit large integer-valued numbers (`|x| >= 1e21`) as `<real>` instead of `<integer>`. `Number.prototype.toString()` renders them in exponential notation (`(1e21).toString() === "1e+21"`), which the `<integer>` parse path truncated at the `e`, silently corrupting the value on a `build` → `parse` round-trip.
