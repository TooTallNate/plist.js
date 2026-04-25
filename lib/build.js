import xmlbuilder from 'xmlbuilder';

/**
 * Encode a Uint8Array into a base64 string.
 *
 * @param {Uint8Array} bytes
 * @returns {String} base64 encoded string
 * @api private
 */

function uint8ArrayToBase64(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Accepts a `Date` instance and returns an ISO date string.
 *
 * @param {Date} d - Date instance to serialize
 * @returns {String} ISO date string representation of `d`
 * @api private
 */

function ISODateString(d){
  function pad(n){
    return n < 10 ? '0' + n : n;
  }
  return d.getUTCFullYear()+'-'
    + pad(d.getUTCMonth()+1)+'-'
    + pad(d.getUTCDate())+'T'
    + pad(d.getUTCHours())+':'
    + pad(d.getUTCMinutes())+':'
    + pad(d.getUTCSeconds())+'Z';
}

/**
 * Returns the internal "type" of `obj` via the
 * `Object.prototype.toString()` trick.
 *
 * @param {Mixed} obj - any value
 * @returns {String} the internal "type" name
 * @api private
 */

const toString = Object.prototype.toString;
function type (obj) {
  const m = toString.call(obj).match(/\[object (.*)\]/);
  return m ? m[1] : m;
}

/**
 * Generate an XML plist string from the input object `obj`.
 *
 * @param {Object} obj - the object to convert
 * @param {Object} [opts] - optional options object
 * @returns {String} converted plist XML string
 * @api public
 */

export function build (obj, opts) {
  const XMLHDR = {
    version: '1.0',
    encoding: 'UTF-8'
  };

  const XMLDTD = {
    pubid: '-//Apple//DTD PLIST 1.0//EN',
    sysid: 'http://www.apple.com/DTDs/PropertyList-1.0.dtd'
  };

  const doc = xmlbuilder.create('plist');

  doc.dec(XMLHDR.version, XMLHDR.encoding, XMLHDR.standalone);
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
 *
 * @api private
 */

function walk_obj(next, next_child) {
  const name = type(next);

  if ('Undefined' == name) {
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
    const bytes = next instanceof Uint8Array
      ? next
      : new Uint8Array(next.buffer, next.byteOffset, next.byteLength);
    next_child.ele('data').raw(uint8ArrayToBase64(bytes));

  } else if ('Object' == name) {
    next_child = next_child.ele('dict');
    for (const prop in next) {
      if (next.hasOwnProperty(prop)) {
        next_child.ele('key').txt(prop);
        walk_obj(next[prop], next_child);
      }
    }

  } else if ('Number' == name) {
    // detect if this is an integer or real
    // TODO: add an ability to force one way or another via a "cast"
    const tag_type = (next % 1 === 0) ? 'integer' : 'real';
    next_child.ele(tag_type).txt(next.toString());

  } else if ('BigInt' == name) {
    next_child.ele('integer').txt(next);

  } else if ('Date' == name) {
    next_child.ele('date').txt(ISODateString(new Date(next)));

  } else if ('Boolean' == name) {
    next_child.ele(next ? 'true' : 'false');

  } else if ('String' == name) {
    next_child.ele('string').txt(next);

  } else if ('Null' === name) {
    next_child.ele('null').txt('');

  }
}
