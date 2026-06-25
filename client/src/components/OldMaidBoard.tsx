import { useEffect, useRef, useState } from 'react';
import { OldMaidState, PlayingCard, PublicPlayer } from '../../../shared/protocol.ts';
import { sfx } from '../sounds.ts';
import { CardFace } from './Card.tsx';

const REVEAL_MS = 1500;

/** A row of face-up matched pairs (two cards each). */
function Pairs({ cards }: { cards: PlayingCard[] }) {
  if (!cards.length) return <span className="om-none">no pairs yet</span>;
  const pairs: PlayingCard[][] = [];
  for (let i = 0; i < cards.length; i += 2) pairs.push(cards.slice(i, i + 2));
  return (
    <div className="om-pairs">
      {pairs.map((pair, i) => (
        <span className="om-pair" key={i}>
          {pair.map((c) => (
            <CardFace key={c.id} card={c} tiny />
          ))}
        </span>
      ))}
    </div>
  );
}

export function OldMaidBoard({
  game,
  players,
  youId,
  canPlay,
  onDraw,
}: {
  game: OldMaidState;
  players: PublicPlayer[];
  youId: string;
  canPlay: boolean;
  onDraw: (index: number) => void;
}) {
  const nameOf = (id: string | null) => players.find((p) => p.id === id)?.name ?? 'Someone';

  const opponentId = game.seating.find((id) => id !== youId) ?? null;
  const myHand = game.hands[youId] ?? [];
  const oppCount = opponentId ? game.handCounts[opponentId] ?? 0 : 0;

  // ----- draw reveal animation -----
  const [reveal, setReveal] = useState<{ card: PlayingCard; paired: boolean } | null>(null);
  const prevMoves = useRef(game.moves);
  useEffect(() => {
    if (game.moves === prevMoves.current) return;
    prevMoves.current = game.moves;
    if (!game.lastDrawn) return;
    setReveal({ card: game.lastDrawn, paired: game.lastPaired });
    sfx.click();
    const flip = window.setTimeout(() => (game.lastPaired ? sfx.join() : sfx.place()), 650);
    const done = window.setTimeout(() => setReveal(null), REVEAL_MS);
    return () => {
      clearTimeout(flip);
      clearTimeout(done);
    };
  }, [game.moves, game.lastDrawn, game.lastPaired]);

  // Hold off interaction until the reveal finishes, so the wind-up is seen.
  const yourTurn = canPlay && game.turn === youId && !reveal && !game.winner;

  return (
    <div className="om-board">
      {opponentId && (
        <section className="om-side">
          <header className="om-head">
            <span className="om-name">{nameOf(opponentId)}</span>
            <span className="om-sub">pairs won</span>
          </header>
          <Pairs cards={game.discards[opponentId] ?? []} />
          <p className="om-prompt">{yourTurn ? 'Pick a card from their hand' : 'Their hand'}</p>
          <div className="om-fan">
            {Array.from({ length: oppCount }).map((_, i) => (
              <CardFace key={i} faceDown onClick={yourTurn ? () => onDraw(i) : undefined} />
            ))}
            {oppCount === 0 && <span className="om-none">empty</span>}
          </div>
        </section>
      )}

      {reveal && (
        <div className="om-reveal">
          <div className="flip-card">
            <div className="flip-inner">
              <div className="flip-back" />
              <div className="flip-front">
                <CardFace card={reveal.card} />
              </div>
            </div>
          </div>
          <span className={`om-reveal-label ${reveal.paired ? 'pair' : ''}`}>
            {reveal.paired ? 'Matched a pair — discarded' : 'No match — kept'}
          </span>
        </div>
      )}

      <section className="om-side">
        <header className="om-head">
          <span className="om-name">You</span>
          <span className="om-sub">pairs won</span>
        </header>
        <Pairs cards={game.discards[youId] ?? []} />
        <p className="om-prompt">Your hand</p>
        <div className="om-fan">
          {myHand.map((c) => (
            <CardFace key={c.id} card={c} small />
          ))}
          {myHand.length === 0 && <span className="om-none">safe — no cards left</span>}
        </div>
      </section>
    </div>
  );
}
