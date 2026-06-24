import { OldMaidState, PublicPlayer, SUIT_EMOJI } from '../../../shared/protocol.ts';
import { CardFace } from './Card.tsx';

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
  const yourTurn = canPlay && game.turn === youId;

  const drawNote =
    game.lastDrawn &&
    `Last draw: ${game.lastDrawn.rank}${SUIT_EMOJI[game.lastDrawn.suit]} — ${
      game.lastPaired ? 'paired up! ✅' : 'no match'
    }`;

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

      {drawNote && <p className="om-draw">{drawNote}</p>}

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
