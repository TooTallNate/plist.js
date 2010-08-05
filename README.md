node-plist
==========

This library contains a parser for Mac OS X Plist (property list) files. These
are often used in programming OS X and iOS applications, as well as the iTunes
configuration XML file.

Plist files represent stored programming "object"s. This makes them very similar
in nature to a JSON file. A valid Plist file should be directly representable as
a native JavaScript Object.

Usage
-----

    var plist = require("plist");
    
    plist.parseFile("myPlist.plist", function(err, obj) {
      if (err) {
        throw err;
      }
    
      console.log(JSON.stringify(obj));
    });
