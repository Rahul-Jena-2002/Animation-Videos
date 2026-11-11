document.addEventListener('DOMContentLoaded', () => {
  const bridgeStatus = document.getElementById('bridge-status');
  const bridgeText = document.getElementById('bridge-text');
  const flowTabStatus = document.getElementById('flow-tab-status');
  const openFlowBtn = document.getElementById('open-flow-btn');

  // Test local bridge connection
  function checkBridge() {
    try {
      const testWs = new WebSocket("ws://127.0.0.1:7822");
      testWs.onopen = () => {
        bridgeStatus.className = "status-badge connected";
        bridgeText.innerText = "Antigravity Bridge: Active";
        testWs.close();
      };
      testWs.onerror = () => {
        bridgeStatus.className = "status-badge disconnected";
        bridgeText.innerText = "Antigravity Bridge: Offline";
      };
    } catch (e) {
      bridgeStatus.className = "status-badge disconnected";
      bridgeText.innerText = "Antigravity Bridge: Offline";
    }
  }

  // Check open tabs
  chrome.tabs.query({ url: "*://flow.google.com/*" }, (tabs) => {
    if (tabs && tabs.length > 0) {
      flowTabStatus.innerText = `Connected (${tabs.length} tab open)`;
      flowTabStatus.style.color = "#15803d";
    } else {
      flowTabStatus.innerText = "No active tab (flow.google.com)";
      flowTabStatus.style.color = "#b91c1c";
    }
  });

  openFlowBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://flow.google.com' });
  });

  checkBridge();
});
