import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { generateClip, listRecentClips, downloadLatestClip } from './flow.js';
import { extensionBridge } from './ws-bridge.js';

// Start the WebSocket bridge for Chrome Extension
extensionBridge.start();

const server = new McpServer({
  name: 'google-flow',
  version: '0.1.0',
});

// ── Tool: flow_generate ───────────────────────────────────────────────────────
server.tool(
  'flow_generate',
  'Generate an AI video clip on Google Flow from a text prompt. Returns the local file path of the saved .mp4.',
  {
    prompt: z.string().describe('Describe the video clip to generate'),
    aspectRatio: z
      .enum(['9:16', '16:9', '1:1'])
      .default('9:16')
      .describe('Aspect ratio — use 9:16 for YouTube Shorts'),
  },
  async ({ prompt, aspectRatio }) => {
    try {
      const filePath = await generateClip(prompt, aspectRatio);
      return {
        content: [{ type: 'text', text: `✅ Generated: ${filePath}` }],
      };
    } catch (err) {
      return {
        content: [{ type: 'text', text: `❌ Error: ${(err as Error).message}` }],
        isError: true,
      };
    }
  }
);

// ── Tool: flow_list ───────────────────────────────────────────────────────────
server.tool(
  'flow_list',
  'List all previously generated video clips saved to F:\\YT\\assets\\flow\\, newest first.',
  {},
  async () => {
    const clips = await listRecentClips();
    return {
      content: [
        {
          type: 'text',
          text: clips.length ? clips.join('\n') : '📂 No clips found in F:\\YT\\assets\\flow\\',
        },
      ],
    };
  }
);

// ── Tool: flow_download ───────────────────────────────────────────────────────
server.tool(
  'flow_download',
  'Download the most recently completed clip from the active Google Flow tab into F:\\YT\\assets\\flow\\.',
  {},
  async () => {
    try {
      const filePath = await downloadLatestClip();
      return {
        content: [{ type: 'text', text: `✅ Downloaded: ${filePath}` }],
      };
    } catch (err) {
      return {
        content: [{ type: 'text', text: `❌ Error: ${(err as Error).message}` }],
        isError: true,
      };
    }
  }
);

// ── Start server ──────────────────────────────────────────────────────────────
const transport = new StdioServerTransport();
await server.connect(transport);

