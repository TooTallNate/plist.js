
/**
 * Module dependencies.
 */

var fs = require('fs');
var util = require('util');
var parse = require('./parse');

/**
 * Module exports.
 */

exports.parseFile = util.deprecate(parseFile, '`parseFile()` is deprecated. ' +
  'Use `parseString()` instead.');
exports.parseFileSync = util.deprecate(parseFileSync, '`parseFileSync()` is deprecated. ' +
  'Use `parseStringSync()` instead.');

/**
 * Parses file `filename` as a .plist file.
 * Invokes `fn` callback function when done.
 *
 * @param {String} filename - name of the file to read
 * @param {Function} fn - callback function
 * @api public
 * @deprecated use parseString() instead
 */

function parseFile (filename, fn) {
  fs.readFileSync(filename, 'utf8', onread);
  function onread (err, inxml) {
    if (err) return fn(err);
    parse.parseString(inxml, fn);
  }
}

/**
 * Parses file `filename` as a .plist file.
 * Returns a  when done.
 *
 * @param {String} filename - name of the file to read
 * @param {Function} fn - callback function
 * @api public
 * @deprecated use parseStringSync() instead
 */

function parseFileSync (filename) {
  var inxml = fs.readFileSync(filename, 'utf8');
  return parse.parseStringSync(inxml);
}
