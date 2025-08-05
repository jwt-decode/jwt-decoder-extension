// Configuration and state management
class JWTConfig {
  constructor() {
    this.options = {
      header_name: "authorization",
      header_prefix: ["Bearer "],
      copy_prefix: false
    };
  }

  setOptions(newOptions) {
    this.options.header_name = newOptions.header_name.toLowerCase().trim();
    this.options.header_prefix = typeof newOptions.header_prefix === "string" 
      ? newOptions.header_prefix.split(',') 
      : newOptions.header_prefix;
    this.options.copy_prefix = newOptions.copy_prefix;
    
    // Ensure prefixes end with space
    this.options.header_prefix = this.options.header_prefix.map(prefix => {
      const trimmed = prefix.trim();
      return trimmed.length > 0 && !trimmed.endsWith(' ') ? trimmed + ' ' : trimmed;
    });
    
    this.updateWaitingMessage(newOptions.header_name);
  }

  updateWaitingMessage(headerName) {
    const waitingForRequest = document.getElementById("waiting-for-request");
    if (!waitingForRequest) return;

    const prefixDisplay = this.options.header_prefix.length > 1 
      ? '{' + this.options.header_prefix.join() + "}" 
      : this.options.header_prefix[0];
    
    waitingForRequest.innerHTML = chrome.i18n.getMessage(
      "waitingForRequest",
      [Encoder.htmlEncode(headerName), Encoder.htmlEncode(prefixDisplay)]
    );
  }

  getOptions() {
    return this.options;
  }
}

// DOM element cache and management
class DOMCache {
  constructor() {
    this.elements = new Map();
  }

  getElement(id) {
    if (!this.elements.has(id)) {
      this.elements.set(id, document.getElementById(id));
    }
    return this.elements.get(id);
  }

  clearCache() {
    this.elements.clear();
  }
}

// JWT Token processing utilities
class JWTProcessor {
  static validateToken(token) {
    if (!token || typeof token !== 'string') {
      return { valid: false, error: 'Invalid token format' };
    }

    const trimmedToken = token.trim();
    if (trimmedToken.length === 0) {
      return { valid: false, error: 'Token cannot be empty' };
    }

    const parts = trimmedToken.split('.');
    if (parts.length !== 3) {
      return { valid: false, error: 'JWT token must have exactly 3 parts separated by dots' };
    }

    return { valid: true, token: trimmedToken };
  }

  static decodeToken(token) {
    try {
      const parts = token.split('.');
      const header = JSON.parse(atob(parts[0]));
      const payload = JSON.parse(atob(parts[1]));
      return { success: true, header, payload };
    } catch (error) {
      return { success: false, error: 'Failed to decode JWT token: ' + error.message };
    }
  }

  static extractBearerToken(header, config) {
    if (!header || !header.name || !header.value) return null;
    
    if (header.name.toLowerCase() !== config.header_name) return null;
    
    const prefix = config.header_prefix.find(p => header.value.startsWith(p));
    if (!prefix) return null;
    
    return { 
      prefix, 
      token: header.value.substring(prefix.length) 
    };
  }

  static extractTokenFromInput(input, config) {
    if (!input || typeof input !== 'string') return null;
    
    const trimmedInput = input.trim();
    if (trimmedInput.length === 0) return null;
    
    // First try to find a prefix match
    const prefix = config.header_prefix.find(p => trimmedInput.startsWith(p));
    if (prefix) {
      return {
        prefix,
        token: trimmedInput.substring(prefix.length)
      };
    }
    
    // If no prefix found, assume it's a raw token
    return {
      prefix: '',
      token: trimmedInput
    };
  }
}

// UI rendering and display management
class UIRenderer {
  constructor(domCache) {
    this.dom = domCache;
  }

  syntaxHighlight(json) {
    if (typeof json !== 'string') {
      json = JSON.stringify(json, undefined, 2);
    }
    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return json.replace(/(\"(.*?)\")(:)/g, (match, p1, p2, p3) => {
      return '<span class="json-key">' + p1 + '</span>' + p3;
    });
  }

  renderDecodedToken(header, payload, url, time) {
    const headerElement = this.dom.getElement("header-json");
    const payloadElement = this.dom.getElement("payload-json");
    
    if (headerElement) headerElement.innerHTML = this.syntaxHighlight(header);
    if (payloadElement) payloadElement.innerHTML = this.syntaxHighlight(payload);

    this.updateRequestInfo(url, time);
    // this.hideWaitingMessage();
  }

  updateRequestInfo(url, time) {
    const reqCaptured = this.dom.getElement("request-captured");
    const reqUrl = this.dom.getElement("request-url");
    const reqTime = this.dom.getElement("request-time");
    
    if (reqCaptured && reqUrl && reqTime) {
      reqUrl.textContent = url;
      reqTime.textContent = time;
      reqCaptured.style.display = '';
    }
  }

  hideWaitingMessage() {
    const waitingForRequest = this.dom.getElement("waiting-for-request");
    if (waitingForRequest) waitingForRequest.style.display = 'none';
  }

  showWaitingMessage() {
    const waitingForRequest = this.dom.getElement("waiting-for-request");
    if (waitingForRequest) waitingForRequest.style.display = '';
  }

  hideRequestInfo() {
    const reqCaptured = this.dom.getElement("request-captured");
    if (reqCaptured) reqCaptured.style.display = 'none';
  }

  clearDisplay() {
    const headerJson = this.dom.getElement("header-json");
    const payloadJson = this.dom.getElement("payload-json");

    if (headerJson) headerJson.innerHTML = '';
    if (payloadJson) payloadJson.innerHTML = '';

    this.disableAllButtons();
    this.hideRequestInfo();
    this.showWaitingMessage();
  }

  disableAllButtons() {
    const buttonIds = [
      'copy-header-button',
      'copy-payload-button', 
      'i18n-copy-token',
      'clean-input-button'
    ];
    
    buttonIds.forEach(id => {
      const button = this.dom.getElement(id);
      if (button) button.disabled = true;
    });
  }

  updateCopyButtons(header, payload, token, prefix = '') {
    const config = jwtConfig.getOptions();
    
    // Update token copy button
    const tokenButton = this.dom.getElement("i18n-copy-token");
    if (tokenButton) {
      tokenButton.dataset.token = config.copy_prefix ? prefix + token : token;
      tokenButton.disabled = false;
    }

    // Update header copy button
    const headerButton = this.dom.getElement("copy-header-button");
    if (headerButton) {
      headerButton.dataset.header = JSON.stringify(header);
      headerButton.disabled = false;
    }

    // Update payload copy button
    const payloadButton = this.dom.getElement("copy-payload-button");
    if (payloadButton) {
      payloadButton.dataset.payload = JSON.stringify(payload);
      payloadButton.disabled = false;
    }

    // Update clean input button
    const cleanButton = this.dom.getElement("clean-input-button");
    if (cleanButton) cleanButton.disabled = false;
  }

  setTokenInputState(tokenInput, state) {
    if (!tokenInput) return;
    
    tokenInput.classList.remove('error', 'success');
    if (state) tokenInput.classList.add(state);
  }

  initializeI18n() {
    const elements = {
      'i18n-decoded-header-label': 'decodedHeaderLabel',
      'i18n-decoded-payload-label': 'decodedPayloadLabel',
      'token-captured': 'tokenCaptured'
    };

    Object.entries(elements).forEach(([elementId, messageKey]) => {
      const element = this.dom.getElement(elementId);
      if (element) {
        if (elementId === 'token-captured') {
          element.innerHTML = chrome.i18n.getMessage(messageKey);
        } else {
          element.textContent = chrome.i18n.getMessage(messageKey);
        }
      }
    });
  }
}

// Clipboard operations
class ClipboardManager {
  static copyToClipboard(text) {
    const copyFrom = document.createElement("textarea");
    copyFrom.textContent = text;
    document.body.appendChild(copyFrom);
    copyFrom.select();
    document.execCommand('copy');
    copyFrom.blur();
    document.body.removeChild(copyFrom);
  }

  static copyToken() {
    const token = this.dataset.token;
    ClipboardManager.copyToClipboard(token);
  }

  static copyHeader() {
    const header = this.dataset.header;
    ClipboardManager.copyToClipboard(header);
  }

  static copyPayload() {
    const payload = this.dataset.payload;
    ClipboardManager.copyToClipboard(payload);
  }
}

// Event handling utilities
class EventManager {
  static createInputEvent(data = "") {
    return new InputEvent('input', {
      bubbles: true,
      cancelable: true,
      inputType: 'insertText',
      data
    });
  }

  static triggerInputEvent(element, data = "") {
    if (!element) return;
    
    const event = this.createInputEvent(data);
    element.dispatchEvent(event);
  }
}

// Main application controller
class JWTDecoderApp {
  constructor() {
    this.config = new JWTConfig();
    this.domCache = new DOMCache();
    this.renderer = new UIRenderer(this.domCache);
  }

  handleManualTokenInput() {
    const tokenInput = this.domCache.getElement('token-input');
    if (!tokenInput) return;

    const rawToken = tokenInput.value;
    this.renderer.setTokenInputState(tokenInput, null);

    if (!rawToken.trim()) {
      this.renderer.clearDisplay();
      return;
    }

    // Extract token and prefix from manual input
    const config = this.config.getOptions();
    const extracted = JWTProcessor.extractTokenFromInput(rawToken, config);
    
    if (!extracted) {
      this.renderer.setTokenInputState(tokenInput, 'error');
      this.showError('Invalid token format or prefix');
      return;
    }

    const validation = JWTProcessor.validateToken(extracted.token);
    if (!validation.valid) {
      this.renderer.setTokenInputState(tokenInput, 'error');
      this.showError(validation.error);
      return;
    }

    const result = JWTProcessor.decodeToken(validation.token);
    if (!result.success) {
      this.renderer.setTokenInputState(tokenInput, 'error');
      this.showError(result.error);
      return;
    }

    this.renderer.setTokenInputState(tokenInput, 'success');
    this.displayDecodedToken(
      result.header, 
      result.payload, 
      validation.token, 
      'Manual input', 
      new Date().toLocaleString(),
      extracted.prefix
    );
  }

  displayDecodedToken(header, payload, token, source = null, time = null, prefix = '') {
    this.renderer.hideWaitingMessage();
    this.renderer.renderDecodedToken(header, payload, source, time);
    this.renderer.updateCopyButtons(header, payload, token, prefix);
  }

  showError(message) {
    this.renderer.clearDisplay();
    console.error('JWT Decode Error:', message);
  }

  cleanInput() {
    const tokenInput = this.domCache.getElement('token-input');
    if (!tokenInput) return;

    tokenInput.value = "";
    EventManager.triggerInputEvent(tokenInput);
  }

  onRequestFinished(request) {
    const config = this.config.getOptions();
    const bearerToken = request.request.headers.find(header => 
      JWTProcessor.extractBearerToken(header, config)
    );
    
    if (!bearerToken) return;

    const extracted = JWTProcessor.extractBearerToken(bearerToken, config);
    if (!extracted) return;

    try {
      const result = JWTProcessor.decodeToken(extracted.token);
      if (!result.success) return;

      const tokenInput = this.domCache.getElement('token-input');
      if (tokenInput) {
        tokenInput.dataset.requestUrl = request.request.url;
        tokenInput.dataset.reqTime = request.startedDateTime;
        tokenInput.value = extracted.token;
        EventManager.triggerInputEvent(tokenInput);
      }

      this.displayDecodedToken(
        result.header, 
        result.payload, 
        extracted.token, 
        request.request.url, 
        request.startedDateTime, 
        extracted.prefix
      );
    } catch (error) {
      // Not a token we can extract and decode
    }
  }

  initialize() {
    // Set up event listeners
    const elementsToHandlerMap = {
      "i18n-copy-token": ClipboardManager.copyToken,
      "clean-input-button": () => this.cleanInput(),
      "copy-header-button": ClipboardManager.copyHeader,
      "copy-payload-button": ClipboardManager.copyPayload
    };

    Object.entries(elementsToHandlerMap).forEach(([id, handler]) => {
      const element = this.domCache.getElement(id);
      if (element) element.onclick = handler;
    });

    // Set up token input listeners
    const tokenInput = this.domCache.getElement("token-input");
    if (tokenInput) {
      tokenInput.addEventListener('input', () => this.handleManualTokenInput());
      tokenInput.addEventListener('paste', () => this.handleManualTokenInput());
    }

    // Initialize UI state
    this.renderer.showWaitingMessage();
    this.renderer.hideRequestInfo();

    // Load configuration
    chrome.storage.local.get(this.config.getOptions(), (options) => {
      this.config.setOptions(options);
    });
  }
}

// Initialize application
const jwtConfig = new JWTConfig();
const app = new JWTDecoderApp();

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  app.renderer.initializeI18n();
});

chrome.devtools.network.onRequestFinished.addListener((request) => {
  app.onRequestFinished(request);
});

window.onload = () => {
  app.initialize();
};

chrome.storage.onChanged.addListener((changes, namespace) => {
  chrome.storage.local.get(jwtConfig.getOptions(), (options) => {
    jwtConfig.setOptions(options);
  });
});
