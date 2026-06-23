import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';
import express from 'express';
import { WebSocketServer } from 'ws';
import { RoomManager } from './rooms.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3001;
const clientDist = join(__dirname, '../../client/dist');

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
const wss = new WebSocketServer({ server, path: '/ws' });
const rooms = new RoomManager();

wss.on('connection', (ws) => {
  ws.on('message', (data) => rooms.handleMessage(ws, data.toString()));
  ws.on('close', () => rooms.handleClose(ws));
  ws.on('error', () => rooms.handleClose(ws));
});

// Keep-alive ping so idle WebSockets (and proxies) don't silently drop.
const heartbeat = setInterval(() => {
  for (const ws of wss.clients) {
    if (ws.readyState === ws.OPEN) ws.ping();
  }
}, 30_000);
wss.on('close', () => clearInterval(heartbeat));

server.listen(PORT, () => {
  console.log(`🕹️  EL Arcade server listening on http://localhost:${PORT}`);
  if (!existsSync(clientDist)) {
    console.log('   (client not built yet — run the Vite dev server for the UI)');
  }
});
