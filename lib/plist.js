;(function (exports, sax) {
	var inNode = typeof window === 'undefined' ? true : false;
	function Parser() {
		sax.SAXParser.call(this, false, { lowercasetags: true, trim: false });
	}
	var fs = inNode ? require('fs') : {};
	var util = inNode ? require('util') : {
		inherits: function(ctor, superCtor) {
			ctor.super_ = superCtor;
			ctor.prototype = Object.create(superCtor.prototype, {
				constructor: {
					value: ctor,
					enumerable: false,
					writable: true,
					configurable: true
				}
			});
		}
	};
	util.inherits(Parser, sax.SAXParser);
	Parser.prototype.getInteger = function (string) {
		this.value = parseInt(string, 10);
	}
	Parser.prototype.getString = function (string) {
		this.value += string;
	}
	Parser.prototype.getData = function(string) {
		// todo: parse base64 encoded data
		this.value += string;
	}
	Parser.prototype.getDate = function (string) {
		this.value = new Date(string);
	}

	Parser.prototype.addToDict = function (value) {
		this.dict[this.key] = value;
	}
	Parser.prototype.addToArray = function (value) {
		this.array.push(value);
	}

	Parser.prototype.onopentag = function (tag) {
		switch (tag.name) {
			case 'dict':
			this.stack.push(this.context);
			this.context = {
				value: function() {
					return this.dict;
				},
				dict: {},
				setKey: function(key) {
					this.key = key;
				},
				setValue: function(value) {
					this.dict[this.key] = value;
				}
			}
			break;
			case 'plist':
			case 'array':
			this.stack.push(this.context);
			this.context = {
				value: function() {
					return this.array;
				},
				array: [],
				setKey: function(key) {
					console.log('unexpected <key> element in array');
				},
				setValue: function(value) {
					this.array.push(value);
				}
			}
			break;
			case 'key':
			this.ontext = function (text) {
				this.context.setKey(text);
			}
			break;
			case 'integer':
			this.ontext = this.getInteger;
			break;
			case 'string':
			this.value = '';
			this.ontext = this.getString;
			this.oncdata = this.getString;
			break;
			case 'data':
			this.value = '';
			this.ontext = this.getData;
			this.oncdata = this.getData;
			break;
			case 'true':
			this.value = true;
			break;
			case 'false':
			this.value = false;
			break;
			case 'date':
			this.ontext = this.getDate;
			break;
			default:
			console.log('ignored tag', tag.name);
			break;
		}
	}
	Parser.prototype.onclosetag = function (tag) {
		var value;
		switch (tag) {
			case 'dict':
			case 'array':
			case 'plist':
			var value = this.context.value();
			this.context = this.stack.pop();
			this.context.setValue(value);
			break;
			case 'true':
			case 'false':
			case 'string':
			case 'integer':
			case 'date':
			case 'data':
			this.context.setValue(this.value);
			break;
			case 'key':
			break;
			default:
			console.log('closing', tag, 'tag ignored');
		}
		this.oncdata = this.ontext = this.checkWhitespace;
	}
	Parser.prototype.checkWhitespace = function (data) {
		if (!data.match(/^[ \t\r\n]*$/)) {
			console.log('unexpected non-whitespace data', data);
		}
	}
	Parser.prototype.oncomment = function (comment) {
	}
	Parser.prototype.onerror = function (error) {
		console.log('sax parser error:', error);
		throw error;
	}

	if (inNode) Parser.prototype.parseFile = function (xmlfile, callback) {
		var parser = this;
		parser.stack = [ ];
		parser.context = {
			callback: callback,
			value: function() {},
			setKey: function(key) {},
			setValue: function(value) {
				callback(null, value);
			},
		}
		var rs = fs.createReadStream(xmlfile, {
			encoding: 'utf8'
		});
		rs.on('data', function(data) { parser.write(data); });
		rs.on('end', function() { parser.close(); });
	}

	Parser.prototype.parseString = function (xml, callback) {
		var parser = this;
		parser.stack = [ ];
		parser.context = {
			callback: callback,
			value: function() {},
			setKey: function(key) {},
			setValue: function(value) {
				this.callback(null, value);
			},
		};
		parser.write(xml);
		parser.close();
	}

	exports.Parser = Parser;

	exports.parseString = function (xml, callback) {
		var parser = new Parser();
		parser.parseString(xml, callback);
	}

	if (inNode) exports.parseFile = function (filename, callback) {
		var parser = new Parser();
		parser.parseFile(filename, callback);
	}
})(typeof exports === 'undefined' ? plist = {} : exports, typeof window === "undefined" ? require('sax') : sax) // TODO: Implement detection of 'sax' in the Browser environment
