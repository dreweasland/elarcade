import { CantStopState, PublicPlayer } from '../../../shared/protocol.ts';
import { RollingDie, useDiceReveal } from './RollingDie.tsx';

const SEAT_COLORS = ['#ff3db5', '#19e6ff', '#4dffa6', '#ffe14d'];
const COLUMNS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

function optionLabel(cols: number[]): string {
  if (cols.length === 2 && cols[0] === cols[1]) return `${cols[0]} ×2`;
  if (cols.length === 2) return `${cols[0]} & ${cols[1]}`;
  return `${cols[0]}`;
}

export function CantStopBoard({
  game,
  players,
  youId,
  canPlay,
  onRoll,
  onChoose,
  onStop,
}: {
  game: CantStopState;
  players: PublicPlayer[];
  youId: string;
  canPlay: boolean;
  onRoll: () => void;
  onChoose: (index: number) => void;
  onStop: () => void;
}) {
  const colorOf = (id: string) => SEAT_COLORS[game.seating.indexOf(id) % SEAT_COLORS.length];
  const hasRunners = Object.keys(game.runners).length > 0;
  const rolling = useDiceReveal(game.dice ? game.dice.join(',') : null);
  // Hold the turn indicator on whoever just rolled until the dice settle, so a
  // bust shows before the turn appears to pass.
  const shownTurn = rolling && game.lastRoller ? game.lastRoller : game.turn;
  // Action buttons below are already gated by the inner `rolling` check, so a
  // bust reveal can't be clicked through.
  const myTurn = canPlay && game.turn === youId && !game.winner;

  const turnP = players.find((pl) => pl.id === (shownTurn ?? ''));
  const turnText = game.winner
    ? ''
    : canPlay && shownTurn === youId
      ? 'Your turn!'
      : `${turnP?.avatar ?? ''} ${turnP?.name ?? 'Opponent'}'s turn`;

  return (
    <div className="cs-table">
      {turnText && <p className="pig-turn-banner">{turnText}</p>}
      <div className="cs-legend">
        {game.seating.map((id) => {
          const p = players.find((pl) => pl.id === id);
          const claims = Object.values(game.claimed).filter((c) => c === id).length;
          return (
            <span key={id} className={`cs-leg ${shownTurn === id ? 'turn' : ''}`}>
              <span className="cs-dot" style={{ background: colorOf(id) }} />
              {p?.avatar} {claims}/{game.claimsToWin} 👑
            </span>
          );
        })}
      </div>

      <div className="cs-board">
        {COLUMNS.map((col) => {
          const h = game.heights[col];
          const claimer = game.claimed[col];
          const runnerH = game.runners[col];
          return (
            <div key={col} className={`cs-col ${claimer ? 'claimed' : ''}`}>
              <span className="cs-col-num" style={claimer ? { color: colorOf(claimer) } : undefined}>
                {claimer ? '👑' : col}
              </span>
              <div className="cs-track">
                {!claimer &&
                  game.seating.map((id, idx) => {
                    const prog = game.progress[id]?.[col] ?? 0;
                    if (prog <= 0) return null;
                    return (
                      <span
                        key={id}
                        className="cs-marker"
                        style={{
                          background: colorOf(id),
                          bottom: `${(prog / h) * 100}%`,
                          left: `${12 + idx * 20}%`,
                        }}
                      />
                    );
                  })}
                {!claimer && runnerH !== undefined && (
                  <span className="cs-runner" style={{ bottom: `${(runnerH / h) * 100}%` }} />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {game.dice && (
        <div className="cs-dice">
          {game.dice.map((d, i) => (
            <RollingDie key={i} className="cs-die" value={d} rollKey={`${game.dice!.join(',')}-${i}`} />
          ))}
        </div>
      )}

      {!rolling && game.busted && (
        <p className="pig-bust-text">💥 Busted! No legal move — turn lost.</p>
      )}

      {canPlay && myTurn && (
        <>
          {rolling ? (
            <p className="cs-prompt">🎲 Rolling…</p>
          ) : game.phase === 'choosing' && game.options ? (
            <div className="cs-options">
              <span className="cs-prompt">Pick your advance:</span>
              {game.options.map((o, i) => (
                <button key={i} className="btn primary" onClick={() => onChoose(i)}>
                  {optionLabel(o.cols)}
                </button>
              ))}
            </div>
          ) : (
            <div className="room-actions">
              <button className="btn primary big" onClick={onRoll}>
                🎲 Roll
              </button>
              <button className="btn ghost" disabled={!hasRunners} onClick={onStop}>
                ✋ Stop &amp; bank
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
