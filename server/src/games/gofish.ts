import { CardRank, GoFishMove, GoFishState, PlayingCard } from '../../../shared/protocol.js';
import { buildDeck, shuffle } from './deck.js';

const STARTING_HAND = 7;

export function createGoFish(playerIds: string[], firstPlayerId: string): GoFishState {
  const seating = [...playerIds];
  const pool = shuffle(buildDeck());
  const hands: Record<string, PlayingCard[]> = {};
  const handCounts: Record<string, number> = {};
  const books: Record<string, number> = {};
  const bookRanks: Record<string, CardRank[]> = {};
  for (const id of seating) {
    hands[id] = pool.splice(0, STARTING_HAND);
    books[id] = 0;
    bookRanks[id] = [];
  }
  // Pull any books that were dealt straight away.
  for (const id of seating) harvestBooks({ hands, books, bookRanks } as GoFishState, id);
  for (const id of seating) handCounts[id] = hands[id].length;

  return {
    kind: 'gofish',
    seating,
    hands,
    handCounts,
    pool,
    poolCount: pool.length,
    books,
    bookRanks,
    turn: firstPlayerId,
    lastAction: null,
    winner: null,
    moves: 0,
  };
}

export interface MoveResult {
  state: GoFishState;
  error?: string;
}

export function applyGoFishMove(
  state: GoFishState,
  playerId: string,
  move: GoFishMove,
): MoveResult {
  if (state.winner) return { state, error: 'The game is over.' };
  if (playerId !== state.turn) return { state, error: 'Not your turn.' };
  if (move.action !== 'ask') return { state, error: 'Unknown move.' };

  const asker = playerId;
  const opponent = state.seating.find((id) => id !== asker)!;
  const next: GoFishState = structuredClone(state);

  if (!next.hands[asker].some((c) => c.rank === move.rank)) {
    return { state, error: 'You can only ask for a rank you hold.' };
  }

  const askerName = `{${asker}}`;
  const oppName = `{${opponent}}`;
  const matches = next.hands[opponent].filter((c) => c.rank === move.rank);

  if (matches.length > 0) {
    // Opponent hands over every card of that rank — asker goes again.
    next.hands[opponent] = next.hands[opponent].filter((c) => c.rank !== move.rank);
    next.hands[asker].push(...matches);
    next.lastAction = `${askerName} got ${matches.length} ${move.rank} from ${oppName}!`;
    harvestBooks(next, asker);
    next.moves++;
    refillIfEmpty(next, asker);
    finalize(next, asker); // asker keeps the turn
    return { state: next };
  }

  // Go fish — draw from the ocean.
  if (next.pool && next.pool.length > 0) {
    const drawn = next.pool.shift()!;
    next.hands[asker].push(drawn);
    next.poolCount = next.pool.length;
    if (drawn.rank === move.rank) {
      next.lastAction = `Go fish! ${askerName} drew the ${move.rank} they asked for — go again!`;
      harvestBooks(next, asker);
      next.moves++;
      refillIfEmpty(next, asker);
      finalize(next, asker); // lucky draw keeps the turn
      return { state: next };
    }
    next.lastAction = `Go fish! ${askerName} drew a card.`;
    harvestBooks(next, asker);
  } else {
    next.lastAction = `Go fish! …but the ocean is empty.`;
  }

  next.moves++;
  refillIfEmpty(next, asker);
  refillIfEmpty(next, opponent);
  finalize(next, opponent); // turn passes
  return { state: next };
}

export function viewGoFish(state: GoFishState, viewerId: string | null): GoFishState {
  const view: GoFishState = structuredClone(state);
  delete view.pool;
  view.hands = {};
  for (const id of state.seating) {
    view.hands[id] = id === viewerId ? structuredClone(state.hands[id]) : [];
  }
  return view;
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

/** Move any completed set of four out of a hand and into that player's books. */
function harvestBooks(state: GoFishState, playerId: string): void {
  const counts = new Map<CardRank, PlayingCard[]>();
  for (const c of state.hands[playerId]) {
    const arr = counts.get(c.rank) ?? [];
    arr.push(c);
    counts.set(c.rank, arr);
  }
  for (const [rank, cards] of counts) {
    if (cards.length === 4) {
      state.hands[playerId] = state.hands[playerId].filter((c) => c.rank !== rank);
      state.books[playerId]++;
      state.bookRanks[playerId].push(rank);
    }
  }
}

/** If a player runs out of cards but the ocean isn't empty, they draw one. */
function refillIfEmpty(state: GoFishState, playerId: string): void {
  if (state.hands[playerId].length === 0 && state.pool && state.pool.length > 0) {
    state.hands[playerId].push(state.pool.shift()!);
    state.poolCount = state.pool.length;
    harvestBooks(state, playerId);
  }
}

/** Sync counts, set the next turn, and check for the end of the game. */
function finalize(state: GoFishState, nextTurn: string): void {
  for (const id of state.seating) state.handCounts[id] = state.hands[id].length;

  const totalBooks = state.seating.reduce((n, id) => n + state.books[id], 0);
  const everyoneEmpty = state.seating.every((id) => state.hands[id].length === 0);
  const oceanEmpty = !state.pool || state.pool.length === 0;

  if (totalBooks >= 13 || (oceanEmpty && everyoneEmpty)) {
    const [a, b] = state.seating;
    state.turn = null;
    state.winner =
      state.books[a] === state.books[b] ? 'draw' : state.books[a] > state.books[b] ? a : b;
    return;
  }
  // The next player must have cards to ask with; if not (ocean dry), it passes.
  if (state.hands[nextTurn].length === 0) {
    nextTurn = state.seating.find((id) => id !== nextTurn) ?? nextTurn;
  }
  state.turn = nextTurn;
}
