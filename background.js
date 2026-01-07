export const UNINSTALL_URL = "https://jwt-decode.github.io/jwt-decoder/uninstall_page";

export function initializeBackground() {
  chrome.runtime.setUninstallURL(UNINSTALL_URL);

  chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
      // Code to be executed on first install
      // eg. open a tab with a url
      chrome.tabs.create({
        url: "https://jwt-decode.github.io/jwt-decoder/",
      });
    } else if (details.reason === chrome.runtime.OnInstalledReason.UPDATE) {
      // When extension is updated
    } else if (
      details.reason === chrome.runtime.OnInstalledReason.CHROME_UPDATE
    ) {
      // When browser is updated
    } else if (
      details.reason === chrome.runtime.OnInstalledReason.SHARED_MODULE_UPDATE
    ) {
      // When a shared module is updated
    }
  });
}

if (typeof chrome !== 'undefined' && chrome?.runtime?.onInstalled) {
  initializeBackground();
}
