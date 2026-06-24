import { ZombieColor, ZombieDie, ZombieFace, ZombieMove, ZombieState } from '../../../shared/protocol.js';

const TARGET = 13; // brains to win
const HAND = 3; // dice rolled at once

// Cup composition: 6 green (easy), 4 yellow (medium), 3 red (nasty).
function freshCup(): ZombieColor[] {
  return [
    ...Array(6).fill('green'),
    ...Array(4).fill('yellow'),
    ...Array(3).fill('red'),
  ] as ZombieColor[];
}

// Face distribution per die color (6 faces each).
const FACES: Record<ZombieColor, ZombieFace[]> = {
  green: ['brain', 'brain', 'brain', 'foot', 'foot', 'shotgun'],
  yellow: ['brain', 'brain', 'foot', 'foot', 'shotgun', 'shotgun'],
  red: ['brain', 'foot', 'foot', 'shotgun', 'shotgun', 'shotgun'],
};

function rollFace(color: ZombieColor): ZombieFace {
  const faces = FACES[color];
  return faces[Math.floor(Math.random() * faces.length)];
}

export function createZombie(playerIds: string[], firstPlayerId: string): ZombieState {
  const scores: Record<string, number> = {};
  for (const id of playerIds) scores[id] = 0;
  const state: ZombieState = {
    kind: 'zombie',
    seating: [...playerIds],
    turn: firstPlayerId,
    scores,
    brains: 0,
    shotguns: 0,
    kept: [],
    rolled: null,
    cupCount: 13,
    busted: false,
    target: TARGET,
    winner: null,
    moves: 0,
    cup: freshCup(),
    usedBrains: [],
  };
  return state;
}

export interface MoveResult {
  state: ZombieState;
  error?: string;
}

export function applyZombieMove(state: ZombieState, playerId: string, move: ZombieMove): MoveResult {
  if (state.winner) return { state, error: 'The game is over.' };
  if (state.turn !== playerId) return { state, error: 'It is not your turn.' };

  const next: ZombieState = structuredClone(state);
  next.moves++;

  if (move.action === 'bank') {
    next.scores[playerId] = (next.scores[playerId] ?? 0) + next.brains;
    if (next.scores[playerId] >= next.target) {
      next.winner = playerId;
      next.turn = null;
      next.rolled = null;
      return { state: next };
    }
    startTurn(next, nextPlayer(next, playerId));
    return { state: next };
  }

  // action === 'roll'
  next.busted = false;
  const cup = next.cup!;
  const usedBrains = next.usedBrains!;

  // Refill the hand to HAND dice, drawing from the cup (reshuffling brains if empty).
  const toRoll: ZombieDie[] = [...next.kept];
  while (toRoll.length < HAND) {
    if (cup.length === 0) {
      // Reshuffle set-aside brain dice back into the cup.
      if (usedBrains.length === 0) break; // truly out of dice
      cup.push(...usedBrains);
      usedBrains.length = 0;
    }
    const idx = Math.floor(Math.random() * cup.length);
    const color = cup.splice(idx, 1)[0];
    toRoll.push({ color, face: 'foot' });
  }

  // Roll every die in hand.
  const rolled: ZombieDie[] = toRoll.map((d) => ({ color: d.color, face: rollFace(d.color) }));
  next.rolled = rolled;
  next.kept = [];

  for (const d of rolled) {
    if (d.face === 'brain') {
      next.brains++;
      usedBrains.push(d.color);
    } else if (d.face === 'shotgun') {
      next.shotguns++;
    } else {
      next.kept.push(d);
    }
  }
  next.cupCount = cup.length;

  if (next.shotguns >= 3) {
    // Blasted! Lose all brains this turn, pass the cup.
    next.brains = 0;
    next.busted = true;
    const blastRoll = next.rolled;
    startTurn(next, nextPlayer(next, playerId));
    next.rolled = blastRoll; // keep the fatal roll visible
    next.busted = true;
  }

  return { state: next };
}

/** Reset all per-turn state and hand the cup to the next player. */
function startTurn(state: ZombieState, playerId: string): void {
  state.turn = playerId;
  state.brains = 0;
  state.shotguns = 0;
  state.kept = [];
  state.rolled = null;
  state.busted = false;
  state.cup = freshCup();
  state.usedBrains = [];
  state.cupCount = 13;
}

function nextPlayer(state: ZombieState, fromId: string): string {
  const idx = state.seating.indexOf(fromId);
  return state.seating[(idx + 1) % state.seating.length];
}

/** Hide the cup contents (and reshuffle bookkeeping) from clients. */
export function viewZombie(state: ZombieState, _viewerId: string | null): ZombieState {
  const view: ZombieState = structuredClone(state);
  delete view.cup;
  delete view.usedBrains;
  return view;
}
