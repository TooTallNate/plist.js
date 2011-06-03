var path = require("path");
var assert = require("assert");
var plist = require("../");

var file = path.join(__dirname, "iTunes-BIG.xml");
var startTime = new Date();

plist.parseFile(file, function(err, dicts) {
  if (err) {
    throw err;
  }

  var endTime = new Date();
  console.log('Parsed "' + file + '" in ' + (endTime - startTime) + 'ms');

  var dict = dicts[0];
  assert.equal(dicts.length, 1);
  assert.equal(dict['Application Version'], "9.2.1");
  assert.deepEqual(Object.keys(dict), [
      'Major Version'
    , 'Minor Version'
    , 'Application Version'
    , 'Features'
    , 'Show Content Ratings'
    , 'Music Folder'
    , 'Library Persistent ID'
    , 'Tracks'
    , 'Playlists'
  ]);

});
