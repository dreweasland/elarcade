// Arcade sound effects synthesized with the Web Audio API — no audio files.
// The AudioContext is created lazily on first use (after a user gesture) so
// browsers don't block it.

let ctx: AudioContext | null = null;
const MUTE_KEY = 'el-arcade-muted';
let muted = localStorage.getItem(MUTE_KEY) === '1';

export function isMuted(): boolean {
  return muted;
}

export function setMuted(value: boolean): void {
  muted = value;
  localStorage.setItem(MUTE_KEY, value ? '1' : '0');
}

export function toggleMuted(): boolean {
  setMuted(!muted);
  return muted;
}

function getCtx(): AudioContext | null {
  if (muted) return null;
  if (!ctx) {
    const Ctor = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

/** Play a single tone with a quick attack/decay envelope. */
function tone(freq: number, start: number, duration: number, type: OscillatorType, gain = 0.18): void {
  const ac = getCtx();
  if (!ac) return;
  const t0 = ac.currentTime + start;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(g).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

/** Play a sequence of [frequency, startOffset, duration] notes. */
function sequence(notes: Array<[number, number, number]>, type: OscillatorType = 'square'): void {
  for (const [freq, start, dur] of notes) tone(freq, start, dur, type);
}

export const sfx = {
  click: () => tone(440, 0, 0.07, 'square', 0.12),
  place: () => tone(660, 0, 0.09, 'triangle', 0.16),
  join: () => sequence([[523, 0, 0.1], [784, 0.1, 0.14]], 'triangle'),
  win: () => sequence([[523, 0, 0.12], [659, 0.12, 0.12], [784, 0.24, 0.12], [1047, 0.36, 0.22]]),
  lose: () => sequence([[392, 0, 0.16], [311, 0.16, 0.16], [233, 0.32, 0.3]], 'sawtooth'),
  draw: () => sequence([[440, 0, 0.14], [440, 0.18, 0.2]], 'square'),
  error: () => tone(180, 0, 0.18, 'sawtooth', 0.14),
};
