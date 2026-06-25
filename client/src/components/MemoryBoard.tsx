import { MemoryState, PublicPlayer } from '../../../shared/protocol.ts';
import { AvatarIcon } from './AvatarIcon.tsx';

export function MemoryBoard({
  game,
  players,
  youId,
  canPlay,
  onFlip,
}: {
  game: MemoryState;
  players: PublicPlayer[];
  youId: string;
  canPlay: boolean;
  onFlip: (index: number) => void;
}) {
  const myTurn = canPlay && game.turn === youId && !game.winner;
  const playerById = (id: string) => players.find((p) => p.id === id);

  return (
    <div className="mem-table">
      {/* Per-player pair counts */}
      <div className="mem-scores">
        {game.seating.map((id) => {
          const p = playerById(id);
          return (
            <div key={id} className={`mem-score ${game.turn === id ? 'turn' : ''} ${id === youId ? 'you' : ''}`}>
              <span className="mem-score-avatar"><AvatarIcon id={p?.avatar} /></span>
              <span className="mem-score-name">{p?.name}</span>
              <span className="mem-score-pairs">{game.scores[id] ?? 0}</span>
            </div>
          );
        })}
      </div>

      <div
        className="mem-grid"
        style={{ gridTemplateColumns: `repeat(${game.cols}, 1fr)` }}
      >
        {game.cards.map((card, i) => {
          const faceUp = card.matchedBy !== null || game.flipped.includes(i);
          const flippable = myTurn && card.matchedBy === null && !game.flipped.includes(i);
          const owner = card.matchedBy ? playerById(card.matchedBy) : undefined;
          return (
            <button
              key={card.id}
              className={`mem-card ${faceUp ? 'up' : ''} ${card.matchedBy ? 'matched' : ''} ${
                flippable ? 'flippable' : ''
              }`}
              disabled={!flippable}
              onClick={() => flippable && onFlip(i)}
              aria-label={faceUp ? `card ${card.face}` : 'face-down card'}
            >
              {faceUp ? (
                <span className="mem-face">
                  {card.face}
                  {owner && <span className="mem-owner"><AvatarIcon id={owner.avatar} /></span>}
                </span>
              ) : (
                <span className="mem-q" aria-hidden="true">
                  ?
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
