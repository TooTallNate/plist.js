var slice = Array.prototype.slice;

// Both "libxmljs" and "node-xml" are supported! However, "libxmljs" is
// highly preferred as it uses native C++ compared to "node-xml" which
// is pure JavaScript and NodeJS.
var xml;
try {
  require.paths.unshift(require("path").join(__dirname, "../vendor/libxmljs/lib"));
  xml = require("libxmljs");
  require.paths.shift();
} catch(ex) {
  try {
    require.paths.unshift(require("path").join(__dirname, "../vendor/node-xml/lib"));
    xml = require("node-xml");
    require.paths.shift();
    console.error("WARNING: 'libxmljs' module not found. Reverting to 'node-xml' (a lot slower!)"+
                  "\n\tFor better performance, try running:"+
                  '\n\t\t"npm install libxmljs"');
  } catch(e) {
    throw "FATAL: Neither 'libxmljs' or 'node-xml' were found! Cannot parse Plist files!";
  }
}

// TODO: Use these somehow?
/*
function(cb) {
  cb.onCdata(function(cdata) {
    console.log('<CDATA>'+cdata+"</CDATA>");
  });
  cb.onComment(function(msg) {
    console.log('<COMMENT>'+msg+"</COMMENT>");
  });
  cb.onWarning(function(msg) {
    console.log('<WARNING>'+msg+"</WARNING>");
  });
  cb.onError(function(msg) {
    console.log('<ERROR>'+JSON.stringify(msg)+"</ERROR>");
  });
}  */

/**
 * plist.parseFile
 * ---------------
 * 
 */
exports.parseFile = function(path, callback) {
    
  var saxParser = new xml.SaxParser(function(handler){
    // 'setTimeout' because this callback function is executed
    // before the constructor returns. However, we need to access
    // 'saxParser' from inside this callback, so we must wait
    // a tiny bit for the constructor to return first (sloppy
    // workaround for a terrible API).
    setTimeout(function() {
      
      // We define a common interface for attaching event handlers
      // since they are swapped constantly throughout parsing.
      if ("m_hndDoc" in saxParser) {
        // Using 'node-xml'. Hopefully this semi-private reference
        // to the event handler object doesn't get removed someday!
        handler = saxParser.m_hndDoc;
      } else {
        // We have to monkey-patch 'libxmljs' since the event-registering
        // mechanism is too complicated, and we can't remove registered
        // listeners once they've been attached (again, terrible API).
        handler.callback = function() {
          var args = slice.call(arguments, 0);
          var name = args.shift();
          name = "on" + name.charAt(0).toUpperCase() + name.substring(1);
          if (handler[name]) {
            handler[name].apply(handler, args);
          }
        };

      }
      handler.onStartElementNS = function(elem) {
        if (elem == "plist") {
          // The PlistParser starts things off...
          PlistParser(handler, callback);
        } else {
          // Not a valid XML Plist file! Should start with <plist>
          // TODO: Throw an error?
        }
      }

      saxParser.parseFile(path);
    }, 10);
  });
  
}



function PlistParser(saxParser, callback) {
  var items = [];
  saxParser.onStartElementNS = function(elem) {
    var parser = getParser(elem);
    if (parser) {
      parser(saxParser, function(err, v) {
        if (err) {
          callback(err);
        }
        items.push(v);
      });
    }
  }
  saxParser.onEndElementNS = function(elem) {
    if (elem == "plist") {
      callback(null, items);
    }
  }
}



function DictParser(saxParser, callback) {
  var dict = {};
  var expectingKey = true;
  var keyValue = false;
  var currentKey;
  
  var parentOnStartElementNS = saxParser.onStartElementNS;
  var parentOnEndElementNS = saxParser.onEndElementNS;
  var parentOnCharacters = saxParser.onCharacters;
  
  saxParser.onStartElementNS = function(elem) {
    if (expectingKey) {
      if (elem == "key") {
        expectingKey = false;
        StringParser(saxParser, function(err, str) {
          if (err) {
            callback(err);
          }
          currentKey = str;
        });
      } else {
        // Malformed Dict! Should be key-value pairs, expecting <key>!
        // TODO: Throw an error?
      }
    } else {
      expectingKey = true;
      var parser = getParser(elem);
      if (parser) {
        parser(saxParser, function(err, v) {
          if (err) {
            callback(err);
          }
          dict[currentKey] = v;
        });
      }
    }
  }
  
  saxParser.onEndElementNS = function(elem) {
    if (elem == "dict") {
      saxParser.onStartElementNS = parentOnStartElementNS;
      saxParser.onEndElementNS = parentOnEndElementNS;
      saxParser.onCharacters = parentOnCharacters;
      callback(null, dict);
    }
  }
  
}



function ArrayParser(saxParser, callback) {
  var array = [];
  
  var parentOnStartElementNS = saxParser.onStartElementNS;
  var parentOnEndElementNS = saxParser.onEndElementNS;
  
  saxParser.onStartElementNS = function(elem) {
    var parser = getParser(elem);
    if (parser) {
      parser(saxParser, function(err, v) {
        if (err) {
          callback(err);
        }
        array.push(v);
      });
    }
  }
  saxParser.onEndElementNS = function(elem) {
    if (elem == "array") {
      saxParser.onStartElementNS = parentOnStartElementNS;
      saxParser.onEndElementNS = parentOnEndElementNS;
      callback(null, array);
    }
  }
}



function StringParser(saxParser, callback) {
  var parentOnCharacters = saxParser.onCharacters;
  saxParser.onCharacters = function(chars) {
    saxParser.onCharacters = parentOnCharacters;
    callback(null, chars.replace(/(\r\n|\r|\n|\t)/g, ""));
  }
}



function IntegerParser(saxParser, callback) {
  StringParser(saxParser, function(err, str) {
    if (err) {
      callback(err);
    }
    callback(null, Number(str));
  });
}

// TODO: Maybe turn into a 'Buffer' instance?
function DataParser(saxParser, callback) {
  StringParser(saxParser, function(err, str) {
    if (err) {
      callback(err);
    }
    callback(null, str);
  });
}

// TODO: Attempt to return a 'Date' instance
function DateParser(saxParser, callback) {
  StringParser(saxParser, function(err, str) {
    if (err) {
      callback(err);
    }
    callback(null, str);
  });
}

function TrueParser(saxParser, callback) {
  callback(null, true);
}

function FalseParser(saxParser, callback) {
  callback(null, false);
}

function getParser(elem) {
  switch(elem) {
    case "array":
      return ArrayParser;
    case "data":
      return DataParser;
    case "date":
      return DateParser;
    case "dict":
      return DictParser;
    case "false":
      return FalseParser;
    case "integer":
      return IntegerParser;
    case "string":
      return StringParser;
    case "true":
      return TrueParser;
    default:
      console.error('"' + elem + '" parser not implemented!');
  }
}
