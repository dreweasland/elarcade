import { CHUTES_BOARD, ChutesMove, ChutesState } from '../../../shared/protocol.js';

export function createChutes(playerIds: string[], firstPlayerId: string): ChutesState {
  const positions: Record<string, number> = {};
  for (const id of playerIds) positions[id] = 0;
  return {
    kind: 'chutes',
    seating: [...playerIds],
    turn: firstPlayerId,
    positions,
    lastRoll: null,
    lastFrom: null,
    lastVia: null,
    lastMover: null,
    winner: null,
    moves: 0,
  };
}

export interface MoveResult {
  state: ChutesState;
  error?: string;
}

export function applyChutesMove(state: ChutesState, playerId: string, move: ChutesMove): MoveResult {
  if (state.winner) return { state, error: 'The game is over.' };
  if (state.turn !== playerId) return { state, error: 'It is not your turn.' };
  if (move.action !== 'roll') return { state, error: 'Unknown move.' };

  const next: ChutesState = structuredClone(state);
  next.moves++;

  const roll = 1 + Math.floor(Math.random() * 6);
  next.lastRoll = roll;
  next.lastMover = playerId;
  const from = next.positions[playerId] ?? 0;
  next.lastFrom = from;
  next.lastVia = null;

  let pos = from + roll;

  // Apply a ladder or chute first (they live on squares 1–99) — a ladder can
  // carry you onto 100 (e.g. 80 -> 100), which must count as a win.
  if (pos < 100) {
    const dest = CHUTES_BOARD[pos];
    if (dest !== undefined) {
      next.lastVia = dest > pos ? 'ladder' : 'chute';
      pos = dest;
    }
  }

  // Reaching or passing 100 wins (kid-friendly: no exact-landing bounce-back).
  if (pos >= 100) {
    next.positions[playerId] = 100;
    next.winner = playerId;
    next.turn = null;
    return { state: next };
  }

  next.positions[playerId] = pos;
  next.turn = nextPlayer(next, playerId);
  return { state: next };
}

function nextPlayer(state: ChutesState, fromId: string): string {
  const idx = state.seating.indexOf(fromId);
  return state.seating[(idx + 1) % state.seating.length];
}
