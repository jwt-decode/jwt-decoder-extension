var options = {
  header_name: "authorization",
  header_prefix: ["Bearer "],
  copy_prefix: false,
  wrap_claim_names: false
};

function setOptions(o) {
  options.header_name = o.header_name.toLowerCase().trim();
  options.header_prefix = typeof o.header_prefix == "string" ? o.header_prefix.split(',') : o.header_prefix;
  options.copy_prefix = o.copy_prefix;
  options.wrap_claim_names = o.wrap_claim_names;
  for(var i = 0 ; i<options.header_prefix.length ; i++) {
    if(options.header_prefix[i].trim().length>0 && !options.header_prefix[i].endsWith(' ')) {
      options.header_prefix[i] += ' ';
    }
  }
  var waitingForRequest = document.getElementById("waiting-for-request");
  var p = options.header_prefix.length>1 ? '{'+options.header_prefix.join()+"}" : options.header_prefix[0];
  waitingForRequest.innerHTML = chrome.i18n.getMessage(
    "waitingForRequest",
    [
      Encoder.htmlEncode(o.header_name),
      Encoder.htmlEncode(p)
    ]
  );
}

function bearer_token(header) {
  if(header && header.name && header.name.toLowerCase() == options.header_name && header.value) {
    var p = options.header_prefix.find( s => header.value.startsWith(s) );
    if(p) {
      return { prefix:p , tok:header.value.substring(p.length) };
    }
  }
  return null;
}

function isObject(obj) {
  var type = typeof obj;
  return type === 'function' || type === 'object' && !!obj;
}

const ts_claims = ["exp","iat","nbf"];

function syntaxHighlight(json) {
  if (typeof json != 'string') {
    json = JSON.stringify(json, undefined, 2);
  }
  json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return json.replace(/(\"(.*?)\")(:)/g, function(match, p1, p2, p3) {
    return '<span class="json-key">' + p1 + '</span>' + p3;
  });
}

function render(header, claims, url, time) {

  var preHeader = document.getElementById("header-json");
  preHeader.innerHTML = syntaxHighlight(header);

  var prePayload = document.getElementById("payload-json");
  prePayload.innerHTML = syntaxHighlight(claims);

  var reqCaptured = document.getElementById("request-captured");
  var reqUrl = document.getElementById("request-url");
  var reqTime = document.getElementById("request-time");
  if (reqCaptured && reqUrl && reqTime) {
    reqUrl.textContent = url;
    reqTime.textContent = time;
    reqCaptured.style.display = '';
  }

  var waitingForRequest = document.getElementById("waiting-for-request");
  if (waitingForRequest) waitingForRequest.style.display = 'none';
  }

function updateRawTokenCopyButton(p,tok) {
  var b = document.getElementById("i18n-copy-token");
  b.dataset.token = options.copy_prefix ? p+tok : tok;
  b.disabled = false;
}

function updateCopyDecodedButtons(header, payload) {
  var b = document.getElementById("copy-header-button");
  b.dataset.header = JSON.stringify(header);
  b.disabled = false;

  b = document.getElementById("copy-payload-button");
  b.dataset.payload = JSON.stringify(payload);
  b.disabled = false;
}

// Taken from: https://stackoverflow.com/a/18455088/1823175
function copyTextToClipboard(text) {
  var copyFrom = document.createElement("textarea");
  copyFrom.textContent = text;
  document.body.appendChild(copyFrom);
  copyFrom.select();
  document.execCommand('copy');
  copyFrom.blur();
  document.body.removeChild(copyFrom);
}

function copyToken() {
  var t = this.dataset.token;
  copyTextToClipboard(t);
}

function copyHeader(){
  var h = this.dataset.header;
  copyTextToClipboard(h);
}

function copyPayload(){
  var p = this.dataset.payload;
  copyTextToClipboard(p);
}

function onRequestFinished(request) {
  var h = bearer_token(request.request.headers.find(bearer_token));
  if(!h) return;
  try {
    var parts = h.tok.split('.');
    var header = JSON.parse(atob(parts[0]));
    var payload = JSON.parse(atob(parts[1]));
    render(header, payload, request.request.url, request.startedDateTime);
    updateRawTokenCopyButton(h.prefix,h.tok);
    updateCopyDecodedButtons(header, payload);
  } catch (error) {
    // Not a token we can extract and decode
  }
}

function i18n_messages(){
  document.getElementById('i18n-copy-token').textContent = chrome.i18n.getMessage("copyTokenButton");
  document.getElementById('i18n-decoded-header-label').textContent=chrome.i18n.getMessage('decodedHeaderLabel');
  document.getElementById('i18n-decoded-payload-label').textContent=chrome.i18n.getMessage('decodedPayloadLabel');
  document.getElementById('token-captured').innerHTML=chrome.i18n.getMessage('tokenCaptured');
}

document.addEventListener('DOMContentLoaded', i18n_messages);
chrome.devtools.network.onRequestFinished.addListener(onRequestFinished);
window.onload = function() {
  document.getElementById("i18n-copy-token").onclick = copyToken;
  document.getElementById("copy-header-button").onclick = copyHeader;
  document.getElementById("copy-payload-button").onclick = copyPayload;
  chrome.storage.local.get(options, setOptions);

  var waitingForRequest = document.getElementById("waiting-for-request");
  if (waitingForRequest) waitingForRequest.style.display = '';
  var reqCaptured = document.getElementById("request-captured");
  if (reqCaptured) reqCaptured.style.display = 'none';

};
chrome.storage.onChanged.addListener( function(changes, namespace) {
  chrome.storage.local.get(options, setOptions);
});
