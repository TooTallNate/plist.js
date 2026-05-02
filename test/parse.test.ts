import { describe, it, expect } from 'vitest';
import { parse } from '../src/index.js';

function parseFixture(string: string) {
  const intro = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple Computer//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">`;

  return parse(intro + string + '</plist>');
}

describe('parse()', () => {

  describe('null', () => {
    it('should parse a <null> node into a null value', () => {
      const parsed = parseFixture('<null/>');
      expect(parsed).toBe(null);
    });
  });

  describe('boolean', () => {
    it('should parse a <true> node into a Boolean `true` value', () => {
      const parsed = parseFixture('<true/>');
      expect(parsed).toBe(true);
    });

    it('should parse a <false> node into a Boolean `false` value', () => {
      const parsed = parseFixture('<false/>');
      expect(parsed).toBe(false);
    });
  });

  describe('integer', () => {
    it('should throw an Error when parsing an empty integer', () => {
      expect(() => parseFixture('<integer/>')).toThrow();
    });

    it('should parse an <integer> node into a Number', () => {
      const parsed = parseFixture('<integer>14</integer>');
      expect(parsed).toBe(14);
    });
  });

  describe('real', () => {
    it('should throw an Error when parsing an empty real', () => {
      expect(() => parseFixture('<real/>')).toThrow();
    });

    it('should parse a <real> node into a Number', () => {
      const parsed = parseFixture('<real>3.14</real>');
      expect(parsed).toBe(3.14);
    });
  });

  describe('string', () => {
    it('should parse a self closing string', () => {
      const parsed = parseFixture('<string/>');
      expect(parsed).toBe('');
    });

    it('should parse an empty string', () => {
      const parsed = parseFixture('<string></string>');
      expect(parsed).toBe('');
    });

    it('should parse the string contents', () => {
      const parsed = parseFixture('<string>test</string>');
      expect(parsed).toBe('test');
    });

    it('should parse a string with comments', () => {
      const parsed = parseFixture('<string>a<!-- comment --> string</string>');
      expect(parsed).toBe('a string');
    });
  });

  describe('data', () => {
    it('should parse an empty data tag into an empty Uint8Array', () => {
      const parsed = parseFixture('<data/>');
      expect(parsed).toBeInstanceOf(Uint8Array);
      expect(new TextDecoder().decode(parsed as Uint8Array)).toBe('');
    });

    it('should parse a <data> node into a Uint8Array', () => {
      const parsed = parseFixture('<data>4pyTIMOgIGxhIG1vZGU=</data>');
      expect(parsed).toBeInstanceOf(Uint8Array);
      expect(new TextDecoder().decode(parsed as Uint8Array)).toBe('\u2713 \u00e0 la mode');
    });

    it('should parse a <data> node with newlines into a Uint8Array', () => {
      const xml = `<data>4pyTIMOgIGxhIG
1v
ZG
U=</data>
`;
      const parsed = parseFixture(xml);
      expect(parsed).toBeInstanceOf(Uint8Array);
      expect(new TextDecoder().decode(parsed as Uint8Array)).toBe('\u2713 \u00e0 la mode');
    });
  });

  describe('date', () => {
    it('should throw an error when parsing an empty date', () => {
      expect(() => parseFixture('<date/>')).toThrow();
    });

    it('should parse a <date> node into a Date', () => {
      const parsed = parseFixture('<date>2010-02-08T21:41:23Z</date>');
      expect(parsed).toBeInstanceOf(Date);
      expect((parsed as Date).getTime()).toBe(1265665283000);
    });
  });

  describe('array', () => {
    it('should parse an empty array', () => {
      const parsed = parseFixture('<array/>');
      expect(parsed).toEqual([]);
    });

    it('should parse an array with one element', () => {
      const parsed = parseFixture('<array><true/></array>');
      expect(parsed).toEqual([true]);
    });

    it('should parse an array with multiple elements', () => {
      const parsed = parseFixture(
        '<array><string>1</string><string>2</string></array>'
      );
      expect(parsed).toEqual(['1', '2']);
    });

    it('should parse empty elements inside an array', () => {
      const parsed = parseFixture('<array><string/><false/></array>');
      expect(parsed).toEqual(['', false]);
    });
  });

  describe('dict', () => {
    it('should throw if key is missing', () => {
      expect(() => parseFixture('<dict><string>x</string></dict>')).toThrow();
    });

    it('should throw if two keys follow each other', () => {
      expect(() => parseFixture('<dict><key>a</key><key>b</key></dict>')).toThrow();
    });

    it('should parse to empty string if value is missing', () => {
      const parsed = parseFixture('<dict><key>a</key></dict>');
      expect(parsed).toEqual({ 'a': '' });
    });

    it('should parse an empty key', () => {
      const parsed = parseFixture('<dict><key/><string>1</string></dict>');
      expect(parsed).toEqual({ '': '1' });
    });

    it('should parse empty <key /> and <string /> tags mixed with real entries (#66)', () => {
      const parsed = parseFixture(
        '<dict><key /><string /><key>foo</key><string>bar</string></dict>'
      );
      expect(parsed).toEqual({ '': '', foo: 'bar' });
    });

    it('should parse an empty value', () => {
      const parsed = parseFixture('<dict><key>a</key><string/></dict>');
      expect(parsed).toEqual({ 'a': '' });
    });

    it('should parse multiple key/value pairs', () => {
      const parsed = parseFixture(
        '<dict><key>a</key><true/><key>b</key><false/></dict>'
      );
      expect(parsed).toEqual({ a: true, b: false });
    });

    it('should parse nested data structures', () => {
      const parsed = parseFixture(
        '<dict><key>a</key><dict><key>a1</key><true/></dict></dict>'
      );
      expect(parsed).toEqual({ a: { a1: true } });
    });

    /* Test to protect against CVE-2022-22912 */
    it('should throw if key value is __proto__', () => {
      expect(() => {
        parseFixture('<dict><key>__proto__</key><dict><key>length</key><string>polluted</string></dict></dict>');
      }).toThrow();

      // keys with backslashes aren't literally "__proto__" so should parse fine
      const parsed = parseFixture('<dict><key>_\\_proto_\\_</key><dict><key>length</key><string>polluted</string></dict></dict>');
      expect(parsed).toEqual({ '_\\_proto_\\_': { length: 'polluted' } });
    });
  });

  describe('integration', () => {
    it('should parse a plist file with XML comments', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>CFBundleName</key>
    <string>Emacs</string>

    <key>CFBundlePackageType</key>
    <string>APPL</string>

    <!-- This should be the emacs version number. -->

    <key>CFBundleShortVersionString</key>
    <string>24.3</string>

    <key>CFBundleSignature</key>
    <string>EMAx</string>

    <!-- This SHOULD be a build number. -->

    <key>CFBundleVersion</key>
    <string>9.0</string>
  </dict>
</plist>
`;
      const parsed = parse(xml);
      expect(parsed).toEqual({
        CFBundleName: 'Emacs',
        CFBundlePackageType: 'APPL',
        CFBundleShortVersionString: '24.3',
        CFBundleSignature: 'EMAx',
        CFBundleVersion: '9.0'
      });
    });

    it('should parse a plist file with CDATA content', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>OptionsLabel</key>
	<string>Product</string>
	<key>PopupMenu</key>
	<array>
		<dict>
			<key>Key</key>
			<string>iPhone</string>
			<key>Title</key>
			<string>iPhone</string>
		</dict>
		<dict>
			<key>Key</key>
			<string>iPad</string>
			<key>Title</key>
			<string>iPad</string>
		</dict>
		<dict>
			<key>Key</key>
      <string>
        <![CDATA[
        #import &lt;Cocoa/Cocoa.h&gt;

#import &lt;MacRuby/MacRuby.h&gt;

int main(int argc, char *argv[])
{
  return macruby_main("rb_main.rb", argc, argv);
}
]]>
</string>
		</dict>
	</array>
	<key>TemplateSelection</key>
	<dict>
		<key>iPhone</key>
		<string>Tab Bar iPhone Application</string>
		<key>iPad</key>
		<string>Tab Bar iPad Application</string>
	</dict>
</dict>
</plist>
`;
      const parsed = parse(xml);
      expect(parsed).toEqual({ OptionsLabel: 'Product',
        PopupMenu:
         [ { Key: 'iPhone', Title: 'iPhone' },
           { Key: 'iPad', Title: 'iPad' },
           { Key: '\n        \n        #import &lt;Cocoa/Cocoa.h&gt;\n\n#import &lt;MacRuby/MacRuby.h&gt;\n\nint main(int argc, char *argv[])\n{\n  return macruby_main("rb_main.rb", argc, argv);\n}\n\n' } ],
        TemplateSelection:
         { iPhone: 'Tab Bar iPhone Application',
           iPad: 'Tab Bar iPad Application' }
      });
    });

    it('should parse an example "Cordova.plist" file', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple Computer//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
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
`;
      const parsed = parse(xml);
      expect(parsed).toEqual({
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

    it('should parse an example "Xcode-Info.plist" file', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>CFBundleDevelopmentRegion</key>
	<string>en</string>
	<key>CFBundleDisplayName</key>
	<string>\${PRODUCT_NAME}</string>
	<key>CFBundleExecutable</key>
	<string>\${EXECUTABLE_NAME}</string>
	<key>CFBundleIconFiles</key>
	<array/>
	<key>CFBundleIdentifier</key>
	<string>com.joshfire.ads</string>
	<key>CFBundleInfoDictionaryVersion</key>
	<string>6.0</string>
	<key>CFBundleName</key>
	<string>\${PRODUCT_NAME}</string>
	<key>CFBundlePackageType</key>
	<string>APPL</string>
	<key>CFBundleShortVersionString</key>
	<string>1.0</string>
	<key>CFBundleSignature</key>
	<string>????</string>
	<key>CFBundleVersion</key>
	<string>1.0</string>
	<key>LSRequiresIPhoneOS</key>
	<true/>
	<key>UIRequiredDeviceCapabilities</key>
	<array>
		<string>armv7</string>
	</array>
	<key>UISupportedInterfaceOrientations</key>
	<array>
		<string>UIInterfaceOrientationPortrait</string>
		<string>UIInterfaceOrientationLandscapeLeft</string>
		<string>UIInterfaceOrientationLandscapeRight</string>
	</array>
	<key>UISupportedInterfaceOrientations~ipad</key>
	<array>
		<string>UIInterfaceOrientationPortrait</string>
		<string>UIInterfaceOrientationPortraitUpsideDown</string>
		<string>UIInterfaceOrientationLandscapeLeft</string>
		<string>UIInterfaceOrientationLandscapeRight</string>
	</array>
	<key>CFBundleAllowMixedLocalizations</key>
	<true/>
</dict>
</plist>
`;
      const parsed = parse(xml);
      expect(parsed).toEqual({
        CFBundleDevelopmentRegion: 'en',
        CFBundleDisplayName: '${PRODUCT_NAME}',
        CFBundleExecutable: '${EXECUTABLE_NAME}',
        CFBundleIconFiles: [],
        CFBundleIdentifier: 'com.joshfire.ads',
        CFBundleInfoDictionaryVersion: '6.0',
        CFBundleName: '${PRODUCT_NAME}',
        CFBundlePackageType: 'APPL',
        CFBundleShortVersionString: '1.0',
        CFBundleSignature: '????',
        CFBundleVersion: '1.0',
        LSRequiresIPhoneOS: true,
        UIRequiredDeviceCapabilities: [ 'armv7' ],
        UISupportedInterfaceOrientations:
         [ 'UIInterfaceOrientationPortrait',
           'UIInterfaceOrientationLandscapeLeft',
           'UIInterfaceOrientationLandscapeRight' ],
        'UISupportedInterfaceOrientations~ipad':
         [ 'UIInterfaceOrientationPortrait',
           'UIInterfaceOrientationPortraitUpsideDown',
           'UIInterfaceOrientationLandscapeLeft',
           'UIInterfaceOrientationLandscapeRight' ],
        CFBundleAllowMixedLocalizations: true
      });
    });
  });

  describe('invalid formats', () => {
    it('should fail parsing invalid xml plist', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>test</key>
  <strong>Testing</strong>
  <key>bar</key>
  <string></string>
</dict>
</plist>
`;
      expect(() => parse(xml)).toThrow();
    });

    it('ensure empty strings arent valid plist', () => {
      expect(() => parse('')).toThrow();
    });

    it('should throw a descriptive error for binary plist input', () => {
      expect(() => parse('bplist00\x00')).toThrow(
        /Binary plist detected/,
      );
    });

    it('should throw a useful error for completely invalid XML', () => {
      expect(() => parse('this is not xml at all')).toThrow();
    });
  });
});
