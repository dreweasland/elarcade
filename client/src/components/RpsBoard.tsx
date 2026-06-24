import { PublicPlayer, RpsPick, RpsState } from '../../../shared/protocol.ts';

const PICKS: Array<{ pick: RpsPick; emoji: string; label: string }> = [
  { pick: 'rock', emoji: '✊', label: 'Rock' },
  { pick: 'paper', emoji: '✋', label: 'Paper' },
  { pick: 'scissors', emoji: '✌️', label: 'Scissors' },
];
const EMOJI: Record<RpsPick, string> = { rock: '✊', paper: '✋', scissors: '✌️' };

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

  const result = game.lastResult;
  let resultLine: string | null = null;
  if (result) {
    if (result.winner === 'tie') resultLine = "It's a tie — throw again!";
    else if (result.winner === youId) resultLine = 'You won that round! 🎉';
    else resultLine = `${nameOf(result.winner)} won that round.`;
  }

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

      {result && (
        <div className="rps-reveal">
          <span className="rps-throw">{opponentId ? EMOJI[result.picks[youId]] : ''}</span>
          <span className="rps-mid">{resultLine}</span>
          <span className="rps-throw">{opponentId ? EMOJI[result.picks[opponentId]] : ''}</span>
        </div>
      )}

      {!game.winner && canPlay && (
        youLocked ? (
          <p className="rps-status">
            🔒 Locked in! {oppLocked ? 'Revealing…' : `Waiting for ${nameOf(opponentId)}…`}
          </p>
        ) : (
          <>
            <p className="rps-status">Round {game.round + 1} — make your throw!</p>
            <div className="rps-buttons">
              {PICKS.map((p) => (
                <button key={p.pick} className="rps-btn" onClick={() => onThrow(p.pick)}>
                  <span className="rps-emoji">{p.emoji}</span>
                  <span>{p.label}</span>
                </button>
              ))}
            </div>
          </>
        )
      )}

      {!canPlay && !game.winner && (
        <p className="rps-status">
          {oppLocked && youLocked ? 'Revealing…' : 'Players are choosing…'}
        </p>
      )}
    </div>
  );
}
