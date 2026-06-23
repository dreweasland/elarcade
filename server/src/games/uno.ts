import { UnoCard, UnoColor, UnoMove, UnoState } from '../../../shared/protocol.js';

const COLORS: UnoColor[] = ['red', 'yellow', 'green', 'blue'];

// ---------------------------------------------------------------------------
// Deck
// ---------------------------------------------------------------------------

function buildDeck(): UnoCard[] {
  const deck: UnoCard[] = [];
  let n = 0;
  const card = (c: UnoCard['color'], kind: UnoCard['kind'], value?: number) =>
    deck.push({ id: `c${n++}`, color: c, kind, value });

  for (const color of COLORS) {
    card(color, 'number', 0); // one 0
    for (let v = 1; v <= 9; v++) {
      card(color, 'number', v);
      card(color, 'number', v); // two of 1..9
    }
    for (const kind of ['skip', 'reverse', 'draw2'] as const) {
      card(color, kind);
      card(color, kind); // two of each action
    }
  }
  for (let i = 0; i < 4; i++) card('wild', 'wild');
  for (let i = 0; i < 4; i++) card('wild', 'wild4');
  return deck;
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export function createUno(playerIds: string[], firstPlayerId: string): UnoState {
  const drawPile = shuffle(buildDeck());
  const hands: Record<string, UnoCard[]> = {};
  for (const id of playerIds) hands[id] = drawPile.splice(0, 7);

  // Flip the starting card; keep flipping past wild/action cards so the first
  // turn has a plain number to match (a common simplification).
  let start = drawPile.shift()!;
  while (start.kind !== 'number') {
    drawPile.push(start);
    start = drawPile.shift()!;
  }
  const discard = [start];

  return {
    kind: 'uno',
    seating: [...playerIds],
    hands,
    drawPile,
    drawPileCount: drawPile.length,
    discard,
    topColor: start.color as UnoColor,
    direction: 1,
    turn: firstPlayerId,
    pendingPlay: null,
    winner: null,
    lastAction: 'Game on! Match the color or number.',
    moves: 0,
  };
}

export interface MoveResult {
  state: UnoState;
  error?: string;
}

// ---------------------------------------------------------------------------
// Apply move
// ---------------------------------------------------------------------------

export function applyUnoMove(state: UnoState, playerId: string, move: UnoMove): MoveResult {
  if (state.winner) return { state, error: 'The game is over.' };
  if (state.turn !== playerId) return { state, error: 'It is not your turn.' };

  const next: UnoState = structuredClone(state);
  const pending = next.pendingPlay && next.pendingPlay.player === playerId ? next.pendingPlay : null;

  if (move.action === 'pass') {
    if (!pending) return { state, error: 'You can only pass after drawing.' };
    next.pendingPlay = null;
    next.lastAction = `${tag(playerId)} passed.`;
    next.moves++;
    advance(next, playerId, 1);
    return { state: next };
  }

  if (move.action === 'draw') {
    if (pending) return { state, error: 'Play the card you drew, or pass.' };
    const drawn = drawCards(next, playerId, 1)[0];
    next.moves++;
    if (drawn && isPlayable(drawn, top(next), next.topColor)) {
      // Drew a playable card — let them choose to play it or pass.
      next.pendingPlay = { player: playerId, cardId: drawn.id };
      next.lastAction = `${tag(playerId)} drew a card they can play.`;
    } else {
      next.pendingPlay = null;
      next.lastAction = `${tag(playerId)} drew a card.`;
      advance(next, playerId, 1);
    }
    return { state: next };
  }

  // action === 'play'
  const hand = next.hands[playerId];
  const card = hand.find((c) => c.id === move.cardId);
  if (!card) return { state, error: 'You do not have that card.' };
  if (pending && card.id !== pending.cardId) {
    return { state, error: 'You must play the card you drew, or pass.' };
  }
  if (!isPlayable(card, top(next), next.topColor)) {
    return { state, error: "That card doesn't match." };
  }
  const isWild = card.kind === 'wild' || card.kind === 'wild4';
  if (isWild && !move.chosenColor) return { state, error: 'Pick a color for your wild card.' };

  // Remove from hand, place on discard.
  next.hands[playerId] = hand.filter((c) => c.id !== card.id);
  next.discard.push(card);
  next.topColor = isWild ? (move.chosenColor as UnoColor) : (card.color as UnoColor);
  next.pendingPlay = null;
  next.moves++;

  const remaining = next.hands[playerId].length;
  let note = `${tag(playerId)} played ${describe(card, next.topColor)}.`;

  if (remaining === 0) {
    next.winner = playerId;
    next.turn = null;
    next.lastAction = `${tag(playerId)} played their last card — winner!`;
    return { state: next };
  }

  // UNO-call enforcement: down to one card without calling UNO → draw 2.
  if (remaining === 1) {
    if (move.uno) {
      note += ` UNO! 🎉`;
    } else {
      drawCards(next, playerId, 2);
      note += ` Forgot to say UNO — draw 2!`;
    }
  }

  applyCardEffect(next, playerId, card, (extra) => (note += ` ${extra}`));
  next.lastAction = note;
  return { state: next };
}

// ---------------------------------------------------------------------------
// Effects & turn order
// ---------------------------------------------------------------------------

function applyCardEffect(
  state: UnoState,
  playerId: string,
  card: UnoCard,
  log: (s: string) => void,
): void {
  const n = state.seating.length;
  switch (card.kind) {
    case 'reverse': {
      state.direction = (state.direction * -1) as 1 | -1;
      if (n === 2) {
        // Reverse acts as a Skip in two-player.
        advance(state, playerId, 2);
        log('Reversed!');
      } else {
        advance(state, playerId, 1);
        log('Reversed!');
      }
      break;
    }
    case 'skip': {
      const skipped = neighbor(state, playerId, 1);
      advance(state, playerId, 2);
      log(`${tag(skipped)} was skipped!`);
      break;
    }
    case 'draw2': {
      const victim = neighbor(state, playerId, 1);
      drawCards(state, victim, 2);
      advance(state, playerId, 2);
      log(`${tag(victim)} draws 2 and is skipped!`);
      break;
    }
    case 'wild4': {
      const victim = neighbor(state, playerId, 1);
      drawCards(state, victim, 4);
      advance(state, playerId, 2);
      log(`${tag(victim)} draws 4 and is skipped!`);
      break;
    }
    default:
      advance(state, playerId, 1); // number or plain wild
  }
}

/** The player `steps` seats away from `fromId` in the current direction. */
function neighbor(state: UnoState, fromId: string, steps: number): string {
  const n = state.seating.length;
  const idx = state.seating.indexOf(fromId);
  const next = (((idx + state.direction * steps) % n) + n) % n;
  return state.seating[next];
}

/** Move the turn `steps` seats from `fromId` in the current direction. */
function advance(state: UnoState, fromId: string, steps: number): void {
  state.turn = neighbor(state, fromId, steps);
}

// ---------------------------------------------------------------------------
// Draw pile
// ---------------------------------------------------------------------------

function drawCards(state: UnoState, playerId: string, count: number): UnoCard[] {
  const drawn: UnoCard[] = [];
  for (let i = 0; i < count; i++) {
    if (state.drawPile.length === 0) reshuffle(state);
    const card = state.drawPile.shift();
    if (!card) break; // pile and discard exhausted (vanishingly rare)
    state.hands[playerId].push(card);
    drawn.push(card);
  }
  state.drawPileCount = state.drawPile.length;
  return drawn;
}

/** When the draw pile runs out, reshuffle the discard (except its top) back in. */
function reshuffle(state: UnoState): void {
  if (state.discard.length <= 1) return;
  const topCard = state.discard.pop()!;
  state.drawPile = shuffle(state.discard);
  state.discard = [topCard];
  state.drawPileCount = state.drawPile.length;
}

// ---------------------------------------------------------------------------
// Rules helpers
// ---------------------------------------------------------------------------

function top(state: UnoState): UnoCard {
  return state.discard[state.discard.length - 1];
}

export function isPlayable(card: UnoCard, topCard: UnoCard, topColor: UnoColor): boolean {
  if (card.kind === 'wild' || card.kind === 'wild4') return true;
  if (card.color === topColor) return true;
  if (card.kind === 'number' && topCard.kind === 'number' && card.value === topCard.value) {
    return true;
  }
  if (card.kind !== 'number' && card.kind === topCard.kind) return true;
  return false;
}

function describe(card: UnoCard, activeColor: UnoColor): string {
  const colorName = (c: string) => c.charAt(0).toUpperCase() + c.slice(1);
  if (card.kind === 'number') return `${colorName(card.color)} ${card.value}`;
  if (card.kind === 'skip') return `${colorName(card.color)} Skip`;
  if (card.kind === 'reverse') return `${colorName(card.color)} Reverse`;
  if (card.kind === 'draw2') return `${colorName(card.color)} Draw Two`;
  if (card.kind === 'wild4') return `Wild Draw Four (${colorName(activeColor)})`;
  return `Wild (${colorName(activeColor)})`;
}

// A short tag the room layer can't resolve to names, so we use the id; the
// client maps ids to names. We keep the raw id wrapped for clarity.
function tag(playerId: string): string {
  return `{${playerId}}`;
}

// ---------------------------------------------------------------------------
// Redaction — hide other hands and the draw pile from the wire
// ---------------------------------------------------------------------------

export function viewUno(state: UnoState, viewerId: string | null): UnoState {
  const view: UnoState = structuredClone(state);
  view.drawPile = [];
  // Send only the top discard card.
  view.discard = [top(state)];
  for (const pid of Object.keys(view.hands)) {
    if (pid === viewerId) continue;
    view.hands[pid] = view.hands[pid].map((_, i) => ({
      id: `back-${pid}-${i}`,
      color: 'back',
      kind: 'back',
    }));
  }
  return view;
}
