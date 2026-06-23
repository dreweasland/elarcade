import type { WebSocket } from 'ws';
import {
  GameId,
  GameMove,
  GameState,
  GAMES,
  PlayerIdentity,
  RoomState,
  ServerMessage,
} from '../../shared/protocol.js';
import { GAME_MODULES } from './games/index.js';

interface PlayerRecord {
  id: string;
  name: string;
  avatar: string;
  token: string;
  ws: WebSocket | null; // null while disconnected (awaiting reconnect)
}

interface Room {
  code: string;
  game: GameId;
  status: 'waiting' | 'playing' | 'finished';
  players: PlayerRecord[];
  hostId: string;
  scores: Record<string, number>;
  spectators: Set<WebSocket>;
  rematchReady: Set<string>;
  gameState: GameState | null;
  /** Who played first in the most recent round (to alternate fairly). */
  lastFirstPlayerId: string | null;
  /** Pending room-cleanup timer once everyone has disconnected. */
  emptyTimer: NodeJS.Timeout | null;
}

/** Per-socket bookkeeping so we can find a socket's room/player on any message. */
interface SocketMeta {
  roomCode: string;
  playerId: string;
  spectator: boolean;
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // no I/O to avoid confusion
const ROOM_EMPTY_GRACE_MS = 5 * 60 * 1000; // keep an empty room alive 5 min for reconnects

export class RoomManager {
  private rooms = new Map<string, Room>();
  private sockets = new WeakMap<WebSocket, SocketMeta>();

  // -------------------------------------------------------------------------
  // Connection lifecycle
  // -------------------------------------------------------------------------

  handleMessage(ws: WebSocket, raw: string): void {
    let msg: unknown;
    try {
      msg = JSON.parse(raw);
    } catch {
      return this.send(ws, { type: 'error', message: 'Bad message.' });
    }
    const m = msg as { type?: string };
    switch (m.type) {
      case 'createRoom':
        return this.createRoom(ws, msg as any);
      case 'joinRoom':
        return this.joinRoom(ws, msg as any);
      case 'rejoin':
        return this.rejoin(ws, (msg as any).token);
      case 'move':
        return this.move(ws, (msg as any).move);
      case 'rematch':
        return this.rematch(ws);
      case 'leaveRoom':
        return this.leave(ws);
      default:
        return this.send(ws, { type: 'error', message: 'Unknown command.' });
    }
  }

  handleClose(ws: WebSocket): void {
    const meta = this.sockets.get(ws);
    if (!meta) return;
    const room = this.rooms.get(meta.roomCode);
    if (!room) return;

    if (meta.spectator) {
      room.spectators.delete(ws);
    } else {
      const player = room.players.find((p) => p.id === meta.playerId);
      if (player) player.ws = null; // keep the seat for a reconnect
    }
    this.sockets.delete(ws);
    this.scheduleCleanupIfEmpty(room);
    this.broadcast(room);
  }

  // -------------------------------------------------------------------------
  // Commands
  // -------------------------------------------------------------------------

  private createRoom(ws: WebSocket, msg: { game: GameId; player: PlayerIdentity }): void {
    const info = GAMES[msg.game];
    if (!info) return this.send(ws, { type: 'error', message: 'Unknown game.' });

    const code = this.uniqueCode();
    const player = this.newPlayer(ws, code, msg.player);
    const room: Room = {
      code,
      game: msg.game,
      status: 'waiting',
      players: [player],
      hostId: player.id,
      scores: { [player.id]: 0 },
      spectators: new Set(),
      rematchReady: new Set(),
      gameState: null,
      lastFirstPlayerId: null,
      emptyTimer: null,
    };
    this.rooms.set(code, room);
    this.sockets.set(ws, { roomCode: code, playerId: player.id, spectator: false });

    this.send(ws, { type: 'joined', code, youId: player.id, token: player.token, role: 'player' });
    this.broadcast(room);
  }

  private joinRoom(ws: WebSocket, msg: { code: string; player: PlayerIdentity }): void {
    const code = (msg.code || '').toUpperCase().trim();
    const room = this.rooms.get(code);
    if (!room) return this.send(ws, { type: 'error', message: 'No room with that code.' });

    const info = GAMES[room.game];
    const seatTaken = room.players.length >= info.maxPlayers;

    if (seatTaken) {
      // Room is full -> join as a spectator.
      room.spectators.add(ws);
      this.sockets.set(ws, { roomCode: code, playerId: '', spectator: true });
      this.send(ws, { type: 'joined', code, youId: '', token: '', role: 'spectator' });
      this.cancelCleanup(room);
      this.broadcast(room);
      return;
    }

    const player = this.newPlayer(ws, code, msg.player);
    room.players.push(player);
    room.scores[player.id] = 0;
    this.sockets.set(ws, { roomCode: code, playerId: player.id, spectator: false });
    this.cancelCleanup(room);

    this.send(ws, { type: 'joined', code, youId: player.id, token: player.token, role: 'player' });

    // Auto-start once enough players are seated.
    if (room.status === 'waiting' && room.players.length >= info.minPlayers) {
      this.startRound(room);
    }
    this.broadcast(room);
  }

  private rejoin(ws: WebSocket, token: string): void {
    for (const room of this.rooms.values()) {
      const player = room.players.find((p) => p.token === token);
      if (!player) continue;
      player.ws = ws;
      this.sockets.set(ws, { roomCode: room.code, playerId: player.id, spectator: false });
      this.cancelCleanup(room);
      this.send(ws, {
        type: 'joined',
        code: room.code,
        youId: player.id,
        token: player.token,
        role: 'player',
      });
      this.broadcast(room);
      return;
    }
    // Token no longer valid (room expired) -> tell the client to start over.
    this.send(ws, { type: 'left' });
  }

  private move(ws: WebSocket, move: GameMove): void {
    const { room, meta } = this.context(ws) ?? {};
    if (!room || !meta || meta.spectator) return;
    if (room.status !== 'playing' || !room.gameState) return;

    const result = GAME_MODULES[room.game].applyMove(room.gameState, meta.playerId, move);
    if (result.error) return this.send(ws, { type: 'error', message: result.error });

    room.gameState = result.state;
    if (result.state.winner) {
      room.status = 'finished';
      if (result.state.winner !== 'draw') {
        room.scores[result.state.winner] = (room.scores[result.state.winner] ?? 0) + 1;
      }
    }
    this.broadcast(room);
  }

  private rematch(ws: WebSocket): void {
    const { room, meta } = this.context(ws) ?? {};
    if (!room || !meta || meta.spectator) return;
    if (room.status !== 'finished') return;

    room.rematchReady.add(meta.playerId);
    // Start again once every seated player is ready.
    if (room.players.every((p) => room.rematchReady.has(p.id))) {
      this.startRound(room);
    }
    this.broadcast(room);
  }

  private leave(ws: WebSocket): void {
    const meta = this.sockets.get(ws);
    if (!meta) return;
    const room = this.rooms.get(meta.roomCode);
    this.send(ws, { type: 'left' });
    if (!room) {
      this.sockets.delete(ws);
      return;
    }
    if (meta.spectator) {
      room.spectators.delete(ws);
    } else {
      // Explicit leave removes the seat entirely (not a reconnect).
      room.players = room.players.filter((p) => p.id !== meta.playerId);
      delete room.scores[meta.playerId];
      room.rematchReady.delete(meta.playerId);
      // If a game was underway, end the round — the opponent is alone.
      if (room.status === 'playing') {
        room.status = 'waiting';
        room.gameState = null;
      }
    }
    this.sockets.delete(ws);
    this.scheduleCleanupIfEmpty(room);
    this.broadcast(room);
  }

  // -------------------------------------------------------------------------
  // Round management
  // -------------------------------------------------------------------------

  private startRound(room: Room): void {
    const ids = room.players.map((p) => p.id);
    const firstPlayerId = this.pickFirstPlayer(room);
    room.gameState = GAME_MODULES[room.game].createState(ids, firstPlayerId);
    room.lastFirstPlayerId = firstPlayerId;
    room.status = 'playing';
    room.rematchReady.clear();
  }

  /** Loser of the last round goes first; on a draw or first game, alternate. */
  private pickFirstPlayer(room: Room): string {
    const ids = room.players.map((p) => p.id);
    const prev = room.gameState;
    if (prev && prev.winner && prev.winner !== 'draw') {
      const loser = ids.find((id) => id !== prev.winner);
      if (loser) return loser;
    }
    if (room.lastFirstPlayerId) {
      const other = ids.find((id) => id !== room.lastFirstPlayerId);
      if (other) return other;
    }
    return ids[0];
  }

  // -------------------------------------------------------------------------
  // Broadcast & helpers
  // -------------------------------------------------------------------------

  private broadcast(room: Room): void {
    const state = this.publicState(room);
    const payload: ServerMessage = { type: 'roomState', room: state };
    for (const p of room.players) if (p.ws) this.send(p.ws, payload);
    for (const s of room.spectators) this.send(s, payload);
  }

  private publicState(room: Room): RoomState {
    return {
      code: room.code,
      game: room.game,
      status: room.status,
      players: room.players.map((p) => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        connected: p.ws !== null,
      })),
      hostId: room.hostId,
      scores: { ...room.scores },
      spectators: room.spectators.size,
      rematchReady: [...room.rematchReady],
      gameState: room.gameState,
    };
  }

  private context(ws: WebSocket): { room: Room; meta: SocketMeta } | undefined {
    const meta = this.sockets.get(ws);
    if (!meta) return undefined;
    const room = this.rooms.get(meta.roomCode);
    if (!room) return undefined;
    return { room, meta };
  }

  private newPlayer(ws: WebSocket, code: string, identity: PlayerIdentity): PlayerRecord {
    return {
      id: randomId(8),
      name: sanitizeName(identity.name),
      avatar: identity.avatar || '👾',
      token: `${code}.${randomId(24)}`,
      ws,
    };
  }

  private uniqueCode(): string {
    let code = '';
    do {
      code = '';
      for (let i = 0; i < 4; i++) {
        code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
      }
    } while (this.rooms.has(code));
    return code;
  }

  private scheduleCleanupIfEmpty(room: Room): void {
    const anyConnected = room.players.some((p) => p.ws !== null) || room.spectators.size > 0;
    if (anyConnected) return;
    this.cancelCleanup(room);
    room.emptyTimer = setTimeout(() => this.rooms.delete(room.code), ROOM_EMPTY_GRACE_MS);
  }

  private cancelCleanup(room: Room): void {
    if (room.emptyTimer) {
      clearTimeout(room.emptyTimer);
      room.emptyTimer = null;
    }
  }

  private send(ws: WebSocket, msg: ServerMessage): void {
    if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
  }
}

function randomId(len: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let out = '';
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function sanitizeName(name: string): string {
  const clean = (name || '').replace(/\s+/g, ' ').trim().slice(0, 16);
  return clean || 'Player';
}
