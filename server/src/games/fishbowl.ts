import { FISHBOWL_ROUNDS, FishbowlMove, FishbowlState, GameOptions } from '../../../shared/protocol.js';

const DEFAULT_WORDS_PER_PLAYER = 3;
const MIN_WORDS_PER_PLAYER = 1;
const MAX_WORDS_PER_PLAYER = 5;
const TURN_SECONDS = 60;
const MAX_WORD_LEN = 40;

export function createFishbowl(playerIds: string[], options?: GameOptions): FishbowlState {
  const seating = [...playerIds];
  const teams: Record<string, 0 | 1> = {};
  seating.forEach((id, i) => {
    teams[id] = (i % 2) as 0 | 1;
  });
  const wordsPerPlayer = clampWords(options?.words ?? DEFAULT_WORDS_PER_PLAYER);
  return {
    kind: 'fishbowl',
    seating,
    teams,
    wordsPerPlayer,
    phase: 'writing',
    round: 0,
    roundKind: FISHBOWL_ROUNDS[0],
    activeTeam: 0,
    clueGiver: null,
    turnPointer: [0, 0],
    secondsLeft: TURN_SECONDS,
    turnSeconds: TURN_SECONDS,
    bowl: [],
    allWords: [],
    bowlCount: 0,
    totalWords: 0,
    currentWord: null,
    turnCorrect: 0,
    scores: [0, 0],
    submitted: [],
    pending: {},
    winner: null,
    moves: 0,
  };
}

export interface MoveResult {
  state: FishbowlState;
  error?: string;
}

export function applyFishbowlMove(
  state: FishbowlState,
  playerId: string,
  move: FishbowlMove,
): MoveResult {
  if (state.winner || state.phase === 'over') return { state, error: 'The game is over.' };

  // --- Writing phase: everyone tosses their words into the bowl. ---
  if (move.action === 'submitWords') {
    if (state.phase !== 'writing') return { state, error: 'Words are already in the bowl.' };
    if (!state.seating.includes(playerId)) return { state, error: 'You are not in this game.' };
    if (state.submitted.includes(playerId)) return { state, error: 'You already tossed yours in!' };
    const words = sanitizeWords(move.words, state.wordsPerPlayer);
    if (words.length < state.wordsPerPlayer) {
      return { state, error: `Fill in all ${state.wordsPerPlayer} words.` };
    }
    const next: FishbowlState = structuredClone(state);
    next.pending![playerId] = words;
    next.submitted.push(playerId);
    if (next.submitted.length >= next.seating.length) openPlay(next);
    return { state: next };
  }

  // --- Everything else is driven solely by the active clue-giver. ---
  if (state.phase === 'writing') return { state, error: 'Toss your words in first.' };
  if (playerId !== state.clueGiver) return { state, error: "It's not your turn to give clues." };

  const next: FishbowlState = structuredClone(state);

  if (move.action === 'start') {
    if (next.phase !== 'ready') return { state, error: 'Your turn is already going.' };
    next.phase = 'clue';
    next.secondsLeft = next.turnSeconds;
    next.turnCorrect = 0;
    drawWord(next);
    return { state: next };
  }

  if (next.phase !== 'clue') return { state, error: 'Start your turn first.' };

  if (move.action === 'correct') {
    if (!next.currentWord) return { state, error: 'No word to score.' };
    next.scores[next.activeTeam]++;
    next.turnCorrect++;
    next.moves++;
    next.currentWord = null;
    if (next.bowl!.length === 0) {
      advanceRound(next); // last word of the round cleared
    } else {
      drawWord(next);
    }
    return { state: next };
  }

  if (move.action === 'skip') {
    if (next.currentWord) {
      next.bowl!.push(next.currentWord); // back of the bowl, no penalty
      next.currentWord = null;
      next.bowlCount = next.bowl!.length;
    }
    drawWord(next);
    next.moves++;
    return { state: next };
  }

  return { state, error: 'Unknown move.' };
}

/** Server-driven countdown (~1/sec). When time runs out the turn passes. */
export function tickFishbowl(state: FishbowlState): { state: FishbowlState; changed: boolean } {
  if (state.phase !== 'clue' || state.winner) return { state, changed: false };
  const next: FishbowlState = structuredClone(state);
  next.secondsLeft = Math.max(0, next.secondsLeft - 1);
  if (next.secondsLeft <= 0) {
    if (next.currentWord) {
      next.bowl!.push(next.currentWord); // unguessed word returns to the bowl
      shuffle(next.bowl!);
      next.currentWord = null;
      next.bowlCount = next.bowl!.length;
    }
    endTurn(next);
  }
  return { state: next, changed: true };
}

// ---------------------------------------------------------------------------
// Redaction — hide the bowl, the master word list, and the live word from
// everyone except the clue-giver who's currently conveying it.
// ---------------------------------------------------------------------------

export function viewFishbowl(state: FishbowlState, viewerId: string | null): FishbowlState {
  const view: FishbowlState = structuredClone(state);
  delete view.bowl;
  delete view.allWords;
  delete view.pending;
  if (!(state.phase === 'clue' && viewerId !== null && viewerId === state.clueGiver)) {
    view.currentWord = null;
  }
  return view;
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

function teamMembers(state: FishbowlState, team: 0 | 1): string[] {
  return state.seating.filter((id) => state.teams[id] === team);
}

function setClueGiver(state: FishbowlState): void {
  const members = teamMembers(state, state.activeTeam);
  state.clueGiver = members.length ? members[state.turnPointer[state.activeTeam] % members.length] : null;
}

/** Close writing: shuffle every word into the bowl and tee up the first turn. */
function openPlay(state: FishbowlState): void {
  const all: string[] = [];
  for (const id of state.seating) {
    for (const w of state.pending![id] ?? []) all.push(w);
  }
  shuffle(all);
  state.allWords = [...all];
  state.totalWords = all.length;
  state.bowl = all;
  state.bowlCount = all.length;
  state.pending = {};
  state.round = 0;
  state.roundKind = FISHBOWL_ROUNDS[0];
  state.activeTeam = 0;
  state.turnPointer = [0, 0];
  state.currentWord = null;
  state.turnCorrect = 0;
  state.phase = 'ready';
  setClueGiver(state);
}

function drawWord(state: FishbowlState): void {
  state.currentWord = state.bowl!.length ? state.bowl!.shift()! : null;
  state.bowlCount = state.bowl!.length;
}

/** Bowl emptied — advance to the next round (or finish after charades). */
function advanceRound(state: FishbowlState): void {
  state.currentWord = null;
  const nextRound = state.round + 1;
  if (nextRound >= FISHBOWL_ROUNDS.length) {
    finish(state);
    return;
  }
  state.round = nextRound;
  state.roundKind = FISHBOWL_ROUNDS[nextRound];
  state.bowl = shuffle([...(state.allWords ?? [])]);
  state.bowlCount = state.bowl.length;
  endTurn(state); // the other team kicks off the new round
}

/** Pass play to the next clue-giver and wait for them to start. */
function endTurn(state: FishbowlState): void {
  state.turnPointer[state.activeTeam]++;
  state.activeTeam = state.activeTeam === 0 ? 1 : 0;
  setClueGiver(state);
  state.phase = 'ready';
  state.secondsLeft = state.turnSeconds;
  state.currentWord = null;
  state.turnCorrect = 0;
}

function finish(state: FishbowlState): void {
  state.phase = 'over';
  // Team game: the session win-counter is per-player, so finish as a 'draw'
  // (awards no points) and let the board show the real team result.
  state.winner = 'draw';
  state.currentWord = null;
  state.bowl = [];
  state.bowlCount = 0;
  state.secondsLeft = 0;
  state.clueGiver = null;
}

function clampWords(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_WORDS_PER_PLAYER;
  return Math.min(MAX_WORDS_PER_PLAYER, Math.max(MIN_WORDS_PER_PLAYER, Math.round(n)));
}

function sanitizeWords(words: unknown, max: number): string[] {
  if (!Array.isArray(words)) return [];
  const out: string[] = [];
  for (const w of words) {
    const t = String(w ?? '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, MAX_WORD_LEN);
    if (t) out.push(t);
    if (out.length >= max) break;
  }
  return out;
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
