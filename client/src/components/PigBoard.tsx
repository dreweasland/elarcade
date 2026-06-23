import { PigState, PublicPlayer } from '../../../shared/protocol.ts';

const DICE = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

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
  const myTurn = canPlay && game.turn === youId && !game.winner;
  const playerById = (id: string) => players.find((p) => p.id === id);

  return (
    <div className="pig-table">
      <div className="pig-scores">
        {game.seating.map((id) => {
          const p = playerById(id);
          return (
            <div key={id} className={`pig-score ${game.turn === id ? 'turn' : ''} ${id === youId ? 'you' : ''}`}>
              <span className="pig-score-avatar">{p?.avatar}</span>
              <span className="pig-score-name">{p?.name}</span>
              <span className="pig-score-num">{game.scores[id] ?? 0}</span>
            </div>
          );
        })}
      </div>
      <p className="pig-target">First to {game.target} wins</p>

      <div className={`pig-die ${game.busted ? 'busted' : ''}`}>
        {game.busted ? '💥' : game.lastRoll ? DICE[game.lastRoll] : '🎲'}
      </div>

      <div className="pig-turn-total">
        {game.busted ? (
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
