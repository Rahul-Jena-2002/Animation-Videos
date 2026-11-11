import { WebSocketServer, WebSocket } from 'ws';

const WS_PORT = 7822;

class ExtensionBridge {
  private wss: WebSocketServer | null = null;
  private client: WebSocket | null = null;

  start() {
    if (this.wss) return;

    this.wss = new WebSocketServer({ port: WS_PORT });
    console.log(`[Bridge] WebSocket server listening on ws://127.0.0.1:${WS_PORT}`);

    this.wss.on('connection', (ws) => {
      console.log('[Bridge] Chrome extension connected!');
      this.client = ws;

      ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString());
          console.log('[Bridge] Received from extension:', msg);
        } catch (e) {}
      });

      ws.on('close', () => {
        console.log('[Bridge] Chrome extension disconnected');
        if (this.client === ws) {
          this.client = null;
        }
      });
    });
  }

  isConnected(): boolean {
    return this.client !== null && this.client.readyState === WebSocket.OPEN;
  }

  async sendCommand(action: string, payload: any = {}): Promise<any> {
    const ws = this.client;
    if (!this.isConnected() || !ws) {
      throw new Error("Chrome extension is not connected. Make sure Chrome has the extension installed and flow.google.com is open!");
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Timeout waiting for response from Google Flow extension."));
      }, 300000); // 5 min timeout for video generation

      const onMessage = (data: any) => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.type === "COMPLETE" || msg.type === "INFO") {
            cleanup();
            resolve(msg);
          } else if (msg.type === "ERROR") {
            cleanup();
            reject(new Error(msg.message || "Unknown error from Google Flow"));
          }
        } catch (e) {}
      };

      const cleanup = () => {
        clearTimeout(timeout);
        ws.off('message', onMessage);
      };

      ws.on('message', onMessage);
      ws.send(JSON.stringify({ action, ...payload }));
    });
  }
}

export const extensionBridge = new ExtensionBridge();
