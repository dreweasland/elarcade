// Shared protocol between client and server. Keep this dependency-free so both
// the browser bundle (Vite) and the Node server (tsx) can import it directly.

// ---------------------------------------------------------------------------
// Avatars & games
// ---------------------------------------------------------------------------

/** Kid-friendly emoji avatars chosen on the home screen. */
export const AVATARS = [
  '🦖', '🐱', '🦄', '🤖', '🐸', '🦊', '🐙', '🐯',
  '🦉', '🐧', '🦋', '🐲', '👾', '🦁', '🐼', '🚀',
] as const;
export type Avatar = (typeof AVATARS)[number];

export type GameId = 'ticTacToe' | 'connectFour';

export interface GameInfo {
  id: GameId;
  name: string;
  tagline: string;
  icon: string;
  minPlayers: number;
  maxPlayers: number;
}

/** The arcade's catalog of games. Add a new entry here + a server game module. */
export const GAMES: Record<GameId, GameInfo> = {
  ticTacToe: {
    id: 'ticTacToe',
    name: 'Tic-Tac-Toe',
    tagline: 'Three in a row wins!',
    icon: '⭕',
    minPlayers: 2,
    maxPlayers: 2,
  },
  connectFour: {
    id: 'connectFour',
    name: 'Connect Four',
    tagline: 'Drop discs, get four in a row!',
    icon: '🔴',
    minPlayers: 2,
    maxPlayers: 2,
  },
};

// ---------------------------------------------------------------------------
// Room & player state (server-authoritative; broadcast to all clients)
// ---------------------------------------------------------------------------

export interface PublicPlayer {
  id: string;
  name: string;
  avatar: string;
  connected: boolean;
}

export type RoomStatus = 'waiting' | 'playing' | 'finished';

/** Tic-tac-toe specific public state. */
export interface TicTacToeState {
  kind: 'ticTacToe';
  board: Array<'X' | 'O' | null>; // length 9, index 0..8 row-major
  /** Which player id holds X and which holds O. */
  marks: Record<string, 'X' | 'O'>;
  /** Player id whose turn it is, or null when the round is over. */
  turn: string | null;
  /** Winning player id, 'draw', or null while in progress. */
  winner: string | 'draw' | null;
  /** The three board indices that won, for highlighting. */
  winningLine: number[] | null;
}

// --- Connect Four ----------------------------------------------------------

export const C4_COLS = 7;
export const C4_ROWS = 6;

/** Connect Four state. Board is row-major, index = row * C4_COLS + col, row 0 = top. */
export interface ConnectFourState {
  kind: 'connectFour';
  board: Array<'R' | 'Y' | null>; // length C4_ROWS * C4_COLS
  /** Which player id holds Red and which holds Yellow. */
  marks: Record<string, 'R' | 'Y'>;
  turn: string | null;
  winner: string | 'draw' | null;
  /** The four board indices that won, for highlighting. */
  winningLine: number[] | null;
}

export type GameState = TicTacToeState | ConnectFourState;
export type GameMove = TicTacToeMove | ConnectFourMove;

export interface RoomState {
  code: string;
  game: GameId;
  status: RoomStatus;
  players: PublicPlayer[];
  /** Player id of the room host (created the room). */
  hostId: string;
  /** Wins this session, keyed by player id. Resets when the room empties. */
  scores: Record<string, number>;
  /** Number of spectators currently watching. */
  spectators: number;
  /** Player ids who have clicked "rematch" while status === 'finished'. */
  rematchReady: string[];
  /** Game-specific state, present once status === 'playing' or 'finished'. */
  gameState: GameState | null;
}

// ---------------------------------------------------------------------------
// Client -> Server messages
// ---------------------------------------------------------------------------

export interface PlayerIdentity {
  name: string;
  avatar: string;
}

export type ClientMessage =
  | { type: 'createRoom'; game: GameId; player: PlayerIdentity }
  | { type: 'joinRoom'; code: string; player: PlayerIdentity }
  | { type: 'rejoin'; token: string }
  | { type: 'move'; move: GameMove }
  | { type: 'rematch' }
  | { type: 'leaveRoom' };

/** Tic-tac-toe move: place your mark at a board cell. */
export interface TicTacToeMove {
  cell: number; // 0..8
}

/** Connect Four move: drop a disc into a column. */
export interface ConnectFourMove {
  column: number; // 0..C4_COLS-1
}

// ---------------------------------------------------------------------------
// Server -> Client messages
// ---------------------------------------------------------------------------

export type ServerMessage =
  | { type: 'joined'; code: string; youId: string; token: string; role: 'player' | 'spectator' }
  | { type: 'roomState'; room: RoomState }
  | { type: 'left' }
  | { type: 'error'; message: string };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export const WINNING_LINES: number[][] = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
  [0, 4, 8], [2, 4, 6],            // diagonals
];
