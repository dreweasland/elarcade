// CPU opponents. Each function takes the full server-side state and the bot's
// player id, and returns the move it wants to make now — or null if it isn't
// the bot's turn / there's nothing to do. The room engine calls these on a
// timer so moves feel natural and animations get to play.

import {
  C4_COLS,
  C4_ROWS,
  CardRank,
  CheckerPiece,
  CheckersState,
  ChutesState,
  ConnectFourState,
  GoFishState,
  LUDO_LAST_RING_REL,
  LUDO_RING_LEN,
  LUDO_SAFE,
  LUDO_START,
  LudoState,
  OldMaidState,
  PigState,
  RpsPick,
  RpsState,
  TicTacToeState,
  WINNING_LINES,
} from '../../../shared/protocol.js';

const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// --- Tic-Tac-Toe -----------------------------------------------------------

export function botTicTacToe(state: TicTacToeState, botId: string): { cell: number } | null {
  if (state.winner || state.turn !== botId) return null;
  const me = state.marks[botId];
  const opp = me === 'X' ? 'O' : 'X';
  const b = state.board;
  const empties = b.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0);
  const lineWin = (mark: 'X' | 'O'): number | null => {
    for (const [a, c, d] of WINNING_LINES) {
      const line = [b[a], b[c], b[d]];
      const marks = line.filter((v) => v === mark).length;
      const empty = line.filter((v) => v === null).length;
      if (marks === 2 && empty === 1) return [a, c, d][line.indexOf(null)];
    }
    return null;
  };
  const win = lineWin(me);
  if (win != null) return { cell: win };
  const block = lineWin(opp);
  if (block != null) return { cell: block };
  if (b[4] === null) return { cell: 4 };
  const corners = [0, 2, 6, 8].filter((i) => b[i] === null);
  if (corners.length) return { cell: pick(corners) };
  return empties.length ? { cell: pick(empties) } : null;
}

// --- Connect Four ----------------------------------------------------------

function c4Drop(board: (string | null)[], col: number, mark: string): (string | null)[] | null {
  for (let r = C4_ROWS - 1; r >= 0; r--) {
    const i = r * C4_COLS + col;
    if (!board[i]) {
      const copy = board.slice();
      copy[i] = mark;
      return copy;
    }
  }
  return null;
}

function c4Wins(board: (string | null)[], mark: string): boolean {
  const at = (r: number, c: number) => (r >= 0 && r < C4_ROWS && c >= 0 && c < C4_COLS ? board[r * C4_COLS + c] : null);
  for (let r = 0; r < C4_ROWS; r++) {
    for (let c = 0; c < C4_COLS; c++) {
      if (at(r, c) !== mark) continue;
      for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
        let n = 1;
        while (n < 4 && at(r + dr * n, c + dc * n) === mark) n++;
        if (n === 4) return true;
      }
    }
  }
  return false;
}

export function botConnectFour(state: ConnectFourState, botId: string): { column: number } | null {
  if (state.winner || state.turn !== botId) return null;
  const me = state.marks[botId];
  const opp = me === 'R' ? 'Y' : 'R';
  const legal = Array.from({ length: C4_COLS }, (_, c) => c).filter((c) => c4Drop(state.board, c, me));
  if (!legal.length) return null;
  for (const c of legal) {
    const after = c4Drop(state.board, c, me)!;
    if (c4Wins(after, me)) return { column: c };
  }
  for (const c of legal) {
    const after = c4Drop(state.board, c, opp)!;
    if (c4Wins(after, opp)) return { column: c };
  }
  const center = [3, 2, 4, 1, 5, 0, 6].filter((c) => legal.includes(c));
  return { column: center.length ? center[0] : pick(legal) };
}

// --- Checkers --------------------------------------------------------------

type CkBoard = (CheckerPiece | null)[];
const ckRc = (i: number): [number, number] => [Math.floor(i / 8), i % 8];
const ckIdx = (r: number, c: number) => r * 8 + c;
const ckIn = (r: number, c: number) => r >= 0 && r < 8 && c >= 0 && c < 8;
function ckDirs(p: CheckerPiece): Array<[number, number]> {
  if (p.king) return [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  return p.color === 'r' ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]];
}
function ckJumps(board: CkBoard, i: number): number[] {
  const p = board[i];
  if (!p) return [];
  const [r, c] = ckRc(i);
  const out: number[] = [];
  for (const [dr, dc] of ckDirs(p)) {
    const mr = r + dr, mc = c + dc, tr = r + 2 * dr, tc = c + 2 * dc;
    if (!ckIn(tr, tc)) continue;
    const mid = board[ckIdx(mr, mc)], dest = board[ckIdx(tr, tc)];
    if (mid && mid.color !== p.color && !dest) out.push(ckIdx(tr, tc));
  }
  return out;
}
function ckSteps(board: CkBoard, i: number): number[] {
  const p = board[i];
  if (!p) return [];
  const [r, c] = ckRc(i);
  const out: number[] = [];
  for (const [dr, dc] of ckDirs(p)) {
    const tr = r + dr, tc = c + dc;
    if (ckIn(tr, tc) && !board[ckIdx(tr, tc)]) out.push(ckIdx(tr, tc));
  }
  return out;
}

export function botCheckers(state: CheckersState, botId: string): { action: 'move'; from: number; to: number } | null {
  if (state.winner || state.turn !== botId) return null;
  const color = state.marks[botId];

  if (state.mustContinueFrom !== null) {
    const tos = ckJumps(state.board, state.mustContinueFrom);
    return tos.length ? { action: 'move', from: state.mustContinueFrom, to: pick(tos) } : null;
  }

  const jumps: Array<{ from: number; to: number }> = [];
  const steps: Array<{ from: number; to: number }> = [];
  for (let i = 0; i < 64; i++) {
    const p = state.board[i];
    if (!p || p.color !== color) continue;
    for (const to of ckJumps(state.board, i)) jumps.push({ from: i, to });
    for (const to of ckSteps(state.board, i)) steps.push({ from: i, to });
  }
  if (jumps.length) return { action: 'move', ...pick(jumps) };
  if (steps.length) return { action: 'move', ...pick(steps) };
  return null;
}

// --- Pig -------------------------------------------------------------------

export function botPig(state: PigState, botId: string): { action: 'roll' | 'hold' } | null {
  if (state.winner || state.turn !== botId) return null;
  const banked = state.scores[botId] ?? 0;
  if (banked + state.turnTotal >= state.target) return { action: 'hold' }; // can win
  if (state.turnTotal >= 20) return { action: 'hold' };
  return { action: 'roll' };
}

// --- Chutes & Ladders ------------------------------------------------------

export function botChutes(state: ChutesState, botId: string): { action: 'roll' } | null {
  if (state.winner || state.turn !== botId) return null;
  return { action: 'roll' };
}

// --- Go Fish ---------------------------------------------------------------

export function botGoFish(state: GoFishState, botId: string): { action: 'ask'; rank: CardRank } | null {
  if (state.winner || state.turn !== botId) return null;
  const hand = state.hands[botId] ?? [];
  if (!hand.length) return null;
  return { action: 'ask', rank: pick(hand).rank };
}

// --- Odd One Out -----------------------------------------------------------

export function botOldMaid(state: OldMaidState, botId: string): { action: 'draw'; index: number } | null {
  if (state.winner || state.turn !== botId) return null;
  const opp = state.seating.find((id) => id !== botId);
  const count = opp ? state.handCounts[opp] ?? 0 : 0;
  if (count <= 0) return null;
  return { action: 'draw', index: Math.floor(Math.random() * count) };
}

// --- Rock Paper Scissors ---------------------------------------------------

export function botRps(state: RpsState, botId: string): { action: 'throw'; pick: RpsPick } | null {
  if (state.winner || state.locked[botId]) return null;
  return { action: 'throw', pick: pick<RpsPick>(['rock', 'paper', 'scissors']) };
}

// --- Ludo ------------------------------------------------------------------

export function botLudo(state: LudoState, botId: string): { action: 'roll' } | { action: 'move'; token: number } | null {
  if (state.winner || state.turn !== botId) return null;
  if (state.phase === 'rolling') return { action: 'roll' };
  if (state.phase === 'moving') {
    const d = state.dice ?? 0;
    const color = state.colors[botId];
    const mine = state.tokens[botId];
    let best = state.movable[0];
    let bestScore = -Infinity;
    for (const t of state.movable) {
      const rel = mine[t];
      const newRel = rel < 0 ? 0 : rel + d;
      let score = newRel; // progress
      if (newRel === 56) score += 100; // reaching home
      // Bumping an opponent is great.
      if (newRel >= 0 && newRel <= LUDO_LAST_RING_REL) {
        const abs = (LUDO_START[color] + newRel) % LUDO_RING_LEN;
        if (!LUDO_SAFE.includes(abs)) {
          for (const other of state.seating) {
            if (other === botId) continue;
            const oc = state.colors[other];
            if (state.tokens[other].some((or) => or >= 0 && or <= LUDO_LAST_RING_REL && (LUDO_START[oc] + or) % LUDO_RING_LEN === abs)) {
              score += 50;
            }
          }
        }
      }
      if (rel < 0) score += 5; // getting a token out is good
      if (score > bestScore) {
        bestScore = score;
        best = t;
      }
    }
    return { action: 'move', token: best };
  }
  return null;
}
