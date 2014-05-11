var fs = require('fs');
var plist = require('../');

exports.testString = function(test) {
  plist.parseString('<string>Hello World!</string>', function(err, res) {
    test.ifError(err);
    test.equal(res, 'Hello World!');
    test.done();
  });
}

exports.testParseStringSync = function(test) {
  test.doesNotThrow(function(){
    var res = plist.parseStringSync('<plist><dict><key>test</key><integer>101</integer></dict></plist>');
    test.equal(Object.keys(res)[0], 'test');
    test.equal(res.test, 101);
    test.done();
  });
}

exports.testParseStringSyncFailsOnInvalidXML = function(test) {
  test.throws(function(){
    var res = plist.parseStringSync('<string>Hello World!</string>');
  });
  test.done();
}

exports.testDict = function(test) {
  plist.parseString('<plist><dict><key>test</key><integer>101</integer></dict></plist>', function(err, res) {
    test.ifError(err);

    test.ok(Array.isArray(res));
    test.equal(res.length, 1);
    test.equal(Object.keys(res[0])[0], 'test');
    test.equal(res[0].test, 101);
    test.done();
  });
}

exports.testArray = function (test) {

  plist.parseString('<plist><dict><key>test</key><array><integer>0</integer><integer>1</integer><false/><true/></array></dict></plist>', function (err, res) {

    test.ifError(err);

    test.ok(Array.isArray(res));
    test.equal(res[0].test.length, 4);
    test.strictEqual(res[0].test[0], 0);
    test.strictEqual(res[0].test[1], 1);
    test.strictEqual(res[0].test[2], false);
    test.strictEqual(res[0].test[3], true);
    test.done();
  });
}

exports.testCDATA = function(test) {
  plist.parseString('<string><![CDATA[Hello World!&lt;M]]></string>', function(err, res) {
    test.ifError(err);
    test.equal(res, 'Hello World!&lt;M');
    test.done();
  });
}

exports.testComments = function(test) {
  var xml = fs.readFileSync(__dirname + '/xml-comments.plist', 'utf8');
  var obj = plist.parse(xml);
  test.deepEqual(obj, {
    CFBundleName: 'Emacs',
    CFBundlePackageType: 'APPL',
    CFBundleShortVersionString: '24.3',
    CFBundleSignature: 'EMAx',
    CFBundleVersion: '9.0'
  });
  test.done();
}
