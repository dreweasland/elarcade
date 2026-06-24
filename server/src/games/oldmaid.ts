import { OldMaidMove, OldMaidState, PlayingCard } from '../../../shared/protocol.js';
import { buildDeck, shuffle } from './deck.js';

/**
 * Odd One Out (Old Maid). One Queen is removed from the deck, so three Queens
 * remain — one of them can never be paired. Whoever is left holding it loses.
 */
export function createOldMaid(playerIds: string[], firstPlayerId: string): OldMaidState {
  const seating = [...playerIds];
  // A standard deck minus exactly one Queen, so the odd Queen can never pair.
  let removedOne = false;
  const trimmed = buildDeck().filter((c) => {
    if (!removedOne && c.rank === 'Q') {
      removedOne = true;
      return false;
    }
    return true;
  });
  shuffle(trimmed);

  const hands: Record<string, PlayingCard[]> = {};
  for (const id of seating) hands[id] = [];
  trimmed.forEach((card, i) => hands[seating[i % seating.length]].push(card));

  const pairs: Record<string, number> = {};
  const handCounts: Record<string, number> = {};
  for (const id of seating) {
    pairs[id] = discardPairs(hands[id]);
    handCounts[id] = hands[id].length;
  }

  const state: OldMaidState = {
    kind: 'oldmaid',
    seating,
    hands,
    handCounts,
    pairs,
    turn: firstPlayerId,
    lastDrawn: null,
    lastPaired: false,
    loser: null,
    winner: null,
    moves: 0,
  };
  checkEnd(state);
  return state;
}

export interface MoveResult {
  state: OldMaidState;
  error?: string;
}

export function applyOldMaidMove(
  state: OldMaidState,
  playerId: string,
  move: OldMaidMove,
): MoveResult {
  if (state.winner) return { state, error: 'The game is over.' };
  if (playerId !== state.turn) return { state, error: 'Not your turn.' };
  if (move.action !== 'draw') return { state, error: 'Unknown move.' };

  const opponent = state.seating.find((id) => id !== playerId)!;
  const next: OldMaidState = structuredClone(state);
  const oppHand = next.hands[opponent];
  if (oppHand.length === 0) return { state, error: 'Nothing left to draw.' };

  // Positions are hidden (all backs), so shuffle to keep the pick fair, then
  // honor whichever index they tapped.
  shuffle(oppHand);
  const idx = Math.max(0, Math.min(oppHand.length - 1, Math.floor(move.index)));
  const [card] = oppHand.splice(idx, 1);

  // Does it pair with something already in hand?
  const myHand = next.hands[playerId];
  const matchAt = myHand.findIndex((c) => c.rank === card.rank);
  if (matchAt >= 0) {
    myHand.splice(matchAt, 1);
    next.pairs[playerId]++;
    next.lastPaired = true;
  } else {
    myHand.push(card);
    next.lastPaired = false;
  }
  next.lastDrawn = card;
  next.moves++;

  for (const id of next.seating) next.handCounts[id] = next.hands[id].length;
  checkEnd(next);
  if (!next.winner) next.turn = opponent;
  return { state: next };
}

export function viewOldMaid(state: OldMaidState, viewerId: string | null): OldMaidState {
  const view: OldMaidState = structuredClone(state);
  view.hands = {};
  for (const id of state.seating) {
    view.hands[id] = id === viewerId ? structuredClone(state.hands[id]) : [];
  }
  return view;
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

/** Remove all rank-pairs from a hand (in place). Returns pairs removed. */
function discardPairs(hand: PlayingCard[]): number {
  let pairs = 0;
  let again = true;
  while (again) {
    again = false;
    outer: for (let i = 0; i < hand.length; i++) {
      for (let j = i + 1; j < hand.length; j++) {
        if (hand[i].rank === hand[j].rank) {
          hand.splice(j, 1);
          hand.splice(i, 1);
          pairs++;
          again = true;
          break outer;
        }
      }
    }
  }
  return pairs;
}

/** When one lone card (the odd Queen) is all that remains, end the game. */
function checkEnd(state: OldMaidState): void {
  const total = state.seating.reduce((n, id) => n + state.hands[id].length, 0);
  if (total <= 1) {
    const holder = state.seating.find((id) => state.hands[id].length > 0) ?? null;
    state.loser = holder;
    state.turn = null;
    state.winner = state.seating.find((id) => id !== holder) ?? 'draw';
  }
}
