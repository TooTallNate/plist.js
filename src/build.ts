import xmlbuilder from 'xmlbuilder';
import type { PlistValue } from './parse.js';

/**
 * Encode a Uint8Array into a base64 string.
 */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export interface BuildOptions {
  pretty?: boolean;
  indent?: string;
  newline?: string;
  [key: string]: unknown;
}

/**
 * Generate an XML plist string from the input object `obj`.
 *
 * @param obj - the object to convert
 * @param opts - optional options object
 * @returns converted plist XML string
 */
export function build(obj: PlistValue, opts?: BuildOptions): string {
  const XMLHDR = {
    version: '1.0',
    encoding: 'UTF-8',
  };

  const XMLDTD = {
    pubid: '-//Apple//DTD PLIST 1.0//EN',
    sysid: 'http://www.apple.com/DTDs/PropertyList-1.0.dtd',
  };

  const doc = xmlbuilder.create('plist');

  doc.dec(XMLHDR.version, XMLHDR.encoding);
  doc.dtd(XMLDTD.pubid, XMLDTD.sysid);
  doc.att('version', '1.0');

  walk_obj(obj, doc);

  if (!opts) opts = {};
  // default `pretty` to `true`
  opts.pretty = opts.pretty !== false;
  return doc.end(opts);
}

/**
 * depth first, recursive traversal of a javascript object. when complete,
 * next_child contains a reference to the build XML object.
 */
function walk_obj(next: unknown, next_child: xmlbuilder.XMLElement): void {
  if (typeof next === 'undefined') {
    return;
  } else if (Array.isArray(next)) {
    next_child = next_child.ele('array');
    for (let i = 0; i < next.length; i++) {
      walk_obj(next[i], next_child);
    }
  } else if (next instanceof ArrayBuffer) {
    next_child.ele('data').raw(uint8ArrayToBase64(new Uint8Array(next)));
  } else if (ArrayBuffer.isView(next)) {
    // Handles Uint8Array, Buffer, and all typed arrays
    const bytes =
      next instanceof Uint8Array
        ? next
        : new Uint8Array(next.buffer as ArrayBuffer, next.byteOffset, next.byteLength);
    next_child.ele('data').raw(uint8ArrayToBase64(bytes));
  } else if (typeof next === 'object' && next !== null && !(next instanceof Date)) {
    next_child = next_child.ele('dict');
    for (const prop in next as Record<string, unknown>) {
      if (Object.hasOwn(next as Record<string, unknown>, prop)) {
        next_child.ele('key').txt(prop);
        walk_obj((next as Record<string, unknown>)[prop], next_child);
      }
    }
  } else if (typeof next === 'number') {
    const tag_type = next % 1 === 0 ? 'integer' : 'real';
    next_child.ele(tag_type).txt(next.toString());
  } else if (typeof next === 'bigint') {
    next_child.ele('integer').txt(next.toString());
  } else if (next instanceof Date) {
    next_child
      .ele('date')
      .txt(new Date(next).toISOString().replace(/\.\d{3}Z$/, 'Z'));
  } else if (typeof next === 'boolean') {
    next_child.ele(next ? 'true' : 'false');
  } else if (typeof next === 'string') {
    next_child.ele('string').txt(next);
  } else if (next === null) {
    next_child.ele('null').txt('');
  }
}
