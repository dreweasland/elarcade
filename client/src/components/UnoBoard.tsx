import { useState } from 'react';
import { PublicPlayer, UnoCard, UnoColor, UnoState } from '../../../shared/protocol.ts';
import { sfx } from '../sounds.ts';

const PICKABLE: UnoColor[] = ['red', 'yellow', 'green', 'blue'];

function isPlayable(card: UnoCard, top: UnoCard, topColor: UnoColor): boolean {
  if (card.kind === 'wild' || card.kind === 'wild4') return true;
  if (card.color === topColor) return true;
  if (card.kind === 'number' && top.kind === 'number' && card.value === top.value) return true;
  if (card.kind !== 'number' && card.kind === top.kind) return true;
  return false;
}

export function UnoBoard({
  game,
  players,
  youId,
  canPlay,
  onPlay,
  onDraw,
  onPass,
}: {
  game: UnoState;
  players: PublicPlayer[];
  youId: string;
  canPlay: boolean;
  onPlay: (cardId: string, chosenColor?: UnoColor, uno?: boolean) => void;
  onDraw: () => void;
  onPass: () => void;
}) {
  const [picker, setPicker] = useState<string | null>(null);
  const [unoArmed, setUnoArmed] = useState(false);

  const top = game.discard[0];
  const myHand = game.hands[youId] ?? [];
  const pending = game.pendingPlay?.player === youId ? game.pendingPlay : null;
  const myTurn = canPlay && game.turn === youId && !game.winner;
  const playerById = (id: string) => players.find((p) => p.id === id);

  // Opponents in seating order, starting after me.
  const order = game.seating;
  const opponents = order.filter((id) => id !== youId);

  function handlePlay(card: UnoCard) {
    if (!myTurn) return;
    if (pending && card.id !== pending.cardId) return;
    if (card.kind === 'wild' || card.kind === 'wild4') {
      setPicker(card.id);
      return;
    }
    sfx.place();
    onPlay(card.id, undefined, unoArmed);
    setUnoArmed(false);
  }

  function chooseColor(color: UnoColor) {
    if (!picker) return;
    sfx.place();
    onPlay(picker, color, unoArmed);
    setPicker(null);
    setUnoArmed(false);
  }

  return (
    <div className="uno-table">
      {/* Opponents */}
      <div className="uno-opponents">
        {opponents.map((id) => {
          const p = playerById(id);
          const count = game.hands[id]?.length ?? 0;
          return (
            <div key={id} className={`uno-opp ${game.turn === id ? 'turn' : ''}`}>
              <div className="uno-opp-cards">
                {Array.from({ length: Math.min(count, 7) }, (_, i) => (
                  <span key={i} className="uno-card back mini" style={{ marginLeft: i ? -16 : 0 }} />
                ))}
              </div>
              <div className="uno-opp-name">
                <span>{p?.avatar}</span> {p?.name}
                <b className="uno-count">{count}</b>
                {count === 1 && <span className="uno-badge">UNO!</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Center: draw pile + discard */}
      <div className="uno-center">
        <button
          className={`uno-draw-pile ${myTurn && !pending ? 'active' : ''}`}
          disabled={!myTurn || !!pending}
          onClick={() => {
            sfx.place();
            onDraw();
            setUnoArmed(false);
          }}
          aria-label="Draw a card"
        >
          <span className="uno-card back" />
          <span className="uno-pile-count">{game.drawPileCount}</span>
        </button>

        <div className="uno-dir" title="Play direction">
          {game.direction === 1 ? '↻' : '↺'}
        </div>

        <div className={`uno-discard color-${game.topColor}`}>
          <CardFace card={top} activeColor={game.topColor} />
        </div>
      </div>

      {pending && (
        <div className="uno-pending">
          You drew a card — play it or
          <button className="btn ghost small" onClick={() => { sfx.click(); onPass(); }}>
            Pass
          </button>
        </div>
      )}

      {/* Your hand */}
      {!canPlay ? (
        <p className="bs-status">Spectating</p>
      ) : (
        <>
          <div className="uno-hand-label">
            Your hand
            {myTurn && myHand.length === 2 && (
              <button
                className={`uno-call ${unoArmed ? 'armed' : ''}`}
                onClick={() => {
                  setUnoArmed((v) => !v);
                  sfx.click();
                }}
              >
                {unoArmed ? 'UNO armed' : 'Tap UNO!'}
              </button>
            )}
          </div>
          <div className="uno-hand">
            {myHand.map((card) => {
              const playable = myTurn && (!pending || card.id === pending.cardId) && isPlayable(card, top, game.topColor);
              return (
                <button
                  key={card.id}
                  className={`uno-card-btn ${playable ? 'playable' : 'dim'}`}
                  disabled={!playable}
                  onClick={() => handlePlay(card)}
                >
                  <CardFace card={card} activeColor={game.topColor} />
                </button>
              );
            })}
          </div>
          <div className="room-actions">
            <button className="btn ghost" disabled={!myTurn || !!pending} onClick={() => { sfx.place(); onDraw(); setUnoArmed(false); }}>
              Draw a card
            </button>
          </div>
        </>
      )}

      {/* Wild color picker */}
      {picker && (
        <div className="uno-picker-overlay" onClick={() => setPicker(null)}>
          <div className="uno-picker" onClick={(e) => e.stopPropagation()}>
            <p>Pick a color</p>
            <div className="uno-picker-colors">
              {PICKABLE.map((c) => (
                <button key={c} className={`uno-swatch color-${c}`} onClick={() => chooseColor(c)} aria-label={c} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CardFace({ card, activeColor }: { card: UnoCard; activeColor: UnoColor }) {
  if (card.kind === 'back') return <span className="uno-card back" />;

  const label =
    card.kind === 'number'
      ? String(card.value)
      : card.kind === 'skip'
        ? '⦸'
        : card.kind === 'reverse'
          ? '⇄'
          : card.kind === 'draw2'
            ? '+2'
            : card.kind === 'wild4'
              ? '+4'
              : '★';

  const colorClass = card.color === 'wild' ? `wild active-${activeColor}` : `color-${card.color}`;
  return (
    <span className={`uno-card ${colorClass}`}>
      <span className="uno-corner tl">{label}</span>
      <span className="uno-glyph">{label}</span>
      <span className="uno-corner br">{label}</span>
    </span>
  );
}
