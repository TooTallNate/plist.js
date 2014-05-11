
var fs = require('fs');
var assert = require('assert');
var parse = require('../').parse;
var resolve = require('path').resolve;

describe('plist', function () {

  describe('parse()', function () {

    it('should parse "Cordova.plist"', function () {
      var file = resolve(__dirname, 'fixtures', 'Cordova.plist');
      var xml = fs.readFileSync(file, 'utf8');
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
