/**
 * tests for base64 encoding and decoding, used in <data> elements
 */

var path = require('path')
  , plist = require('../');

exports.testDecodeBase64 = function(test) {
  var file = path.join(__dirname, 'utf8data.xml');
  plist.parseFile(file, function(err, plists) {
    var plist = plists[0];

    test.ifError(err);
    test.equal(plist['Smart Info'], '✓ à la mode');
    test.done();
  });
}

exports.testDecodeBase64WithNewlines = function(test) {
  var file = path.join(__dirname, 'utf8data.xml');
  plist.parseFile(file, function(err, plists) {
    var plist = plists[0];

    test.ifError(err);
    test.equal(plist['Newlines'], '✓ à la mode');
    test.done();
  });
}

exports.testBase64Encode = function(test) {
  var to_write = { yay: '✓ à la mode' };

  var out = plist.build(to_write);
  
  plist.parseString(out, function(err, plists) {
    var plist = plists[0];

    test.ifError(err);
    test.equal(plist['yay'], '✓ à la mode');
    test.done();
  });
}
