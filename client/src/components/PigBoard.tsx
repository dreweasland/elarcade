import { PigState, PublicPlayer } from '../../../shared/protocol.ts';
import { RollingDie, useDiceReveal } from './RollingDie.tsx';

export function PigBoard({
  game,
  players,
  youId,
  canPlay,
  onRoll,
  onHold,
}: {
  game: PigState;
  players: PublicPlayer[];
  youId: string;
  canPlay: boolean;
  onRoll: () => void;
  onHold: () => void;
}) {
  const playerById = (id: string) => players.find((p) => p.id === id);
  const dieCount = game.lastRoll?.length ?? game.diceCount;
  const rolling = useDiceReveal(game.lastRoll ? String(game.moves) : null);
  // Hold the turn indicator on whoever just rolled until the dice settle, so
  // a bust shows before the turn appears to pass.
  const shownTurn = rolling && game.lastRoller ? game.lastRoller : game.turn;
  const myTurn = canPlay && game.turn === youId && !game.winner && !rolling;

  const turnP = playerById(shownTurn ?? '');
  const turnText = game.winner
    ? ''
    : !canPlay
      ? `${turnP?.avatar ?? ''} ${turnP?.name ?? ''}'s turn`
      : shownTurn === youId
        ? 'Your turn!'
        : `${turnP?.avatar ?? ''} ${turnP?.name ?? 'Opponent'}'s turn`;

  return (
    <div className="pig-table">
      {turnText && <p className="pig-turn-banner">{turnText}</p>}
      <div className="pig-scores">
        {game.seating.map((id) => {
          const p = playerById(id);
          return (
            <div key={id} className={`pig-score ${shownTurn === id ? 'turn' : ''} ${id === youId ? 'you' : ''}`}>
              <span className="pig-score-avatar">{p?.avatar}</span>
              <span className="pig-score-name">{p?.name}</span>
              <span className="pig-score-num">{game.scores[id] ?? 0}</span>
            </div>
          );
        })}
      </div>
      <p className="pig-target">
        First to {game.target}
        {game.diceCount === 2 && ' · 2 dice — double 1s wipe your score!'}
      </p>

      <div className={`pig-dice ${!rolling && game.busted ? 'busted' : ''} ${!rolling && game.wipedOut ? 'wiped' : ''}`}>
        {Array.from({ length: dieCount }, (_, i) => (
          <RollingDie
            key={i}
            className="pig-die"
            value={game.lastRoll ? game.lastRoll[i] : null}
            rollKey={`${game.moves}-${i}`}
          />
        ))}
      </div>

      <div className="pig-turn-total">
        {rolling ? (
          <span className="pig-rolling">Rolling…</span>
        ) : game.wipedOut ? (
          <span className="pig-bust-text">💀 Snake eyes! Whole score wiped!</span>
        ) : game.busted ? (
          <span className="pig-bust-text">Busted! Rolled a 1 — turn lost</span>
        ) : (
          <>
            This turn: <b>{game.turnTotal}</b>
          </>
        )}
      </div>

      {canPlay && (
        <div className="room-actions">
          <button className="btn primary big" disabled={!myTurn} onClick={onRoll}>
            🎲 Roll
          </button>
          <button className="btn ghost" disabled={!myTurn || game.turnTotal === 0} onClick={onHold}>
            ✋ Hold ({game.turnTotal})
          </button>
        </div>
      )}
    </div>
  );
}
