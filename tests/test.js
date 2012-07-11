var path = require("path");
var fs = require("fs");
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

  testBuildIdentity(dict, file);
  testBuildAgainstFile(dict, file);
  
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
  
  // TODO These following 2 tests fails because CDATA entities get converted in the process 
  //testBuildIdentity(dict);
  //testBuildAgainstFile(dict, file2);
  
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
  
  testBuildIdentity(dict);
  // TODO The following test fails because float rounding 
  //testBuildAgainstFile(dict, file3);

});

function flattenXMLForAssert(instr) {
    return instr.replace(/\s/g,'');
}

// Builder test A - build plist from JS object, then re-parse plist and compare both JS objects 
function testBuildIdentity(dict, tag) {
    var build = plist.build(dict);    
    plist.parseString(build.toString(), function(err, dicts2) {	
        assert.deepEqual(dict,dicts2[0]);
        console.log('Tested deepEqual plist.parseString(plist.build(...)) against '+tag+' data.');    
    });
}

// Builder test B - build plist from JS object, then compare flattened XML against original plist *file* content 
function testBuildAgainstFile(dict, infile) {
    var doc = plist.build(dict);
    var fileContent = fs.readFileSync(infile);

    var s1 = flattenXMLForAssert(doc.toString());
    var s2 = flattenXMLForAssert(fileContent.toString());

    for (var i=0;i<s1.length; i++) {
        if (s1[i]!==s2[i]) {
            console.log(infile+" Mismatch at char "+i);
            break;
        }
    }
    assert.equal(s1,s2);
    console.log('Built plist from parsed "' + infile + '" and revalidated against original file.');    
}
