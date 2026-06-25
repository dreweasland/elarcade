import { useState } from 'react';
import { C4_COLS, C4_ROWS, ConnectFourState, PublicPlayer } from '../../../shared/protocol.ts';
import { AvatarIcon } from './AvatarIcon.tsx';

export function ConnectFourBoard({
  game,
  players,
  youId,
  canPlay,
  onPlay,
}: {
  game: ConnectFourState;
  players: PublicPlayer[];
  youId: string;
  canPlay: boolean;
  onPlay: (column: number) => void;
}) {
  const [hoverCol, setHoverCol] = useState<number | null>(null);

  const markOwner = (mark: 'R' | 'Y') => {
    const id = Object.keys(game.marks).find((pid) => game.marks[pid] === mark);
    return players.find((p) => p.id === id);
  };

  const yourTurn = canPlay && game.turn === youId && !game.winner;
  const yourAvatar = markOwner(game.marks[youId])?.avatar;

  const columnFull = (col: number) => game.board[col] !== null; // top cell occupied

  return (
    <div className="c4-board">
      {Array.from({ length: C4_COLS }, (_, col) => {
        const playable = yourTurn && !columnFull(col);
        return (
          <button
            key={col}
            className={`c4-col ${playable ? 'playable' : ''} ${
              hoverCol === col && playable ? 'hovered' : ''
            }`}
            disabled={!playable}
            onClick={() => playable && onPlay(col)}
            onMouseEnter={() => setHoverCol(col)}
            onMouseLeave={() => setHoverCol(null)}
            aria-label={`drop in column ${col + 1}`}
          >
            {Array.from({ length: C4_ROWS }, (_, row) => {
              const i = row * C4_COLS + col;
              const mark = game.board[i];
              const owner = mark ? markOwner(mark) : undefined;
              const winning = game.winningLine?.includes(i);
              return (
                <span key={i} className={`c4-slot ${mark ? `disc-${mark}` : ''} ${winning ? 'winning' : ''}`}>
                  {owner ? <span className="c4-disc"><AvatarIcon id={owner.avatar} /></span> : null}
                </span>
              );
            })}
            {playable && hoverCol === col && (
              <span className="c4-preview" aria-hidden="true">
                <AvatarIcon id={yourAvatar} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
