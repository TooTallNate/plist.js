plist.js
========
### Apple's Property list parser/builder for Node.js and browsers

[![ci](https://github.com/TooTallNate/plist.js/actions/workflows/ci.yml/badge.svg)](https://github.com/TooTallNate/plist.js/actions/workflows/ci.yml)

Provides facilities for reading and writing Plist (property list) files.
These are often used in programming OS X and iOS applications, as well
as the iTunes configuration XML file.

Plist files represent stored programming "object"s. They are very similar
to JSON. A valid Plist file is representable as a native JavaScript Object
and vice-versa.


## Usage

### Node.js

Install using `npm`:

``` bash
$ npm install plist
```

Then import the `parse()` and `build()` functions:

``` js
import { parse, build } from 'plist';

const val = parse('<plist><string>Hello World!</string></plist>');
console.log(val);  // "Hello World!"
```


### Browser

Use an [import map](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script/type/importmap)
to resolve the bare module specifiers used by plist and its dependencies,
then import directly from the source:

``` html
<script type="importmap">
  {
    "imports": {
      "@xmldom/xmldom": "https://esm.sh/@xmldom/xmldom",
      "xmlbuilder": "https://esm.sh/xmlbuilder"
    }
  }
</script>
<script type="module">
  import { parse, build } from './node_modules/plist/index.js';

  const val = parse('<plist><string>Hello World!</string></plist>');
  console.log(val);  // "Hello World!"
</script>
```

See the [browser example](./examples/browser/) for a drag-and-drop demo.


## API

### Parsing

Parsing a plist from filename:

``` js
import { readFileSync } from 'node:fs';
import { parse } from 'plist';

const obj = parse(readFileSync('myPlist.plist', 'utf8'));
console.log(JSON.stringify(obj));
```

Parsing a plist from string payload:

``` js
import { parse } from 'plist';

const xml =
  '<?xml version="1.0" encoding="UTF-8"?>' +
  '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">' +
  '<plist version="1.0">' +
    '<key>metadata</key>' +
    '<dict>' +
      '<key>bundle-identifier</key>' +
      '<string>com.company.app</string>' +
      '<key>bundle-version</key>' +
      '<string>0.1.1</string>' +
      '<key>kind</key>' +
      '<string>software</string>' +
      '<key>title</key>' +
      '<string>AppName</string>' +
    '</dict>' +
  '</plist>';

console.log(parse(xml));

// [
//   "metadata",
//   {
//     "bundle-identifier": "com.company.app",
//     "bundle-version": "0.1.1",
//     "kind": "software",
//     "title": "AppName"
//   }
// ]
```

### Building

Given an existing JavaScript Object, you can turn it into an XML document
that complies with the plist DTD:

``` js
import { build } from 'plist';

const obj = [
  "metadata",
  {
    "bundle-identifier": "com.company.app",
    "bundle-version": "0.1.1",
    "kind": "software",
    "title": "AppName"
  }
];

console.log(build(obj));

// <?xml version="1.0" encoding="UTF-8"?>
// <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
// <plist version="1.0">
//   <key>metadata</key>
//   <dict>
//     <key>bundle-identifier</key>
//     <string>com.company.app</string>
//     <key>bundle-version</key>
//     <string>0.1.1</string>
//     <key>kind</key>
//     <string>software</string>
//     <key>title</key>
//     <string>AppName</string>
//   </dict>
// </plist>
```


## License

[(The MIT License)](LICENSE)
