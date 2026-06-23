import {
  ClientMessage,
  GameId,
  GameMove,
  PlayerIdentity,
  RoomState,
  ServerMessage,
} from '../../shared/protocol.ts';

const TOKEN_KEY = 'el-arcade-token';

export interface ArcadeState {
  status: 'idle' | 'connecting' | 'connected';
  youId: string;
  role: 'player' | 'spectator' | null;
  code: string | null;
  room: RoomState | null;
  /** Transient error banner text. */
  error: string | null;
}

const initialState: ArcadeState = {
  status: 'idle',
  youId: '',
  role: null,
  code: null,
  room: null,
  error: null,
};

type Listener = (s: ArcadeState) => void;

/**
 * Owns the single WebSocket connection to the arcade server, handles
 * reconnection with the saved token, and exposes a small action API. React
 * subscribes via the useArcade hook below.
 */
export class ArcadeConnection {
  private ws: WebSocket | null = null;
  private state: ArcadeState = initialState;
  private listeners = new Set<Listener>();
  private pending: ClientMessage | null = null; // message to send on next open
  private intentionalClose = false;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  getState(): ArcadeState {
    return this.state;
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** Attempt to rejoin a room from a saved token (called once on app start). */
  tryResume(): void {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) this.connect({ type: 'rejoin', token });
  }

  createRoom(game: GameId, player: PlayerIdentity): void {
    this.connect({ type: 'createRoom', game, player });
  }

  joinRoom(code: string, player: PlayerIdentity): void {
    this.connect({ type: 'joinRoom', code: code.toUpperCase().trim(), player });
  }

  move(move: GameMove): void {
    this.sendNow({ type: 'move', move });
  }

  rematch(): void {
    this.sendNow({ type: 'rematch' });
  }

  leave(): void {
    this.intentionalClose = true;
    this.sendNow({ type: 'leaveRoom' });
    localStorage.removeItem(TOKEN_KEY);
    this.clearReconnect();
    if (this.ws) this.ws.close();
    this.ws = null;
    this.patch({ ...initialState });
  }

  dismissError(): void {
    if (this.state.error) this.patch({ error: null });
  }

  // -------------------------------------------------------------------------

  private connect(firstMessage: ClientMessage): void {
    this.intentionalClose = false;
    this.pending = firstMessage;

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.flushPending();
      return;
    }
    if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
      return; // pending will flush on open
    }

    this.patch({ status: 'connecting', error: null });
    const url = this.wsUrl();
    const ws = new WebSocket(url);
    this.ws = ws;

    ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.flushPending();
    };
    ws.onmessage = (ev) => this.handle(ev.data);
    ws.onclose = () => this.onClose();
    ws.onerror = () => {
      /* close handler drives reconnect */
    };
  }

  private flushPending(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    // If we have no explicit pending message but do have a token, resume.
    const msg = this.pending ?? this.resumeMessage();
    this.pending = null;
    if (msg) this.ws.send(JSON.stringify(msg));
  }

  private resumeMessage(): ClientMessage | null {
    const token = localStorage.getItem(TOKEN_KEY);
    return token ? { type: 'rejoin', token } : null;
  }

  private sendNow(msg: ClientMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  private handle(raw: string): void {
    let msg: ServerMessage;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    switch (msg.type) {
      case 'joined':
        if (msg.role === 'player' && msg.token) localStorage.setItem(TOKEN_KEY, msg.token);
        this.patch({
          status: 'connected',
          youId: msg.youId,
          role: msg.role,
          code: msg.code,
          error: null,
        });
        break;
      case 'roomState':
        this.patch({ room: msg.room, status: 'connected' });
        break;
      case 'left':
        localStorage.removeItem(TOKEN_KEY);
        this.intentionalClose = true;
        this.clearReconnect();
        if (this.ws) this.ws.close();
        this.ws = null;
        this.patch({ ...initialState });
        break;
      case 'error':
        this.patch({ error: msg.message });
        break;
    }
  }

  private onClose(): void {
    this.ws = null;
    if (this.intentionalClose) return;
    // Unexpected drop: if we can resume, reconnect with backoff.
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      this.patch({ status: 'idle' });
      return;
    }
    this.reconnectAttempts += 1;
    if (this.reconnectAttempts > 12) {
      this.patch({ status: 'idle', error: 'Lost connection. Please rejoin.' });
      return;
    }
    this.patch({ status: 'connecting' });
    const delay = Math.min(500 * this.reconnectAttempts, 4000);
    this.clearReconnect();
    this.reconnectTimer = setTimeout(() => this.connect({ type: 'rejoin', token }), delay);
  }

  private clearReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private wsUrl(): string {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    return `${proto}://${location.host}/ws`;
  }

  private patch(partial: Partial<ArcadeState>): void {
    this.state = { ...this.state, ...partial };
    for (const fn of this.listeners) fn(this.state);
  }
}

export const arcade = new ArcadeConnection();
