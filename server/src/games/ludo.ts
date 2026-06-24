import {
  LUDO_HOME_REL,
  LUDO_LAST_RING_REL,
  LUDO_RING_LEN,
  LUDO_SAFE,
  LUDO_START,
  LudoColor,
  LudoMove,
  LudoState,
} from '../../../shared/protocol.js';

/** Which colours play, by seat count — 2 players sit opposite for fairness. */
const COLOR_LAYOUT: Record<number, LudoColor[]> = {
  2: ['red', 'yellow'],
  3: ['red', 'green', 'yellow'],
  4: ['red', 'green', 'yellow', 'blue'],
};

export function createLudo(playerIds: string[], firstPlayerId: string): LudoState {
  const seating = [...playerIds];
  const layout = COLOR_LAYOUT[seating.length] ?? COLOR_LAYOUT[4];
  const colors: Record<string, LudoColor> = {};
  const tokens: Record<string, number[]> = {};
  seating.forEach((id, i) => {
    colors[id] = layout[i];
    tokens[id] = [-1, -1, -1, -1];
  });

  return {
    kind: 'ludo',
    seating,
    turn: seating.includes(firstPlayerId) ? firstPlayerId : seating[0],
    colors,
    tokens,
    phase: 'rolling',
    dice: null,
    rollId: 0,
    movable: [],
    lastRollNoMove: false,
    lastMover: null,
    lastBump: null,
    winner: null,
    moves: 0,
  };
}

export interface MoveResult {
  state: LudoState;
  error?: string;
}

export function applyLudoMove(state: LudoState, playerId: string, move: LudoMove): MoveResult {
  if (state.winner) return { state, error: 'The game is over.' };
  if (playerId !== state.turn) return { state, error: 'Not your turn.' };

  if (move.action === 'roll') {
    if (state.phase !== 'rolling') return { state, error: 'Pick a token to move first.' };
    const next: LudoState = structuredClone(state);
    const d = 1 + Math.floor(Math.random() * 6);
    next.dice = d;
    next.rollId++;
    next.moves++;
    next.lastBump = null;
    next.lastRollNoMove = false;

    const legal = legalMoves(next, playerId, d);
    if (legal.length === 0) {
      next.lastRollNoMove = true;
      endTurn(next, d, playerId, false);
      return { state: next };
    }
    if (legal.length === 1) {
      moveToken(next, playerId, legal[0], d);
      endTurn(next, d, playerId, true);
      return { state: next };
    }
    next.phase = 'moving';
    next.movable = legal;
    return { state: next };
  }

  if (move.action === 'move') {
    if (state.phase !== 'moving') return { state, error: 'Roll first.' };
    if (state.dice == null) return { state, error: 'Roll first.' };
    if (!state.movable.includes(move.token)) return { state, error: 'That token can’t move.' };
    const next: LudoState = structuredClone(state);
    next.lastBump = null;
    moveToken(next, playerId, move.token, next.dice!);
    next.moves++;
    next.movable = [];
    endTurn(next, next.dice!, playerId, true);
    return { state: next };
  }

  return { state, error: 'Unknown move.' };
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

/** Token indices the player can legally move with die value `d`. */
function legalMoves(state: LudoState, playerId: string, d: number): number[] {
  const out: number[] = [];
  state.tokens[playerId].forEach((rel, i) => {
    if (rel === LUDO_HOME_REL) return; // already home
    if (rel === -1) {
      if (d === 6) out.push(i); // a 6 launches a token
      return;
    }
    if (rel + d <= LUDO_HOME_REL) out.push(i); // must land exactly on/within home
  });
  return out;
}

/** Move one token, resolving bumps and a possible win. */
function moveToken(state: LudoState, playerId: string, token: number, d: number): void {
  const color = state.colors[playerId];
  const rel = state.tokens[playerId][token];
  const newRel = rel === -1 ? 0 : rel + d;
  state.tokens[playerId][token] = newRel;
  state.lastMover = playerId;

  // Bumping only happens on the common loop, and never on a safe square.
  if (newRel >= 0 && newRel <= LUDO_LAST_RING_REL) {
    const abs = (LUDO_START[color] + newRel) % LUDO_RING_LEN;
    if (!LUDO_SAFE.includes(abs)) {
      for (const other of state.seating) {
        if (other === playerId) continue;
        const oc = state.colors[other];
        state.tokens[other].forEach((orel, oi) => {
          if (orel >= 0 && orel <= LUDO_LAST_RING_REL) {
            if ((LUDO_START[oc] + orel) % LUDO_RING_LEN === abs) {
              state.tokens[other][oi] = -1; // sent home
              state.lastBump = { victim: oc };
            }
          }
        });
      }
    }
  }

  if (state.tokens[playerId].every((t) => t === LUDO_HOME_REL)) {
    state.winner = playerId;
  }
}

/** Hand the turn on — a 6 (after an actual move) earns another roll. */
function endTurn(state: LudoState, d: number, playerId: string, moved: boolean): void {
  state.phase = 'rolling';
  if (state.winner) {
    state.turn = null;
    return;
  }
  if (d === 6 && moved) {
    state.turn = playerId; // bonus roll
    return;
  }
  const idx = state.seating.indexOf(playerId);
  state.turn = state.seating[(idx + 1) % state.seating.length];
}
