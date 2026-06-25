import { DrawGuessMove, DrawGuessState } from '../../../shared/protocol.js';

const ROUND_SECONDS = 75;
const REVEAL_SECONDS = 6;
const MAX_STROKES = 4000;
const MAX_CHAT = 24;

// Kid-friendly, drawable words.
const WORDS = [
  'cat', 'dog', 'sun', 'tree', 'house', 'car', 'boat', 'fish', 'star', 'apple',
  'pizza', 'rocket', 'robot', 'flower', 'snake', 'bird', 'ball', 'hat', 'cake', 'moon',
  'rainbow', 'banana', 'cookie', 'dragon', 'ghost', 'crown', 'guitar', 'ice cream', 'butterfly', 'spider',
  'shark', 'turtle', 'frog', 'duck', 'bee', 'cloud', 'train', 'plane', 'kite', 'sock',
  'pumpkin', 'snowman', 'castle', 'whale', 'lion', 'tiger', 'penguin', 'mountain', 'umbrella', 'balloon',
  'poop'
];

function pickWord(exclude?: string): string {
  let word = WORDS[Math.floor(Math.random() * WORDS.length)];
  // Avoid handing the next drawer the same word two rounds running.
  for (let guard = 0; word === exclude && WORDS.length > 1 && guard < 10; guard++) {
    word = WORDS[Math.floor(Math.random() * WORDS.length)];
  }
  return word;
}

export function createDrawGuess(playerIds: string[], firstDrawerId: string): DrawGuessState {
  const seating = [...playerIds];
  // Start the drawer rotation at the chosen first player.
  const startIdx = Math.max(0, seating.indexOf(firstDrawerId));
  const rotated = [...seating.slice(startIdx), ...seating.slice(0, startIdx)];
  const scores: Record<string, number> = {};
  for (const id of seating) scores[id] = 0;

  const word = pickWord();
  return {
    kind: 'drawguess',
    seating: rotated,
    round: 0,
    totalRounds: rotated.length,
    drawerId: rotated[0],
    phase: 'drawing',
    word,
    wordLength: word.replace(/ /g, '').length,
    secondsLeft: ROUND_SECONDS,
    strokes: [],
    guessed: [],
    scores,
    chat: [],
    winner: null,
    moves: 0,
  };
}

export interface MoveResult {
  state: DrawGuessState;
  error?: string;
}

export function applyDrawGuessMove(
  state: DrawGuessState,
  playerId: string,
  move: DrawGuessMove,
): MoveResult {
  if (state.winner) return { state, error: 'The game is over.' };
  if (move.action !== 'guess') return { state, error: 'Unknown move.' };
  if (state.phase !== 'drawing') return { state, error: 'Not guessing right now.' };
  if (playerId === state.drawerId) return { state, error: 'The drawer cannot guess.' };
  if (state.guessed.includes(playerId)) return { state, error: 'You already guessed it!' };

  const text = (move.text || '').trim();
  if (!text) return { state, error: 'Type a guess.' };

  const next: DrawGuessState = structuredClone(state);
  next.moves++;

  if (normalize(text) === normalize(next.word)) {
    next.guessed.push(playerId);
    // Earlier guesses are worth a little more; drawer earns 1 per correct guess.
    const order = next.guessed.length; // 1st, 2nd, ...
    next.scores[playerId] = (next.scores[playerId] ?? 0) + (order === 1 ? 3 : order === 2 ? 2 : 1);
    next.scores[next.drawerId] = (next.scores[next.drawerId] ?? 0) + 1;
    pushChat(next, { playerId, kind: 'correct', text: '' });

    // Everyone (besides the drawer) guessed → end the round early.
    const guessers = next.seating.filter((id) => id !== next.drawerId);
    if (guessers.every((id) => next.guessed.includes(id))) {
      endRound(next);
    }
  } else {
    pushChat(next, { playerId, kind: 'guess', text: text.slice(0, 40) });
  }

  return { state: next };
}

/** Server-driven countdown. Called ~once per second by the room. */
export function tickDrawGuess(state: DrawGuessState): { state: DrawGuessState; changed: boolean } {
  if (state.phase === 'over' || state.winner) return { state, changed: false };
  const next: DrawGuessState = structuredClone(state);
  next.secondsLeft = Math.max(0, next.secondsLeft - 1);

  if (next.secondsLeft <= 0) {
    if (next.phase === 'drawing') {
      endRound(next);
    } else if (next.phase === 'reveal') {
      advanceRound(next);
    }
  }
  return { state: next, changed: true };
}

function endRound(state: DrawGuessState): void {
  state.phase = 'reveal';
  state.secondsLeft = REVEAL_SECONDS;
  pushChat(state, { playerId: state.drawerId, kind: 'system', text: `The word was "${state.word}".` });
}

function advanceRound(state: DrawGuessState): void {
  const nextRound = state.round + 1;
  if (nextRound >= state.totalRounds) {
    state.phase = 'over';
    state.winner = decideWinner(state);
    state.secondsLeft = 0;
    return;
  }
  state.round = nextRound;
  state.drawerId = state.seating[nextRound];
  state.phase = 'drawing';
  state.secondsLeft = ROUND_SECONDS;
  state.strokes = [];
  state.guessed = [];
  state.chat = [];
  const word = pickWord(state.word);
  state.word = word;
  state.wordLength = word.replace(/ /g, '').length;
}

function decideWinner(state: DrawGuessState): string | 'draw' {
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

function pushChat(state: DrawGuessState, entry: Omit<DrawGuessState['chat'][number], 'id'>): void {
  state.chat.push({ id: `ch${state.moves}-${state.chat.length}`, ...entry });
  if (state.chat.length > MAX_CHAT) state.chat = state.chat.slice(-MAX_CHAT);
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// ---------------------------------------------------------------------------
// Drawing relay helpers (used by the room, not the move system)
// ---------------------------------------------------------------------------

/**
 * Validate + sanitize an incoming stroke. Returns the stored (bounded) stroke
 * so the caller can relay exactly that to peers — never the raw client payload
 * — or null if the stroke is rejected.
 */
export function addStroke(
  state: DrawGuessState,
  segment: DrawGuessState['strokes'][number],
): DrawGuessState['strokes'][number] | null {
  if (state.phase !== 'drawing') return null;
  if (state.strokes.length >= MAX_STROKES) return null;
  if (!segment || !Array.isArray(segment.points) || segment.points.length < 2) return null;
  const clean = {
    color: String(segment.color || '#fff').slice(0, 12),
    width: Math.max(1, Math.min(40, Number(segment.width) || 4)),
    points: segment.points.slice(0, 512).map((n) => Math.round(n)),
  };
  state.strokes.push(clean);
  return clean;
}

export function clearStrokes(state: DrawGuessState): void {
  state.strokes = [];
}

// ---------------------------------------------------------------------------
// Redaction — hide the word from players who shouldn't see it yet
// ---------------------------------------------------------------------------

export function viewDrawGuess(state: DrawGuessState, viewerId: string | null): DrawGuessState {
  const canSee =
    state.phase !== 'drawing' ||
    viewerId === state.drawerId ||
    (viewerId !== null && state.guessed.includes(viewerId));
  if (canSee) return state;
  const view: DrawGuessState = structuredClone(state);
  view.word = '';
  return view;
}
