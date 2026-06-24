import { CardRank, CARD_RANKS, GoFishState, PublicPlayer } from '../../../shared/protocol.ts';
import { CardFace } from './Card.tsx';

export function GoFishBoard({
  game,
  players,
  youId,
  canPlay,
  onAsk,
}: {
  game: GoFishState;
  players: PublicPlayer[];
  youId: string;
  canPlay: boolean;
  onAsk: (rank: CardRank) => void;
}) {
  const nameOf = (id: string | null) => players.find((p) => p.id === id)?.name ?? 'Someone';
  const avatarOf = (id: string | null) => players.find((p) => p.id === id)?.avatar ?? '👾';

  const opponentId = game.seating.find((id) => id !== youId) ?? null;
  const myHand = game.hands[youId] ?? [];
  const yourTurn = canPlay && game.turn === youId;

  // Distinct ranks in your hand, in deck order, for the "ask" buttons.
  const myRanks = CARD_RANKS.filter((r) => myHand.some((c) => c.rank === r));

  const log = game.lastAction
    ? game.lastAction.replace(/\{([^}]+)\}/g, (_, id) => nameOf(id))
    : null;

  return (
    <div className="gf-board">
      {opponentId && (
        <div className="gf-opponent">
          <span className="gf-opp-who">
            {avatarOf(opponentId)} {nameOf(opponentId)}
          </span>
          <span className="gf-opp-meta">
            🂠 {game.handCounts[opponentId] ?? 0} cards · 📚 {game.books[opponentId] ?? 0} books
          </span>
          {(game.bookRanks[opponentId]?.length ?? 0) > 0 && (
            <span className="gf-books">{game.bookRanks[opponentId].join(' ')}</span>
          )}
        </div>
      )}

      <div className="gf-ocean">🌊 {game.poolCount} cards in the ocean</div>
      {log && <p className="gf-log">{log}</p>}

      <div className="gf-you">
        <span className="gf-you-meta">
          Your books: 📚 {game.books[youId] ?? 0}
          {(game.bookRanks[youId]?.length ?? 0) > 0 && (
            <span className="gf-books"> {game.bookRanks[youId].join(' ')}</span>
          )}
        </span>
        <div className="gf-hand">
          {myHand.map((c) => (
            <CardFace key={c.id} card={c} small />
          ))}
          {myHand.length === 0 && <span className="gf-empty">Your hand is empty.</span>}
        </div>
      </div>

      {canPlay && !game.winner && (
        <div className="gf-ask">
          <span className="field-label">{yourTurn ? 'Ask your opponent for…' : 'Waiting for your turn…'}</span>
          <div className="gf-ranks">
            {myRanks.map((r) => (
              <button
                key={r}
                className="rank-btn"
                disabled={!yourTurn}
                onClick={() => onAsk(r)}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
