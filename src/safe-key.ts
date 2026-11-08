/**
 * Reject dictionary keys that would pollute the prototype of the returned
 * object (CVE-2022-22912). The XML parser already guards `<key>__proto__</key>`;
 * this is the shared guard for the OpenStep and binary parsers, which `parse()`
 * dispatches to automatically. A non-string key (e.g. an OpenStep `( )` array or
 * a binary key ref pointing at a container) is rejected too, so the `__proto__`
 * check cannot be bypassed by a value that merely coerces to that string.
 */
export function assertSafeKey(key: unknown): asserts key is string {
  if (typeof key !== 'string') {
    throw new Error(`Invalid plist dictionary key of type ${typeof key}`);
  }
  if (key === '__proto__') {
    throw new Error(
      '__proto__ keys can lead to prototype pollution. More details on CVE-2022-22912'
    );
  }
}
