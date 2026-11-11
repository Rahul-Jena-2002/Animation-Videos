---
name: google-flow
description: Connect Antigravity to Google Flow (flow.google.com) to generate AI video clips for YouTube Shorts. Provides tools to generate, list, and download clips directly into the workspace.
---

# Google Flow Bridge

Use this skill to generate AI video clips via Google Flow and save them to `F:\YT\assets\flow\`.

## One-Time Setup

Before using for the first time, launch Chrome with CDP enabled:

```powershell
powershell -File "F:\YT\.agents\plugins\google-flow\mcp\launch-chrome.ps1"
```

This opens Chrome to `flow.google.com`. **Sign into your Google account** in that window. You only need to do this once — the session is saved in a dedicated Chrome profile.

## Available Tools

### `flow_generate` — Generate a clip from a prompt
Use this to create a new AI video clip. Always use `aspectRatio: "9:16"` for YouTube Shorts.

**Example:** "Generate a 9:16 clip of a neon Tokyo street at night with rain"

### `flow_list` — List saved clips
Lists all `.mp4` files previously saved to `F:\YT\assets\flow\`, newest first.

### `flow_download` — Download latest clip
Downloads the most recently completed clip from the active Google Flow tab.

## Workflow for YouTube Shorts

1. Launch Chrome (one-time): run `launch-chrome.ps1`
2. Log in to Google Flow in the Chrome window
3. In Antigravity: use `flow_generate` with your prompt and `aspectRatio: "9:16"`
4. Wait for generation (up to 5 minutes)
5. The `.mp4` is auto-saved to `F:\YT\assets\flow\`
6. Edit and upload to YouTube Shorts

## Troubleshooting

- **"Cannot connect to Chrome"** → Run `launch-chrome.ps1` first
- **"Not logged in"** → Sign into Google in the Chrome window, then retry
- **"Generation already in progress"** → Wait for the current clip to finish
- **Selectors broken (Flow UI changed)** → Update `F:\YT\.agents\plugins\google-flow\mcp\src\selectors.ts` and rebuild with `npm run build`
