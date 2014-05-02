
/**
 * Module dependencies.
 */

var xmlbuilder = require('xmlbuilder');

/**
 * Module exports.
 */

exports.build = build;

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

var toString = Object.prototype.toString;
function type (obj) {
  var m = toString.call(obj).match(/\[object (.*)\]/);
  return m ? m[1] : m;
}

/**
 * generate an XML plist string from the input object
 *
 * @param {Object} obj - the object to convert
 * @returns {String} converted plist
 * @api public
 */

function build (obj) {
  var XMLHDR = { 'version': '1.0','encoding': 'UTF-8' }
    , XMLDTD = { 'ext': 'PUBLIC \"-//Apple Computer//DTD PLIST 1.0//EN\" \"http://www.apple.com/DTDs/PropertyList-1.0.dtd\"' }
    , doc = xmlbuilder.create()
    , child = doc.begin('plist', XMLHDR, XMLDTD).att('version', '1.0');

  walk_obj(obj, child);

  return child.end({
    pretty: true
  });
}

/**
 * depth first, recursive traversal of a javascript object. when complete,
 * next_child contains a reference to the build XML object.
 *
 * @api private
 */

function walk_obj(next, next_child) {
  var tag_type, i, prop;
  var name = type(next);

  if (Array.isArray(next)) {
    next_child = next_child.ele('array');
    for (i = 0; i < next.length; i++) {
      walk_obj(next[i], next_child);
    }

  } else if (Buffer.isBuffer(next)) {
    next_child.ele('data').raw(next.toString('base64'));

  } else if ('Object' == name) {
    next_child = next_child.ele('dict');
    for (prop in next) {
      if (next.hasOwnProperty(prop)) {
        next_child.ele('key').txt(prop);
        walk_obj(next[prop], next_child);
      }
    }

  } else if ('Number' == name) {
    // detect if this is an integer or real
    // TODO: add an ability to force one way or another via a "cast"
    tag_type =(next % 1 === 0) ? 'integer' : 'real';
    next_child.ele(tag_type).txt(next.toString());

  } else if ('Date' == name) {
    next_child.ele('date').txt(ISODateString(new Date(next)));

  } else if ('Boolean' == name) {
    val = next ? 'true' : 'false';
    next_child.ele(val);

  } else if ('String' == name) {
    next_child.ele('string').txt(next);
  }
}
