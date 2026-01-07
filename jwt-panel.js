import { Encoder } from './encoder.js';

// Configuration and state management
export class JWTConfig {
  constructor() {
    this.options = {
      header_name: "authorization",
      header_prefix: ["Bearer "],
      copy_prefix: false,
      allow_empty_prefix: false
    };
  }

  setOptions(newOptions) {
    this.options.header_name = newOptions.header_name.toLowerCase().trim();
    this.options.header_prefix = typeof newOptions.header_prefix === "string" 
      ? newOptions.header_prefix.split(',') 
      : newOptions.header_prefix;
    this.options.copy_prefix = newOptions.copy_prefix;
    this.options.allow_empty_prefix = newOptions.allow_empty_prefix !== undefined 
      ? newOptions.allow_empty_prefix 
      : false;
    
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
    const trimmedPrefisex = this.options.header_prefix.map(prefix=> prefix.trim())
    let prefixDisplay = this.options.header_prefix.length > 1 
      ? '{' + trimmedPrefisex.join(", ") + "}" 
      : this.options.header_prefix[0].trim();
    
    if (this.options.allow_empty_prefix) {
      prefixDisplay += " or no prefix";
    }

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
export class DOMCache {
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
export class JWTProcessor {
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

  static extractTokenFromHeader(header, config) {
    if (!header || !header.name || !header.value) return null;
    
    if (header.name.toLowerCase() !== config.header_name) return null;
    
    const prefix = config.header_prefix.find(p => header.value.startsWith(p));
    if (prefix) {
      return { 
        prefix, 
        token: header.value.substring(prefix.length) 
      };
    }
    
    // If no prefix matches and allow_empty_prefix is enabled, treat entire header value as token
    if (config.allow_empty_prefix) {
      return {
        prefix: '',
        token: header.value
      };
    }
    
    return null;
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
export class UIRenderer {
  constructor(domCache, config) {
    this.dom = domCache;
    this.config = config;
  }

  syntaxHighlight(json) {
    if (typeof json !== 'string') {
      json = JSON.stringify(json, undefined, 2);
    }
    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
   const iatReplaced = this.addHumanreadableTimeClaimTip(json, "iat", "Issued At");
   const expReplaced = this.addHumanreadableTimeClaimTip(iatReplaced, "exp", "Expiration Time");

   return expReplaced.replace(/("(.*?)")(:)/g, (match, p1, p2, p3) => {
      return '<span class="json-key">' + p1 + '</span>' + p3;
    });
  }

  addHumanreadableTimeClaimTip(jsonStr, claimName, claimMeaning) {
    const escapedClaim = claimName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`("${escapedClaim}"\\s*:\\s*)(\\d+)`, "g");
    return jsonStr.replace(
        regex,
        (match, key, value) => {
          const utcString = this.epochToUTCString(value);
          return (
              key +
              `<span style="text-decoration:underline;cursor:pointer;color:blue" title="${claimMeaning}: ${utcString}">` +
              `${value}</span>`
          );
        }
    );
  }

  epochToUTCString(epochString) {
    const epochSeconds = parseInt(epochString, 10);
    const date = new Date(epochSeconds * 1000);
    return date.toUTCString();
  }

  renderDecodedToken(header, payload, source, time) {
    const headerElement = this.dom.getElement("header-json");
    const payloadElement = this.dom.getElement("payload-json");
    
    if (headerElement) headerElement.innerHTML = this.syntaxHighlight(header);
    if (payloadElement) payloadElement.innerHTML = this.syntaxHighlight(payload);

    this.updateRequestInfo(source, time);
    // this.hideWaitingMessage();
  }

  updateRequestInfo(url, time) {
    const reqCaptured = this.dom.getElement("request-captured");
    const reqUrl = this.dom.getElement("request-url");
    const reqTime = this.dom.getElement("request-time");
    
    if (reqCaptured && reqUrl && reqTime) {
      // Clear any existing expanders
      const existingUrlExpander = reqUrl.parentElement.querySelector('.info-expander[data-for="url"]');
      const existingTimeExpander = reqTime.parentElement.querySelector('.info-expander[data-for="time"]');
      if (existingUrlExpander) existingUrlExpander.remove();
      if (existingTimeExpander) existingTimeExpander.remove();
      
      // Reset classes
      reqUrl.classList.remove('expanded');
      reqUrl.classList.remove('is-truncated');
      reqTime.classList.remove('expanded');
      reqTime.classList.remove('is-truncated');
      
      // Set full text and truncate if needed
      this.setTruncatedText(reqUrl, url, 'url');
      reqTime.textContent = time
      
      reqCaptured.style.display = '';
    }
  }

  setTruncatedText(element, fullText, identifier) {
    const maxLength = 80; // Maximum characters before truncation
    
    if (!fullText) {
      element.textContent = '';
      element.classList.remove('is-truncated');
      return;
    }
    
    // Store full text in data attribute
    element.dataset.fullText = fullText;
    
    if (fullText.length <= maxLength) {
      element.textContent = fullText;
      element.classList.remove('is-truncated');
      return;
    }
    
    // Truncate and add expander
    const truncated = fullText.substring(0, maxLength);
    element.textContent = truncated;
    element.classList.add('is-truncated');
    
    // Create expander element
    const expander = document.createElement('span');
    expander.className = 'info-expander';
    expander.textContent = '...';
    expander.dataset.for = identifier;
    expander.onclick = (e) => {
      e.stopPropagation();
      this.toggleTextExpansion(element, expander);
    };
    
    // Insert expander after the text element
    element.parentElement.insertBefore(expander, element.nextSibling);
  }

  toggleTextExpansion(element, expander) {
    const isExpanded = element.classList.contains('expanded');
    
    if (isExpanded) {
      // Collapse: show truncated version
      const fullText = element.dataset.fullText;
      const maxLength = 80;
      const truncated = fullText.substring(0, maxLength);
      element.textContent = truncated;
      element.classList.remove('expanded');
      expander.textContent = '...';
    } else {
      // Expand: show full text
      element.textContent = element.dataset.fullText;
      element.classList.add('expanded');
      expander.textContent = ' [hide]';
    }
  }

  hideWaitingMessage() {
    const waitingForRequest = this.dom.getElement("waiting-for-request-container");
    if (waitingForRequest) waitingForRequest.style.display = 'none';
  }

  showWaitingMessage() {
    const waitingForRequest = this.dom.getElement("waiting-for-request-container");
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
    const config = this.config.getOptions();
    
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
  }

  updateCleanButton(){
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
export class ClipboardManager {
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
export class EventManager {
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
export class JWTDecoderApp {
  constructor(config) {
    this.config = config;
    this.domCache = new DOMCache();
    this.renderer = new UIRenderer(this.domCache, this.config);
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

    this.processExtractedToken(extracted, tokenInput, 'Manual input', new Date().toLocaleString());
  }

  onRequestFinished(request) {
    const config = this.config.getOptions();
    let extracted = null;
    
    // Find and extract token in a single pass
    for (const header of request.request.headers) {
      extracted = JWTProcessor.extractTokenFromHeader(header, config);
      if (extracted) break;
    }
    
    if (!extracted) return;
    const tokenInput = this.domCache.getElement('token-input');
    tokenInput.value = extracted.token;
    this.processExtractedToken(extracted, tokenInput, request.request.url, request.startedDateTime);
  }

  processExtractedToken(extracted, tokenInput, source, time) {
    const validation = JWTProcessor.validateToken(extracted.token);
    if (!validation.valid) {
      this.renderer.setTokenInputState(tokenInput, 'error');
      this.showError(validation.error);
      this.renderer.updateCleanButton();
      return;
    }

    const result = JWTProcessor.decodeToken(validation.token);
    if (!result.success) {
      this.renderer.setTokenInputState(tokenInput, 'error');
      this.showError(result.error);
      this.renderer.updateCleanButton();
      return;
    }

    this.renderer.setTokenInputState(tokenInput, 'success');
    this.displayDecodedToken(
      result.header, 
      result.payload, 
      validation.token, 
      source, 
      time,
      extracted.prefix
    );
  }

  displayDecodedToken(header, payload, token, source = null, time = null, prefix = '') {
    this.renderer.hideWaitingMessage();
    this.renderer.renderDecodedToken(header, payload, source, time);
    this.renderer.updateCopyButtons(header, payload, token, prefix);
    this.renderer.updateCleanButton();
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


  initialize() {
    // Set up event listeners
    const elementsToHandlerMap = {
      "i18n-copy-token": ClipboardManager.copyToken,
      "clean-input-button": () => this.cleanInput(),
      "copy-header-button": ClipboardManager.copyHeader,
      "copy-payload-button": ClipboardManager.copyPayload,
      "open-settings": () => this.openSettings()
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
      tokenInput.addEventListener('focus', () => tokenInput.select());
    }

    // Initialize UI state
    this.renderer.showWaitingMessage();
    this.renderer.hideRequestInfo();

    // Load configuration
    chrome.storage.local.get(this.config.getOptions(), (options) => {
      this.config.setOptions(options);
    });
  }

  openSettings(){
    chrome.runtime.openOptionsPage();
  }
}

export function initializeJwtPanel() {
  const jwtConfig = new JWTConfig();
  const app = new JWTDecoderApp(jwtConfig);

  document.addEventListener('DOMContentLoaded', () => {
    app.renderer.initializeI18n();
  });

  chrome.devtools.network.onRequestFinished.addListener((request) => {
    app.onRequestFinished(request);
  });

  window.onload = () => {
    app.initialize();
  };

  chrome.storage.onChanged.addListener(() => {
    chrome.storage.local.get(jwtConfig.getOptions(), (options) => {
      jwtConfig.setOptions(options);
    });
  });
}

if (typeof chrome !== 'undefined' && chrome?.devtools?.network && typeof document !== 'undefined') {
  initializeJwtPanel();
}
