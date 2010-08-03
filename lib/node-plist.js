var sys     = require("sys");
//var xml     = require("../vendor/node-xml/lib/node-xml");
var xml = require("libxmljs");

/*
function(cb) {
  cb.onCdata(function(cdata) {
    sys.puts('<CDATA>'+cdata+"</CDATA>");
  });
  cb.onComment(function(msg) {
    sys.puts('<COMMENT>'+msg+"</COMMENT>");
  });
  cb.onWarning(function(msg) {
    sys.puts('<WARNING>'+msg+"</WARNING>");
  });
  cb.onError(function(msg) {
    sys.puts('<ERROR>'+JSON.stringify(msg)+"</ERROR>");
  });
}  */

exports.parseFile = function(path, callback) {
    
  var saxParser = new xml.SaxParser(function(handler){
    setTimeout(function() {
      if ("m_hndDoc" in saxParser) { // Using 'node-xml'
        handler = saxParser.m_hndDoc;
      } else { // Using 'libxmljs'

        // We have to monkey-patch 'libxmljs' since the event-registering
        // mechanism is too complicated, and we can't remove registered
        // listeners once they've been attached.
        handler.callback = function() {
          var args = Array.prototype.slice.call(arguments, 0);
          var name = args.shift();
          name = "on" + name.charAt(0).toUpperCase() + name.substring(1);
          if (handler[name]) {
            handler[name].apply(handler, args);
          }
        };

      }
      handler.onStartElementNS = function(elem) {
        if (elem == "plist") {
          PlistParser(handler, callback);
        } else {
          // Not a valid XML Plist file?
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
        // Malformed Dict?!
      }
    } else {
      expectingKey = true;
      var parser = getParser(elem);
      if (parser) {
        parser(saxParser, function(err, v) {
          if (err) {
            throw err;
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
      //sys.puts("DictParser:\t"+JSON.stringify(dict));
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
      //sys.puts("ArrayParser:\t"+JSON.stringify(array));
      callback(null, array);
    }
  }
}



function StringParser(saxParser, callback) {
  var parentOnCharacters = saxParser.onCharacters;
  saxParser.onCharacters = function(chars) {
    saxParser.onCharacters = parentOnCharacters;
    //sys.puts("StringParser:\t"+JSON.stringify(chars));
    callback(null, chars);
  }
}



function IntegerParser(saxParser, callback) {
  StringParser(saxParser, function(err, str) {
    if (err) {
      throw err;
    }
    callback(null, Number(str));
  });
}

// TODO: Maybe turn into a 'Buffer' instance?
function DataParser(saxParser, callback) {
  StringParser(saxParser, function(err, str) {
    if (err) {
      throw err;
    }
    callback(null, str);
  });
}

// TODO: Attempt to return a 'Date' instance
function DateParser(saxParser, callback) {
  StringParser(saxParser, function(err, str) {
    if (err) {
      throw err;
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
      sys.error(elem + " parser not implemented!");
  }
}
