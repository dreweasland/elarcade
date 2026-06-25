import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';
import express from 'express';
import { WebSocket, WebSocketServer } from 'ws';
import { RoomManager } from './rooms.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3001;
const clientDist = join(__dirname, '../../client/dist');
// Cap incoming WS frames well below the ws default of 100 MiB. Real messages
// are a small move or one drawing; this blocks oversized-payload JSON.parse DoS.
const MAX_WS_PAYLOAD = 2 * 1024 * 1024; // 2 MiB

const app = express();

// Health check (handy for hosting platforms).
app.get('/healthz', (_req, res) => res.json({ ok: true }));

// Serve the built client in production. In dev, Vite serves the client on its
// own port and proxies /ws back here, so this block is simply skipped.
if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => res.sendFile(join(clientDist, 'index.html')));
}

const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws', maxPayload: MAX_WS_PAYLOAD });
const rooms = new RoomManager();

// Liveness tracking for the heartbeat (kept off the ws object via a WeakMap).
const alive = new WeakMap<WebSocket, boolean>();

wss.on('connection', (ws) => {
  alive.set(ws, true);
  ws.on('pong', () => alive.set(ws, true));
  ws.on('message', (data) => rooms.handleMessage(ws, data.toString()));
  ws.on('close', () => rooms.handleClose(ws));
  ws.on('error', () => rooms.handleClose(ws));
});

// Keep-alive: ping every 30s AND reap connections that stopped answering, so a
// client that vanished without a TCP close (sleep, Wi-Fi drop, NAT timeout)
// doesn't hold its seat as a ghost. terminate() fires 'close' -> handleClose.
const heartbeat = setInterval(() => {
  for (const ws of wss.clients) {
    if (alive.get(ws) === false) {
      ws.terminate();
      continue;
    }
    alive.set(ws, false);
    ws.ping();
  }
}, 30_000);
wss.on('close', () => clearInterval(heartbeat));

server.listen(PORT, () => {
  console.log(`🕹️  EL Arcade server listening on http://localhost:${PORT}`);
  if (!existsSync(clientDist)) {
    console.log('   (client not built yet — run the Vite dev server for the UI)');
  }
});
