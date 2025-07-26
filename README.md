# JWT Decoder

JWT Decoder is a Chrome extension which makes it easy to inspect the content of
any JWT bearer token sent by a webapp.

The extension adds a new **JWT** tab in Chrome's Developer Tools.
When the tab is open, the extension inspects all server requests and picks out
the token from any request which has an `Authorization` header containing a JWT
bearer token.

# Development

Running `build.sh` packages the extension for upload to the chrome web store.
Don't forget to change the version number in `manifest.json` before creating the package.

Cursor image made by Pixel perfect
