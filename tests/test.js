var sys = require("sys");
var path = require("path");
var assert = require("assert");
var plist = require("../lib/node-plist");

// The Plist file to parse...
var file = path.join(__dirname, "iTunes-small.xml");

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

