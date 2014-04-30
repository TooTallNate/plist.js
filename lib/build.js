
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

// instanceof is horribly unreliable so we use these hackish but safer checks
// http://perfectionkills.com/instanceof-considered-harmful-or-how-to-write-a-robust-isarray
function isArray(obj) {
  return Object.prototype.toString.call(obj) === '[object Array]';
}

function isDate(obj) {
  return Object.prototype.toString.call(obj) === '[object Date]';
}

function isBoolean(obj) {
  return (obj === true || obj === false || toString.call(obj) == '[object Boolean]');
}

function isNumber(obj) {
  return Object.prototype.toString.call(obj) === '[object Number]';
}

function isObject(obj) {
  return Object.prototype.toString.call(obj) === '[object Object]';
}

function isString(obj) {
  return Object.prototype.toString.call(obj) === '[object String]';
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

  if (isArray(next)) {
    next_child = next_child.ele('array');
    for(i=0 ;i < next.length;i++) {
      walk_obj(next[i], next_child);
    }
  } else if (isObject(next)) {
    if (Buffer.isBuffer(next)) {
      next_child.ele('data').raw(next.toString('base64'));
    } else {
      next_child = next_child.ele('dict');
      for(prop in next) {
        if (next.hasOwnProperty(prop)) {
          next_child.ele('key').txt(prop);
          walk_obj(next[prop], next_child);
        }
      }
    }
  } else if (isNumber(next)) {
    // detect if this is an integer or real
    tag_type =(next % 1 === 0) ? 'integer' : 'real';
    next_child.ele(tag_type).txt(next.toString());
  } else if (isDate(next)) {
    next_child.ele('date').raw(ISODateString(new Date(next)));
  } else if (isBoolean(next)) {
    val = next ? 'true' : 'false';
    next_child.ele(val);
  } else if (isString(next)) {
    //if (str!=obj || str.indexOf("\n")>=0) str = "<![CDATA["+str+"]]>";
    var base64Matcher = new RegExp("^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{4})$");
    if (base64Matcher.test(next.replace(/\s/g,''))) {
      // data is base 64 encoded so assume it's a <data> node
      next_child.ele('data').raw(new Buffer(next, 'utf8').toString('base64'));
    } else {
      // it's not base 64 encoded, assume it's a <string> node
      next_child.ele('string').raw(next);
    }
  }
}
