import { CARD_RANKS, CARD_SUITS, CardSuit, PlayingCard } from '../../../shared/protocol.js';

const SUIT_CHAR: Record<CardSuit, string> = {
  spades: 's',
  hearts: 'h',
  diamonds: 'd',
  clubs: 'c',
};

/** A fresh, ordered 52-card deck. */
export function buildDeck(): PlayingCard[] {
  const deck: PlayingCard[] = [];
  for (const suit of CARD_SUITS) {
    for (const rank of CARD_RANKS) {
      deck.push({ id: `${rank}${SUIT_CHAR[suit]}`, rank, suit });
    }
  }
  return deck;
}

/** Fisher–Yates shuffle, in place. */
export function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
