# EL Arcade — working notes for Claude

A tiny server-authoritative multiplayer arcade (React+Vite client, Node+`ws` server,
one shared typed protocol). `README.md` is the human-facing overview and has the
canonical **"Adding a new game"** steps — read it first. This file captures the
non-obvious things that bite when extending the codebase.

## Commands

- `npm run dev` — runs server (tsx watch) + client (Vite) together.
- `npm run typecheck` — **the only real safety net.** Typechecks `server/tsconfig.json`
  *and* the client. The server has **no build step** (it runs via `tsx`), so `npm run build`
  only builds the client — it will NOT catch server type errors. Always run `npm run typecheck`
  after server changes.
- `npm run build` — client-only production build into `client/dist`.

## Architecture cheatsheet

- `shared/protocol.ts` — dependency-free types imported by both sides. Uses **`.js`
  import extensions even from `.ts`** (NodeNext/ESM); follow that or imports break.
- The room engine (`server/src/rooms.ts`) is fully game-agnostic and drives every game
  through `GAME_MODULES` (`server/src/games/index.ts`). You almost never edit `rooms.ts`.
- A `GameModule` has `createState` + `applyMove`, plus optional hooks:
  - **`viewFor(state, viewerId)`** — per-viewer redaction for hidden info (viewerId is
    `null` for spectators). Used by Battleship, UNO, Memory, Draw & Guess, Telephone.
  - **`tick(state)`** — server clock called ~1×/sec while `status==='playing'`; return
    `changed:true` to broadcast. Used by timed games (Draw & Guess, Telephone).
  - **`botMove(state, botId)`** — CPU opponent; return the move to make now or `null`.
    Driven on a ~1s timer; chains for push-your-luck/multi-bot turns. (`server/src/games/bots.ts`)
  - **`removePlayer(state, playerId)`** — drop a player mid-game so 3-4 player games keep
    going; return the new state, or `null` if too few remain (the room ends the round).
    Built on the `removeSeat` helper (`server/src/games/seating.ts`). Implemented for the
    turn-based multiplayer games incl. Draw & Guess (whose drawer-relative rotation tolerates
    a mid-game leave). Omit for 2-player games and Telephone/Fishbowl (fixed-roster
    album/team rotation can't drop a player cleanly), which end the round on a leave.

## Gotchas the README glosses over

When you add a game, the README's "branch on `gameState.kind` in RoomScreen" is **three**
edits in `client/src/components/RoomScreen.tsx`, not one:
1. The board branch in the JSX (`g.kind === '…' ? <Board…/> :`).
2. **Banner logic** assumes every game has a turn (`'turn' in g`). A game without a `turn`
   field, or one whose board renders its own header (Draw & Guess, Telephone), shows a
   stale "Waiting…" unless you add its kind to the banner-suppression branch.
3. The **sfx effect** has a `progress = g.moves` switch — add `moves`-based games there or
   move sound effects won't fire.

Other engine facts worth knowing:
- **Simultaneous / non-turn-based games are supported** — no `turn` field required
  (Telephone has none; all players act each round, advanced by submit-count or `tick`).
- **`applyMove(state, playerId, move)` gets no room/host context.** If a game needs a
  host-only action (e.g. Telephone's reveal stepping), use **`seating[0]` as the host
  proxy** — `room.players[0]` is the creator/host at game start. Gate the client UI on
  `room.hostId` (they coincide). Don't change the `GameModule` signature for this.
- **Non-competitive games finish via `winner: 'draw'`** (so `settleResult` awards no points)
  and should suppress the generic banner and show their own wrap-up in the board.
- `Math.random()` is used freely server-side (e.g. `pickWord`, room codes) — no determinism
  constraint in this repo.

## Lobby / catalog

The home screen (`HomeScreen.tsx`) is **categorized + filterable**, not a flat list. Every
`GAMES` entry needs a **`category`** (one of `CATEGORIES`: strategy/dice/party/cards/race);
it then auto-slots into the right section and filter chip. The player-count filter/badge is
**derived** from `minPlayers`/`maxPlayers` (`isDuo`, `playerCountLabel`) — don't add a
separate field. Telephone (3–8) and Fishbowl (4–8) are the games that seat more than 4.
