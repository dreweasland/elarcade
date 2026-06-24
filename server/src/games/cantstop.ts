import { CANTSTOP_HEIGHTS, CantStopMove, CantStopState } from '../../../shared/protocol.js';

const CLAIMS_TO_WIN = 3;
const MAX_RUNNERS = 3;

export function createCantStop(playerIds: string[], firstPlayerId: string): CantStopState {
  const progress: Record<string, Record<number, number>> = {};
  for (const id of playerIds) progress[id] = {};
  return {
    kind: 'cantstop',
    seating: [...playerIds],
    turn: firstPlayerId,
    heights: { ...CANTSTOP_HEIGHTS },
    progress,
    claimed: {},
    runners: {},
    phase: 'rolling',
    dice: null,
    options: null,
    busted: false,
    claimsToWin: CLAIMS_TO_WIN,
    winner: null,
    moves: 0,
  };
}

export interface MoveResult {
  state: CantStopState;
  error?: string;
}

export function applyCantStopMove(
  state: CantStopState,
  playerId: string,
  move: CantStopMove,
): MoveResult {
  if (state.winner) return { state, error: 'The game is over.' };
  if (state.turn !== playerId) return { state, error: 'It is not your turn.' };

  const next: CantStopState = structuredClone(state);

  if (move.action === 'roll') {
    if (next.phase !== 'rolling') return { state, error: 'Resolve your roll first.' };
    next.moves++;
    next.busted = false;
    const dice = Array.from({ length: 4 }, () => 1 + Math.floor(Math.random() * 6));
    next.dice = dice;
    const options = generateOptions(next, playerId, dice);
    if (options.length === 0) {
      // Bust — lose this turn's runners, pass the dice.
      const bustDice = dice;
      startTurn(next, nextPlayer(next, playerId));
      next.busted = true;
      next.dice = bustDice;
    } else {
      next.options = options;
      next.phase = 'choosing';
    }
    return { state: next };
  }

  if (move.action === 'choose') {
    if (next.phase !== 'choosing' || !next.options) {
      return { state, error: 'Nothing to choose right now.' };
    }
    const opt = next.options[move.index];
    if (!opt) return { state, error: 'Invalid choice.' };
    next.moves++;
    for (const col of opt.cols) {
      const base = next.runners[col] ?? next.progress[playerId]?.[col] ?? 0;
      next.runners[col] = Math.min(next.heights[col], base + 1);
    }
    next.options = null;
    next.phase = 'rolling';
    return { state: next };
  }

  if (move.action === 'stop') {
    if (next.phase !== 'rolling') return { state, error: 'Resolve your roll first.' };
    if (Object.keys(next.runners).length === 0) {
      return { state, error: 'Roll at least once before stopping.' };
    }
    next.moves++;
    // Commit runners to permanent progress; claim any completed columns.
    for (const key of Object.keys(next.runners)) {
      const col = Number(key);
      const height = next.runners[col];
      next.progress[playerId][col] = height;
      if (height >= next.heights[col] && next.claimed[col] === undefined) {
        next.claimed[col] = playerId;
      }
    }
    const claimedCount = Object.values(next.claimed).filter((p) => p === playerId).length;
    if (claimedCount >= next.claimsToWin) {
      next.winner = playerId;
      next.turn = null;
      next.runners = {};
      next.phase = 'rolling';
      next.dice = null;
      next.options = null;
      return { state: next };
    }
    startTurn(next, nextPlayer(next, playerId));
    return { state: next };
  }

  return { state, error: 'Unknown move.' };
}

/** All distinct legal advance choices for a roll, respecting the 3-runner limit. */
function generateOptions(
  state: CantStopState,
  playerId: string,
  dice: number[],
): Array<{ cols: number[] }> {
  const slots = MAX_RUNNERS - Object.keys(state.runners).length;
  const tent = (col: number) =>
    state.runners[col] ?? state.progress[playerId]?.[col] ?? 0;
  const hasRunner = (col: number) => state.runners[col] !== undefined;
  const isOpen = (col: number) =>
    col >= 2 && col <= 12 && state.claimed[col] === undefined && tent(col) < state.heights[col];

  const pairings: Array<[number, number]> = [
    [dice[0] + dice[1], dice[2] + dice[3]],
    [dice[0] + dice[2], dice[1] + dice[3]],
    [dice[0] + dice[3], dice[1] + dice[2]],
  ];

  const raw: number[][] = [];
  for (const [a, b] of pairings) {
    if (a === b) {
      if (isOpen(a) && (hasRunner(a) || slots >= 1)) raw.push([a, a]);
    } else {
      const aPlay = isOpen(a) && (hasRunner(a) || slots >= 1);
      const bPlay = isOpen(b) && (hasRunner(b) || slots >= 1);
      if (aPlay && bPlay) {
        const newNeeded = (hasRunner(a) ? 0 : 1) + (hasRunner(b) ? 0 : 1);
        if (newNeeded <= slots) raw.push([a, b]);
        else {
          raw.push([a]);
          raw.push([b]);
        }
      } else if (aPlay) raw.push([a]);
      else if (bPlay) raw.push([b]);
    }
  }

  const seen = new Set<string>();
  const result: Array<{ cols: number[] }> = [];
  for (const cols of raw) {
    const key = [...cols].sort((x, y) => x - y).join(',');
    if (!seen.has(key)) {
      seen.add(key);
      result.push({ cols });
    }
  }
  return result;
}

function startTurn(state: CantStopState, playerId: string): void {
  state.turn = playerId;
  state.runners = {};
  state.dice = null;
  state.options = null;
  state.phase = 'rolling';
  state.busted = false;
}

function nextPlayer(state: CantStopState, fromId: string): string {
  const idx = state.seating.indexOf(fromId);
  return state.seating[(idx + 1) % state.seating.length];
}
