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
  | 'dots'
  | 'drawguess'
  | 'zombie'
  | 'chutes'
  | 'cantstop';

/** Optional config the host can choose in the lobby before starting. */
export interface GameOptions {
  size?: 'small' | 'medium' | 'large';
  /** Pig: play with one die (classic) or two (snake-eyes wipes your score). */
  dice?: 1 | 2;
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
  drawguess: {
    id: 'drawguess',
    name: 'Draw & Guess',
    tagline: 'One draws, everyone guesses — 2 to 4 players!',
    icon: '🎨',
    minPlayers: 2,
    maxPlayers: 4,
  },
  zombie: {
    id: 'zombie',
    name: 'Zombie Dice',
    tagline: 'Eat brains, dodge shotguns, push your luck!',
    icon: '🧟',
    minPlayers: 2,
    maxPlayers: 4,
  },
  chutes: {
    id: 'chutes',
    name: 'Chutes & Ladders',
    tagline: 'Climb ladders, dodge chutes, race to 100!',
    icon: '🪜',
    minPlayers: 2,
    maxPlayers: 4,
  },
  cantstop: {
    id: 'cantstop',
    name: "Can't Stop",
    tagline: 'Press your luck up the columns — claim 3 to win!',
    icon: '🧗',
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
  /** How many dice are rolled each turn (1 = classic, 2 = snake-eyes variant). */
  diceCount: number;
  /** The dice faces just rolled (length 1 or 2), or null. */
  lastRoll: number[] | null;
  /** True when the last roll busted the turn (a single 1). */
  busted: boolean;
  /** Two-dice only: true when double 1s wiped the player's whole score. */
  wipedOut: boolean;
  target: number;
  winner: string | null;
  moves: number;
}

export type PigMove = { action: 'roll' } | { action: 'hold' };

// --- Zombie Dice -----------------------------------------------------------

export type ZombieColor = 'green' | 'yellow' | 'red';
export type ZombieFace = 'brain' | 'foot' | 'shotgun';

export interface ZombieDie {
  color: ZombieColor;
  face: ZombieFace;
}

export interface ZombieState {
  kind: 'zombie';
  seating: string[];
  turn: string | null;
  /** Banked brains per player. */
  scores: Record<string, number>;
  /** Brains eaten so far this turn (not yet banked). */
  brains: number;
  /** Shotgun blasts this turn — 3 ends the turn with nothing. */
  shotguns: number;
  /** Footstep dice carried over to re-roll. */
  kept: ZombieDie[];
  /** The dice from the last roll, for display. */
  rolled: ZombieDie[] | null;
  /** How many dice remain in the cup. */
  cupCount: number;
  /** True when the last roll was a third shotgun (turn lost). */
  busted: boolean;
  target: number;
  winner: string | null;
  moves: number;
  /** Server-only: remaining dice colors in the cup. Redacted on the wire. */
  cup?: ZombieColor[];
  /** Server-only: brain-die colors set aside (for cup reshuffle). Redacted. */
  usedBrains?: ZombieColor[];
}

export type ZombieMove = { action: 'roll' } | { action: 'bank' };

// --- Chutes & Ladders ------------------------------------------------------

/** Classic board links: square -> destination (ladders up, chutes down). */
export const CHUTES_BOARD: Record<number, number> = {
  1: 38, 4: 14, 9: 31, 21: 42, 28: 84, 36: 44, 51: 67, 71: 91, 80: 100, // ladders
  16: 6, 47: 26, 49: 11, 56: 53, 62: 19, 64: 60, 87: 24, 93: 73, 95: 75, 98: 78, // chutes
};

export interface ChutesState {
  kind: 'chutes';
  seating: string[];
  turn: string | null;
  positions: Record<string, number>; // 0..100
  lastRoll: number | null;
  /** Square the mover started on this turn (for feedback). */
  lastFrom: number | null;
  lastVia: 'ladder' | 'chute' | null;
  winner: string | null;
  moves: number;
}

export type ChutesMove = { action: 'roll' };

// --- Can't Stop ------------------------------------------------------------

/** Column heights (number of steps to claim), keyed by the 2-12 dice sum. */
export const CANTSTOP_HEIGHTS: Record<number, number> = {
  2: 3, 3: 5, 4: 7, 5: 9, 6: 11, 7: 13, 8: 11, 9: 9, 10: 7, 11: 5, 12: 3,
};

export interface CantStopState {
  kind: 'cantstop';
  seating: string[];
  turn: string | null;
  heights: Record<number, number>;
  /** Permanent progress per player: progress[playerId][col] = steps climbed. */
  progress: Record<string, Record<number, number>>;
  /** Claimed columns: col -> playerId. */
  claimed: Record<number, string>;
  /** This turn's temporary runner positions: col -> absolute height. */
  runners: Record<number, number>;
  phase: 'rolling' | 'choosing';
  dice: number[] | null;
  /** Legal advance choices after a roll. */
  options: Array<{ cols: number[] }> | null;
  busted: boolean;
  claimsToWin: number;
  winner: string | null;
  moves: number;
}

export type CantStopMove =
  | { action: 'roll' }
  | { action: 'choose'; index: number }
  | { action: 'stop' };

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

// --- Draw & Guess ----------------------------------------------------------

/** One drawn polyline. Points are flat [x0,y0,x1,y1,...] normalized 0–1000. */
export interface DrawStroke {
  color: string;
  width: number;
  points: number[];
}

export interface DrawChat {
  id: string;
  playerId: string;
  /** 'guess' = a wrong guess (text shown); 'correct' = got it (text hidden); 'system'. */
  kind: 'guess' | 'correct' | 'system';
  text: string;
}

export interface DrawGuessState {
  kind: 'drawguess';
  seating: string[];
  round: number; // 0-based
  totalRounds: number;
  drawerId: string;
  phase: 'drawing' | 'reveal' | 'over';
  /** The word — redacted to '' for players who shouldn't see it yet. */
  word: string;
  wordLength: number;
  secondsLeft: number;
  strokes: DrawStroke[];
  /** Player ids who have guessed correctly this round. */
  guessed: string[];
  scores: Record<string, number>;
  chat: DrawChat[];
  winner: string | 'draw' | null;
  moves: number;
}

export type DrawGuessMove = { action: 'guess'; text: string };

export type GameState =
  | TicTacToeState
  | ConnectFourState
  | BattleshipState
  | UnoState
  | MemoryState
  | PigState
  | DotsState
  | DrawGuessState
  | ZombieState
  | ChutesState
  | CantStopState;
export type GameMove =
  | TicTacToeMove
  | ConnectFourMove
  | BattleshipMove
  | UnoMove
  | MemoryMove
  | PigMove
  | DotsMove
  | DrawGuessMove
  | ZombieMove
  | ChutesMove
  | CantStopMove;

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
  | { type: 'leaveRoom' }
  // Draw & Guess: lightweight stroke streaming from the current drawer.
  | { type: 'draw'; segment: DrawStroke }
  | { type: 'drawClear' };

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
  | { type: 'error'; message: string }
  // Draw & Guess: relayed stroke from the drawer (not a full state broadcast).
  | { type: 'drawSegment'; segment: DrawStroke }
  | { type: 'drawClear' };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export const WINNING_LINES: number[][] = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
  [0, 4, 8], [2, 4, 6],            // diagonals
];
