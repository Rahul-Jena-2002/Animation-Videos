// Background Service Worker

chrome.runtime.onInstalled.addListener(() => {
  console.log("[Antigravity Flow Connector] Extension installed successfully.");
});

// Relay messages between popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "CHECK_FLOW_TAB") {
    chrome.tabs.query({ url: "*://flow.google.com/*" }, (tabs) => {
      sendResponse({ hasFlowTab: tabs.length > 0, count: tabs.length });
    });
    return true;
  }
});
