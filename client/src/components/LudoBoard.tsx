import { useEffect, useRef } from 'react';
import {
  LUDO_SAFE,
  LUDO_START,
  LudoColor,
  LudoState,
  PublicPlayer,
} from '../../../shared/protocol.ts';
import { sfx } from '../sounds.ts';
import { RollingDie } from './RollingDie.tsx';
import { AvatarIcon } from './AvatarIcon.tsx';

type RC = [number, number];

// The 52 common-loop squares, in travel order, as [row, col] on a 15×15 grid.
const RING: RC[] = [
  [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],
  [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],
  [0, 7],
  [0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],
  [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],
  [7, 14],
  [8, 14], [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],
  [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8],
  [14, 7],
  [14, 6], [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],
  [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0],
  [7, 0],
  [6, 0],
];

// Home columns (rel 51..56) and base slots, per colour.
const HOME: Record<LudoColor, RC[]> = {
  red: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6]],
  green: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7]],
  yellow: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9], [7, 8]],
  blue: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7], [8, 7]],
};
const BASE: Record<LudoColor, RC[]> = {
  red: [[1, 1], [1, 4], [4, 1], [4, 4]],
  green: [[1, 10], [1, 13], [4, 10], [4, 13]],
  yellow: [[10, 10], [10, 13], [13, 10], [13, 13]],
  blue: [[10, 1], [10, 4], [13, 1], [13, 4]],
};

const CSS_COLOR: Record<LudoColor, string> = {
  red: '#ff5252',
  green: '#43d97b',
  yellow: '#f4cf3a',
  blue: '#48a7ff',
};

const key = (r: number, c: number) => `${r},${c}`;
const homeLaneMap = new Map<string, LudoColor>();
const startMap = new Map<string, LudoColor>();
const safeSet = new Set<string>();
(Object.keys(HOME) as LudoColor[]).forEach((col) => {
  HOME[col].forEach(([r, c]) => homeLaneMap.set(key(r, c), col));
  const [sr, sc] = RING[LUDO_START[col]];
  startMap.set(key(sr, sc), col);
});
LUDO_SAFE.forEach((i) => {
  const [r, c] = RING[i];
  if (!startMap.has(key(r, c))) safeSet.add(key(r, c));
});

function cornerColor(r: number, c: number): LudoColor | null {
  if (r < 6 && c < 6) return 'red';
  if (r < 6 && c > 8) return 'green';
  if (r > 8 && c < 6) return 'blue';
  if (r > 8 && c > 8) return 'yellow';
  return null;
}

function tokenCoord(color: LudoColor, rel: number, idx: number): RC {
  if (rel < 0) return BASE[color][idx];
  if (rel <= 50) return RING[(LUDO_START[color] + rel) % 52];
  return HOME[color][rel - 51];
}

export function LudoBoard({
  game,
  players,
  youId,
  canPlay,
  onRoll,
  onMove,
}: {
  game: LudoState;
  players: PublicPlayer[];
  youId: string;
  canPlay: boolean;
  onRoll: () => void;
  onMove: (token: number) => void;
}) {
  const nameOf = (id: string | null) => players.find((p) => p.id === id)?.name ?? 'Someone';
  const avatarOf = (id: string | null) => players.find((p) => p.id === id)?.avatar;

  const myTurn = canPlay && game.turn === youId && !game.winner;

  // Bump sound when an opponent token gets sent home.
  const prevMoves = useRef(game.moves);
  useEffect(() => {
    if (game.moves !== prevMoves.current) {
      prevMoves.current = game.moves;
      if (game.lastBump) sfx.hit();
    }
  }, [game.moves, game.lastBump]);

  // Lay out the 15×15 background.
  const cells: React.ReactNode[] = [];
  for (let r = 0; r < 15; r++) {
    for (let c = 0; c < 15; c++) {
      const k = key(r, c);
      let cls = 'lu-cell';
      let content: React.ReactNode = null;
      const lane = homeLaneMap.get(k);
      const start = startMap.get(k);
      const corner = cornerColor(r, c);
      const center = r >= 6 && r <= 8 && c >= 6 && c <= 8;
      if (lane) {
        cls += ' lane';
        cells.push(<div key={k} className={cls} style={{ background: CSS_COLOR[lane] }} />);
        continue;
      }
      if (center) {
        const isGoal = r === 7 && c === 7;
        cells.push(<div key={k} className={`lu-cell center ${isGoal ? 'goal' : ''}`} />);
        continue;
      }
      if (corner) {
        cells.push(<div key={k} className="lu-cell corner" style={{ ['--c' as string]: CSS_COLOR[corner] }} />);
        continue;
      }
      if (start) {
        cells.push(<div key={k} className="lu-cell start" style={{ background: CSS_COLOR[start] }}>★</div>);
        continue;
      }
      if (safeSet.has(k)) content = '★';
      cells.push(
        <div key={k} className={`lu-cell track ${safeSet.has(k) ? 'safe' : ''}`}>
          {content}
        </div>,
      );
    }
  }

  // Place every token, spreading any that share a square.
  const byCell = new Map<string, number>();
  const tokenEls: React.ReactNode[] = [];
  for (const pid of game.seating) {
    const color = game.colors[pid];
    game.tokens[pid].forEach((rel, i) => {
      const [r, c] = tokenCoord(color, rel, i);
      const k = key(r, c);
      const n = byCell.get(k) ?? 0;
      byCell.set(k, n + 1);
      const dx = (n % 2) * 3.2 - 1.6;
      const dy = Math.floor(n / 2) * 3.2 - 1.6;
      const movable = myTurn && game.phase === 'moving' && pid === youId && game.movable.includes(i);
      const left = ((c + 0.5) / 15) * 100 + dx;
      const top = ((r + 0.5) / 15) * 100 + dy;
      tokenEls.push(
        <button
          key={`${pid}-${i}`}
          className={`lu-token ${pid === youId ? 'me' : ''} ${movable ? 'movable' : ''} ${
            game.lastMover === pid ? 'just' : ''
          }`}
          style={{ left: `${left}%`, top: `${top}%`, background: CSS_COLOR[color] }}
          disabled={!movable}
          onClick={() => movable && onMove(i)}
        >
          <AvatarIcon id={avatarOf(pid)} />
        </button>,
      );
    });
  }

  // Status line.
  let status: React.ReactNode = null;
  if (!game.winner) {
    if (game.lastRollNoMove && game.dice != null) {
      status = `Rolled ${game.dice} — no moves. ${myTurn ? 'Your' : `${nameOf(game.turn)}'s`} turn.`;
    } else if (myTurn && game.phase === 'moving') {
      status = 'Tap a glowing token to move it!';
    } else if (myTurn) {
      status = game.tokens[youId]?.every((t) => t === -1)
        ? 'Roll a 6 to launch a token!'
        : 'Your roll!';
    } else {
      status = `${nameOf(game.turn)} is playing…`;
    }
  }

  return (
    <div className="lu-wrap">
      <div className="lu-players">
        {game.seating.map((pid) => {
          const home = game.tokens[pid].filter((t) => t === 56).length;
          return (
            <div
              key={pid}
              className={`lu-player ${game.turn === pid ? 'turn' : ''} ${pid === youId ? 'you' : ''}`}
              style={{ ['--c' as string]: CSS_COLOR[game.colors[pid]] }}
            >
              <span className="lu-chip" />
              <span className="lu-pname"><AvatarIcon id={avatarOf(pid)} /> {nameOf(pid)}</span>
              <span className="lu-home">{home}/4 home</span>
            </div>
          );
        })}
      </div>

      <div className="lu-board">
        {cells}
        {tokenEls}
      </div>

      <div className="lu-status">
        <RollingDie className="lu-die" value={game.dice} rollKey={String(game.rollId)} />
        {game.lastBump && <span className="lu-bump">Bump!</span>}
        {status && <span className="lu-msg">{status}</span>}
      </div>

      {canPlay && !game.winner && game.phase === 'rolling' && (
        <div className="room-actions">
          <button className="btn primary big" disabled={!myTurn} onClick={onRoll}>
            Roll
          </button>
        </div>
      )}
    </div>
  );
}
