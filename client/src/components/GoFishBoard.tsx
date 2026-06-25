import { useEffect, useRef, useState } from 'react';
import { CardRank, CARD_RANKS, GoFishState, PublicPlayer } from '../../../shared/protocol.ts';
import { sfx } from '../sounds.ts';
import { CardFace } from './Card.tsx';

const REVEAL_MS = 1700;

type Ask = NonNullable<GoFishState['lastAsk']>;

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
  const myRanks = CARD_RANKS.filter((r) => myHand.some((c) => c.rank === r));

  // ----- ask / outcome reveal -----
  const [reveal, setReveal] = useState<Ask | null>(null);
  const prevMoves = useRef(game.moves);
  useEffect(() => {
    if (game.moves === prevMoves.current) return;
    prevMoves.current = game.moves;
    if (!game.lastAsk) return;
    setReveal(game.lastAsk);
    sfx.click();
    const hit = window.setTimeout(() => (game.lastAsk!.fished ? sfx.place() : sfx.join()), 700);
    const done = window.setTimeout(() => setReveal(null), REVEAL_MS);
    return () => {
      clearTimeout(hit);
      clearTimeout(done);
    };
  }, [game.moves, game.lastAsk]);

  const yourTurn = canPlay && game.turn === youId && !reveal && !game.winner;

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

      {reveal ? (
        <div className="gf-reveal">
          <span className="gf-reveal-q">
            {avatarOf(reveal.asker)} <b>{nameOf(reveal.asker)}</b> asked for…
          </span>
          <span className="gf-reveal-rank pop">{reveal.rank}</span>
          <span className={`gf-reveal-out ${reveal.fished ? 'fish' : 'got'}`}>
            {reveal.fished
              ? '🎣 Go Fish!'
              : `✅ Got ${reveal.got} from ${nameOf(reveal.target)}!`}
          </span>
        </div>
      ) : (
        game.lastAction && (
          <p className="gf-log">{game.lastAction.replace(/\{([^}]+)\}/g, (_, id) => nameOf(id))}</p>
        )
      )}

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
          <span className="field-label">{yourTurn ? 'Ask your opponent for…' : 'Waiting…'}</span>
          <div className="gf-ranks">
            {myRanks.map((r) => (
              <button key={r} className="rank-btn" disabled={!yourTurn} onClick={() => onAsk(r)}>
                {r}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
