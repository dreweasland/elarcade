import { useEffect, useRef, useState } from 'react';
import { PublicPlayer, RpsPick, RpsState } from '../../../shared/protocol.ts';
import { sfx } from '../sounds.ts';

const PICKS: Array<{ pick: RpsPick; emoji: string; label: string }> = [
  { pick: 'rock', emoji: '✊', label: 'Rock' },
  { pick: 'paper', emoji: '✋', label: 'Paper' },
  { pick: 'scissors', emoji: '✌️', label: 'Scissors' },
];
const EMOJI: Record<RpsPick, string> = { rock: '✊', paper: '✋', scissors: '✌️' };
const CHANT = ['✊ Rock…', '✋ Paper…', '✌️ Scissors…', '👊 Shoot!'];

export function RpsBoard({
  game,
  players,
  youId,
  canPlay,
  onThrow,
}: {
  game: RpsState;
  players: PublicPlayer[];
  youId: string;
  canPlay: boolean;
  onThrow: (pick: RpsPick) => void;
}) {
  const nameOf = (id: string | null) => players.find((p) => p.id === id)?.name ?? 'Someone';

  const opponentId = game.seating.find((id) => id !== youId) ?? null;
  const youLocked = game.locked[youId];
  const oppLocked = opponentId ? game.locked[opponentId] : false;

  // ----- "Rock, Paper, Scissors, Shoot!" countdown when a round resolves -----
  const [chant, setChant] = useState<number | null>(null);
  const prevRound = useRef(game.round);
  useEffect(() => {
    if (game.round === prevRound.current) return;
    prevRound.current = game.round;
    if (!game.lastResult) return;
    setChant(0);
    const timers = [
      window.setTimeout(() => { setChant(1); sfx.click(); }, 320),
      window.setTimeout(() => { setChant(2); sfx.click(); }, 640),
      window.setTimeout(() => { setChant(3); sfx.place(); }, 960),
      window.setTimeout(() => setChant(null), 1500),
    ];
    sfx.click();
    return () => timers.forEach(clearTimeout);
  }, [game.round, game.lastResult]);

  const result = game.lastResult;
  let resultLine: string | null = null;
  if (result) {
    if (result.winner === 'tie') resultLine = "It's a tie — throw again!";
    else if (result.winner === youId) resultLine = 'You won that round! 🎉';
    else resultLine = `${nameOf(result.winner)} won that round.`;
  }

  const counting = chant !== null;
  const canThrow = canPlay && !youLocked && !game.winner && !counting;

  return (
    <div className="rps-board">
      <div className="rps-scores">
        <span className={`rps-score ${game.winner === youId ? 'win' : ''}`}>
          You {game.scores[youId] ?? 0}
        </span>
        <span className="rps-vs">first to {game.target}</span>
        <span className="rps-score">
          {nameOf(opponentId)} {opponentId ? game.scores[opponentId] ?? 0 : 0}
        </span>
      </div>

      {counting ? (
        <div className="rps-countdown">
          <div className="rps-fists">
            <span className="rps-fist shake">✊</span>
            <span className="rps-fist shake flip">✊</span>
          </div>
          <span className="rps-chant">{CHANT[chant!]}</span>
        </div>
      ) : result ? (
        <div className="rps-reveal">
          <span className="rps-throw pop">{EMOJI[result.picks[youId]] ?? '✊'}</span>
          <span className="rps-mid">{resultLine}</span>
          <span className="rps-throw pop">
            {opponentId ? EMOJI[result.picks[opponentId]] ?? '✊' : '✊'}
          </span>
        </div>
      ) : (
        <p className="rps-status">Round {game.round + 1} — throw to begin!</p>
      )}

      {!game.winner && canPlay && !counting && (
        youLocked ? (
          <p className="rps-status">
            🔒 Locked in! {oppLocked ? 'Revealing…' : `Waiting for ${nameOf(opponentId)}…`}
          </p>
        ) : (
          <div className="rps-buttons">
            {PICKS.map((p) => (
              <button key={p.pick} className="rps-btn" disabled={!canThrow} onClick={() => onThrow(p.pick)}>
                <span className="rps-emoji">{p.emoji}</span>
                <span>{p.label}</span>
              </button>
            ))}
          </div>
        )
      )}

      {!canPlay && !game.winner && !counting && (
        <p className="rps-status">{oppLocked && youLocked ? 'Revealing…' : 'Players are choosing…'}</p>
      )}
    </div>
  );
}
