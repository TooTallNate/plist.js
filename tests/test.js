var sys = require("sys");
var path = require("path");
var assert = require("assert");
var plist = require("../lib/plist");

// The Plist file to parse...
var file = path.join(path.dirname, "iTunes-small.xml");

var startTime = new Date();

plist.parseFile(file, function(err, dicts) {

  if (err) {
    throw err;
  }

  var endTime = new Date();
  sys.puts('Parsed "' + file + '" in ' + (endTime - startTime) + 'ms');

  sys.puts(sys.inspect(dicts, true, 5));
  //sys.puts(JSON.stringify(dicts));
  
  var dict = dicts[0];
  //assert.equal(dict['Application Version'], "9.0.3");
  //assert.equal(dict['Library Persistent ID'], "6F81D37F95101437");
  
});

var plistFile = path.join(path.dirname, "tests/sample2.plist");

plist.parseFile(plistFile, function(err, dicts) {
  if (err) {
    throw err;
  }

  var dict = dicts[0];

  assert.equal(dict['PopupMenu'][2]['Key'], "\n        #import &lt;Cocoa/Cocoa.h&gt;\n\n#import &lt;MacRuby/MacRuby.h&gt;\n\nint main(int argc, char *argv[])\n{\n  return macruby_main(\"rb_main.rb\", argc, argv);\n}\n");
});
