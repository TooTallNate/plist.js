
var plist = require('../');

exports.testEmptyString = function(test) {
  var obj = { a: '' };
  var xml = plist.build(obj);

  // the empty string should be on the same XML line
  test.ok(xml.indexOf('<string></string>'));

  // reflection should work
  test.deepEqual(obj, plist.parse(xml));

  test.done();
}
