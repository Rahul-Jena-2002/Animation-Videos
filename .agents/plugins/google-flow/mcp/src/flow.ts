import fs from 'node:fs';
import path from 'node:path';
import { connectBrowser, getFlowPage, checkLoggedIn } from './browser.js';
import { extensionBridge } from './ws-bridge.js';
import { SEL } from './selectors.js';

const OUTPUT_DIR = 'F:\\YT\\assets\\flow';
const POLL_INTERVAL_MS = 5000;
const MAX_WAIT_MS = 5 * 60 * 1000; // 5 minutes

// Ensure output directory exists
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Simple mutex: one generation at a time
let generating = false;

export async function generateClip(
  prompt: string,
  aspectRatio: '9:16' | '16:9' | '1:1' = '9:16'
): Promise<string> {
  if (generating) {
    throw new Error('A generation is already in progress. Please wait for it to finish.');
  }
  generating = true;

  try {
    // 1. If Chrome extension is connected via WebSocket, prioritize it!
    if (extensionBridge.isConnected()) {
      console.log("[Flow] Using active Chrome Extension bridge...");
      const res = await extensionBridge.sendCommand("GENERATE", { prompt, aspectRatio });
      if (res.videoUrl) {
        return `Video generated via Chrome Extension: ${res.videoUrl}`;
      }
      return "Video generation triggered on flow.google.com via Chrome Extension.";
    }

    // 2. Otherwise fall back to CDP browser session
    const browser = await connectBrowser();
    const page = await getFlowPage(browser);

    const loggedIn = await checkLoggedIn(page);
    if (!loggedIn) {
      throw new Error(
        'Not logged in to Google Flow. Please sign into your Google account in the Chrome window.'
      );
    }

    // Clear and type prompt
    await page.waitForSelector(SEL.promptInput, { timeout: 10000 });
    await page.click(SEL.promptInput);
    await page.keyboard.down('Control');
    await page.keyboard.press('KeyA');
    await page.keyboard.up('Control');
    await page.type(SEL.promptInput, prompt);

    // Try setting aspect ratio via aria-label buttons (best effort)
    const ariaMap: Record<string, string> = {
      '9:16': 'Vertical',
      '16:9': 'Horizontal',
      '1:1':  'Square',
    };
    const ariaLabel = ariaMap[aspectRatio];
    try {
      const ratioBtn = await page.$(`button[aria-label*="${ariaLabel}"]`);
      if (ratioBtn) await ratioBtn.click();
    } catch {
      // Aspect ratio selector not found — Flow may not expose it; continue
    }

    // Click Generate
    await page.waitForSelector(SEL.generateButton, { timeout: 5000 });
    await page.click(SEL.generateButton);

    // Poll until progress bar disappears (generation complete)
    const start = Date.now();
    while (Date.now() - start < MAX_WAIT_MS) {
      await sleep(POLL_INTERVAL_MS);
      const bar = await page.$(SEL.progressBar);
      if (!bar) break;
    }

    // Download the video
    return await downloadFromPage(page, 'generated');
  } finally {
    generating = false;
  }
}

export async function downloadLatestClip(): Promise<string> {
  const browser = await connectBrowser();
  const page = await getFlowPage(browser);

  const loggedIn = await checkLoggedIn(page);
  if (!loggedIn) {
    throw new Error('Not logged in to Google Flow.');
  }

  return await downloadFromPage(page, 'manual');
}

export async function listRecentClips(): Promise<string[]> {
  if (!fs.existsSync(OUTPUT_DIR)) return [];

  return fs
    .readdirSync(OUTPUT_DIR)
    .filter(f => f.endsWith('.mp4'))
    .map(f => ({ name: f, mtime: fs.statSync(path.join(OUTPUT_DIR, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime)
    .map(f => path.join(OUTPUT_DIR, f.name));
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function downloadFromPage(page: import('puppeteer-core').Page, tag: string): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outPath = path.join(OUTPUT_DIR, `${timestamp}-${tag}.mp4`);

  // Intercept the next video response
  const videoUrl = await interceptVideoUrl(page);

  if (videoUrl) {
    // Use page.evaluate to fetch and return as base64, then write to disk
    const base64 = await page.evaluate(async (url: string) => {
      const res = await fetch(url);
      const buf = await res.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = '';
      bytes.forEach(b => (binary += String.fromCharCode(b)));
      return btoa(binary);
    }, videoUrl);

    fs.writeFileSync(outPath, Buffer.from(base64, 'base64'));
    return outPath;
  }

  // Fallback: click download button and use Chrome's download interception
  await page.waitForSelector(SEL.downloadButton, { timeout: 10000 });
  await page.click(SEL.downloadButton);
  await sleep(3000);
  return outPath;
}

async function interceptVideoUrl(page: import('puppeteer-core').Page): Promise<string | null> {
  return new Promise(resolve => {
    const timeout = setTimeout(() => resolve(null), 8000);

    page.once('response', async response => {
      const ct = response.headers()['content-type'] ?? '';
      if (ct.includes('video/mp4') || ct.includes('video/webm')) {
        clearTimeout(timeout);
        resolve(response.url());
      }
    });
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

