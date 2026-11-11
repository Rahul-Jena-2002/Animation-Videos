import puppeteer, { type Browser, type Page } from 'puppeteer-core';
import { SEL } from './selectors.js';

const CDP_URL = 'http://localhost:9222';
const FLOW_URL = 'https://flow.google.com';

export async function connectBrowser(): Promise<Browser> {
  try {
    const browser = await puppeteer.connect({ browserURL: CDP_URL, defaultViewport: null });
    return browser;
  } catch {
    throw new Error(
      'Cannot connect to Chrome on port 9222.\n' +
      'Run the launcher: powershell -File .agents/plugins/google-flow/mcp/launch-chrome.ps1\n' +
      'Then log into your Google account in the Chrome window that opens.'
    );
  }
}

export async function getFlowPage(browser: Browser): Promise<Page> {
  const pages = await browser.pages();

  // Try to find an existing Flow tab
  for (const page of pages) {
    const url = page.url();
    if (url.includes('flow.google.com')) {
      await page.bringToFront();
      return page;
    }
  }

  // Open a new Flow tab
  const page = await browser.newPage();
  await page.goto(FLOW_URL, { waitUntil: 'domcontentloaded' });
  return page;
}

export async function checkLoggedIn(page: Page): Promise<boolean> {
  try {
    // If Google login link appears within 2s, we are NOT logged in
    await page.waitForSelector(SEL.loginCheck, { timeout: 2000 });
    return false;
  } catch {
    // Selector not found = good, we are logged in
    return true;
  }
}

