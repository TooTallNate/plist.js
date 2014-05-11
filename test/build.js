
var assert = require('assert');
var build = require('../').build;
var multiline = require('multiline');

describe('plist', function () {

  describe('build()', function () {

    it('should create a plist XML string from a String', function () {
      var xml = build('test');
      assert.strictEqual(xml, multiline(function () {/*
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <string>test</string>
</plist>
*/}));
    });

    it('should create a plist XML integer from a whole Number', function () {
      var xml = build(3);
      assert.strictEqual(xml, multiline(function () {/*
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <integer>3</integer>
</plist>
*/}));
    });

    it('should create a plist XML real from a fractional Number', function () {
      var xml = build(Math.PI);
      assert.strictEqual(xml, multiline(function () {/*
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <real>3.141592653589793</real>
</plist>
*/}));
    });

  });

});
