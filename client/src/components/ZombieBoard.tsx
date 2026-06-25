import { useEffect, useState } from 'react';
import { PublicPlayer, ZombieDie, ZombieState } from '../../../shared/protocol.ts';
import { useDiceReveal } from './RollingDie.tsx';

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
  const playerById = (id: string) => players.find((p) => p.id === id);
  const rolling = useDiceReveal(game.rolled ? String(game.moves) : null, 600);
  // Hold the turn indicator on whoever just rolled until the dice settle, so a
  // bust shows before the turn appears to pass.
  const shownTurn = rolling && game.lastRoller ? game.lastRoller : game.turn;
  const myTurn = canPlay && game.turn === youId && !game.winner && !rolling;

  const turnP = playerById(shownTurn ?? '');
  const turnText = game.winner
    ? ''
    : canPlay && shownTurn === youId
      ? 'Your turn!'
      : `${turnP?.avatar ?? ''} ${turnP?.name ?? 'Opponent'}'s turn`;

  return (
    <div className="zd-table">
      {turnText && <p className="pig-turn-banner">{turnText}</p>}
      <div className="zd-scores">
        {game.seating.map((id) => {
          const p = playerById(id);
          return (
            <div key={id} className={`zd-score ${shownTurn === id ? 'turn' : ''} ${id === youId ? 'you' : ''}`}>
              <span className="zd-score-avatar">{p?.avatar}</span>
              <span className="zd-score-name">{p?.name}</span>
              <span className="zd-score-num">{game.scores[id] ?? 0}</span>
            </div>
          );
        })}
      </div>
      <p className="zd-target">First to {game.target} brains wins</p>

      <div className="zd-status">
        {rolling ? (
          <span className="zd-dim">Rolling…</span>
        ) : (
          <>
            <span>
              Brains <b>{game.brains}</b>
            </span>
            <span className={game.shotguns >= 2 ? 'danger' : ''}>
              Shotguns <b>{game.shotguns}</b>/3
            </span>
            <span>Cup <b>{game.cupCount}</b></span>
          </>
        )}
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
        {rolling ? null : game.busted ? (
          <span className="pig-bust-text">Blasted! Three shotguns — turn lost!</span>
        ) : game.kept.length > 0 ? (
          <span>
            Carrying {game.kept.length} runner{game.kept.length > 1 ? 's' : ''} — roll again or bank!
          </span>
        ) : (
          <span className="zd-dim">Eat brains, but 3 shotguns and you lose them all.</span>
        )}
      </div>

      {canPlay && (
        <div className="room-actions">
          <button className="btn primary big" disabled={!myTurn} onClick={onRoll}>
            Roll
          </button>
          <button className="btn ghost" disabled={!myTurn || game.brains === 0} onClick={onBank}>
            Bank ({game.brains})
          </button>
        </div>
      )}
    </div>
  );
}
