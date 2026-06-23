import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In dev, the client runs on :5173 and proxies the WebSocket to the Node
// server on :3001. In production the Node server serves the built client and
// the WS lives at the same origin, so no proxy is needed.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/ws': {
        target: 'ws://localhost:3001',
        ws: true,
      },
    },
    // Allow importing ../shared from outside the client root.
    fs: { allow: ['..'] },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
