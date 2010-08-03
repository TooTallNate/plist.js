var sys     = require("sys");
var xml     = require("../vendor/node-xml/lib/node-xml");

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
    
  var saxParser = new xml.SaxParser(function(){});
  saxParser.m_hndDoc.onStartElementNS = function(elem) {
    if (elem == "plist") {
      PlistParser(saxParser.m_hndDoc, callback);
    } else {
      // Not a valid XML Plist file?
    }
  }
  
  saxParser.parseFile(path);
}



function PlistParser(saxParser, callback) {
  var dicts = [];
  saxParser.onStartElementNS = function(elem) {
    if (elem == "dict") {
      DictParser(saxParser, function(err, dict) {
        if (err) {
          throw err;
        }
        dicts.push(dict);
      });
    } else {
    }
  }
  saxParser.onEndElementNS = function(elem) {
    if (elem == "plist") {
      callback(null, dicts);
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
        keyValue = true;
      } else {
        
      }
    } else {
      expectingKey = true;
      var parser;
      switch(elem) {
        case "array":
          parser = ArrayParser;
          break;
        case "data":
          parser = DataParser;
          break;
        case "date":
          parser = DateParser;
          break;
        case "dict":
          parser = DictParser;
          break;
        case "false":
          parser = FalseParser;
          break;
        case "integer":
          parser = IntegerParser;
          break;
        case "string":
          parser = StringParser;
          break;
        case "true":
          parser = TrueParser;
          break;
        default:
          sys.error(elem + " parser not implemented!");
          break;
      }
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
  
  saxParser.onCharacters = function(chars) {
    if (keyValue) {
      currentKey = chars;
      keyValue = false;
    }
  }
  
}



function ArrayParser(saxParser, callback) {
  var array = [];
  
  var parentOnStartElementNS = saxParser.onStartElementNS;
  var parentOnEndElementNS = saxParser.onEndElementNS;
  
  saxParser.onStartElementNS = function(elem) {
    var parser;
    switch(elem) {
      case "array":
        parser = ArrayParser;
        break;
      case "data":
        parser = DataParser;
        break;
      case "date":
        parser = DateParser;
        break;
      case "dict":
        parser = DictParser;
        break;
      case "false":
        parser = FalseParser;
        break;
      case "integer":
        parser = IntegerParser;
        break;
      case "string":
        parser = StringParser;
        break;
      case "true":
        parser = TrueParser;
        break;
      default:
        sys.error(elem + " parser not implemented!");
        break;
    }
    if (parser) {
      parser(saxParser, function(err, v) {
        if (err) {
          throw err;
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

