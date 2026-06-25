import { useEffect, useRef, useState } from 'react';
import { DrawGuessState, DrawStroke, PublicPlayer } from '../../../shared/protocol.ts';
import { arcade } from '../arcade.ts';

const COLORS = ['#f3eaff', '#111018', '#ff3db5', '#19e6ff', '#4dffa6', '#ffe14d', '#ff8c1a'];
const WIDTHS = [4, 10, 20];
const SIZE = 1000; // canvas buffer is SIZE×SIZE; points are normalized to it

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

export function DrawGuessBoard({
  game,
  players,
  youId,
  canPlay,
  onGuess,
}: {
  game: DrawGuessState;
  players: PublicPlayer[];
  youId: string;
  canPlay: boolean;
  onGuess: (text: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const accRef = useRef<number[]>([]);
  const lastSentRef = useRef(0);
  const [color, setColor] = useState(COLORS[3]);
  const [width, setWidth] = useState(WIDTHS[1]);
  const [guess, setGuess] = useState('');

  const playerById = (id: string) => players.find((p) => p.id === id);
  const isDrawer = game.drawerId === youId;
  const drawing = game.phase === 'drawing';
  const canDraw = canPlay && isDrawer && drawing;
  const haveGuessed = game.guessed.includes(youId);
  const canGuess = canPlay && !isDrawer && drawing && !haveGuessed;

  // Repaint the whole canvas when the round changes (also on mount / reconnect).
  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, SIZE, SIZE);
    for (const s of game.strokes) paintStroke(ctx, s);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.round, game.phase === 'drawing']);

  // Apply live relayed strokes from the drawer.
  useEffect(() => {
    return arcade.subscribeDraw((e) => {
      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx) return;
      if (e.type === 'clear') ctx.clearRect(0, 0, SIZE, SIZE);
      else paintStroke(ctx, e.segment);
    });
  }, []);

  function toBuf(e: React.PointerEvent): [number, number] {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    const x = Math.max(0, Math.min(SIZE, ((e.clientX - r.left) / r.width) * SIZE));
    const y = Math.max(0, Math.min(SIZE, ((e.clientY - r.top) / r.height) * SIZE));
    return [Math.round(x), Math.round(y)];
  }

  function flush(end: boolean) {
    const acc = accRef.current;
    if (acc.length >= 4) {
      arcade.sendDraw({ color, width, points: acc.slice() });
      accRef.current = end ? [] : acc.slice(-2);
      lastSentRef.current = performance.now();
    } else if (end) {
      accRef.current = [];
    }
  }

  function onDown(e: React.PointerEvent) {
    if (!canDraw) return;
    e.preventDefault();
    canvasRef.current?.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    accRef.current = toBuf(e);
    lastSentRef.current = performance.now();
  }
  function onMove(e: React.PointerEvent) {
    if (!canDraw || !drawingRef.current) return;
    const [x, y] = toBuf(e);
    const acc = accRef.current;
    const lx = acc[acc.length - 2];
    const ly = acc[acc.length - 1];
    if (x === lx && y === ly) return;
    acc.push(x, y);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) paintStroke(ctx, { color, width, points: [lx, ly, x, y] });
    if (performance.now() - lastSentRef.current > 50 || acc.length > 40) flush(false);
  }
  function onUp() {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    flush(true);
  }

  function clearCanvas() {
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, SIZE, SIZE);
    arcade.sendDrawClear();
  }

  // Word area
  let wordLine: React.ReactNode;
  if (game.phase !== 'drawing') {
    wordLine = (
      <span className="dg-word reveal">
        The word was <b>{game.word}</b>
      </span>
    );
  } else if (isDrawer) {
    wordLine = (
      <span className="dg-word">
        Draw: <b>{game.word}</b>
      </span>
    );
  } else if (haveGuessed) {
    wordLine = (
      <span className="dg-word got">
        <b>{game.word}</b>
      </span>
    );
  } else {
    wordLine = <span className="dg-word blanks">{'_ '.repeat(game.wordLength).trim()}</span>;
  }

  const drawer = playerById(game.drawerId);

  return (
    <div className="dg-table">
      <div className="dg-header">
        <span className="dg-round">
          Round {game.round + 1}/{game.totalRounds}
        </span>
        <span className={`dg-timer ${game.secondsLeft <= 10 ? 'low' : ''}`}>⏱ {game.secondsLeft}s</span>
        <span className="dg-drawer">
          {drawer?.avatar} {drawer?.name} {isDrawer ? '(you)' : ''} is drawing
        </span>
      </div>

      <div className="dg-wordline">{wordLine}</div>

      <div className="dg-stage">
        <canvas
          ref={canvasRef}
          width={SIZE}
          height={SIZE}
          className={`dg-canvas ${canDraw ? 'drawable' : ''}`}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerLeave={onUp}
        />
      </div>

      {canDraw && (
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
      )}

      {canGuess && (
        <form
          className="dg-guess"
          onSubmit={(e) => {
            e.preventDefault();
            const t = guess.trim();
            if (t) onGuess(t);
            setGuess('');
          }}
        >
          <input
            className="text-input"
            value={guess}
            maxLength={40}
            placeholder="Type your guess…"
            onChange={(e) => setGuess(e.target.value)}
          />
          <button className="btn primary" type="submit">
            Guess
          </button>
        </form>
      )}
      {!isDrawer && haveGuessed && drawing && <p className="dg-got-note">You got it! Sit tight…</p>}

      <div className="dg-scores">
        {game.seating.map((id) => {
          const p = playerById(id);
          return (
            <div key={id} className={`dg-score ${game.drawerId === id ? 'drawer' : ''}`}>
              <span>{p?.avatar}</span>
              <span className="dg-score-name">{p?.name}</span>
              {game.drawerId === id && <span className="dg-tag">drawing</span>}
              {game.guessed.includes(id) && <span className="dg-tag ok">guessed</span>}
              <span className="dg-score-pts">{game.scores[id] ?? 0}</span>
            </div>
          );
        })}
      </div>

      <div className="dg-feed">
        {game.chat.slice(-8).map((c) => {
          const name = playerById(c.playerId)?.name ?? 'Someone';
          if (c.kind === 'correct') return <p key={c.id} className="dg-msg correct">{name} guessed it!</p>;
          if (c.kind === 'system') return <p key={c.id} className="dg-msg system">{c.text}</p>;
          return (
            <p key={c.id} className="dg-msg">
              <b>{name}:</b> {c.text}
            </p>
          );
        })}
      </div>
    </div>
  );
}
