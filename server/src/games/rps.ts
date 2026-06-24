import { RpsMove, RpsPick, RpsState } from '../../../shared/protocol.js';

const TARGET = 3; // best of five

/** What each throw beats. */
const BEATS: Record<RpsPick, RpsPick> = {
  rock: 'scissors',
  paper: 'rock',
  scissors: 'paper',
};

export function createRps(playerIds: string[]): RpsState {
  const seating = [...playerIds];
  const scores: Record<string, number> = {};
  const locked: Record<string, boolean> = {};
  const picks: Record<string, RpsPick | null> = {};
  for (const id of seating) {
    scores[id] = 0;
    locked[id] = false;
    picks[id] = null;
  }
  return {
    kind: 'rps',
    seating,
    scores,
    target: TARGET,
    round: 0,
    picks,
    locked,
    lastResult: null,
    winner: null,
    moves: 0,
  };
}

export interface MoveResult {
  state: RpsState;
  error?: string;
}

export function applyRpsMove(state: RpsState, playerId: string, move: RpsMove): MoveResult {
  if (state.winner) return { state, error: 'The game is over.' };
  if (!state.seating.includes(playerId)) return { state, error: 'You are not in this game.' };
  if (move.action !== 'throw') return { state, error: 'Unknown move.' };
  if (move.pick !== 'rock' && move.pick !== 'paper' && move.pick !== 'scissors') {
    return { state, error: 'Pick rock, paper, or scissors.' };
  }
  if (state.locked[playerId]) return { state, error: 'You already threw — wait for your opponent.' };

  const next: RpsState = structuredClone(state);
  next.picks![playerId] = move.pick;
  next.locked[playerId] = true;
  next.moves++;

  // Resolve once both players have thrown.
  if (next.seating.every((id) => next.locked[id])) {
    const [a, b] = next.seating;
    const pa = next.picks![a]!;
    const pb = next.picks![b]!;
    let winner: string | 'tie';
    if (pa === pb) winner = 'tie';
    else winner = BEATS[pa] === pb ? a : b;

    if (winner !== 'tie') next.scores[winner]++;
    next.lastResult = { picks: { [a]: pa, [b]: pb }, winner };
    next.round++;

    // Reset for the next round.
    for (const id of next.seating) {
      next.picks![id] = null;
      next.locked[id] = false;
    }

    if (next.scores[a] >= next.target || next.scores[b] >= next.target) {
      next.winner = next.scores[a] > next.scores[b] ? a : b;
    }
  }

  return { state: next };
}

export function viewRps(state: RpsState, _viewerId: string | null): RpsState {
  // Hide live throws until the round resolves; the `locked` flags are public,
  // and `lastResult` already holds the fully revealed previous round.
  const view: RpsState = structuredClone(state);
  delete view.picks;
  return view;
}
