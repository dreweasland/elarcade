import { useEffect, useRef, useState } from 'react';
import { GAMES } from '../../../shared/protocol.ts';
import { useArcade } from '../useArcade.ts';
import { sfx } from '../sounds.ts';
import { TicTacToeBoard } from './TicTacToeBoard.tsx';
import { ConnectFourBoard } from './ConnectFourBoard.tsx';
import { BattleshipBoard } from './BattleshipBoard.tsx';

export function RoomScreen() {
  const { state, arcade } = useArcade();
  const room = state.room;
  const prev = useRef({ status: '', progress: 0, hits: 0, hadWinner: false });

  // React to game-state transitions with sound effects.
  useEffect(() => {
    if (!room) return;
    const g = room.gameState;
    const winner = g?.winner ?? null;

    // A monotonically increasing count of moves, per game, drives the move sound.
    let progress = 0;
    let hits = 0;
    if (g?.kind === 'ticTacToe' || g?.kind === 'connectFour') {
      progress = g.board.filter(Boolean).length;
    } else if (g?.kind === 'battleship') {
      for (const b of Object.values(g.boards)) {
        progress += b.shots.length;
        hits += b.hits.length;
      }
    }

    if (room.status === 'playing' && prev.current.status !== 'playing') sfx.join();

    if (progress > prev.current.progress && !winner) {
      if (g?.kind === 'battleship') {
        if (g.lastSunk) sfx.sunk();
        else if (hits > prev.current.hits) sfx.hit();
        else sfx.splash();
      } else {
        sfx.place();
      }
    }

    if (winner && !prev.current.hadWinner) {
      if (winner === 'draw') sfx.draw();
      else if (winner === state.youId) sfx.win();
      else sfx.lose();
    }

    prev.current = { status: room.status, progress, hits, hadWinner: !!winner };
  }, [room, state.youId]);

  if (!room) {
    return <div className="room-screen connecting-msg">Connecting…</div>;
  }

  const info = GAMES[room.game];
  const you = room.players.find((p) => p.id === state.youId);
  const isSpectator = state.role === 'spectator';
  const g = room.gameState;

  let banner = '';
  if (room.status === 'waiting') {
    banner = 'Waiting for a friend to join…';
  } else if (room.status === 'playing' && g && g.kind === 'battleship' && g.phase === 'placing') {
    banner = isSpectator
      ? 'Fleets are being placed…'
      : g.ready.includes(state.youId)
        ? 'Waiting for opponent…'
        : 'Place your ships!';
  } else if (room.status === 'playing' && g) {
    if (isSpectator) {
      const t = room.players.find((p) => p.id === g.turn);
      banner = `${t?.name ?? 'Someone'}'s turn`;
    } else {
      banner = g.turn === state.youId ? 'Your turn!' : `${opponentName(room, state.youId)} is thinking…`;
    }
  } else if (room.status === 'finished' && g) {
    if (g.winner === 'draw') banner = "It's a draw! 🤝";
    else if (g.winner === state.youId) banner = 'You win! 🎉';
    else banner = `${room.players.find((p) => p.id === g.winner)?.name ?? 'Player'} wins! 🏆`;
  }

  const youReady = room.rematchReady.includes(state.youId);

  let sunkNote = '';
  if (g && g.kind === 'battleship' && g.lastSunk && !isSpectator) {
    sunkNote =
      g.lastSunk.by === state.youId
        ? `💥 You sank their ${g.lastSunk.ship}!`
        : `🌊 Your ${g.lastSunk.ship} was sunk!`;
  }

  return (
    <div className="room-screen">
      <RoomHeader code={room.code} game={info.name} spectators={room.spectators} />

      <Scoreboard room={room} youId={state.youId} />

      <p className={`banner ${room.status}`}>{banner}</p>
      {sunkNote && <p className="sunk-note">{sunkNote}</p>}

      {g && g.kind === 'ticTacToe' ? (
        <TicTacToeBoard
          game={g}
          players={room.players}
          youId={state.youId}
          canPlay={!isSpectator}
          onPlay={(cell) => arcade.move({ cell })}
        />
      ) : g && g.kind === 'connectFour' ? (
        <ConnectFourBoard
          game={g}
          players={room.players}
          youId={state.youId}
          canPlay={!isSpectator}
          onPlay={(column) => arcade.move({ column })}
        />
      ) : g && g.kind === 'battleship' ? (
        <BattleshipBoard
          game={g}
          players={room.players}
          youId={state.youId}
          canPlay={!isSpectator}
          onPlace={(ships) => arcade.move({ action: 'place', ships })}
          onFire={(cell) => arcade.move({ action: 'fire', cell })}
        />
      ) : (
        <div className="board-placeholder">
          <span className="big-icon">{info.icon}</span>
          <p>Share the code below so a friend can join!</p>
        </div>
      )}

      <div className="room-actions">
        {room.status === 'finished' && !isSpectator && (
          <button className="btn primary big" disabled={youReady} onClick={() => arcade.rematch()}>
            {youReady ? 'Ready! Waiting…' : 'Play again ↻'}
          </button>
        )}
        {isSpectator && <span className="spectator-tag">👀 Spectating</span>}
        <button className="btn ghost" onClick={() => arcade.leave()}>
          Leave
        </button>
      </div>
    </div>
  );
}

function opponentName(
  room: NonNullable<ReturnType<typeof useArcade>['state']['room']>,
  youId: string,
): string {
  return room.players.find((p) => p.id !== youId)?.name ?? 'Opponent';
}

function RoomHeader({
  code,
  game,
  spectators,
}: {
  code: string;
  game: string;
  spectators: number;
}) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = `${location.origin}?code=${code}`;
    sfx.click();
    if (navigator.share) {
      try {
        await navigator.share({ title: 'EL Arcade', text: `Join my game! Code: ${code}`, url });
        return;
      } catch {
        /* fall through to clipboard */
      }
    }
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="room-header">
      <span className="room-game">{game}</span>
      <button className="code-chip" onClick={share} title="Copy / share code">
        <span className="code-label">CODE</span>
        <span className="code-value">{code}</span>
        <span className="code-action">{copied ? '✓ Copied' : '📋 Share'}</span>
      </button>
      {spectators > 0 && <span className="spectator-count">👀 {spectators}</span>}
    </div>
  );
}

function Scoreboard({
  room,
  youId,
}: {
  room: NonNullable<ReturnType<typeof useArcade>['state']['room']>;
  youId: string;
}) {
  const slots = [...room.players];
  return (
    <div className="scoreboard">
      {slots.map((p) => (
        <div key={p.id} className={`score-card ${p.id === youId ? 'you' : ''} ${p.connected ? '' : 'offline'}`}>
          <span className="score-avatar">{p.avatar}</span>
          <span className="score-name">
            {p.name}
            {p.id === youId ? ' (you)' : ''}
            {!p.connected ? ' …' : ''}
          </span>
          <span className="score-num">{room.scores[p.id] ?? 0}</span>
        </div>
      ))}
      {room.players.length < 2 && (
        <div className="score-card empty">
          <span className="score-avatar">＋</span>
          <span className="score-name">Open seat</span>
          <span className="score-num">–</span>
        </div>
      )}
    </div>
  );
}
