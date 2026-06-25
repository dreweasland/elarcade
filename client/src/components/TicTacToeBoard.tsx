import { PublicPlayer, TicTacToeState } from '../../../shared/protocol.ts';
import { AvatarIcon } from './AvatarIcon.tsx';

export function TicTacToeBoard({
  game,
  players,
  youId,
  canPlay,
  onPlay,
}: {
  game: TicTacToeState;
  players: PublicPlayer[];
  youId: string;
  canPlay: boolean;
  onPlay: (cell: number) => void;
}) {
  // Map an 'X'/'O' mark back to the player who owns it, for avatar display.
  const markOwner = (mark: 'X' | 'O') => {
    const id = Object.keys(game.marks).find((pid) => game.marks[pid] === mark);
    return players.find((p) => p.id === id);
  };

  const yourMark = game.marks[youId];
  const yourTurn = canPlay && game.turn === youId && !game.winner;

  return (
    <div className={`board ${yourTurn ? 'your-turn' : ''}`}>
      {game.board.map((mark, i) => {
        const owner = mark ? markOwner(mark) : undefined;
        const winning = game.winningLine?.includes(i);
        const playable = yourTurn && mark === null;
        return (
          <button
            key={i}
            className={`cell ${mark ? `mark-${mark}` : ''} ${winning ? 'winning' : ''} ${
              playable ? 'playable' : ''
            }`}
            disabled={!playable}
            onClick={() => playable && onPlay(i)}
            aria-label={mark ? `square ${i + 1}, ${owner?.name ?? mark}` : `empty square ${i + 1}`}
          >
            {owner ? (
              <span className="cell-avatar"><AvatarIcon id={owner.avatar} /></span>
            ) : playable ? (
              <span className="cell-ghost"><AvatarIcon id={markOwner(yourMark)?.avatar} /></span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
