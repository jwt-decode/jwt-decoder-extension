export function createJwtPanel() {
  chrome.devtools.panels.create(
    "JWT Decoder",
    "",
    "jwt-panel.html",
    function(panel) {}
  );
}

if (typeof chrome !== 'undefined' && chrome?.devtools?.panels) {
  createJwtPanel();
}
