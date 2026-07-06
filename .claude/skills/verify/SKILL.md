---
name: verify
description: Build/launch/drive recipe for verifying EL Arcade changes end-to-end (multi-client browser games over WebSocket).
---

# Verifying EL Arcade changes

The surface is a browser GUI: React client (Vite, :5173) talking WS to the Node
server (:3001, proxied by Vite). Almost every change needs **multiple players**,
so drive it with several isolated browser contexts in one Playwright script.

## Launch

```bash
npm run dev   # background; server :3001 + Vite :5173, ready in ~2s
```

## Drive (what worked)

- `playwright-core` (install in the scratchpad, not the repo) + the cached
  Chromium under `~/Library/Caches/ms-playwright/chromium-*/chrome-mac-arm64/
  Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`
  via `chromium.launch({ executablePath })`. No download needed.
- One `browser.newContext()` per player — isolated localStorage, so the
  room-resume token doesn't leak between players.
- Lobby flow: fill `input[placeholder="Your name"]` → host clicks
  `.cabinet` with the game's display name → read code from `.code-value` →
  others fill `input[placeholder="CODE"]` and click `.join .btn.primary` →
  host clicks "Start game ▶".
- Canvas games: sample the *buffer* via
  `canvas.getContext('2d').getImageData(x, y, 1, 1).data[3]` (buffer is
  1000×1000; CSS background shows through transparent pixels, so alpha>0 =
  painted, 0 = erased/blank). Drag with `page.mouse` mapped through
  `boundingBox()`.
- Wire assertions: monkey-patch `WebSocket.prototype.send` in the page to
  capture `{type:'move', move}` payloads (e.g. check stroke chunking caps).

## Gotchas

- Timed phases (Telephone writes 50s / draws 80s; Draw & Guess) really run —
  budget the wait, or have all present players submit to advance instantly.
- If the last player's submit completes a round, the "Locked in!" waiting
  screen never renders — don't assert on it; assert on the next phase or the
  reveal content instead.
- Server hot-reloads via tsx watch — editing server files mid-run resets
  in-memory rooms; restart the drive script after server edits.
