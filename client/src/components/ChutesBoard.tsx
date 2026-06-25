import { useEffect, useRef, useState } from 'react';
import { CHUTES_BOARD, ChutesState, PublicPlayer } from '../../../shared/protocol.ts';
import { sfx } from '../sounds.ts';
import { ROLL_MS, RollingDie } from './RollingDie.tsx';

const DIE_MS = ROLL_MS + 120; // let the die finish rolling before the token walks
const STEP_MS = 230; // time per square while walking
const LAND_PAUSE_MS = 420; // pause on the landing square before a ladder/chute
const SLIDE_MS = 750; // time the slide stays before clearing

interface Anim {
  mover: string;
  pos: number;
  via: 'ladder' | 'chute' | null;
  /** During a slide, the source/destination squares (to highlight the link). */
  from?: number;
  to?: number;
}

/** Center of a square (1-100) as a percent (0-100) of the boustrophedon grid. */
function squareCenter(n: number): { x: number; y: number } {
  const r = Math.floor((n - 1) / 10); // 0 = bottom row
  const idx = (n - 1) % 10;
  const col = r % 2 === 0 ? idx : 9 - idx; // alternate row direction
  const displayRow = 9 - r; // 0 = top row
  return { x: (col + 0.5) * 10, y: (displayRow + 0.5) * 10 };
}

export function ChutesBoard({
  game,
  players,
  youId,
  canPlay,
  onRoll,
}: {
  game: ChutesState;
  players: PublicPlayer[];
  youId: string;
  canPlay: boolean;
  onRoll: () => void;
}) {
  const [anim, setAnim] = useState<Anim | null>(null);
  const prevMoves = useRef(game.moves);
  const timers = useRef<number[]>([]);

  // Animate a token square-by-square whenever a new move arrives.
  useEffect(() => {
    if (game.moves === prevMoves.current) return; // first render / no new move
    prevMoves.current = game.moves;
    const mover = game.lastMover;
    if (!mover || game.lastFrom == null || game.lastRoll == null) return;

    timers.current.forEach(clearTimeout);
    timers.current = [];

    const start = game.lastFrom;
    const landing = Math.min(100, start + game.lastRoll);
    const final = game.positions[mover] ?? landing;

    // Hold the token at its start square while the die tumbles, then walk.
    let t = DIE_MS;
    setAnim({ mover, pos: start, via: null });
    for (let sq = start + 1; sq <= landing; sq++) {
      const at = sq;
      t += STEP_MS;
      timers.current.push(
        window.setTimeout(() => {
          setAnim({ mover, pos: at, via: null });
          sfx.click();
        }, t),
      );
    }
    if (final !== landing) {
      // Landed on a ladder or chute — pause, then slide.
      timers.current.push(
        window.setTimeout(() => {
          setAnim({ mover, pos: final, via: game.lastVia, from: landing, to: final });
          if (game.lastVia === 'ladder') sfx.win();
          else sfx.lose();
        }, t + LAND_PAUSE_MS),
      );
      timers.current.push(window.setTimeout(() => setAnim(null), t + LAND_PAUSE_MS + SLIDE_MS));
    } else {
      timers.current.push(window.setTimeout(() => setAnim(null), t + 300));
    }

    return () => {
      timers.current.forEach(clearTimeout);
    };
  }, [game.moves]); // eslint-disable-line react-hooks/exhaustive-deps

  const myTurn = canPlay && game.turn === youId && !game.winner && !anim;

  const displayPos = (id: string) =>
    anim && anim.mover === id ? anim.pos : (game.positions[id] ?? 0);

  // Build display rows top (100) to bottom (1), boustrophedon.
  const rows: number[][] = [];
  for (let r = 9; r >= 0; r--) {
    const base = r * 10;
    const row = Array.from({ length: 10 }, (_, i) => base + i + 1);
    if (r % 2 === 1) row.reverse();
    rows.push(row);
  }

  const tokensOn = (sq: number) => players.filter((p) => displayPos(p.id) === sq);
  const atStart = players.filter((p) => displayPos(p.id) === 0);

  let feedback = '';
  if (anim?.via === 'ladder') feedback = 'Up a ladder!';
  else if (anim?.via === 'chute') feedback = 'Down a chute!';
  else if (game.lastRoll == null) feedback = 'Roll to move!';

  const winner = players.find((p) => p.id === (game.winner ?? null));

  return (
    <div className="ch-table">
      <div className="ch-board-wrap">
        <svg className="ch-links" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {Object.entries(CHUTES_BOARD).map(([fromStr, to]) => {
            const from = Number(fromStr);
            const a = squareCenter(from);
            const b = squareCenter(to);
            const ladder = to > from;
            const active = anim?.from === from && anim?.to === to;
            return (
              <line
                key={from}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                className={`ch-link ${ladder ? 'ladder' : 'chute'} ${active ? 'active' : ''}`}
              />
            );
          })}
        </svg>
        <div className="ch-grid">
        {rows.flat().map((sq) => {
          const dest = CHUTES_BOARD[sq];
          const kind = dest === undefined ? '' : dest > sq ? 'ladder' : 'chute';
          const here = tokensOn(sq);
          return (
            <div key={sq} className={`ch-cell ${kind}`}>
              <span className="ch-num">{sq}</span>
              {here.length > 0 && (
                <span className="ch-tokens">
                  {here.map((p) => (
                    <span
                      key={p.id}
                      className={`${p.id === youId ? 'me' : ''} ${anim?.mover === p.id ? 'hop' : ''}`}
                    >
                      {p.avatar}
                    </span>
                  ))}
                </span>
              )}
            </div>
          );
        })}
        </div>
      </div>

      {atStart.length > 0 && (
        <div className="ch-start">
          Start: {atStart.map((p) => (<span key={p.id}>{p.avatar}</span>))}
        </div>
      )}

      <div className="ch-status">
        {game.lastRoll != null && (
          <RollingDie className="ch-die" value={game.lastRoll} rollKey={String(game.moves)} />
        )}
        {feedback && <span className="ch-feedback">{feedback}</span>}
      </div>

      {game.winner && winner && <p className="ch-win">{winner.avatar} reached 100!</p>}

      {canPlay && (
        <div className="room-actions">
          <button className="btn primary big" disabled={!myTurn} onClick={onRoll}>
            {anim ? 'Moving…' : 'Roll'}
          </button>
        </div>
      )}
    </div>
  );
}
