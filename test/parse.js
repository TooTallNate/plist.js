
var assert = require('assert');
var parse = require('../').parse;
var multiline = require('multiline');

describe('plist', function () {

  describe('parse()', function () {

    it('should parse a <string> node into a String', function () {
      var xml = multiline(function () {/*
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple Computer//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<string>gray</string>
</plist>
*/});
      var parsed = parse(xml);
      assert.strictEqual(parsed, 'gray');
    });

    it('should parse an <integer> node into a Number', function () {
      var xml = multiline(function () {/*
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple Computer//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <integer>14</integer>
</plist>
*/});
      var parsed = parse(xml);
      assert.strictEqual(parsed, 14);
    });

    it('should parse a <real> node into a Number', function () {
      var xml = multiline(function () {/*
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple Computer//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <real>3.14</real>
</plist>
*/});
      var parsed = parse(xml);
      assert.strictEqual(parsed, 3.14);
    });

    it('should parse a <date> node into a Date', function () {
      var xml = multiline(function () {/*
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple Computer//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <date>2010-02-08T21:41:23Z</date>
</plist>
*/});
      var parsed = parse(xml);
      assert(parsed instanceof Date);
      assert.strictEqual(parsed.getTime(), 1265665283000);
    });

    it('should parse a <data> node into a Buffer', function () {
      var xml = multiline(function () {/*
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple Computer//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <data>4pyTIMOgIGxhIG1vZGU=</data>
</plist>
*/});
      var parsed = parse(xml);
      assert(Buffer.isBuffer(parsed));
      assert.strictEqual(parsed.toString('utf8'), '✓ à la mode');
    });

    it('should parse a <data> node with newlines into a Buffer', function () {
      var xml = multiline(function () {/*
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple Computer//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <data>4pyTIMOgIGxhIG
  
  
  1vZGU=</data>
</plist>
*/});
      var parsed = parse(xml);
      assert(Buffer.isBuffer(parsed));
      assert.strictEqual(parsed.toString('utf8'), '✓ à la mode');
    });

    it('should parse an example "Cordova.plist" file', function () {
      var xml = multiline(function () {/*
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple Computer//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<!--
#
# Licensed to the Apache Software Foundation (ASF) under one
# or more contributor license agreements.  See the NOTICE file
# distributed with this work for additional information
# regarding copyright ownership.  The ASF licenses this file
# to you under the Apache License, Version 2.0 (the
# "License"); you may not use this file except in compliance
# with the License.  You may obtain a copy of the License at
# 
# http://www.apache.org/licenses/LICENSE-2.0
# 
# Unless required by applicable law or agreed to in writing,
# software distributed under the License is distributed on an
# "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
#  KIND, either express or implied.  See the License for the
# specific language governing permissions and limitations
# under the License.
#
-->
<plist version="1.0">
<dict>
  <key>UIWebViewBounce</key>
  <true/>
  <key>TopActivityIndicator</key>
  <string>gray</string>
  <key>EnableLocation</key>
  <false/>
  <key>EnableViewportScale</key>
  <false/>
  <key>AutoHideSplashScreen</key>
  <true/>
  <key>ShowSplashScreenSpinner</key>
  <true/>
  <key>MediaPlaybackRequiresUserAction</key>
  <false/>
  <key>AllowInlineMediaPlayback</key>
  <false/>
  <key>OpenAllWhitelistURLsInWebView</key>
  <false/>
  <key>BackupWebStorage</key>
  <true/>
  <key>ExternalHosts</key>
  <array>
      <string>*</string>
  </array>
  <key>Plugins</key>
  <dict>
    <key>Device</key>
    <string>CDVDevice</string>
    <key>Logger</key>
    <string>CDVLogger</string>
    <key>Compass</key>
    <string>CDVLocation</string>
    <key>Accelerometer</key>
    <string>CDVAccelerometer</string>
    <key>Camera</key>
    <string>CDVCamera</string>
    <key>NetworkStatus</key>
    <string>CDVConnection</string>
    <key>Contacts</key>
    <string>CDVContacts</string>
    <key>Debug Console</key>
    <string>CDVDebugConsole</string>
    <key>Echo</key>
    <string>CDVEcho</string>
    <key>File</key>
    <string>CDVFile</string>
    <key>FileTransfer</key>
    <string>CDVFileTransfer</string>
    <key>Geolocation</key>
    <string>CDVLocation</string>
    <key>Notification</key>
    <string>CDVNotification</string>
    <key>Media</key>
    <string>CDVSound</string>
    <key>Capture</key>
    <string>CDVCapture</string>
    <key>SplashScreen</key>
    <string>CDVSplashScreen</string>
    <key>Battery</key>
    <string>CDVBattery</string>
  </dict>
</dict>
</plist>
*/});
      var parsed = parse(xml);
      assert.deepEqual(parsed, {
        UIWebViewBounce: true,
        TopActivityIndicator: 'gray',
        EnableLocation: false,
        EnableViewportScale: false,
        AutoHideSplashScreen: true,
        ShowSplashScreenSpinner: true,
        MediaPlaybackRequiresUserAction: false,
        AllowInlineMediaPlayback: false,
        OpenAllWhitelistURLsInWebView: false,
        BackupWebStorage: true,
        ExternalHosts: [ '*' ],
        Plugins: {
          Device: 'CDVDevice',
          Logger: 'CDVLogger',
          Compass: 'CDVLocation',
          Accelerometer: 'CDVAccelerometer',
          Camera: 'CDVCamera',
          NetworkStatus: 'CDVConnection',
          Contacts: 'CDVContacts',
          'Debug Console': 'CDVDebugConsole',
          Echo: 'CDVEcho',
          File: 'CDVFile',
          FileTransfer: 'CDVFileTransfer',
          Geolocation: 'CDVLocation',
          Notification: 'CDVNotification',
          Media: 'CDVSound',
          Capture: 'CDVCapture',
          SplashScreen: 'CDVSplashScreen',
          Battery: 'CDVBattery'
        }
      });
    });

  });

});
