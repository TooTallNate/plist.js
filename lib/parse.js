
/**
 * Module dependencies.
 */

var DOMParser = require('xmldom').DOMParser;

/**
 * Module exports.
 */

exports.parseString = parseString;
exports.parseStringSync = parseStringSync;

/**
 *
 */

function parseString (xml, callback) {
  console.warn('parseString is deprecated. Please use parseStringSync instead.');
  var doc, error, plist;
  try {
    doc = new DOMParser().parseFromString(xml);
    plist = parsePlistXML(doc.documentElement);
  } catch(e) {
    error = e;
  }
  callback(error, plist);
}

/**
 *
 */

function parseStringSync (xml) {
  var doc = new DOMParser().parseFromString(xml);
  var plist;
  if (doc.documentElement.nodeName !== 'plist') {
    throw new Error('malformed document. First element should be <plist>');
  }
  plist = parsePlistXML(doc.documentElement);

  // if the plist is an array with 1 element, pull it out of the array
  if (plist.length == 1) {
    plist = plist[0];
  }
  return plist;
}

/**
 * convert an XML based plist document into a JSON representation
 *
 * @param object xml_node current XML node in the plist
 * @returns built up JSON object
 */

function parsePlistXML(node) {
  var i, new_obj, key, val, new_arr, res, d;
  if (!node)
    return null;

  if (node.nodeName === 'plist') {
    new_arr = [];
    for (i=0;i < node.childNodes.length;i++) {
      // ignore comment nodes (text)
      if (node.childNodes[i].nodeType !== 3) {
        new_arr.push( parsePlistXML(node.childNodes[i]));
      }
    }
    return new_arr;
  }
  else if (node.nodeName === 'dict') {
    new_obj = {};
    key = null;
    for (i=0;i < node.childNodes.length;i++) {
      // ignore comment nodes (text)
      if (node.childNodes[i].nodeType !== 3) {
        if (key === null) {
          key = parsePlistXML(node.childNodes[i]);
        } else {
          new_obj[key] = parsePlistXML(node.childNodes[i]);
          key = null;
        }
      }
    }
    return new_obj;
  }
  else if (node.nodeName === 'array') {
    new_arr = [];
    for (i=0;i < node.childNodes.length;i++) {
      // ignore comment nodes (text)
      if (node.childNodes[i].nodeType !== 3) {
        res = parsePlistXML(node.childNodes[i]);
        if (res) new_arr.push( res );
      }
    }
    return new_arr;
  }
  else if (node.nodeName === '#text') {
    // TODO: what should we do with text types? (CDATA sections)
  }
  else if (node.nodeName === 'key') {
    return node.childNodes[0].nodeValue;
  }
  else if (node.nodeName === 'string') {
    res = '';
    for (d=0; d < node.childNodes.length; d++)
    {
      res += node.childNodes[d].nodeValue;
    }
    return res;
  }
  else if (node.nodeName === 'integer') {
    // parse as base 10 integer
    return parseInt(node.childNodes[0].nodeValue, 10);
  }
  else if (node.nodeName === 'real') {
    res = '';
    for (d=0; d < node.childNodes.length; d++)
    {
      if (node.childNodes[d].nodeType === 3) {
        res += node.childNodes[d].nodeValue;
      }
    }
    return parseFloat(res);
  }
  else if (node.nodeName === 'data') {
    res = '';
    for (d=0; d < node.childNodes.length; d++)
    {
      if (node.childNodes[d].nodeType === 3) {
        res += node.childNodes[d].nodeValue;
      }
    }

    // validate that the string is encoded as base64
    var base64Matcher = new RegExp("^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{4})$");
    if (!base64Matcher.test(res.replace(/\s/g,'')) ) {
      throw new Error('malformed document. <data> element is not base64 encoded');
    }

    // decode base64 data as utf8 string
    return new Buffer(res, 'base64').toString('utf8');
  }
  else if (node.nodeName === 'date') {
    return new Date(node.childNodes[0].nodeValue);
  }
  else if (node.nodeName === 'true') {
    return true;
  }
  else if (node.nodeName === 'false') {
    return false;
  }
}