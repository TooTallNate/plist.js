var plist = require('../');
var assert = require('assert');


var gotResponse1 = false;
plist.parseString("<string>Hello World!</string>", function(err, res) {
  if (err) throw err;
  gotResponse1 = true;
  assert.equal(res, 'Hello World!');
});


var gotResponse2 = false;
plist.parseString("<plist><dict><key>test</key><integer>101</integer></dict></plist>", function(err, res) {
  if (err) throw err;
  gotResponse2 = true;
  assert.ok(Array.isArray(res));
  assert.equal(res.length, 1);
  assert.equal(Object.keys(res[0])[0], 'test');
  assert.equal(res[0].test, 101);
});


process.on('exit', function() {
  assert.ok(gotResponse1);
});
