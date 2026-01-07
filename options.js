// Saves options to chrome.storage
export function saveOptions() {
  var header_name = document.getElementById('header_name').value;
  var header_prefix = document.getElementById('header_prefix').value;
  var copy_prefix = document.getElementById('copy_prefix').checked;
  var allow_empty_prefix = document.getElementById('allow_empty_prefix').checked;
  chrome.storage.local.set({
    header_name: header_name,
    header_prefix: header_prefix,
    copy_prefix: copy_prefix,
    allow_empty_prefix: allow_empty_prefix,
  }, function() {
    // Update status to let user know options were saved.
    var status = document.getElementById('status');
    status.textContent = 'Options saved.';
    setTimeout(function() {
      status.textContent = '';
    }, 750);
  });
}

export function restoreOptions() {
  chrome.storage.local.get({
    header_name: "Authorization",
    header_prefix: "Bearer",
    copy_prefix: false,
    allow_empty_prefix: false,
  }, function(items) {
    document.getElementById('header_name').value = items.header_name;
    document.getElementById('header_prefix').value = items.header_prefix;
    document.getElementById('copy_prefix').checked = items.copy_prefix;
    document.getElementById('allow_empty_prefix').checked = items.allow_empty_prefix;
  });
}

// Resets options to default values
export function resetOptions() {
  document.getElementById('header_name').value = "Authorization";
  document.getElementById('header_prefix').value = "Bearer";
  document.getElementById('copy_prefix').checked = false;
  document.getElementById('allow_empty_prefix').checked = false;
  saveOptions();
}

export function i18nMessages() {
  document.title = chrome.i18n.getMessage("optionsTitle");
  document.getElementById('i18n-title').textContent = chrome.i18n.getMessage("optionsTitle");
  document.getElementById('i18n-header-name-label').textContent = chrome.i18n.getMessage("headerNameLabel");
  document.getElementById('i18n-header-prefix-label').textContent = chrome.i18n.getMessage("headerPrefixLabel");
  document.getElementById('i18n-header-prefix-hint').textContent = chrome.i18n.getMessage("headerPrefixHint");
  document.getElementById('i18n-copy-prefix-label').textContent = chrome.i18n.getMessage("copyPrefixLabel");
  document.getElementById('i18n-allow-empty-prefix-label').textContent = chrome.i18n.getMessage("allowEmptyPrefixLabel");
  document.getElementById('i18n-save').textContent = chrome.i18n.getMessage("saveButton");
  document.getElementById('i18n-reset').textContent = chrome.i18n.getMessage("resetButton");
}

export function initializeOptions() {
  document.addEventListener('DOMContentLoaded', () => {
    restoreOptions();
    i18nMessages();

    const saveButton = document.getElementById('i18n-save');
    const resetButton = document.getElementById('i18n-reset');

    if (saveButton) saveButton.addEventListener('click', saveOptions);
    if (resetButton) resetButton.addEventListener('click', resetOptions);
  });
}

if (typeof chrome !== 'undefined' && chrome?.storage && typeof document !== 'undefined') {
  initializeOptions();
}
