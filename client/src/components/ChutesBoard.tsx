import { useEffect, useRef, useState } from 'react';
import { CHUTES_BOARD, ChutesState, PublicPlayer } from '../../../shared/protocol.ts';
import { sfx } from '../sounds.ts';

const STEP_MS = 230; // time per square while walking
const LAND_PAUSE_MS = 420; // pause on the landing square before a ladder/chute
const SLIDE_MS = 750; // time the slide stays before clearing

interface Anim {
  mover: string;
  pos: number;
  via: 'ladder' | 'chute' | null;
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

    let t = 0;
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
          setAnim({ mover, pos: final, via: game.lastVia });
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

  let status: React.ReactNode = 'Roll to move!';
  if (anim?.via === 'ladder') status = '🪜 Up a ladder!';
  else if (anim?.via === 'chute') status = '🛝 Down a chute!';
  else if (game.lastRoll) status = <>🎲 <b>{game.lastRoll}</b></>;

  const winner = players.find((p) => p.id === (game.winner ?? null));

  return (
    <div className="ch-table">
      <div className="ch-grid">
        {rows.flat().map((sq) => {
          const dest = CHUTES_BOARD[sq];
          const kind = dest === undefined ? '' : dest > sq ? 'ladder' : 'chute';
          const here = tokensOn(sq);
          return (
            <div key={sq} className={`ch-cell ${kind}`}>
              <span className="ch-num">{sq}</span>
              {kind === 'ladder' && <span className="ch-icon">🪜</span>}
              {kind === 'chute' && <span className="ch-icon">🛝</span>}
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

      {atStart.length > 0 && (
        <div className="ch-start">
          Start: {atStart.map((p) => (<span key={p.id}>{p.avatar}</span>))}
        </div>
      )}

      <div className="ch-status">{status}</div>

      {game.winner && winner && <p className="ch-win">{winner.avatar} reached 100! 🎉</p>}

      {canPlay && (
        <div className="room-actions">
          <button className="btn primary big" disabled={!myTurn} onClick={onRoll}>
            {anim ? 'Moving…' : '🎲 Roll'}
          </button>
        </div>
      )}
    </div>
  );
}
