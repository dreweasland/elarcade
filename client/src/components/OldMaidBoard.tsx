import { useEffect, useRef, useState } from 'react';
import { OldMaidState, PlayingCard, PublicPlayer } from '../../../shared/protocol.ts';
import { sfx } from '../sounds.ts';
import { CardFace } from './Card.tsx';

const REVEAL_MS = 1500;

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
  const avatarOf = (id: string | null) => players.find((p) => p.id === id)?.avatar ?? '👾';

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
        <div className="om-opponent">
          <span className="om-who">
            {avatarOf(opponentId)} {nameOf(opponentId)} · 👯 {game.pairs[opponentId] ?? 0} pairs
          </span>
          {yourTurn ? (
            <p className="om-prompt">👉 Pick a card from their hand:</p>
          ) : (
            <p className="om-prompt dim">Their hand ({oppCount})</p>
          )}
          <div className="om-fan">
            {Array.from({ length: oppCount }).map((_, i) => (
              <CardFace key={i} faceDown onClick={yourTurn ? () => onDraw(i) : undefined} />
            ))}
            {oppCount === 0 && <span className="gf-empty">No cards left!</span>}
          </div>
        </div>
      )}

      {reveal && (
        <div className="om-reveal">
          <div className="flip-card">
            <div className="flip-inner">
              <div className="flip-back">🐠</div>
              <div className="flip-front">
                <CardFace card={reveal.card} />
              </div>
            </div>
          </div>
          <span className={`om-reveal-label ${reveal.paired ? 'pair' : ''}`}>
            {reveal.paired ? 'Pair! 💞 Discarded' : 'No match — kept 🫣'}
          </span>
        </div>
      )}

      <div className="om-you">
        <span className="om-who">Your hand · 👯 {game.pairs[youId] ?? 0} pairs</span>
        <div className="om-fan">
          {myHand.map((c) => (
            <CardFace key={c.id} card={c} small />
          ))}
          {myHand.length === 0 && <span className="gf-empty">Safe — no cards! 🎉</span>}
        </div>
      </div>
    </div>
  );
}
