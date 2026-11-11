# Google Flow Bridge — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an Antigravity IDE plugin that connects to Google Flow (flow.google.com) via Chrome CDP to generate AI video clips and auto-save them into the workspace (F:\YT).

**Architecture:** A local Node.js MCP server uses `puppeteer-core` over Chrome DevTools Protocol (CDP) to control a persistent Chrome window where the user is logged into Google Flow. Antigravity's agent invokes MCP tools to submit prompts, poll generation status, and download completed `.mp4` files into the workspace. A companion Antigravity skill teaches the agent the workflow and tool signatures.

**Tech Stack:** Node.js 22+, puppeteer-core, @modelcontextprotocol/sdk, TypeScript, Chrome (CDP port 9222), Antigravity plugin system (plugin.json + SKILL.md + mcp_config.json)

**Spec:** This document is the spec.

## Global Constraints

- Node.js >= 22 (already installed v24.19.0)
- Chrome at `C:\Program Files\Google\Chrome\Application\chrome.exe`
- MCP server lives at `F:\YT\.agents\plugins\google-flow\mcp\`
- Plugin root: `F:\YT\.agents\plugins\google-flow\`
- Output videos saved to `F:\YT\assets\flow\`
- CDP debug port: `9222`
- All TypeScript compiled to `dist/` via `tsc`
- No external state store; Chrome user-data-dir persists sessions at `F:\YT\.agents\plugins\google-flow\mcp\chrome-profile\`

## Review Focus

- Google login session expiry: Chrome profile persists cookies — if session expires, `connect` tool should detect the login page and return a clear error asking user to re-login in the Chrome window.
- Flow UI changes: selectors are stored in a single `selectors.ts` file so they can be patched without touching business logic.
- Download interception race: video download must wait for the network response with a `.mp4` content-type before resolving, not just a fixed timeout.
- Multiple concurrent generates: MCP server should queue requests (one active generation at a time) and reject parallel calls with a clear message.
- Port 9222 already in use: `launch-chrome` script should detect the port and skip re-launch if Chrome is already running with CDP.

---

## Task 1: Project Scaffold & Build Config

**Files:**
- Create: `F:\YT\.agents\plugins\google-flow\mcp\package.json`
- Create: `F:\YT\.agents\plugins\google-flow\mcp\tsconfig.json`
- Create: `F:\YT\.agents\plugins\google-flow\mcp\src\selectors.ts`

**Interfaces:**
- Produces: compiled entry at `dist/index.js`, selector constants used by all later tasks

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "google-flow-mcp",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "puppeteer-core": "^22.0.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "@types/node": "^20.0.0"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: Create `src/selectors.ts`** — single source of truth for all Flow UI selectors

```typescript
// All CSS/XPath selectors for flow.google.com — update here if Flow UI changes
export const SEL = {
  promptInput:     'textarea[aria-label*="prompt"], textarea[placeholder*="Describe"]',
  generateButton:  'button[aria-label*="Generate"], button:has-text("Generate")',
  progressBar:     '[role="progressbar"], .generation-progress',
  downloadButton:  'button[aria-label*="Download"], a[download]',
  videoPlayer:     'video',
  loginCheck:      'a[href*="accounts.google.com"], [data-signin]',
};
```

- [ ] **Step 4: Install dependencies**

Run: `cd F:\YT\.agents\plugins\google-flow\mcp && npm install`
Expected: `node_modules/` created, no errors

- [ ] **Step 5: Verify build compiles cleanly**

Run: `npm run build`
Expected: `dist/` folder created, exit code 0

- [ ] **Step 6: Commit**

```
git add F:\YT\.agents\plugins\google-flow\mcp\
git commit -m "feat(flow): scaffold MCP server project"
```

---

## Task 2: Chrome Launcher Script

**Files:**
- Create: `F:\YT\.agents\plugins\google-flow\mcp\launch-chrome.ps1`

**Interfaces:**
- Produces: a running Chrome process with CDP on port 9222 and the persistent profile; consumed by Task 3's `browser.ts`

- [ ] **Step 1: Create `launch-chrome.ps1`**

```powershell
$cdpPort = 9222
$chromePath = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$profileDir = "$PSScriptRoot\chrome-profile"

# Check if CDP is already listening
$listening = netstat -ano | Select-String ":$cdpPort "
if ($listening) {
    Write-Host "Chrome CDP already running on port $cdpPort — skipping launch."
    exit 0
}

New-Item -ItemType Directory -Force -Path $profileDir | Out-Null

Start-Process -FilePath $chromePath -ArgumentList @(
    "--remote-debugging-port=$cdpPort",
    "--user-data-dir=$profileDir",
    "--no-first-run",
    "--no-default-browser-check",
    "https://flow.google.com"
)

Write-Host "Chrome launched. Log into your Google account in the Chrome window, then run 'flow: Connect' in Antigravity."
```

- [ ] **Step 2: Register as a VS Code / Antigravity task** in `F:\YT\.agents\plugins\google-flow\tasks.json`

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Google Flow: Launch Chrome",
      "type": "shell",
      "command": "powershell -File ${workspaceFolder}/.agents/plugins/google-flow/mcp/launch-chrome.ps1",
      "group": "none",
      "presentation": { "reveal": "always" }
    }
  ]
}
```

- [ ] **Step 3: Verify manually**

Run `launch-chrome.ps1` in PowerShell. Confirm Chrome opens to `flow.google.com`. Confirm port 9222 is bound (`netstat -ano | findstr 9222`). Confirm running script a second time prints "already running" and exits cleanly.

- [ ] **Step 4: Commit**

```
git commit -am "feat(flow): add Chrome CDP launcher script"
```

---

## Task 3: Chrome CDP Bridge (`browser.ts`)

**Files:**
- Create: `F:\YT\.agents\plugins\google-flow\mcp\src\browser.ts`

**Interfaces:**
- Consumes: `SEL` from `selectors.ts`; CDP on `localhost:9222`
- Produces:
  - `connectBrowser(): Promise<Browser>` — attaches puppeteer to running Chrome
  - `getFlowPage(browser: Browser): Promise<Page>` — returns the Flow tab or opens one
  - `checkLoggedIn(page: Page): Promise<boolean>` — true if not on a login/redirect page

- [ ] **Step 1: Implement `src/browser.ts`**

Signatures:
```typescript
import puppeteer, { Browser, Page } from 'puppeteer-core';
import { SEL } from './selectors.js';

export async function connectBrowser(): Promise<Browser>
// Connect to ws://localhost:9222 using puppeteer.connect({ browserURL })

export async function getFlowPage(browser: Browser): Promise<Page>
// Find open tab matching flow.google.com or open a new one; bring it to front

export async function checkLoggedIn(page: Page): Promise<boolean>
// Wait 2s for SEL.loginCheck; if found, return false; else true
```

- [ ] **Step 2: Build and verify types compile**

Run: `npm run build`
Expected: no TypeScript errors

- [ ] **Step 3: Commit**

```
git commit -am "feat(flow): add Chrome CDP browser bridge"
```

---

## Task 4: Flow Automation Core (`flow.ts`)

**Files:**
- Create: `F:\YT\.agents\plugins\google-flow\mcp\src\flow.ts`

**Interfaces:**
- Consumes: `connectBrowser`, `getFlowPage`, `checkLoggedIn` from `browser.ts`; `SEL` from `selectors.ts`
- Produces:
  - `generateClip(prompt: string, aspectRatio: "9:16" | "16:9" | "1:1"): Promise<string>` — returns local file path of saved `.mp4`
  - `listRecentClips(): Promise<string[]>` — returns list of paths under `F:\YT\assets\flow\`
  - `downloadLatestClip(): Promise<string>` — downloads most recently completed clip, returns path

- [ ] **Step 1: Create output directory**

Ensure `F:\YT\assets\flow\` exists in script startup; use `fs.mkdirSync` with `{ recursive: true }`.

- [ ] **Step 2: Implement `generateClip`**

```typescript
export async function generateClip(
  prompt: string,
  aspectRatio: "9:16" | "16:9" | "1:1" = "9:16"
): Promise<string>
```

Steps inside: connect browser → get page → check login (throw `"Not logged in"` if false) → type prompt into `SEL.promptInput` → set aspect ratio if selector available → click `SEL.generateButton` → poll for `SEL.progressBar` to disappear (max 5 min, check every 5s) → trigger download → intercept response with `Content-Type: video/mp4` → pipe to `F:\YT\assets\flow\<timestamp>.mp4` → return file path.

- [ ] **Step 3: Implement `listRecentClips`**

```typescript
export async function listRecentClips(): Promise<string[]>
```

Returns `fs.readdirSync("F:\\YT\\assets\\flow")` filtered to `.mp4`, sorted newest-first (by mtime), mapped to full paths.

- [ ] **Step 4: Implement `downloadLatestClip`**

```typescript
export async function downloadLatestClip(): Promise<string>
```

Connect browser → get page → check login → find `SEL.downloadButton` → click and intercept `.mp4` response → save to `F:\YT\assets\flow\<timestamp>-manual.mp4` → return path.

- [ ] **Step 5: Build**

Run: `npm run build`
Expected: no errors

- [ ] **Step 6: Commit**

```
git commit -am "feat(flow): add Flow automation core"
```

---

## Task 5: MCP Server Entry Point (`index.ts`)

**Files:**
- Create: `F:\YT\.agents\plugins\google-flow\mcp\src\index.ts`

**Interfaces:**
- Consumes: `generateClip`, `listRecentClips`, `downloadLatestClip` from `flow.ts`
- Produces: running MCP stdio server exposing three tools: `flow_generate`, `flow_list`, `flow_download`

- [ ] **Step 1: Implement `src/index.ts`**

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { generateClip, listRecentClips, downloadLatestClip } from "./flow.js";

const server = new McpServer({ name: "google-flow", version: "0.1.0" });

// Tool: flow_generate
server.tool("flow_generate",
  { prompt: z.string(), aspectRatio: z.enum(["9:16","16:9","1:1"]).default("9:16") },
  async ({ prompt, aspectRatio }) => {
    const path = await generateClip(prompt, aspectRatio);
    return { content: [{ type: "text", text: `Generated: ${path}` }] };
  }
);

// Tool: flow_list
server.tool("flow_list", {}, async () => {
  const clips = await listRecentClips();
  return { content: [{ type: "text", text: clips.join("\n") || "No clips found." }] };
});

// Tool: flow_download
server.tool("flow_download", {}, async () => {
  const path = await downloadLatestClip();
  return { content: [{ type: "text", text: `Downloaded: ${path}` }] };
});

const transport = new StdioServerTransport();
await server.connect(transport);
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: `dist/index.js` present, exit 0

- [ ] **Step 3: Smoke-test MCP server**

Run: `echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node dist/index.js`
Expected: JSON response listing `flow_generate`, `flow_list`, `flow_download`

- [ ] **Step 4: Commit**

```
git commit -am "feat(flow): add MCP server with 3 tools"
```

---

## Task 6: Antigravity Plugin Wiring

**Files:**
- Create: `F:\YT\.agents\plugins\google-flow\plugin.json`
- Create: `F:\YT\.agents\plugins\google-flow\mcp_config.json`
- Create: `F:\YT\.agents\plugins\google-flow\skills\google-flow\SKILL.md`

**Interfaces:**
- Consumes: `dist/index.js` from Task 5
- Produces: installed Antigravity plugin; agent can invoke `flow_generate`, `flow_list`, `flow_download` as tools

- [ ] **Step 1: Create `plugin.json`**

```json
{
  "name": "google-flow",
  "version": "0.1.0",
  "description": "Connect Antigravity to Google Flow for AI video generation (YouTube Shorts).",
  "skills": ["skills/google-flow"],
  "mcpServers": ["mcp_config.json"]
}
```

- [ ] **Step 2: Create `mcp_config.json`**

```json
{
  "mcpServers": {
    "google-flow": {
      "command": "node",
      "args": ["F:/YT/.agents/plugins/google-flow/mcp/dist/index.js"],
      "env": {}
    }
  }
}
```

- [ ] **Step 3: Create `SKILL.md`**

Skill teaches Antigravity:
- How to launch Chrome (run `launch-chrome.ps1` once)
- How to call `flow_generate` with a prompt and `aspectRatio: "9:16"` for Shorts
- How to call `flow_list` to see saved clips
- How to call `flow_download` to fetch the latest clip
- Where clips are saved (`F:\YT\assets\flow\`)

- [ ] **Step 4: Reload Antigravity and verify tools appear**

In Antigravity IDE, reload the window. Open a new chat and ask: "List my Google Flow tools." Confirm `flow_generate`, `flow_list`, `flow_download` appear in the tool list.

- [ ] **Step 5: End-to-end test**

With Chrome open and logged into `flow.google.com`, ask Antigravity: "Generate a 9:16 clip of a neon city timelapse." Confirm: a `.mp4` appears in `F:\YT\assets\flow\`.

- [ ] **Step 6: Commit**

```
git commit -am "feat(flow): wire Antigravity plugin, skill, and MCP config"
```
