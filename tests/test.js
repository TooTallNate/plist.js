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

  // Try re-stringifying and re-parsing
  plist.parseString(plist.stringify(dicts), function(err, dicts2) {
    assert.deepEqual(dicts,dicts2);
  });
  
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

  // Try re-stringifying and re-parsing
  plist.parseString(plist.stringify(dicts), function(err, dicts2) {
    assert.deepEqual(dicts,dicts2);
  });

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

  // Try re-stringifying and re-parsing
  plist.parseString(plist.stringify(dicts), function(err, dicts2) {
    assert.deepEqual(dicts,dicts2);
  });

});

// Fourth test...
var file4 = path.join(__dirname, "Xcode-Info.plist");
var startTime4 = new Date();

plist.parseFile(file4, function(err, dicts) {
  if (err) {
    throw err;
  }

  var endTime = new Date();
  console.log('Parsed "' + file4 + '" in ' + (endTime - startTime4) + 'ms');

  var dict = dicts[0];
  assert.equal(dict['CFBundleAllowMixedLocalizations'], true);
  assert.equal(dict['CFBundleExecutable'], "${EXECUTABLE_NAME}");
  assert.equal(dict['UISupportedInterfaceOrientations~ipad'][0], "UIInterfaceOrientationPortrait");

  // Try re-stringifying and re-parsing
  plist.parseString(plist.stringify(dicts), function(err, dicts2) {
    assert.deepEqual(dicts,dicts2);
  });

});


// Fifth test...
var file5 = path.join(__dirname, "Xcode-PhoneGap.plist");
var startTime5 = new Date();

plist.parseFile(file5, function(err, dicts) {
  if (err) {
    throw err;
  }

  var endTime = new Date();
  console.log('Parsed "' + file5 + '" in ' + (endTime - startTime5) + 'ms');

  var dict = dicts[0];
  assert.equal(dict['ExternalHosts'][0], "*");
  assert.equal(dict['Plugins']['com.phonegap.accelerometer'], "PGAccelerometer");
  
  // Try re-stringifying and re-parsing
  plist.parseString(plist.stringify(dicts), function(err, dicts2) {
    assert.deepEqual(dicts,dicts2);
  });

});