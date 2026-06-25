import { useEffect, useRef, useState } from 'react';
import { DrawStroke, PublicPlayer, TelephoneState } from '../../../shared/protocol.ts';

const COLORS = ['#111018', '#ff3db5', '#19e6ff', '#4dffa6', '#ffe14d', '#ff8c1a', '#7b61ff'];
const WIDTHS = [4, 10, 20];
const SIZE = 1000; // canvas buffer is SIZE×SIZE; points normalized to it

function paintStroke(ctx: CanvasRenderingContext2D, s: DrawStroke) {
  const p = s.points;
  if (!p || p.length < 2) return;
  ctx.strokeStyle = s.color;
  ctx.lineWidth = s.width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(p[0], p[1]);
  if (p.length === 2) ctx.lineTo(p[0] + 0.1, p[1] + 0.1);
  for (let i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]);
  ctx.stroke();
}

/** Read-only rendering of a finished drawing. */
function Sketch({ strokes, className }: { strokes: DrawStroke[]; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, SIZE, SIZE);
    for (const s of strokes) paintStroke(ctx, s);
  }, [strokes]);
  return <canvas ref={ref} width={SIZE} height={SIZE} className={`tp-sketch ${className ?? ''}`} />;
}

export function TelephoneBoard({
  game,
  players,
  youId,
  hostId,
  canPlay,
  onSubmitText,
  onSubmitDrawing,
  onReveal,
}: {
  game: TelephoneState;
  players: PublicPlayer[];
  youId: string;
  hostId: string;
  canPlay: boolean;
  onSubmitText: (text: string) => void;
  onSubmitDrawing: (strokes: DrawStroke[]) => void;
  onReveal: (dir: 'next' | 'prev') => void;
}) {
  const nameOf = (id: string) => players.find((p) => p.id === id)?.name ?? 'Someone';
  const avatarOf = (id: string) => players.find((p) => p.id === id)?.avatar ?? '👾';

  const inGame = game.seating.includes(youId);
  const youSubmitted = game.submitted.includes(youId);
  const total = game.seating.length;
  const playing = game.phase === 'writing' || game.phase === 'drawing';

  // ----- interactive drawing canvas -----
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<DrawStroke[]>([]);
  const drawingRef = useRef(false);
  const ptsRef = useRef<number[]>([]);
  const [color, setColor] = useState(COLORS[0]);
  const [width, setWidth] = useState(WIDTHS[1]);
  const [strokeCount, setStrokeCount] = useState(0);
  const [text, setText] = useState('');

  // Reset the drafting surface whenever the round/phase changes.
  useEffect(() => {
    strokesRef.current = [];
    ptsRef.current = [];
    setStrokeCount(0);
    setText('');
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, SIZE, SIZE);
  }, [game.round, game.phase]);

  function toBuf(e: React.PointerEvent): [number, number] {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    const x = Math.max(0, Math.min(SIZE, ((e.clientX - r.left) / r.width) * SIZE));
    const y = Math.max(0, Math.min(SIZE, ((e.clientY - r.top) / r.height) * SIZE));
    return [Math.round(x), Math.round(y)];
  }
  function onDown(e: React.PointerEvent) {
    e.preventDefault();
    canvasRef.current?.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    ptsRef.current = toBuf(e);
  }
  function onMove(e: React.PointerEvent) {
    if (!drawingRef.current) return;
    const [x, y] = toBuf(e);
    const acc = ptsRef.current;
    const lx = acc[acc.length - 2];
    const ly = acc[acc.length - 1];
    if (x === lx && y === ly) return;
    acc.push(x, y);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) paintStroke(ctx, { color, width, points: [lx, ly, x, y] });
  }
  function onUp() {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    if (ptsRef.current.length >= 2) {
      strokesRef.current.push({ color, width, points: ptsRef.current.slice() });
      setStrokeCount(strokesRef.current.length);
    }
    ptsRef.current = [];
  }
  function clearCanvas() {
    strokesRef.current = [];
    setStrokeCount(0);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, SIZE, SIZE);
  }

  const phaseLabel =
    game.phase === 'writing'
      ? game.round === 0
        ? 'Write a starter'
        : 'Caption it'
      : game.phase === 'drawing'
        ? 'Draw it'
        : 'The Big Reveal';

  // ---------------------------------------------------------------- reveal --
  if (game.phase === 'reveal' || game.phase === 'over') {
    const album = game.albums[game.revealAlbum] ?? [];
    const shown = game.phase === 'over' ? album : album.slice(0, game.revealPage);
    const owner = game.seating[game.revealAlbum];
    const isHost = youId === hostId;
    const atEnd =
      game.revealPage >= album.length && game.revealAlbum >= game.albums.length - 1;

    return (
      <div className="tp-board">
        <div className="tp-reveal-head">
          <span className="tp-reveal-title">The Big Reveal</span>
          {game.phase === 'reveal' && (
            <span className="tp-reveal-progress">
              Album {game.revealAlbum + 1}/{game.albums.length}
            </span>
          )}
        </div>
        <p className="tp-reveal-owner">
          {avatarOf(owner)} <b>{nameOf(owner)}</b> started it with…
        </p>

        <div className="tp-album">
          {shown.map((page, i) => (
            <div key={i} className={`tp-page ${page.kind}`}>
              <span className="tp-page-author">
                {avatarOf(page.authorId)} {nameOf(page.authorId)}{' '}
                {page.kind === 'drawing' ? 'drew' : i === 0 ? 'wrote' : 'guessed'}
              </span>
              {page.kind === 'text' ? (
                <p className="tp-page-text">{page.text || '— (left blank) —'}</p>
              ) : (
                <Sketch strokes={page.strokes ?? []} />
              )}
            </div>
          ))}
        </div>

        {game.phase === 'reveal' &&
          (isHost ? (
            <div className="tp-reveal-controls">
              <button
                className="btn ghost"
                disabled={game.revealAlbum === 0 && game.revealPage <= 1}
                onClick={() => onReveal('prev')}
              >
                ◀ Back
              </button>
              <button className="btn primary" onClick={() => onReveal('next')}>
                {atEnd ? 'Finish' : 'Next ▶'}
              </button>
            </div>
          ) : (
            <p className="tp-watching">{nameOf(hostId)} is running the reveal…</p>
          ))}
        {game.phase === 'over' && <p className="tp-fin">That's a wrap! Play again for new chaos.</p>}
      </div>
    );
  }

  // ----------------------------------------------------------- play header --
  const header = (
    <div className="tp-head">
      <span className="tp-round">
        Round {game.round + 1}/{game.totalRounds}
      </span>
      <span className="tp-phase">{phaseLabel}</span>
      <span className={`tp-timer ${game.secondsLeft <= 10 ? 'low' : ''}`}>⏱ {game.secondsLeft}s</span>
      <span className="tp-count">
        {game.submitted.length}/{total} in
      </span>
    </div>
  );

  // Spectators (and anyone not seated) just watch the progress.
  if (!canPlay || !inGame) {
    return (
      <div className="tp-board">
        {header}
        <p className="tp-waiting">
          {game.phase === 'writing' ? 'Players are writing…' : 'Players are drawing…'}
        </p>
      </div>
    );
  }

  if (youSubmitted) {
    return (
      <div className="tp-board">
        {header}
        <p className="tp-done">Locked in! Waiting for the rest… ({game.submitted.length}/{total})</p>
      </div>
    );
  }

  // ----- writing phase (starter line or caption a drawing) -----
  if (game.phase === 'writing') {
    const prompt = game.youRespondTo;
    return (
      <div className="tp-board">
        {header}
        {game.round === 0 ? (
          <p className="tp-prompt">Write a fun sentence for someone else to draw!</p>
        ) : (
          <>
            <p className="tp-prompt">What's happening here? Write your best guess:</p>
            {prompt?.kind === 'drawing' && <Sketch strokes={prompt.strokes ?? []} className="prompt" />}
          </>
        )}
        <form
          className="tp-write"
          onSubmit={(e) => {
            e.preventDefault();
            const t = text.trim();
            if (t) onSubmitText(t);
          }}
        >
          <input
            className="text-input"
            value={text}
            maxLength={80}
            placeholder={game.round === 0 ? 'e.g. A cat riding a skateboard' : 'Type your guess…'}
            onChange={(e) => setText(e.target.value)}
          />
          <button className="btn primary" type="submit" disabled={!text.trim()}>
            Send ▶
          </button>
        </form>
      </div>
    );
  }

  // ----- drawing phase -----
  const prompt = game.youRespondTo;
  return (
    <div className="tp-board">
      {header}
      <p className="tp-prompt">
        Draw this: <b className="tp-draw-word">{prompt?.text || '???'}</b>
      </p>
      <div className="dg-stage">
        <canvas
          ref={canvasRef}
          width={SIZE}
          height={SIZE}
          className="dg-canvas drawable"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerLeave={onUp}
        />
      </div>
      <div className="dg-tools">
        <div className="dg-colors">
          {COLORS.map((c) => (
            <button
              key={c}
              className={`dg-swatch ${c === color ? 'sel' : ''}`}
              style={{ background: c }}
              onClick={() => setColor(c)}
              aria-label={`color ${c}`}
            />
          ))}
        </div>
        <div className="dg-widths">
          {WIDTHS.map((w) => (
            <button key={w} className={`dg-wbtn ${w === width ? 'sel' : ''}`} onClick={() => setWidth(w)}>
              <span style={{ width: w, height: w }} />
            </button>
          ))}
        </div>
        <button className="btn ghost small" onClick={clearCanvas}>
          Clear
        </button>
      </div>
      <button
        className="btn primary big"
        disabled={strokeCount === 0}
        onClick={() => onSubmitDrawing(strokesRef.current.slice())}
      >
        Send drawing ▶
      </button>
    </div>
  );
}
