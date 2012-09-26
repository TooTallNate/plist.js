var path = require('path')
  , fs = require('fs')
  , plist = require('../');
 
/*
// TODO These assertions fail because CDATA entities get converted in the process
exports.testBuildFromPlistFile = function(test) {
  var file = path.join(__dirname, 'sample2.plist');

  plist.parseFile(file, function(err, dicts) {
    var dict = dicts[0];
    test.ifError(err);

    testBuildIdentity(test, dict, file, function(){
      testBuildAgainstFile(test, dict, file);
      test.done();
    });

    test.done();
  });
}
*/

exports.testBuildFromSmallItunesXML = function(test) {
  var file = path.join(__dirname, 'iTunes-small.xml');
  plist.parseFile(file, function(err, dicts) {
    var dict = dicts[0];

    test.ifError(err);

    testBuildIdentity(test, dict, file, function(){
      testBuildAgainstFile(test, dict, file);
      test.done();
    });
  });
}

/*
// TODO The following test fails because float rounding 
exports.testBuildAirplayXML = function(test) {
  var file = path.join(__dirname, 'airplay.xml');

  plist.parseFile(file, function(err, dicts) {
    var dict;
    test.ifError(err);
    dict = dicts[0];
    
    testBuildIdentity(test, dict, file, function(){
      testBuildAgainstFile(test, dict, file);
      test.done();
    });

    test.done();
  });
}
*/

/*
// TODO: finish this test
exports.testBuildPhoneGapPlist = function(test) {
  var file = path.join(__dirname, 'Xcode-PhoneGap.plist');

  plist.parseFile(file, function(err, dicts) {
    var build = plist.build(dicts);
    test.done();
  });
}
*/

// Builder test A - build plist from JS object, then re-parse plist and compare both JS objects 
function testBuildIdentity(test, dict, infile, callback) {
    var build = plist.build(dict);    
    plist.parseString(build.toString(), function(err, dicts2) { 
        test.deepEqual(dict,dicts2[0]);
        callback();
    });
}

function flattenXMLForAssert(instr) {
    return instr.replace(/\s/g,'');
}

// Builder test B - build plist from JS object, then compare flattened XML against original plist *file* content 
function testBuildAgainstFile(test, dict, infile) {
    var doc = plist.build(dict)
      , fileContent = fs.readFileSync(infile)
      , s1 = flattenXMLForAssert(doc.toString())
      , s2 = flattenXMLForAssert(fileContent.toString())
      , mismatch = '';

    for (var i=0;i<s1.length; i++) {
        if (s1[i]!==s2[i]) {
            mismatch = '" at char '+ i;
            break;
        }
    }
  
    test.equal(s1, s2, 'file mismatch in "' + infile + mismatch);
}
