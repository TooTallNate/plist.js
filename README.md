# node-plist

Provides facilities for reading and writing Mac OS X Plist (property list) files. These are often used in programming OS X and iOS applications, as well as the iTunes
configuration XML file.

Plist files represent stored programming "object"s. They are very similar
to JSON. A valid Plist file is representable as a native JavaScript Object and vice-versa.

## Tests
`npm test`

## Usage
Parsing a plist from filename
``` javascript
var plist = require('plist');

var obj = plist.parseFileSync('myPlist.plist');
console.log(JSON.stringify(obj));
```

Parsing a plist from string payload
``` javascript
var plist = require('plist');

var obj = plist.parseStringSync('<plist><string>Hello World!</string></plist>');
console.log(obj);  // Hello World!
```

Given an existing JavaScript Object, you can turn it into an XML document that complies with the plist DTD

``` javascript
var plist = require('plist');

console.log(plist.build({'foo' : 'bar'}).toString());
```

## Command Line

This package also comes bundled with a command line utility called `plist`.  Pass filenames as arguments
or have it read from standard input

```
$ plist tests/utf8data.xml
{
  "Smart Info": "✓ à la mode",
  "Newlines": "✓ à la mode"
}
$ cat tests/utf8data.xml | plist
{
  "Smart Info": "✓ à la mode",
  "Newlines": "✓ à la mode"
}
```

Supply a `-p` argument to convert from JSON to plist format and go full circle (plist->json->plist)

```
$ cat tests/utf8data.xml | plist | plist -p
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple Computer//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>Smart Info</key>
    <string>✓ à la mode</string>
    <key>Newlines</key>
    <string>✓ à la mode</string>
  </dict>
</plist>
```

### Usage

```
$ plist -h
Usage: plist [-j] [filename]

Convert plist->json or json->plist on the command line
passed in as a file or standard input

Options
  -h   print this message and exit
  -j   convert from plist to json (assumed)
  -p   convert from json to plist
```

## Deprecated methods
These functions work, but may be removed in a future release. version 0.4.x added Sync versions of these functions.

Parsing a plist from filename
``` javascript
var plist = require('plist');

plist.parseFile('myPlist.plist', function(err, obj) {
  if (err) throw err;

  console.log(JSON.stringify(obj));
});
```

Parsing a plist from string payload
``` javascript
var plist = require('plist');

plist.parseString('<plist><string>Hello World!</string></plist>', function(err, obj) {
  if (err) throw err;

  console.log(obj[0]);  // Hello World!
});
```
