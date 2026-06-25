import { CheckerPiece, CheckersMove, CheckersState } from '../../../shared/protocol.js';

type Color = 'r' | 'b';
type Board = (CheckerPiece | null)[];

const KING_DIRS: Array<[number, number]> = [
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
];

/**
 * Red ('r') is the first player, starts along the bottom and moves upward
 * (toward row 0). Black ('b') starts at the top and moves down. Captures are
 * optional, but once a jump begins it must be carried to the end of the chain.
 */
export function createCheckers(playerIds: string[], firstPlayerId: string): CheckersState {
  const seating = [...playerIds];
  const other = seating.find((id) => id !== firstPlayerId)!;
  const marks: Record<string, Color> = { [firstPlayerId]: 'r', [other]: 'b' };

  const board: Board = Array(64).fill(null);
  let b = 0;
  let rd = 0;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 8; c++) if ((r + c) % 2 === 1) board[idx(r, c)] = { id: `b${b++}`, color: 'b', king: false };
  }
  for (let r = 5; r < 8; r++) {
    for (let c = 0; c < 8; c++) if ((r + c) % 2 === 1) board[idx(r, c)] = { id: `r${rd++}`, color: 'r', king: false };
  }

  return {
    kind: 'checkers',
    board,
    marks,
    turn: firstPlayerId,
    mustContinueFrom: null,
    lastMove: null,
    lastCaptured: [],
    winner: null,
    moves: 0,
  };
}

export interface MoveResult {
  state: CheckersState;
  error?: string;
}

export function applyCheckersMove(
  state: CheckersState,
  playerId: string,
  move: CheckersMove,
): MoveResult {
  if (state.winner) return { state, error: 'The game is over.' };
  if (playerId !== state.turn) return { state, error: 'Not your turn.' };
  if (move.action !== 'move') return { state, error: 'Unknown move.' };

  const color = state.marks[playerId];
  const { from, to } = move;
  if (!validSquare(from) || !validSquare(to)) return { state, error: 'Off the board.' };
  if (state.mustContinueFrom !== null && from !== state.mustContinueFrom) {
    return { state, error: 'Finish your jump with the same piece.' };
  }

  const piece = state.board[from];
  if (!piece || piece.color !== color) return { state, error: 'That is not your piece.' };

  const next: CheckersState = structuredClone(state);
  const board = next.board;
  const moving = board[from]!;

  const jump = jumpsFrom(board, from).find((j) => j.to === to);
  let didJump = false;

  next.lastCaptured = [];
  if (jump) {
    board[to] = moving;
    board[from] = null;
    board[jump.over] = null;
    next.lastCaptured = [jump.over];
    didJump = true;
  } else {
    if (state.mustContinueFrom !== null) return { state, error: 'Keep jumping with this piece.' };
    if (!stepsFrom(board, from).includes(to)) return { state, error: 'Illegal move.' };
    board[to] = moving;
    board[from] = null;
  }

  next.lastMove = [from, to];
  next.moves++;

  // Crown a man that reaches the far row (ends the turn even mid-chain).
  let kinged = false;
  const [tr] = rc(to);
  if (!moving.king && ((color === 'r' && tr === 0) || (color === 'b' && tr === 7))) {
    moving.king = true;
    kinged = true;
  }

  // A jump that opens further jumps must continue with the same piece.
  if (didJump && !kinged && jumpsFrom(board, to).length > 0) {
    next.mustContinueFrom = to;
    next.turn = playerId;
    finalizeWin(next);
    return { state: next };
  }

  next.mustContinueFrom = null;
  next.turn = Object.keys(next.marks).find((id) => id !== playerId) ?? playerId;
  finalizeWin(next);
  return { state: next };
}

// ---------------------------------------------------------------------------
// Rules helpers
// ---------------------------------------------------------------------------

function idx(r: number, c: number): number {
  return r * 8 + c;
}
function rc(i: number): [number, number] {
  return [Math.floor(i / 8), i % 8];
}
function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}
function validSquare(i: number): boolean {
  return Number.isInteger(i) && i >= 0 && i < 64;
}

function dirsFor(piece: CheckerPiece): Array<[number, number]> {
  if (piece.king) return KING_DIRS;
  return piece.color === 'r'
    ? [
        [-1, -1],
        [-1, 1],
      ]
    : [
        [1, -1],
        [1, 1],
      ];
}

function stepsFrom(board: Board, i: number): number[] {
  const p = board[i];
  if (!p) return [];
  const [r, c] = rc(i);
  const out: number[] = [];
  for (const [dr, dc] of dirsFor(p)) {
    const tr = r + dr;
    const tc = c + dc;
    if (inBounds(tr, tc) && !board[idx(tr, tc)]) out.push(idx(tr, tc));
  }
  return out;
}

function jumpsFrom(board: Board, i: number): Array<{ to: number; over: number }> {
  const p = board[i];
  if (!p) return [];
  const [r, c] = rc(i);
  const out: Array<{ to: number; over: number }> = [];
  for (const [dr, dc] of dirsFor(p)) {
    const mr = r + dr;
    const mc = c + dc;
    const tr = r + 2 * dr;
    const tc = c + 2 * dc;
    if (!inBounds(tr, tc)) continue;
    const mid = board[idx(mr, mc)];
    const dest = board[idx(tr, tc)];
    if (mid && mid.color !== p.color && !dest) out.push({ to: idx(tr, tc), over: idx(mr, mc) });
  }
  return out;
}

function hasAnyMove(board: Board, color: Color): boolean {
  for (let i = 0; i < 64; i++) {
    const p = board[i];
    if (!p || p.color !== color) continue;
    if (stepsFrom(board, i).length > 0 || jumpsFrom(board, i).length > 0) return true;
  }
  return false;
}

/** Declare a winner if a side is wiped out or has no legal move. */
function finalizeWin(state: CheckersState): void {
  let red = 0;
  let black = 0;
  for (const sq of state.board) {
    if (sq?.color === 'r') red++;
    else if (sq?.color === 'b') black++;
  }
  const winnerColor: Color | null = red === 0 ? 'b' : black === 0 ? 'r' : null;
  if (winnerColor) {
    state.winner = playerOf(state, winnerColor);
    state.turn = null;
    state.mustContinueFrom = null;
    return;
  }
  if (state.turn) {
    const color = state.marks[state.turn];
    if (!hasAnyMove(state.board, color)) {
      state.winner = Object.keys(state.marks).find((id) => id !== state.turn) ?? 'draw';
      state.turn = null;
      state.mustContinueFrom = null;
    }
  }
}

function playerOf(state: CheckersState, color: Color): string | 'draw' {
  return Object.keys(state.marks).find((id) => state.marks[id] === color) ?? 'draw';
}
