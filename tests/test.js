var path = require("path");
var assert = require("assert");
var plist = require("../");

// First test...
var file = path.join(__dirname, "iTunes-small.xml");
var startTime1 = new Date();

plist.parseFile(file, function(err, dicts) {
  if (err) {
    throw err;
  }

  var endTime = new Date();
  console.log('Parsed "' + file + '" in ' + (endTime - startTime1) + 'ms');

  var dict = dicts[0];
  assert.equal(dict['Application Version'], "9.0.3");
  assert.equal(dict['Library Persistent ID'], "6F81D37F95101437");

});


// Second tests. Runs concurrently with the first test...
var file2 = path.join(__dirname, "sample2.plist");
var startTime2 = new Date();

plist.parseFile(file2, function(err, dicts) {
  if (err) {
    throw err;
  }

  var endTime = new Date();
  console.log('Parsed "' + file2 + '" in ' + (endTime - startTime2) + 'ms');

  var dict = dicts[0];
  assert.equal(dict['PopupMenu'][2]['Key'], "\n        \n        #import &lt;Cocoa/Cocoa.h&gt;\n\n#import &lt;MacRuby/MacRuby.h&gt;\n\nint main(int argc, char *argv[])\n{\n  return macruby_main(\"rb_main.rb\", argc, argv);\n}\n\n");

});


// Third test...
var file3 = path.join(__dirname, "airplay.xml");
var startTime3 = new Date();

plist.parseFile(file3, function(err, dicts) {
  if (err) {
    throw err;
  }

  var endTime = new Date();
  console.log('Parsed "' + file3 + '" in ' + (endTime - startTime3) + 'ms');

  var dict = dicts[0];
  assert.equal(dict['duration'], 5555.0495000000001);
  assert.equal(dict['position'], 4.6269989039999997);

});
