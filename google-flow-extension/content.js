// Content script running directly inside flow.google.com

console.log("[Antigravity Flow Connector] Content script loaded on flow.google.com");

let socket = null;
let reconnectTimer = null;
const BRIDGE_WS_URL = "ws://127.0.0.1:7822";

function connectBridge() {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return;
  }

  try {
    socket = new WebSocket(BRIDGE_WS_URL);

    socket.onopen = () => {
      console.log("[Antigravity Flow Connector] Connected to local Antigravity Bridge!");
      notifyPopup({ connected: true });
      socket.send(JSON.stringify({
        type: "REGISTER",
        client: "FLOW_TAB",
        url: window.location.href,
        title: document.title
      }));
    };

    socket.onmessage = async (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log("[Antigravity Flow Connector] Received message:", message);

        if (message.action === "GENERATE") {
          await handleGenerate(message.prompt, message.aspectRatio || "9:16");
        } else if (message.action === "STATUS") {
          socket.send(JSON.stringify({
            type: "STATUS",
            ready: true,
            url: window.location.href
          }));
        }
      } catch (err) {
        console.error("[Antigravity Flow Connector] Message handling error:", err);
      }
    };

    socket.onclose = () => {
      notifyPopup({ connected: false });
      if (!reconnectTimer) {
        reconnectTimer = setTimeout(() => {
          reconnectTimer = null;
          connectBridge();
        }, 3000);
      }
    };

    socket.onerror = () => {
      socket.close();
    };
  } catch (err) {
    if (!reconnectTimer) {
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connectBridge();
      }, 3000);
    }
  }
}

// Helper: Notify background/popup
function notifyPopup(state) {
  chrome.runtime.sendMessage({ type: "BRIDGE_STATE", ...state }).catch(() => {});
}

// Find prompt textarea or contenteditable element
function findPromptInput() {
  const selectors = [
    'textarea[aria-label*="prompt" i]',
    'textarea[placeholder*="Describe" i]',
    'textarea[placeholder*="prompt" i]',
    'textarea',
    'div[contenteditable="true"]',
    'input[type="text"][aria-label*="prompt" i]'
  ];

  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el && el.offsetParent !== null) {
      return el;
    }
  }
  return null;
}

// Find Generate button
function findGenerateButton() {
  const buttons = Array.from(document.querySelectorAll('button'));
  for (const btn of buttons) {
    const text = (btn.innerText || btn.getAttribute('aria-label') || '').toLowerCase();
    if (text.includes('generate') || text.includes('create') || text.includes('submit')) {
      if (btn.offsetParent !== null && !btn.disabled) {
        return btn;
      }
    }
  }
  return null;
}

async function handleGenerate(prompt, aspectRatio) {
  socket.send(JSON.stringify({ type: "PROGRESS", stage: "INJECTING_PROMPT" }));

  const inputEl = findPromptInput();
  if (!inputEl) {
    socket.send(JSON.stringify({
      type: "ERROR",
      message: "Could not locate prompt input box on flow.google.com"
    }));
    return;
  }

  // Focus and input prompt
  inputEl.focus();
  if (inputEl.tagName === 'TEXTAREA' || inputEl.tagName === 'INPUT') {
    inputEl.value = prompt;
    inputEl.dispatchEvent(new Event('input', { bubbles: true }));
    inputEl.dispatchEvent(new Event('change', { bubbles: true }));
  } else {
    inputEl.innerText = prompt;
    inputEl.dispatchEvent(new Event('input', { bubbles: true }));
  }

  await sleep(1000);

  // Click Generate button
  const genBtn = findGenerateButton();
  if (!genBtn) {
    socket.send(JSON.stringify({
      type: "ERROR",
      message: "Prompt entered, but Generate button was not found or is disabled."
    }));
    return;
  }

  genBtn.click();
  socket.send(JSON.stringify({ type: "PROGRESS", stage: "GENERATING" }));

  // Monitor for video completion (poll up to 5 minutes)
  const startTime = Date.now();
  let foundVideoUrl = null;

  while (Date.now() - startTime < 300000) {
    await sleep(4000);

    const videos = Array.from(document.querySelectorAll('video'));
    for (const v of videos) {
      if (v.src && (v.src.startsWith('blob:') || v.src.startsWith('http'))) {
        foundVideoUrl = v.src;
        break;
      }
    }

    if (foundVideoUrl) break;
  }

  if (foundVideoUrl) {
    socket.send(JSON.stringify({
      type: "COMPLETE",
      videoUrl: foundVideoUrl,
      prompt: prompt
    }));
  } else {
    socket.send(JSON.stringify({
      type: "INFO",
      message: "Generation triggered on Flow page. Check your Flow gallery."
    }));
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Connect automatically on page load
connectBridge();
setInterval(connectBridge, 5000);

