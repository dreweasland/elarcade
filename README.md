# 🕹️ EL Arcade

A tiny multiplayer arcade built for **E**merson & **L**eighton. Players join from
their own phones, tablets, or laptops using a short room code — no accounts, no
passwords, just pick a name and an avatar and play.

**Games: Tic-Tac-Toe, Connect Four, Battleship, UNO, Memory Match, Pig (1 or 2 dice), Dots & Boxes, Draw & Guess & Zombie Dice.** More cabinets drop in easily.

## Features

- 🌐 **Real-time multiplayer** across separate devices (WebSockets)
- 🎮 **Arcade lobby** with shareable 4-letter room codes
- 👾 Pick-a-name + emoji avatar, no login
- 🏆 Session win counter
- 🔊 Synthesized arcade sound effects (toggleable mute)
- ↻ Rematch button
- 📶 Reconnect-on-drop (rejoins a game in progress if WiFi blips)
- 📱 Mobile-first neon UI

## Tech

| Part   | Stack                                            |
| ------ | ------------------------------------------------ |
| Client | React + TypeScript + Vite, custom neon CSS       |
| Server | Node + TypeScript (tsx), Express + `ws`          |
| Shared | One typed protocol file (`shared/protocol.ts`)   |

The server is **authoritative** — it owns all game state, so clients can't cheat.

## Run it locally

```bash
npm install
npm run dev
```

- Client (with hot reload): http://localhost:5173
- Server + WebSocket: http://localhost:3001 (Vite proxies `/ws` to it)

Open the client URL on two devices/tabs, create a room on one, and join with the
code on the other. (On another device, use your computer's LAN IP, e.g.
`http://192.168.1.20:5173`.)

## Production build

```bash
npm run build   # builds the client into client/dist
npm start       # serves the client + WebSocket on PORT (default 3001)
```

Then open http://localhost:3001.

## Deploy (play across houses)

This repo includes `render.yaml`. To deploy on [Render](https://render.com):

1. Push this repo to GitHub.
2. In Render: **New → Blueprint**, point it at the repo.
3. It builds and gives you a public `https://…onrender.com` URL.

Any host that runs a Node web service works (Fly.io, Railway, etc.) — build with
`npm run build`, start with `npm start`, and make sure WebSocket upgrades are
allowed (they are by default on the platforms above).

> Note: the free tier sleeps when idle and rooms live in memory, so a long
> period of inactivity resets active rooms. Perfect for casual family play.

## Adding a new game

The engine is game-agnostic; a new game is four small, local changes:

1. **Types** — add an entry to `GAMES` in `shared/protocol.ts` plus your
   `…State` (with a `kind` tag) and `…Move` types; add them to the `GameState`
   / `GameMove` unions.
2. **Rules** — add a module under `server/src/games/` (see `connectFour.ts`)
   exporting `create…` and `apply…Move`.
3. **Register** — add it to `GAME_MODULES` in `server/src/games/index.ts`. The
   room manager, scoring, rematch, spectators, and reconnect all work for free.
4. **Board** — add a board component on the client and branch on
   `gameState.kind` in `RoomScreen.tsx`.

No changes to `rooms.ts` are needed — it drives every game through the registry.
