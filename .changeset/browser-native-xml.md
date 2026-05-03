---
"plist": minor
---

Add browser-native implementations using `DOMParser` and `XMLSerializer` for parsing, and native DOM APIs for building XML. Bundlers that support the `"browser"` export condition (Vite, webpack, esbuild) will automatically use these lighter implementations, dramatically reducing bundle size by eliminating the `@xmldom/xmldom` and `xmlbuilder` dependencies.
