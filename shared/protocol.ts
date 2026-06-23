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

export type GameId =
  | 'ticTacToe'
  | 'connectFour'
  | 'battleship'
  | 'uno'
  | 'memory'
  | 'pig'
  | 'dots';

/** Optional config the host can choose in the lobby before starting. */
export interface GameOptions {
  size?: 'small' | 'medium' | 'large';
}

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
  battleship: {
    id: 'battleship',
    name: 'Battleship',
    tagline: 'Hide your fleet, sink theirs!',
    icon: '🚢',
    minPlayers: 2,
    maxPlayers: 2,
  },
  uno: {
    id: 'uno',
    name: 'UNO',
    tagline: 'Match colors & numbers — 2 to 4 players!',
    icon: '🎴',
    minPlayers: 2,
    maxPlayers: 4,
  },
  memory: {
    id: 'memory',
    name: 'Memory Match',
    tagline: 'Flip cards, find the pairs — 2 to 4 players!',
    icon: '🧠',
    minPlayers: 2,
    maxPlayers: 4,
  },
  pig: {
    id: 'pig',
    name: 'Pig',
    tagline: 'Push your luck — roll big, don’t bust!',
    icon: '🎲',
    minPlayers: 2,
    maxPlayers: 4,
  },
  dots: {
    id: 'dots',
    name: 'Dots & Boxes',
    tagline: 'Claim lines, complete boxes — 2 to 4 players!',
    icon: '🔳',
    minPlayers: 2,
    maxPlayers: 4,
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

// --- Battleship ------------------------------------------------------------

export const BATTLESHIP_SIZE = 10;

/** The classic fleet: 5 ships, 17 cells total. */
export const BATTLESHIP_FLEET: Array<{ name: string; size: number }> = [
  { name: 'Carrier', size: 5 },
  { name: 'Battleship', size: 4 },
  { name: 'Cruiser', size: 3 },
  { name: 'Submarine', size: 3 },
  { name: 'Destroyer', size: 2 },
];

export interface BattleshipShip {
  name: string;
  size: number;
  cells: number[]; // board indices the ship occupies
  sunk: boolean;
}

export interface BattleshipBoard {
  /** Ships visible to the viewer (own fleet in full; opponent only once sunk). */
  ships: BattleshipShip[];
  /** Every cell that has been fired at on this board. */
  shots: number[];
  /** Subset of `shots` that struck a ship (so the UI can mark hits). */
  hits: number[];
}

export interface BattleshipState {
  kind: 'battleship';
  size: number;
  /** Ship spec for the placement UI. */
  fleet: Array<{ name: string; size: number }>;
  phase: 'placing' | 'firing';
  /** Player ids who have locked in their placement. */
  ready: string[];
  /** Whose turn to fire (firing phase), or null. */
  turn: string | null;
  /** Per-player boards, keyed by player id. Opponent ships are redacted. */
  boards: Record<string, BattleshipBoard>;
  winner: string | 'draw' | null;
  /** Last ship sunk this turn, for an announcement. */
  lastSunk: { by: string; ship: string } | null;
}

// --- UNO -------------------------------------------------------------------

export type UnoColor = 'red' | 'yellow' | 'green' | 'blue';
export type UnoCardColor = UnoColor | 'wild' | 'back';
export type UnoCardKind =
  | 'number'
  | 'skip'
  | 'reverse'
  | 'draw2'
  | 'wild'
  | 'wild4'
  | 'back';

export interface UnoCard {
  id: string;
  color: UnoCardColor;
  kind: UnoCardKind;
  value?: number; // 0..9 for number cards
}

export interface UnoState {
  kind: 'uno';
  /** Seating order (player ids). Turn moves through this list by `direction`. */
  seating: string[];
  /** Each player's hand. Own hand is real; others are face-down 'back' cards. */
  hands: Record<string, UnoCard[]>;
  /** Server-only; redacted to [] on the wire. */
  drawPile: UnoCard[];
  drawPileCount: number;
  /** Discard pile; redacted to just the top card on the wire. Top = last. */
  discard: UnoCard[];
  /** Active color (a wild sets this). */
  topColor: UnoColor;
  direction: 1 | -1;
  turn: string | null;
  /** Set when a player drew a playable card and may play it or pass. */
  pendingPlay: { player: string; cardId: string } | null;
  winner: string | 'draw' | null;
  /** Human-readable description of the last action, for the table log. */
  lastAction: string | null;
  /** Monotonic move counter (drives sound + animation). */
  moves: number;
}

export type UnoMove =
  | { action: 'play'; cardId: string; chosenColor?: UnoColor; uno?: boolean }
  | { action: 'draw' }
  | { action: 'pass' };

// --- Memory Match ----------------------------------------------------------

export interface MemoryCard {
  id: string;
  /** Emoji face. Empty string when face-down (redacted on the wire). */
  face: string;
  /** Player id who claimed this card as part of a matched pair, or null. */
  matchedBy: string | null;
}

export interface MemoryState {
  kind: 'memory';
  rows: number;
  cols: number;
  cards: MemoryCard[];
  /** Indices currently face-up this turn (0, 1, or a leftover mismatched 2). */
  flipped: number[];
  seating: string[];
  turn: string | null;
  /** Pairs collected per player this game. */
  scores: Record<string, number>;
  winner: string | 'draw' | null;
  lastResult: 'match' | 'miss' | null;
  moves: number;
}

export type MemoryMove = { action: 'flip'; index: number };

// --- Pig (push-your-luck dice) ---------------------------------------------

export interface PigState {
  kind: 'pig';
  seating: string[];
  turn: string | null;
  /** Banked totals per player. */
  scores: Record<string, number>;
  /** Points accumulated this turn but not yet banked. */
  turnTotal: number;
  /** Last die face rolled (1-6), or null. */
  lastRoll: number | null;
  /** True when the last roll was a 1 (turn busted). */
  busted: boolean;
  target: number;
  winner: string | null;
  moves: number;
}

export type PigMove = { action: 'roll' } | { action: 'hold' };

// --- Dots & Boxes ----------------------------------------------------------

export interface DotsState {
  kind: 'dots';
  rows: number; // boxes
  cols: number;
  /** Horizontal edges, length (rows+1)*cols, index r*cols + c. */
  hEdges: boolean[];
  /** Vertical edges, length rows*(cols+1), index r*(cols+1) + c. */
  vEdges: boolean[];
  /** Box owners, length rows*cols, index r*cols + c. */
  owners: (string | null)[];
  seating: string[];
  turn: string | null;
  scores: Record<string, number>;
  winner: string | 'draw' | null;
  moves: number;
}

export type DotsMove = { action: 'edge'; edge: 'h' | 'v'; r: number; c: number };

export type GameState =
  | TicTacToeState
  | ConnectFourState
  | BattleshipState
  | UnoState
  | MemoryState
  | PigState
  | DotsState;
export type GameMove =
  | TicTacToeMove
  | ConnectFourMove
  | BattleshipMove
  | UnoMove
  | MemoryMove
  | PigMove
  | DotsMove;

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
  | { type: 'startGame'; options?: GameOptions }
  | { type: 'leaveRoom' };

/** Tic-tac-toe move: place your mark at a board cell. */
export interface TicTacToeMove {
  cell: number; // 0..8
}

/** Connect Four move: drop a disc into a column. */
export interface ConnectFourMove {
  column: number; // 0..C4_COLS-1
}

/** Battleship move: place your whole fleet, or fire at a cell. */
export type BattleshipMove =
  | { action: 'place'; ships: Array<{ name: string; cells: number[] }> }
  | { action: 'fire'; cell: number };

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
