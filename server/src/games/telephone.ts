import { DrawStroke, TelephoneMove, TelephonePage, TelephoneState } from '../../../shared/protocol.js';

const WRITE_SECONDS = 50;
const DRAW_SECONDS = 80;
const MAX_TEXT = 80;
const MAX_STROKES = 4000;
const MAX_POINTS = 512;

export function createTelephone(playerIds: string[]): TelephoneState {
  const seating = [...playerIds];
  const n = seating.length;
  return {
    kind: 'telephone',
    seating,
    round: 0,
    totalRounds: n,
    phase: 'writing',
    secondsLeft: WRITE_SECONDS,
    albums: seating.map(() => [] as TelephonePage[]),
    submitted: [],
    revealAlbum: 0,
    revealPage: 0,
    youRespondTo: null,
    winner: null,
    moves: 0,
  };
}

export interface MoveResult {
  state: TelephoneState;
  error?: string;
}

/**
 * Album held by a given seat in a given round. Album i is held in round r by
 * seat (i + r) % n; inverting, the album held by seat v is (v - r) mod n. This
 * makes every round a permutation, so each album visits each player exactly
 * once across the n rounds and never returns to the same hands twice.
 */
function albumHeldBy(seatIndex: number, round: number, n: number): number {
  return (((seatIndex - round) % n) + n) % n;
}

export function applyTelephoneMove(
  state: TelephoneState,
  playerId: string,
  move: TelephoneMove,
): MoveResult {
  if (state.winner || state.phase === 'over') return { state, error: 'The game is over.' };

  // Reveal stepping — only the host (seating[0]) drives it.
  if (move.action === 'reveal') {
    if (state.phase !== 'reveal') return { state, error: 'Not revealing yet.' };
    if (playerId !== state.seating[0]) return { state, error: 'Only the host runs the reveal.' };
    const next: TelephoneState = structuredClone(state);
    stepReveal(next, move.dir);
    return { state: next };
  }

  // Page submissions.
  if (state.phase === 'reveal') return { state, error: 'Drawing time is over.' };
  const seatIndex = state.seating.indexOf(playerId);
  if (seatIndex < 0) return { state, error: 'You are not in this game.' };
  if (state.submitted.includes(playerId)) return { state, error: "You're in — sit tight!" };

  let page: TelephonePage;
  if (state.phase === 'writing') {
    if (move.action !== 'submitText') return { state, error: 'Write your answer.' };
    const text = (move.text || '').trim().slice(0, MAX_TEXT);
    if (!text) return { state, error: 'Type something first!' };
    page = { authorId: playerId, kind: 'text', text };
  } else {
    if (move.action !== 'submitDrawing') return { state, error: 'Draw your answer.' };
    page = { authorId: playerId, kind: 'drawing', strokes: sanitizeStrokes(move.strokes) };
  }

  const n = state.seating.length;
  const albumIdx = albumHeldBy(seatIndex, state.round, n);
  const next: TelephoneState = structuredClone(state);
  next.moves++;
  next.albums[albumIdx][next.round] = page;
  next.submitted.push(playerId);

  if (next.submitted.length >= n) advance(next);
  return { state: next };
}

/** Server-driven countdown (~1/sec). Submissions that don't arrive get blanks. */
export function tickTelephone(state: TelephoneState): { state: TelephoneState; changed: boolean } {
  if (state.phase === 'reveal' || state.phase === 'over' || state.winner) {
    return { state, changed: false };
  }
  const next: TelephoneState = structuredClone(state);
  next.secondsLeft = Math.max(0, next.secondsLeft - 1);
  if (next.secondsLeft <= 0) advance(next);
  return { state: next, changed: true };
}

/** Close the current round (filling any missing pages) and open the next one. */
function advance(state: TelephoneState): void {
  fillBlanks(state);
  const nextRound = state.round + 1;
  if (nextRound >= state.totalRounds) {
    state.phase = 'reveal';
    state.secondsLeft = 0;
    state.revealAlbum = 0;
    state.revealPage = 1;
    state.submitted = [];
    return;
  }
  state.round = nextRound;
  state.phase = nextRound % 2 === 0 ? 'writing' : 'drawing';
  state.secondsLeft = state.phase === 'writing' ? WRITE_SECONDS : DRAW_SECONDS;
  state.submitted = [];
}

/** Anyone who didn't submit gets a blank page so every album stays aligned. */
function fillBlanks(state: TelephoneState): void {
  const n = state.seating.length;
  for (let i = 0; i < n; i++) {
    if (state.albums[i][state.round]) continue;
    const holder = state.seating[(i + state.round) % n];
    state.albums[i][state.round] =
      state.phase === 'writing'
        ? { authorId: holder, kind: 'text', text: '' }
        : { authorId: holder, kind: 'drawing', strokes: [] };
  }
}

function stepReveal(state: TelephoneState, dir: 'next' | 'prev'): void {
  const album = state.albums[state.revealAlbum] ?? [];
  if (dir === 'next') {
    if (state.revealPage < album.length) {
      state.revealPage++;
    } else if (state.revealAlbum < state.albums.length - 1) {
      state.revealAlbum++;
      state.revealPage = 1;
    } else {
      state.phase = 'over';
      state.winner = 'draw'; // non-competitive: everyone "wins" the laugh
      state.secondsLeft = 0;
    }
  } else {
    if (state.revealPage > 1) {
      state.revealPage--;
    } else if (state.revealAlbum > 0) {
      state.revealAlbum--;
      state.revealPage = state.albums[state.revealAlbum].length;
    }
  }
}

function sanitizeStrokes(strokes: DrawStroke[] | undefined): DrawStroke[] {
  if (!Array.isArray(strokes)) return [];
  const out: DrawStroke[] = [];
  for (const s of strokes) {
    if (!s || !Array.isArray(s.points) || s.points.length < 2) continue;
    out.push({
      color: String(s.color || '#fff').slice(0, 12),
      width: Math.max(1, Math.min(40, Number(s.width) || 4)),
      points: s.points.slice(0, MAX_POINTS).map((nn) => Math.round(nn)),
    });
    if (out.length >= MAX_STROKES) break;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Redaction — during play you only ever see the one page you must respond to.
// During the reveal, only expose pages up to the host's current position.
// ---------------------------------------------------------------------------

export function viewTelephone(state: TelephoneState, viewerId: string | null): TelephoneState {
  const view: TelephoneState = structuredClone(state);
  view.youRespondTo = null;

  if (state.phase === 'reveal') {
    view.albums = state.albums.map((album, idx) => {
      if (idx < state.revealAlbum) return album; // fully shown already
      if (idx === state.revealAlbum) return album.slice(0, state.revealPage); // in progress
      return []; // not reached yet — don't leak it
    });
    return view;
  }
  if (state.phase === 'over') return view; // all albums public once it's a wrap

  // Active play: hide every chain, surface only this viewer's current prompt.
  const n = state.seating.length;
  view.albums = state.seating.map(() => [] as TelephonePage[]);
  const seatIndex = viewerId ? state.seating.indexOf(viewerId) : -1;
  if (seatIndex >= 0 && state.round > 0) {
    const albumIdx = albumHeldBy(seatIndex, state.round, n);
    view.youRespondTo = state.albums[albumIdx][state.round - 1] ?? null;
  }
  return view;
}
