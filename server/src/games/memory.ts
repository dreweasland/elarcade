import { GameOptions, MemoryCard, MemoryMove, MemoryState } from '../../../shared/protocol.js';

// A pool of distinct, kid-friendly faces — needs >= 18 for the large board.
const FACES = [
  '🦖', '🐱', '🦄', '🤖', '🐸', '🦊', '🐙', '🐯',
  '🦉', '🐧', '🦋', '🐲', '👾', '🦁', '🐼', '🚀',
  '🍕', '🍩', '🍓', '⚽️', '🎸', '🌈', '⭐️', '🎈',
  '🐢', '🦕', '🐝', '🌵', '🍔', '🎲', '🎁', '🔥',
];

const SIZES: Record<NonNullable<GameOptions['size']>, { rows: number; cols: number }> = {
  small: { rows: 4, cols: 4 }, // 8 pairs
  medium: { rows: 4, cols: 6 }, // 12 pairs
  large: { rows: 6, cols: 6 }, // 18 pairs
};

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function createMemory(
  playerIds: string[],
  firstPlayerId: string,
  options?: GameOptions,
): MemoryState {
  const { rows, cols } = SIZES[options?.size ?? 'medium'];
  const pairCount = (rows * cols) / 2;
  const faces = shuffle(FACES).slice(0, pairCount);

  let n = 0;
  const deck: MemoryCard[] = shuffle(
    faces.flatMap((face) => [
      { id: `m${n++}`, face, matchedBy: null },
      { id: `m${n++}`, face, matchedBy: null },
    ]),
  );

  const scores: Record<string, number> = {};
  for (const id of playerIds) scores[id] = 0;

  return {
    kind: 'memory',
    rows,
    cols,
    cards: deck,
    flipped: [],
    seating: [...playerIds],
    turn: firstPlayerId,
    scores,
    winner: null,
    lastResult: null,
    moves: 0,
  };
}

export interface MoveResult {
  state: MemoryState;
  error?: string;
}

export function applyMemoryMove(
  state: MemoryState,
  playerId: string,
  move: MemoryMove,
): MoveResult {
  if (state.winner) return { state, error: 'The game is over.' };
  if (state.turn !== playerId) return { state, error: 'It is not your turn.' };
  if (move.action !== 'flip') return { state, error: 'Unknown move.' };

  const next: MemoryState = structuredClone(state);
  const i = move.index;
  if (!Number.isInteger(i) || i < 0 || i >= next.cards.length) {
    return { state, error: 'That card does not exist.' };
  }

  // Clear a leftover mismatched pair (from the previous turn) before flipping.
  if (next.flipped.length === 2) next.flipped = [];

  if (next.cards[i].matchedBy) return { state, error: 'That card is already matched.' };
  if (next.flipped.includes(i)) return { state, error: 'That card is already face up.' };

  next.flipped.push(i);
  next.moves++;

  if (next.flipped.length < 2) {
    // First card of the turn — just reveal it and wait for the second.
    next.lastResult = null;
    return { state: next };
  }

  // Second card flipped — resolve the pair.
  const [a, b] = next.flipped;
  if (next.cards[a].face === next.cards[b].face) {
    next.cards[a].matchedBy = playerId;
    next.cards[b].matchedBy = playerId;
    next.scores[playerId] = (next.scores[playerId] ?? 0) + 1;
    next.flipped = [];
    next.lastResult = 'match';

    if (next.cards.every((c) => c.matchedBy)) {
      next.winner = decideWinner(next);
      next.turn = null;
    }
    // Match → same player goes again (turn unchanged).
  } else {
    // Miss → leave both cards face-up so everyone sees them, pass the turn.
    // They flip back down on the next player's first flip.
    next.lastResult = 'miss';
    next.turn = nextPlayer(next, playerId);
  }

  return { state: next };
}

function nextPlayer(state: MemoryState, fromId: string): string {
  const idx = state.seating.indexOf(fromId);
  return state.seating[(idx + 1) % state.seating.length];
}

/** Most pairs wins; a tie for the lead is a draw. */
function decideWinner(state: MemoryState): string | 'draw' {
  let best = -1;
  let winners: string[] = [];
  for (const id of state.seating) {
    const s = state.scores[id] ?? 0;
    if (s > best) {
      best = s;
      winners = [id];
    } else if (s === best) {
      winners.push(id);
    }
  }
  return winners.length === 1 ? winners[0] : 'draw';
}

/** Hide the faces of cards that aren't currently face-up or matched. */
export function viewMemory(state: MemoryState, _viewerId: string | null): MemoryState {
  const view: MemoryState = structuredClone(state);
  view.cards = view.cards.map((card, idx) => {
    const visible = card.matchedBy !== null || view.flipped.includes(idx);
    return visible ? card : { ...card, face: '' };
  });
  return view;
}
