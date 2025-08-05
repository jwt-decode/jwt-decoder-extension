// Saves options to chrome.storage
function save_options() {
  var header_name = document.getElementById('header_name').value;
  var header_prefix = document.getElementById('header_prefix').value;
  var copy_prefix = document.getElementById('copy_prefix').checked;
  chrome.storage.local.set({
    header_name: header_name,
    header_prefix: header_prefix,
    copy_prefix: copy_prefix,
  }, function() {
    // Update status to let user know options were saved.
    var status = document.getElementById('status');
    status.textContent = 'Options saved.';
    setTimeout(function() {
      status.textContent = '';
    }, 750);
  });
}

function restore_options() {
  chrome.storage.local.get({
    header_name: "Authorization",
    header_prefix: "Bearer",
    copy_prefix: false,
  }, function(items) {
    document.getElementById('header_name').value = items.header_name;
    document.getElementById('header_prefix').value = items.header_prefix;
    document.getElementById('copy_prefix').checked = items.copy_prefix;
  });
}

// Resets options to default values
function reset_options() {
  document.getElementById('header_name').value = "Authorization";
  document.getElementById('header_prefix').value = "Bearer";
  document.getElementById('copy_prefix').checked = false;
  save_options();
}

function i18n_messages(){
  document.title = chrome.i18n.getMessage("optionsTitle");
  document.getElementById('i18n-title').textContent = chrome.i18n.getMessage("optionsTitle");
  document.getElementById('i18n-header-name-label').textContent = chrome.i18n.getMessage("headerNameLabel");
  document.getElementById('i18n-header-prefix-label').textContent = chrome.i18n.getMessage("headerPrefixLabel");
  document.getElementById('i18n-header-prefix-hint').textContent = chrome.i18n.getMessage("headerPrefixHint");
  document.getElementById('i18n-copy-prefix-label').textContent = chrome.i18n.getMessage("copyPrefixLabel");
  document.getElementById('i18n-wrap-claim-names-label').textContent = chrome.i18n.getMessage("wrapClaimNamesLabel");
  document.getElementById('i18n-save').textContent = chrome.i18n.getMessage("saveButton");
  document.getElementById('i18n-reset').textContent = chrome.i18n.getMessage("resetButton");
}

document.addEventListener('DOMContentLoaded', restore_options);
document.addEventListener('DOMContentLoaded', i18n_messages);
document.getElementById('i18n-save').addEventListener('click', save_options);
document.getElementById('i18n-reset').addEventListener('click', reset_options);

