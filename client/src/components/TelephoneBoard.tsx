import { useEffect, useRef, useState } from 'react';
import { DrawStroke, PublicPlayer, TelephoneState } from '../../../shared/protocol.ts';
import { AvatarIcon } from './AvatarIcon.tsx';
import { chunkPoints, paintStroke, SIZE, toBuf } from './drawing.ts';

const COLORS = ['#111018', '#ff3db5', '#19e6ff', '#4dffa6', '#ffe14d', '#ff8c1a', '#7b61ff'];
const WIDTHS = [4, 10, 20];

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
  canPlay,
  onSubmitText,
  onSubmitDrawing,
  onReveal,
}: {
  game: TelephoneState;
  players: PublicPlayer[];
  youId: string;
  canPlay: boolean;
  onSubmitText: (text: string) => void;
  onSubmitDrawing: (strokes: DrawStroke[]) => void;
  onReveal: (dir: 'next' | 'prev') => void;
}) {
  const nameOf = (id: string) => players.find((p) => p.id === id)?.name ?? 'Someone';
  const avatarOf = (id: string) => players.find((p) => p.id === id)?.avatar;

  const inGame = game.seating.includes(youId);
  const youSubmitted = game.submitted.includes(youId);
  const absent = game.absent ?? [];
  const total = game.seating.filter((s) => !absent.includes(s)).length; // players still in
  // Reveal is driven by the first seat that's still present (host may have left).
  const revealHost = game.seating.find((s) => !absent.includes(s)) ?? game.seating[0];

  // ----- interactive drawing canvas -----
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // One entry per pen/eraser gesture; a long gesture may span several
  // protocol strokes (the server caps points per stroke), so undo works on
  // whole gestures and submit flattens.
  const strokesRef = useRef<DrawStroke[][]>([]);
  const clearedRef = useRef<DrawStroke[][] | null>(null); // undo target after Clear
  const drawingRef = useRef(false);
  const ptsRef = useRef<number[]>([]);
  const autoSentRef = useRef(false);
  const [color, setColor] = useState(COLORS[0]);
  const [width, setWidth] = useState(WIDTHS[1]);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const [strokeCount, setStrokeCount] = useState(0);
  const [text, setText] = useState('');

  // Reset the drafting surface whenever the round/phase changes.
  useEffect(() => {
    strokesRef.current = [];
    clearedRef.current = null;
    ptsRef.current = [];
    drawingRef.current = false;
    autoSentRef.current = false;
    setStrokeCount(0);
    setText('');
    setTool('pen');
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, SIZE, SIZE);
  }, [game.round, game.phase]);

  // Beat the buzzer: when the clock is about to run out, submit whatever is
  // on the canvas / in the input — otherwise the server files a blank page
  // and the work is lost.
  useEffect(() => {
    if (game.secondsLeft > 1 || autoSentRef.current) return;
    if (!canPlay || !inGame || youSubmitted) return;
    if (game.phase === 'drawing') {
      const strokes = strokesRef.current.flat();
      if (drawingRef.current && ptsRef.current.length >= 2) {
        strokes.push(...chunkPoints(ptsRef.current).map(makeStroke)); // mid-gesture counts too
      }
      if (strokes.length > 0) {
        autoSentRef.current = true;
        onSubmitDrawing(strokes);
      }
    } else if (game.phase === 'writing') {
      const t = text.trim();
      if (t) {
        autoSentRef.current = true;
        onSubmitText(t);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.secondsLeft]);

  function makeStroke(points: number[]): DrawStroke {
    return tool === 'eraser' ? { color, width, points, erase: true } : { color, width, points };
  }
  function onDown(e: React.PointerEvent) {
    e.preventDefault();
    canvasRef.current?.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    ptsRef.current = toBuf(canvasRef.current!, e);
  }
  function onMove(e: React.PointerEvent) {
    if (!drawingRef.current) return;
    const [x, y] = toBuf(canvasRef.current!, e);
    const acc = ptsRef.current;
    const lx = acc[acc.length - 2];
    const ly = acc[acc.length - 1];
    const dx = x - lx;
    const dy = y - ly;
    if (dx * dx + dy * dy < 9) return; // thin sub-pixel jitter (~1px on screen)
    acc.push(x, y);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) paintStroke(ctx, makeStroke([lx, ly, x, y]));
  }
  function onUp() {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const pts = ptsRef.current;
    ptsRef.current = [];
    if (pts.length < 2) return;
    strokesRef.current.push(chunkPoints(pts).map(makeStroke));
    setStrokeCount(strokesRef.current.length);
    // A tap (single point) is never painted by onMove — draw the dot now so
    // the artist sees it, matching what gets submitted.
    if (pts.length === 2) {
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) paintStroke(ctx, makeStroke([pts[0], pts[1]]));
    }
  }
  function repaint() {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, SIZE, SIZE);
    for (const gesture of strokesRef.current) for (const s of gesture) paintStroke(ctx, s);
  }
  function undo() {
    if (strokesRef.current.length > 0) {
      strokesRef.current.pop();
    } else if (clearedRef.current) {
      strokesRef.current = clearedRef.current; // Clear is undoable too
      clearedRef.current = null;
    }
    setStrokeCount(strokesRef.current.length);
    repaint();
  }
  function clearCanvas() {
    if (strokesRef.current.length === 0) return;
    clearedRef.current = strokesRef.current;
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
    const isHost = youId === revealHost;
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
          <AvatarIcon id={avatarOf(owner)} /> <b>{nameOf(owner)}</b> started it with…
        </p>

        <div className="tp-album">
          {shown.map((page, i) => (
            <div key={i} className={`tp-page ${page.kind}`}>
              <span className="tp-page-author">
                <AvatarIcon id={avatarOf(page.authorId)} /> {nameOf(page.authorId)}{' '}
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
            <p className="tp-watching">{nameOf(revealHost)} is running the reveal…</p>
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
          onContextMenu={(e) => e.preventDefault()}
        />
      </div>
      <div className="dg-tools">
        <div className="dg-colors">
          {COLORS.map((c) => (
            <button
              key={c}
              className={`dg-swatch ${c === color && tool === 'pen' ? 'sel' : ''}`}
              style={{ background: c }}
              onClick={() => {
                setColor(c);
                setTool('pen');
              }}
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
        <button
          className={`dg-tool ${tool === 'eraser' ? 'sel' : ''}`}
          onClick={() => setTool((t) => (t === 'eraser' ? 'pen' : 'eraser'))}
          aria-label="eraser"
          title="Eraser"
        >
          🧽
        </button>
        <button
          className="btn ghost small"
          onClick={undo}
          disabled={strokeCount === 0 && !clearedRef.current}
        >
          ↩ Undo
        </button>
        <button className="btn ghost small" onClick={clearCanvas} disabled={strokeCount === 0}>
          Clear
        </button>
      </div>
      <button
        className="btn primary big"
        disabled={strokeCount === 0}
        onClick={() => onSubmitDrawing(strokesRef.current.flat())}
      >
        Send drawing ▶
      </button>
    </div>
  );
}
