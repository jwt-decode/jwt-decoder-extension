# JWT Decoder Extension - Manual Test Cases

## Scope
Manual QA for:
- Network token capture from request headers
- JWT decoding in DevTools panel
- Configurable header name and prefix
- Clipboard copy actions
- Manual token input/paste flow
- Options persistence and runtime updates

## Test Setup
1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked** and select this folder.
4. Open any site in a tab (for example `https://example.com`).
5. Open DevTools for that tab and switch to **JWT Decoder** panel.
6. Keep Console open in the page context to run request snippets below.

## Test Data
Use these tokens:

- `VALID_JWT`
`eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMiLCJuYW1lIjoiSm9obiBEb2UiLCJpYXQiOjE3MDAwMDAwMDAsImV4cCI6MjAwMDAwMDAwMH0.sig`

- `VALID_JWT_WITH_BASE64URL_DASH`
`eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjcnZtcHE3NzEiLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3MDAwMDAwMDAsImV4cCI6MjAwMDAwMDAwMCwiZXh0cmEiOiJ-IUAjJCVeJiooKV8rLT0ifQ.sig`

- `INVALID_TWO_PARTS`
`abc.def`

- `INVALID_NOT_JSON_BUT_3_PARTS`
`YWJj.ZGVm.sig`

## Request Snippets (run in page console)

Run once first:
```js
const VALID_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMiLCJuYW1lIjoiSm9obiBEb2UiLCJpYXQiOjE3MDAwMDAwMDAsImV4cCI6MjAwMDAwMDAwMH0.sig';
```

- Default header/prefix:
```js
fetch('/jwt-test-' + Date.now(), {
  headers: { Authorization: 'Bearer ' + VALID_JWT }
}).catch(() => {});
```

- Custom header and prefix:
```js
fetch('/jwt-test-' + Date.now(), {
  headers: { 'X-Auth-Token': 'JWT ' + VALID_JWT }
}).catch(() => {});
```

- No prefix:
```js
fetch('/jwt-test-' + Date.now(), {
  headers: { Authorization: VALID_JWT }
}).catch(() => {});
```

## Test Cases

### A. Panel Initialization

1. **A-01 Panel appears in DevTools**
- Steps: Open DevTools.
- Expected: `JWT Decoder` tab is present and clickable.

2. **A-02 Initial waiting state**
- Steps: Open JWT Decoder panel before any token request.
- Expected: Waiting card is visible, request info card is hidden, copy/clear buttons are disabled.

3. **A-03 Open settings from panel**
- Steps: Click `extension options` link in waiting card.
- Expected: Extension options page opens.

4. **A-04 Popup behavior**
- Steps: Click extension toolbar icon.
- Expected: A new tab opens with project homepage URL.

### B. Automatic Capture and Decode

5. **B-01 Capture with default `Authorization: Bearer`**
- Preconditions: Options are defaults (`Authorization`, `Bearer`, copy prefix off, allow empty prefix off).
- Steps: Send request with default snippet.
- Expected: Token input is filled, input turns green, decoded header/payload are displayed, request URL/time are shown.

6. **B-02 Header name is case-insensitive**
- Steps: Send request with header key `authorization` (lowercase), same token.
- Expected: Token is captured and decoded.

7. **B-03 Prefix mismatch should not capture**
- Preconditions: Default options.
- Steps: Send request with `Authorization: Token <VALID_JWT>`.
- Expected: No new decode result appears.

8. **B-04 No-prefix token blocked when `allow_empty_prefix=false`**
- Preconditions: Default options.
- Steps: Send no-prefix snippet.
- Expected: No capture.

9. **B-05 No-prefix token accepted when `allow_empty_prefix=true`**
- Preconditions: Enable `Allow tokens without prefix` and save.
- Steps: Send no-prefix snippet.
- Expected: Token is captured and decoded.

10. **B-06 Long request URL truncation/expand**
- Steps: Send request to a very long path (`'/jwt-test-' + 'a'.repeat(120)`), then click `...` expander.
- Expected: URL is initially truncated; click expands to full URL; click again collapses.

11. **B-07 Invalid JWT from request**
- Steps: Send request with `Authorization: Bearer INVALID_TWO_PARTS`.
- Expected: Input turns red, decode sections are cleared, clean button is enabled.

12. **B-08 Last matching request wins**
- Steps: Send two requests quickly with different valid tokens.
- Expected: Panel displays data from the most recently processed matching request.

### C. Options and Configuration

13. **C-01 Save options persists values**
- Steps: In options page set header to `X-Auth-Token`, prefix `JWT`, save, close/reopen options.
- Expected: Saved values are restored.

14. **C-02 Reset restores defaults**
- Steps: Change values, click reset.
- Expected: Values become `Authorization`, `Bearer`, copy prefix unchecked, allow empty prefix unchecked.

15. **C-03 Runtime options update without reopening panel**
- Steps: Keep panel open, change options in options page, save.
- Expected: Waiting message updates to new header/prefix immediately.

16. **C-04 Custom header/prefix capture**
- Preconditions: Header=`X-Auth-Token`, Prefix=`JWT`.
- Steps: Send custom snippet.
- Expected: Capture and decode succeeds.

17. **C-05 Multiple prefixes**
- Preconditions: Prefix set to `Bearer,JWT`.
- Steps: Send request once with `Bearer`, once with `JWT`.
- Expected: Both are captured and decoded.

18. **C-06 Prefix auto-space normalization**
- Preconditions: Set prefix `Bearer` (without trailing space).
- Steps: Send `Authorization: Bearer <token>`.
- Expected: Capture still works (space is normalized internally).

19. **C-07 Prefix matching is case-sensitive**
- Preconditions: Prefix=`Bearer`.
- Steps: Send `Authorization: bearer <token>`.
- Expected: No capture.

20. **C-08 Empty prefix config behavior**
- Preconditions: Set prefix to empty string and save.
- Steps: Send request with any `Authorization` value.
- Expected: No capture

### D. Manual Input / Paste

21. **D-01 Manual valid token decode**
- Steps: Paste `VALID_JWT` into token input.
- Expected: Input turns green, decoded sections populate, source/time show `Manual input`.

22. **D-02 Manual input with configured prefix**
- Preconditions: Prefix includes `Bearer`.
- Steps: Paste `Bearer <VALID_JWT>`.
- Expected: Prefix is stripped, token decodes successfully.

23. **D-03 Manual invalid token format**
- Steps: Enter `INVALID_TWO_PARTS`.
- Expected: Input turns red, decoded sections cleared.

24. **D-04 Manual 3-part non-JSON token**
- Steps: Enter `INVALID_NOT_JSON_BUT_3_PARTS`.
- Expected: Input turns red, decoded sections cleared.

25. **D-05 Manual empty input clears state**
- Steps: Decode a valid token, then delete all input text.
- Expected: Header/payload cleared, waiting card shown, request info hidden, buttons disabled.

26. **D-06 Focus selects whole input**
- Steps: Click token input after it has content.
- Expected: Full token text is selected.

27. **D-07 Base64url token compatibility**
- Steps: Paste `VALID_JWT_WITH_BASE64URL_DASH`.
- Expected: Should decode successfully for JWT compliance; if it fails, log a bug (base64url handling issue).

### E. Copy and Clear Actions

28. **E-01 Copy raw token (copy prefix off)**
- Preconditions: `copy_prefix` unchecked, decode token.
- Steps: Click RAW JWT `COPY`, paste clipboard into notepad.
- Expected: Clipboard contains token only (no prefix).

29. **E-02 Copy raw token (copy prefix on)**
- Preconditions: `copy_prefix` checked, capture token from request with `Bearer` prefix.
- Steps: Click RAW JWT `COPY`, paste clipboard.
- Expected: Clipboard contains `Bearer <token>`.

30. **E-03 Copy decoded header**
- Steps: Click HEADER `COPY`, paste clipboard.
- Expected: Clipboard contains JSON string of decoded header.

31. **E-04 Copy decoded payload**
- Steps: Click PAYLOAD `COPY`, paste clipboard.
- Expected: Clipboard contains JSON string of decoded payload.

32. **E-05 Clear button behavior**
- Steps: After decode, click `CLEAR`.
- Expected: Input clears, waiting state restored, request info hidden, copy/clear buttons disabled.

### F. Claims, i18n, and Context

33. **F-01 `iat` and `exp` tooltip rendering**
- Steps: Decode a token containing numeric `iat` and `exp`, hover these values.
- Expected: Values are underlined and show UTC tooltip text.

34. **F-02 Internationalization smoke test**
- Steps: Change browser language to non-English locale supported by extension and reload extension.
- Expected: Options labels and main decoded section labels render localized text.

35. **F-03 Incognito split mode**
- Steps: Allow extension in Incognito, open incognito DevTools panel, set different options in normal/incognito contexts.
- Expected: Extension works in incognito; settings/storage behavior follows split-incognito expectations.

## Recommended Defects to Watch Closely
1. Base64url payload decode may fail for valid JWTs containing `-` or `_`.
2. Empty prefix configuration may match unintended header values.
3. Prefix matching is case-sensitive and may miss lowercase `bearer`.
