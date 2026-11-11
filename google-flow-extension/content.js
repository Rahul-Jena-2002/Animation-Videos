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
      if (!reconnectTimer) {
        reconnectTimer = setTimeout(() => {
          reconnectTimer = null;
          connectBridge();
        }, 2000);
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
      }, 2000);
    }
  }
}

// Find prompt textarea or contenteditable element
function findPromptInput() {
  const selectors = [
    'textarea[placeholder*="What do you want to create" i]',
    'textarea[placeholder*="Describe" i]',
    'textarea[placeholder*="prompt" i]',
    'div[contenteditable="true"]',
    'textarea',
    'input[type="text"]'
  ];

  for (const sel of selectors) {
    const list = Array.from(document.querySelectorAll(sel));
    for (const el of list) {
      if (el.offsetParent !== null) {
        return el;
      }
    }
  }
  return null;
}

// Find Generate button or Arrow submit button
function findGenerateButton(inputEl) {
  // 1. Search in the prompt bar container (the rightmost button is the submit arrow)
  if (inputEl) {
    let parent = inputEl.parentElement;
    for (let depth = 0; depth < 5 && parent; depth++) {
      const containerBtns = Array.from(parent.querySelectorAll('button'));
      if (containerBtns.length >= 2) {
        // Return the last visible button in the container (arrow icon)
        for (let i = containerBtns.length - 1; i >= 0; i--) {
          const b = containerBtns[i];
          if (b.offsetParent !== null) {
            return b;
          }
        }
      }
      parent = parent.parentElement;
    }
  }

  // 2. Global button search by aria-label or text
  const buttons = Array.from(document.querySelectorAll('button'));
  for (const btn of buttons) {
    const text = (btn.innerText || btn.getAttribute('aria-label') || btn.getAttribute('title') || '').toLowerCase();
    if (text.includes('generate') || text.includes('create') || text.includes('submit') || text.includes('send') || text.includes('arrow')) {
      if (btn.offsetParent !== null) {
        return btn;
      }
    }
  }

  return null;
}

function triggerClick(el) {
  if (!el) return;
  el.removeAttribute('disabled');
  ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach(evt => {
    el.dispatchEvent(new MouseEvent(evt, { bubbles: true, cancelable: true, composed: true, view: window }));
  });
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

  // Focus and input prompt using prototype setter so React/Lit state updates
  inputEl.focus();
  if (inputEl.tagName === 'TEXTAREA' || inputEl.tagName === 'INPUT') {
    const prototype = inputEl.tagName === 'TEXTAREA' 
      ? window.HTMLTextAreaElement.prototype 
      : window.HTMLInputElement.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
    if (descriptor && descriptor.set) {
      descriptor.set.call(inputEl, prompt);
    } else {
      inputEl.value = prompt;
    }
    inputEl.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    inputEl.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  } else {
    inputEl.innerText = prompt;
    inputEl.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  }

  await sleep(400);

  // Trigger submit: 1) Press Enter
  ['keydown', 'keypress', 'keyup'].forEach(evt => {
    inputEl.dispatchEvent(new KeyboardEvent(evt, {
      key: 'Enter',
      code: 'Enter',
      keyCode: 13,
      which: 13,
      bubbles: true,
      cancelable: true,
      composed: true
    }));
  });

  // 2) Click the submit button
  const genBtn = findGenerateButton(inputEl);
  if (genBtn) {
    triggerClick(genBtn);
  }

  socket.send(JSON.stringify({
    type: "INFO",
    message: "Prompt submitted successfully into Google Flow!"
  }));
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Connect automatically on page load
connectBridge();
setInterval(connectBridge, 4000);
