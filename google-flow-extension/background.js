// Background Service Worker - Persistent Automation Bridge

console.log("[Antigravity Flow Connector] Background Service Worker starting...");

let ws = null;
const BRIDGE_WS_URL = "ws://127.0.0.1:7822";

function connect() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    return;
  }

  try {
    ws = new WebSocket(BRIDGE_WS_URL);

    ws.onopen = () => {
      console.log("[Background] Connected to Antigravity Bridge on ws://127.0.0.1:7822");
      ws.send(JSON.stringify({ type: "REGISTER", client: "BACKGROUND_WORKER" }));
    };

    ws.onmessage = async (event) => {
      try {
        const msg = JSON.parse(event.data);
        console.log("[Background] Received command from Antigravity:", msg);

        if (msg.action === "GENERATE") {
          await executeGenerateInFlowTab(msg.prompt);
        }
      } catch (err) {
        console.error("[Background] Error handling message:", err);
      }
    };

    ws.onclose = () => {
      console.log("[Background] WebSocket disconnected, retrying in 3s...");
      setTimeout(connect, 3000);
    };

    ws.onerror = (err) => {
      console.error("[Background] WebSocket error:", err);
      ws.close();
    };
  } catch (e) {
    setTimeout(connect, 3000);
  }
}

async function executeGenerateInFlowTab(promptText) {
  // Find open Google Flow tab
  const tabs = await chrome.tabs.query({ url: "*://flow.google.com/*" });
  if (!tabs || tabs.length === 0) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: "ERROR",
        message: "No flow.google.com tab is currently open in Chrome."
      }));
    }
    return;
  }

  const targetTab = tabs[0];
  await chrome.tabs.update(targetTab.id, { active: true });

  // Execute DOM injection directly in the tab
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: targetTab.id },
      func: injectPromptAndSubmit,
      args: [promptText]
    });

    const res = results[0]?.result;
    if (res && res.success) {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: "INFO",
          message: "Prompt injected and submitted successfully into Google Flow!"
        }));
      }
    } else {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: "ERROR",
          message: res?.error || "Could not find input box or submit button in Flow tab."
        }));
      }
    }
  } catch (err) {
    console.error("[Background] Failed to execute script:", err);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "ERROR", message: err.message }));
    }
  }
}

// Function executed inside the Flow tab's DOM
function injectPromptAndSubmit(textToType) {
  // Find input element
  const inputSelectors = [
    'textarea[placeholder*="What do you want to create" i]',
    'textarea[placeholder*="Describe" i]',
    'textarea[placeholder*="prompt" i]',
    'div[contenteditable="true"]',
    'textarea',
    'input[type="text"]'
  ];

  let inputEl = null;
  for (const sel of inputSelectors) {
    const els = Array.from(document.querySelectorAll(sel));
    for (const el of els) {
      if (el.offsetParent !== null) {
        inputEl = el;
        break;
      }
    }
    if (inputEl) break;
  }

  if (!inputEl) {
    return { success: false, error: "Prompt input element not found." };
  }

  // Focus and type prompt
  inputEl.focus();
  if (inputEl.tagName === 'TEXTAREA' || inputEl.tagName === 'INPUT') {
    inputEl.value = textToType;
    inputEl.dispatchEvent(new Event('input', { bubbles: true }));
    inputEl.dispatchEvent(new Event('change', { bubbles: true }));
  } else {
    inputEl.innerText = textToType;
    inputEl.dispatchEvent(new Event('input', { bubbles: true }));
  }

  // Find submit arrow button (usually right next to input or button with arrow/send)
  const buttons = Array.from(document.querySelectorAll('button'));
  let submitBtn = null;

  for (const btn of buttons) {
    const aria = (btn.getAttribute('aria-label') || '').toLowerCase();
    const title = (btn.getAttribute('title') || '').toLowerCase();
    if (aria.includes('create') || aria.includes('generate') || aria.includes('submit') || aria.includes('send') || title.includes('submit')) {
      submitBtn = btn;
      break;
    }
  }

  if (!submitBtn) {
    // Fallback: look for the button containing SVG arrow in the input container
    const container = inputEl.closest('div[class*="container"]') || inputEl.parentElement?.parentElement;
    if (container) {
      const containerBtns = container.querySelectorAll('button');
      if (containerBtns.length > 0) {
        submitBtn = containerBtns[containerBtns.length - 1]; // usually the last button in the row
      }
    }
  }

  if (submitBtn) {
    setTimeout(() => {
      submitBtn.click();
    }, 400);
    return { success: true };
  } else {
    // If no button found, simulate Enter keypress on input
    const enterEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      code: 'Enter',
      keyCode: 13,
      which: 13,
      bubbles: true
    });
    inputEl.dispatchEvent(enterEvent);
    return { success: true, note: "Submitted via Enter key" };
  }
}

connect();
setInterval(connect, 5000);
