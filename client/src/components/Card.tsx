import { PlayingCard, SUIT_EMOJI } from '../../../shared/protocol.ts';

/** A single face-up or face-down playing card. */
export function CardFace({
  card,
  faceDown,
  small,
  onClick,
  selected,
}: {
  card?: PlayingCard;
  faceDown?: boolean;
  small?: boolean;
  onClick?: () => void;
  selected?: boolean;
}) {
  const cls = `card ${small ? 'small' : ''} ${faceDown ? 'down' : ''} ${selected ? 'sel' : ''} ${
    onClick ? 'clickable' : ''
  }`;
  if (faceDown || !card) {
    return (
      <button className={cls} onClick={onClick} disabled={!onClick} aria-label="face-down card">
        <span className="card-back">🐠</span>
      </button>
    );
  }
  const red = card.suit === 'hearts' || card.suit === 'diamonds';
  return (
    <button
      className={`${cls} ${red ? 'red' : 'black'}`}
      onClick={onClick}
      disabled={!onClick}
      aria-label={`${card.rank} of ${card.suit}`}
    >
      <span className="card-rank">{card.rank}</span>
      <span className="card-suit">{SUIT_EMOJI[card.suit]}</span>
    </button>
  );
}
