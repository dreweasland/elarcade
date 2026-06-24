import { useEffect, useState } from 'react';
import { PublicPlayer, ZombieDie, ZombieState } from '../../../shared/protocol.ts';

const FACE: Record<ZombieDie['face'], string> = { brain: '🧠', foot: '👣', shotgun: '💥' };
const FACES: ZombieDie['face'][] = ['brain', 'foot', 'shotgun'];

/** A zombie die that shakes through random faces before settling. */
function ZombieDieRoll({ die, rollKey }: { die: ZombieDie; rollKey: string }) {
  const [face, setFace] = useState<ZombieDie['face']>(die.face);
  const [rolling, setRolling] = useState(false);
  useEffect(() => {
    setRolling(true);
    const iv = window.setInterval(() => setFace(FACES[Math.floor(Math.random() * 3)]), 80);
    const to = window.setTimeout(() => {
      clearInterval(iv);
      setFace(die.face);
      setRolling(false);
    }, 520);
    return () => {
      clearInterval(iv);
      clearTimeout(to);
    };
  }, [rollKey]); // eslint-disable-line react-hooks/exhaustive-deps
  return <span className={`zd-die ${die.color} ${rolling ? 'rolling' : ''}`}>{FACE[face]}</span>;
}

export function ZombieBoard({
  game,
  players,
  youId,
  canPlay,
  onRoll,
  onBank,
}: {
  game: ZombieState;
  players: PublicPlayer[];
  youId: string;
  canPlay: boolean;
  onRoll: () => void;
  onBank: () => void;
}) {
  const myTurn = canPlay && game.turn === youId && !game.winner;
  const playerById = (id: string) => players.find((p) => p.id === id);

  return (
    <div className="zd-table">
      <div className="zd-scores">
        {game.seating.map((id) => {
          const p = playerById(id);
          return (
            <div key={id} className={`zd-score ${game.turn === id ? 'turn' : ''} ${id === youId ? 'you' : ''}`}>
              <span className="zd-score-avatar">{p?.avatar}</span>
              <span className="zd-score-name">{p?.name}</span>
              <span className="zd-score-num">🧠 {game.scores[id] ?? 0}</span>
            </div>
          );
        })}
      </div>
      <p className="zd-target">First to {game.target} brains wins</p>

      <div className="zd-status">
        <span>
          🧠 Brains <b>{game.brains}</b>
        </span>
        <span className={game.shotguns >= 2 ? 'danger' : ''}>
          💥 Shotguns <b>{game.shotguns}</b>/3
        </span>
        <span>🎲 Cup {game.cupCount}</span>
      </div>

      <div className="zd-rolled">
        {game.rolled ? (
          game.rolled.map((d, i) => (
            <ZombieDieRoll
              key={i}
              die={d}
              rollKey={`${game.rolled!.map((x) => x.color + x.face).join(',')}-${i}`}
            />
          ))
        ) : (
          <span className="zd-cup-hint">Roll 3 dice from the cup!</span>
        )}
      </div>

      <div className="zd-note">
        {game.busted ? (
          <span className="pig-bust-text">💥💥💥 Blasted! Three shotguns — turn lost!</span>
        ) : game.kept.length > 0 ? (
          <span>
            Carrying {game.kept.length} runner{game.kept.length > 1 ? 's' : ''} 👣 — roll again or bank!
          </span>
        ) : (
          <span className="zd-dim">Eat brains, but 3 shotguns and you lose them all.</span>
        )}
      </div>

      {canPlay && (
        <div className="room-actions">
          <button className="btn primary big" disabled={!myTurn} onClick={onRoll}>
            🎲 Roll
          </button>
          <button className="btn ghost" disabled={!myTurn || game.brains === 0} onClick={onBank}>
            🧠 Bank ({game.brains})
          </button>
        </div>
      )}
    </div>
  );
}
