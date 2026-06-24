import { useEffect, useState } from 'react';
import { CheckerPiece, CheckersState, PublicPlayer } from '../../../shared/protocol.ts';

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

  const [selected, setSelected] = useState<number | null>(null);

  // Mid multi-jump: force-select the chaining piece.
  useEffect(() => {
    if (game.mustContinueFrom !== null && game.turn === youId) setSelected(game.mustContinueFrom);
    else setSelected(null);
  }, [game.mustContinueFrom, game.turn, game.moves, youId]);

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
      if (game.mustContinueFrom !== null && i !== game.mustContinueFrom) return; // locked piece
      setSelected(i);
    }
  }

  // Red is rendered from the bottom for the red player; flip the view so your
  // own pieces are always nearest you.
  const order = myColor === 'b' ? [...Array(64).keys()].reverse() : [...Array(64).keys()];

  return (
    <div className="ck-wrap">
      <p className="ck-turn">
        {game.winner
          ? ''
          : yourTurn
            ? game.mustContinueFrom !== null
              ? 'Keep jumping! ⛓️'
              : 'Your move'
            : `${nameOf(game.turn)} is thinking…`}
        {myColor && !game.winner && (
          <span className={`ck-youare ${myColor}`}> · you are {myColor === 'r' ? '🔴 Red' : '⚫ Black'}</span>
        )}
      </p>
      <div className="ck-board">
        {order.map((i) => {
          const [r, c] = rc(i);
          const dark = (r + c) % 2 === 1;
          const piece = game.board[i];
          const isSel = selected === i;
          const isTarget = targets.includes(i);
          const isLast = game.lastMove?.includes(i);
          return (
            <div
              key={i}
              className={`ck-sq ${dark ? 'dark' : 'light'} ${isSel ? 'sel' : ''} ${
                isTarget ? 'target' : ''
              } ${isLast ? 'last' : ''}`}
              onClick={() => dark && tap(i)}
            >
              {piece && (
                <span className={`ck-piece ${piece.color}`}>
                  {piece.king ? '♔' : ''}
                </span>
              )}
              {isTarget && !piece && <span className="ck-dot" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
