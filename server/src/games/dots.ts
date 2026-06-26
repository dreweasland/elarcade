import { DotsMove, DotsState, GameOptions } from '../../../shared/protocol.js';
import { highestScorer } from './score.js';
import { removeSeat } from './seating.js';

const SIZES: Record<NonNullable<GameOptions['size']>, { rows: number; cols: number }> = {
  small: { rows: 3, cols: 3 },
  medium: { rows: 5, cols: 4 },
  large: { rows: 6, cols: 5 },
};

export function createDots(
  playerIds: string[],
  firstPlayerId: string,
  options?: GameOptions,
): DotsState {
  const { rows, cols } = SIZES[options?.size ?? 'medium'];
  const scores: Record<string, number> = {};
  for (const id of playerIds) scores[id] = 0;
  return {
    kind: 'dots',
    rows,
    cols,
    hEdges: Array((rows + 1) * cols).fill(false),
    vEdges: Array(rows * (cols + 1)).fill(false),
    owners: Array(rows * cols).fill(null),
    seating: [...playerIds],
    turn: firstPlayerId,
    scores,
    winner: null,
    moves: 0,
  };
}

export interface MoveResult {
  state: DotsState;
  error?: string;
}

export function applyDotsMove(state: DotsState, playerId: string, move: DotsMove): MoveResult {
  if (state.winner) return { state, error: 'The game is over.' };
  if (state.turn !== playerId) return { state, error: 'It is not your turn.' };
  if (move.action !== 'edge') return { state, error: 'Unknown move.' };

  const next: DotsState = structuredClone(state);
  const { edge, r, c } = move;

  // Coordinates must be whole numbers — otherwise NaN/floats slip past the
  // range checks below (NaN comparisons are always false) and corrupt the grid.
  if (!Number.isInteger(r) || !Number.isInteger(c)) {
    return { state, error: 'That line is off the board.' };
  }

  // Validate and set the edge.
  if (edge === 'h') {
    if (r < 0 || r > next.rows || c < 0 || c >= next.cols) {
      return { state, error: 'That line is off the board.' };
    }
    const idx = r * next.cols + c;
    if (next.hEdges[idx]) return { state, error: 'That line is already drawn.' };
    next.hEdges[idx] = true;
  } else if (edge === 'v') {
    if (r < 0 || r >= next.rows || c < 0 || c > next.cols) {
      return { state, error: 'That line is off the board.' };
    }
    const idx = r * (next.cols + 1) + c;
    if (next.vEdges[idx]) return { state, error: 'That line is already drawn.' };
    next.vEdges[idx] = true;
  } else {
    return { state, error: 'Unknown edge.' };
  }

  // Check boxes touching this edge for completion.
  const candidates: Array<[number, number]> = [];
  if (edge === 'h') {
    if (r - 1 >= 0) candidates.push([r - 1, c]); // box above
    if (r < next.rows) candidates.push([r, c]); // box below
  } else {
    if (c - 1 >= 0) candidates.push([r, c - 1]); // box left
    if (c < next.cols) candidates.push([r, c]); // box right
  }

  let completed = 0;
  for (const [br, bc] of candidates) {
    const boxIdx = br * next.cols + bc;
    if (next.owners[boxIdx]) continue;
    if (boxComplete(next, br, bc)) {
      next.owners[boxIdx] = playerId;
      next.scores[playerId] = (next.scores[playerId] ?? 0) + 1;
      completed++;
    }
  }

  next.moves++;

  if (next.owners.every((o) => o !== null)) {
    next.winner = highestScorer(next.seating, next.scores);
    next.turn = null;
  } else if (completed === 0) {
    // No box completed → turn passes. Completing a box earns another turn.
    next.turn = nextPlayer(next, playerId);
  }

  return { state: next };
}

function boxComplete(state: DotsState, br: number, bc: number): boolean {
  const top = state.hEdges[br * state.cols + bc];
  const bottom = state.hEdges[(br + 1) * state.cols + bc];
  const left = state.vEdges[br * (state.cols + 1) + bc];
  const right = state.vEdges[br * (state.cols + 1) + bc + 1];
  return top && bottom && left && right;
}

function nextPlayer(state: DotsState, fromId: string): string {
  const idx = state.seating.indexOf(fromId);
  return state.seating[(idx + 1) % state.seating.length];
}

/** Drop a player mid-game; returns null if too few remain to continue. */
export function removeDotsPlayer(state: DotsState, id: string): DotsState | null {
  const seat = removeSeat(state.seating, state.turn, id);
  if (!seat) return null;
  const next: DotsState = structuredClone(state);
  next.seating = seat.seating;
  delete next.scores[id];
  // Free the boxes they claimed (otherwise they'd render as a ghost owner).
  next.owners = next.owners.map((o) => (o === id ? null : o));
  next.turn = seat.turn;
  return next;
}

