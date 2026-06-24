import { CHUTES_BOARD, ChutesState, PublicPlayer } from '../../../shared/protocol.ts';

export function ChutesBoard({
  game,
  players,
  youId,
  canPlay,
  onRoll,
}: {
  game: ChutesState;
  players: PublicPlayer[];
  youId: string;
  canPlay: boolean;
  onRoll: () => void;
}) {
  const myTurn = canPlay && game.turn === youId && !game.winner;

  // Build display rows top (100) to bottom (1), boustrophedon.
  const rows: number[][] = [];
  for (let r = 9; r >= 0; r--) {
    const base = r * 10;
    const row = Array.from({ length: 10 }, (_, i) => base + i + 1);
    if (r % 2 === 1) row.reverse();
    rows.push(row);
  }

  const tokensOn = (sq: number) => players.filter((p) => (game.positions[p.id] ?? 0) === sq);
  const atStart = players.filter((p) => (game.positions[p.id] ?? 0) === 0);

  const mover = players.find((p) => p.id === (game.winner ?? null));
  let feedback = '';
  if (game.lastRoll) {
    if (game.lastVia === 'ladder') feedback = '🪜 Up a ladder!';
    else if (game.lastVia === 'chute') feedback = '🛝 Down a chute!';
  }

  return (
    <div className="ch-table">
      <div className="ch-grid">
        {rows.flat().map((sq) => {
          const dest = CHUTES_BOARD[sq];
          const kind = dest === undefined ? '' : dest > sq ? 'ladder' : 'chute';
          const here = tokensOn(sq);
          return (
            <div key={sq} className={`ch-cell ${kind}`}>
              <span className="ch-num">{sq}</span>
              {kind === 'ladder' && <span className="ch-icon">🪜</span>}
              {kind === 'chute' && <span className="ch-icon">🛝</span>}
              {here.length > 0 && (
                <span className="ch-tokens">
                  {here.map((p) => (
                    <span key={p.id} className={p.id === youId ? 'me' : ''}>
                      {p.avatar}
                    </span>
                  ))}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {atStart.length > 0 && (
        <div className="ch-start">
          Start: {atStart.map((p) => (<span key={p.id}>{p.avatar}</span>))}
        </div>
      )}

      <div className="ch-status">
        {game.lastRoll ? (
          <>
            🎲 <b>{game.lastRoll}</b> {feedback}
          </>
        ) : (
          'Roll to move!'
        )}
      </div>

      {game.winner && mover && <p className="ch-win">{mover.avatar} reached 100! 🎉</p>}

      {canPlay && (
        <div className="room-actions">
          <button className="btn primary big" disabled={!myTurn} onClick={onRoll}>
            🎲 Roll
          </button>
        </div>
      )}
    </div>
  );
}
