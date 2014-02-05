#!/usr/bin/env node
//
// node-plist command line parser
//
// License: MIT

var fs = require('fs');
var plist = require('../');

function usage() {
  return [
    'Usage: plist [-j] [filename]',
    '',
    'Convert plist->json or json->plist on the command line',
    'passed in as a file or standard input',
    '',
    'Options',
    '  -h   print this message and exit',
    '  -j   convert from plist to json (assumed)',
    '  -p   convert from json to plist',
  ].join('\n');
}

var args = process.argv.slice(2);

// handle arguments
var toJSON = true;
switch (args[0]) {
  case '-h':
    console.log(usage());
    process.exit(0);
  case '-j':
    args.shift();
    break;
  case '-p':
    toJSON = false;
    args.shift();
    break;
}

// default to stdin if no file is specified
if (!args.length)
  args.push('-');

// loop the files given
args.forEach(function(file) {
  if (file === '-')
    file = '/dev/stdin';
  if (toJSON)
    console.log(JSON.stringify(plist.parseFileSync(file), null, 2));
  else
    console.log(plist.build(JSON.parse(fs.readFileSync(file, 'utf-8'))));
});
