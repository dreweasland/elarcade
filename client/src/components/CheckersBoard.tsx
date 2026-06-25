import { useEffect, useRef, useState } from 'react';
import { CheckerPiece, CheckersState, PublicPlayer } from '../../../shared/protocol.ts';
import { sfx } from '../sounds.ts';

type Board = (CheckerPiece | null)[];

const rc = (i: number): [number, number] => [Math.floor(i / 8), i % 8];
const idx = (r: number, c: number) => r * 8 + c;
const inB = (r: number, c: number) => r >= 0 && r < 8 && c >= 0 && c < 8;

function dirsFor(p: CheckerPiece): Array<[number, number]> {
  if (p.king) return [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  return p.color === 'r' ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]];
}
function jumpsFrom(board: Board, i: number): number[] {
  const p = board[i];
  if (!p) return [];
  const [r, c] = rc(i);
  const out: number[] = [];
  for (const [dr, dc] of dirsFor(p)) {
    const mr = r + dr, mc = c + dc, tr = r + 2 * dr, tc = c + 2 * dc;
    if (!inB(tr, tc)) continue;
    const mid = board[idx(mr, mc)], dest = board[idx(tr, tc)];
    if (mid && mid.color !== p.color && !dest) out.push(idx(tr, tc));
  }
  return out;
}
function stepsFrom(board: Board, i: number): number[] {
  const p = board[i];
  if (!p) return [];
  const [r, c] = rc(i);
  const out: number[] = [];
  for (const [dr, dc] of dirsFor(p)) {
    const tr = r + dr, tc = c + dc;
    if (inB(tr, tc) && !board[idx(tr, tc)]) out.push(idx(tr, tc));
  }
  return out;
}

export function CheckersBoard({
  game,
  players,
  youId,
  canPlay,
  onMove,
}: {
  game: CheckersState;
  players: PublicPlayer[];
  youId: string;
  canPlay: boolean;
  onMove: (from: number, to: number) => void;
}) {
  const nameOf = (id: string | null) => players.find((p) => p.id === id)?.name ?? 'Someone';
  const myColor = game.marks[youId] ?? null;
  const yourTurn = canPlay && game.turn === youId && !!myColor;
  const flip = myColor === 'b'; // keep your own pieces nearest you

  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    if (game.mustContinueFrom !== null && game.turn === youId) setSelected(game.mustContinueFrom);
    else setSelected(null);
  }, [game.mustContinueFrom, game.turn, game.moves, youId]);

  // Capture poof + sound when a piece is taken.
  const [poofs, setPoofs] = useState<number[]>([]);
  const prevMoves = useRef(game.moves);
  useEffect(() => {
    if (game.moves === prevMoves.current) return;
    prevMoves.current = game.moves;
    if (game.lastCaptured.length) {
      setPoofs(game.lastCaptured);
      sfx.hit();
      const t = window.setTimeout(() => setPoofs([]), 600);
      return () => clearTimeout(t);
    }
    sfx.place();
  }, [game.moves, game.lastCaptured]);

  const targets =
    selected !== null
      ? game.mustContinueFrom !== null
        ? jumpsFrom(game.board, selected)
        : [...jumpsFrom(game.board, selected), ...stepsFrom(game.board, selected)]
      : [];

  function tap(i: number) {
    if (!yourTurn) return;
    const piece = game.board[i];
    if (selected !== null && targets.includes(i)) {
      onMove(selected, i);
      if (game.mustContinueFrom === null) setSelected(null);
      return;
    }
    if (piece && piece.color === myColor) {
      if (game.mustContinueFrom !== null && i !== game.mustContinueFrom) return;
      setSelected(i);
    }
  }

  // Display coords: flip the whole board for the black player.
  const disp = (i: number): { left: number; top: number } => {
    const [r, c] = rc(i);
    const dr = flip ? 7 - r : r;
    const dc = flip ? 7 - c : c;
    return { left: ((dc + 0.5) / 8) * 100, top: ((dr + 0.5) / 8) * 100 };
  };

  // Background cells, in display order (mapped back to true squares).
  const cells = Array.from({ length: 64 }, (_, d) => {
    const dr = Math.floor(d / 8);
    const dc = d % 8;
    const r = flip ? 7 - dr : dr;
    const c = flip ? 7 - dc : dc;
    const i = idx(r, c);
    const dark = (r + c) % 2 === 1;
    const isSel = selected === i;
    const isTarget = targets.includes(i);
    const isLast = game.lastMove?.includes(i);
    return (
      <div
        key={d}
        className={`ck-sq ${dark ? 'dark' : 'light'} ${isSel ? 'sel' : ''} ${
          isTarget ? 'target' : ''
        } ${isLast ? 'last' : ''}`}
        onClick={() => dark && tap(i)}
      >
        {isTarget && !game.board[i] && <span className="ck-dot" />}
      </div>
    );
  });

  // Pieces as an absolutely-positioned overlay (keyed by id → they glide).
  const pieces = game.board
    .map((p, i) => ({ p, i }))
    .filter((x): x is { p: CheckerPiece; i: number } => !!x.p)
    .map(({ p, i }) => {
      const { left, top } = disp(i);
      return (
        <div
          key={p.id}
          className={`ck-pc ${p.color} ${p.color === myColor ? 'me' : ''} ${
            game.lastMove?.[1] === i ? 'just' : ''
          }`}
          style={{ left: `${left}%`, top: `${top}%` }}
        >
          {p.king ? '♔' : ''}
        </div>
      );
    });

  const poofEls = poofs.map((i) => {
    const { left, top } = disp(i);
    return (
      <span key={`poof-${i}`} className="ck-poof" style={{ left: `${left}%`, top: `${top}%` }} />
    );
  });

  return (
    <div className="ck-wrap">
      <p className="ck-turn">
        {game.winner
          ? ''
          : yourTurn
            ? game.mustContinueFrom !== null
              ? 'Keep jumping!'
              : 'Your move'
            : `${nameOf(game.turn)} is thinking…`}
        {myColor && !game.winner && (
          <span className={`ck-youare ${myColor}`}> · you are {myColor === 'r' ? 'Red' : 'Black'}</span>
        )}
      </p>
      <div className="ck-board">
        {cells}
        {pieces}
        {poofEls}
      </div>
    </div>
  );
}
