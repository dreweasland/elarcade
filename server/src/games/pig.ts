import { GameOptions, PigMove, PigState } from '../../../shared/protocol.js';
import { removeSeat } from './seating.js';

const TARGET = 100;

export function createPig(
  playerIds: string[],
  firstPlayerId: string,
  options?: GameOptions,
): PigState {
  const scores: Record<string, number> = {};
  for (const id of playerIds) scores[id] = 0;
  return {
    kind: 'pig',
    seating: [...playerIds],
    turn: firstPlayerId,
    scores,
    turnTotal: 0,
    diceCount: options?.dice === 2 ? 2 : 1,
    lastRoll: null,
    lastRoller: null,
    busted: false,
    wipedOut: false,
    target: TARGET,
    winner: null,
    moves: 0,
  };
}

export interface MoveResult {
  state: PigState;
  error?: string;
}

const die = () => 1 + Math.floor(Math.random() * 6);

export function applyPigMove(state: PigState, playerId: string, move: PigMove): MoveResult {
  if (state.winner) return { state, error: 'The game is over.' };
  if (state.turn !== playerId) return { state, error: 'It is not your turn.' };

  const next: PigState = structuredClone(state);
  next.moves++;
  next.busted = false;
  next.wipedOut = false;

  if (move.action === 'roll') {
    const roll = Array.from({ length: next.diceCount }, die);
    next.lastRoll = roll;
    next.lastRoller = playerId;
    const ones = roll.filter((d) => d === 1).length;

    if (next.diceCount === 2 && ones === 2) {
      // Snake eyes — lose this turn's points AND your whole banked score.
      next.turnTotal = 0;
      next.scores[playerId] = 0;
      next.wipedOut = true;
      next.turn = nextPlayer(next, playerId);
    } else if (ones >= 1) {
      // A single 1 — lose this turn's points only.
      next.turnTotal = 0;
      next.busted = true;
      next.turn = nextPlayer(next, playerId);
    } else {
      next.turnTotal += roll.reduce((a, b) => a + b, 0);
      // Turn stays — keep rolling or hold.
    }
    return { state: next };
  }

  if (move.action === 'hold') {
    next.scores[playerId] = (next.scores[playerId] ?? 0) + next.turnTotal;
    next.turnTotal = 0;
    next.lastRoll = null;
    next.lastRoller = null;
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

/** Drop a player mid-game; returns null if too few remain to continue. */
export function removePigPlayer(state: PigState, id: string): PigState | null {
  const seat = removeSeat(state.seating, state.turn, id);
  if (!seat) return null;
  const next: PigState = structuredClone(state);
  next.seating = seat.seating;
  delete next.scores[id];
  if (seat.wasTurn) {
    next.turnTotal = 0;
    next.lastRoll = null;
    next.lastRoller = null;
    next.busted = false;
    next.wipedOut = false;
  }
  next.turn = seat.turn;
  return next;
}
