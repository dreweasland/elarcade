import { DrawStroke } from '../../../shared/protocol.ts';

/** Canvas buffer is SIZE×SIZE; stroke points are normalized to it. */
export const SIZE = 1000;

/** Server cap on one stroke's flat points array (see sanitizeStrokes /
 *  addStroke) — gestures longer than this must be split client-side or the
 *  server silently truncates them. */
export const MAX_STROKE_POINTS = 512;

export function paintStroke(ctx: CanvasRenderingContext2D, s: DrawStroke) {
  const p = s.points;
  if (!p || p.length < 2) return;
  // Eraser strokes punch through to transparent; the CSS canvas background
  // (#f7f2ff everywhere a drawing renders) shows through.
  ctx.globalCompositeOperation = s.erase ? 'destination-out' : 'source-over';
  ctx.strokeStyle = s.color;
  ctx.lineWidth = s.width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(p[0], p[1]);
  if (p.length === 2) ctx.lineTo(p[0] + 0.1, p[1] + 0.1);
  for (let i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]);
  ctx.stroke();
  ctx.globalCompositeOperation = 'source-over';
}

/** Map a pointer event to canvas-buffer coordinates (clamped to the buffer). */
export function toBuf(c: HTMLCanvasElement, e: { clientX: number; clientY: number }): [number, number] {
  const r = c.getBoundingClientRect();
  const x = Math.max(0, Math.min(SIZE, ((e.clientX - r.left) / r.width) * SIZE));
  const y = Math.max(0, Math.min(SIZE, ((e.clientY - r.top) / r.height) * SIZE));
  return [Math.round(x), Math.round(y)];
}

/** Split a long gesture into server-sized point chunks, overlapping one point
 *  so consecutive chunks connect seamlessly when replayed. */
export function chunkPoints(pts: number[]): number[][] {
  const chunks: number[][] = [];
  for (let i = 0; ; i += MAX_STROKE_POINTS - 2) {
    chunks.push(pts.slice(i, i + MAX_STROKE_POINTS));
    if (i + MAX_STROKE_POINTS >= pts.length) break;
  }
  return chunks;
}
