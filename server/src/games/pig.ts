import { PigMove, PigState } from '../../../shared/protocol.js';

const TARGET = 100;

export function createPig(playerIds: string[], firstPlayerId: string): PigState {
  const scores: Record<string, number> = {};
  for (const id of playerIds) scores[id] = 0;
  return {
    kind: 'pig',
    seating: [...playerIds],
    turn: firstPlayerId,
    scores,
    turnTotal: 0,
    lastRoll: null,
    busted: false,
    target: TARGET,
    winner: null,
    moves: 0,
  };
}

export interface MoveResult {
  state: PigState;
  error?: string;
}

export function applyPigMove(state: PigState, playerId: string, move: PigMove): MoveResult {
  if (state.winner) return { state, error: 'The game is over.' };
  if (state.turn !== playerId) return { state, error: 'It is not your turn.' };

  const next: PigState = structuredClone(state);
  next.moves++;

  if (move.action === 'roll') {
    const roll = 1 + Math.floor(Math.random() * 6);
    next.lastRoll = roll;
    if (roll === 1) {
      // Bust: lose this turn's points, pass the dice.
      next.turnTotal = 0;
      next.busted = true;
      next.turn = nextPlayer(next, playerId);
    } else {
      next.turnTotal += roll;
      next.busted = false;
      // Turn stays — keep rolling or hold.
    }
    return { state: next };
  }

  if (move.action === 'hold') {
    next.scores[playerId] = (next.scores[playerId] ?? 0) + next.turnTotal;
    next.turnTotal = 0;
    next.busted = false;
    next.lastRoll = null;
    if (next.scores[playerId] >= next.target) {
      next.winner = playerId;
      next.turn = null;
    } else {
      next.turn = nextPlayer(next, playerId);
    }
    return { state: next };
  }

  return { state, error: 'Unknown move.' };
}

function nextPlayer(state: PigState, fromId: string): string {
  const idx = state.seating.indexOf(fromId);
  return state.seating[(idx + 1) % state.seating.length];
}
