import { useEffect, useRef, useState } from 'react';
import {
  CardRank,
  CARD_RANKS,
  CARD_SUITS,
  CardSuit,
  GoFishState,
  PublicPlayer,
  SUIT_EMOJI,
} from '../../../shared/protocol.ts';
import { sfx } from '../sounds.ts';
import { CardFace } from './Card.tsx';

const REVEAL_MS = 1700;
type Ask = NonNullable<GoFishState['lastAsk']>;

/** A completed book — all four suits of one rank, shown as a small set. */
function Book({ rank }: { rank: CardRank }) {
  return (
    <span className="gf-book">
      <b className="gf-book-rank">{rank}</b>
      <span className="gf-book-suits">
        {CARD_SUITS.map((s: CardSuit) => (
          <span key={s} className={s === 'hearts' || s === 'diamonds' ? 'red' : 'black'}>
            {SUIT_EMOJI[s]}
          </span>
        ))}
      </span>
    </span>
  );
}

function Books({ ranks }: { ranks: CardRank[] }) {
  if (!ranks.length) return <span className="gf-none">no books yet</span>;
  return (
    <div className="gf-books-row">
      {ranks.map((r) => (
        <Book key={r} rank={r} />
      ))}
    </div>
  );
}

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

  const opponentId = game.seating.find((id) => id !== youId) ?? null;
  const myHand = game.hands[youId] ?? [];

  // Group your hand into rank-stacks (in deck order).
  const groups = CARD_RANKS.map((r) => ({ rank: r, cards: myHand.filter((c) => c.rank === r) })).filter(
    (g) => g.cards.length > 0,
  );

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
        <section className="gf-side">
          <header className="gf-head">
            <span className="gf-name">{nameOf(opponentId)}</span>
            <span className="gf-meta">
              {game.handCounts[opponentId] ?? 0} cards · deck {game.poolCount}
            </span>
          </header>
          <Books ranks={game.bookRanks[opponentId] ?? []} />
        </section>
      )}

      {reveal ? (
        <div className="gf-reveal">
          <span className="gf-reveal-q">
            {nameOf(reveal.asker)} asked for <b>{reveal.rank}</b>
          </span>
          <span className={`gf-reveal-out ${reveal.fished ? 'fish' : 'got'}`}>
            {reveal.fished ? 'Go Fish!' : `Handed over ${reveal.got}`}
          </span>
        </div>
      ) : (
        <div className="gf-turnline">
          {game.winner ? '' : yourTurn ? 'Your turn — tap cards to ask for that rank' : `${nameOf(game.turn)}'s turn`}
        </div>
      )}

      <section className="gf-side">
        <header className="gf-head">
          <span className="gf-name">You</span>
        </header>
        <Books ranks={game.bookRanks[youId] ?? []} />
        <p className="gf-prompt">Your hand</p>
        <div className="gf-stacks">
          {groups.map((g) => (
            <button
              key={g.rank}
              className={`gf-stack ${yourTurn ? 'askable' : ''}`}
              disabled={!yourTurn}
              onClick={() => yourTurn && onAsk(g.rank)}
              title={yourTurn ? `Ask for ${g.rank}s` : undefined}
            >
              {g.cards.map((c, i) => (
                <span key={c.id} className="gf-stack-card" style={{ marginLeft: i === 0 ? 0 : -26 }}>
                  <CardFace card={c} small />
                </span>
              ))}
            </button>
          ))}
          {groups.length === 0 && <span className="gf-none">hand empty</span>}
        </div>
      </section>
    </div>
  );
}
