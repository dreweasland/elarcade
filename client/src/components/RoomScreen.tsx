import { useEffect, useRef, useState } from 'react';
import { GAMES, GameOptions } from '../../../shared/protocol.ts';
import { useArcade } from '../useArcade.ts';
import { sfx } from '../sounds.ts';
import { TicTacToeBoard } from './TicTacToeBoard.tsx';
import { ConnectFourBoard } from './ConnectFourBoard.tsx';
import { BattleshipBoard } from './BattleshipBoard.tsx';
import { UnoBoard } from './UnoBoard.tsx';
import { MemoryBoard } from './MemoryBoard.tsx';

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
    } else if (g?.kind === 'uno' || g?.kind === 'memory') {
      progress = g.moves;
    }

    if (room.status === 'playing' && prev.current.status !== 'playing') sfx.join();

    if (progress > prev.current.progress && !winner) {
      if (g?.kind === 'battleship') {
        if (g.lastSunk) sfx.sunk();
        else if (hits > prev.current.hits) sfx.hit();
        else sfx.splash();
      } else if (g?.kind === 'memory') {
        if (g.lastResult === 'match') sfx.join();
        else sfx.place();
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
    if (!isSpectator && g.turn === state.youId) {
      banner = 'Your turn!';
    } else {
      const t = room.players.find((p) => p.id === g.turn);
      banner = t ? `${t.avatar} ${t.name}'s turn` : 'Waiting…';
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

  // UNO action log — resolve {playerId} tokens to names.
  let actionNote = '';
  if (g && g.kind === 'uno' && g.lastAction) {
    actionNote = g.lastAction.replace(/\{([^}]+)\}/g, (_, id) => {
      const p = room.players.find((pl) => pl.id === id);
      return p ? p.name : 'Someone';
    });
  } else if (g && g.kind === 'memory' && g.lastResult && room.status === 'playing') {
    const cur = room.players.find((p) => p.id === g.turn);
    actionNote =
      g.lastResult === 'match'
        ? '✨ Match! Go again'
        : `❌ No match — ${cur ? `${cur.name}'s turn` : 'next player'}`;
  }

  return (
    <div className="room-screen">
      <RoomHeader code={room.code} game={info.name} spectators={room.spectators} />

      <Scoreboard room={room} youId={state.youId} />

      <p className={`banner ${room.status}`}>{banner}</p>
      {sunkNote && <p className="sunk-note">{sunkNote}</p>}
      {actionNote && <p className="action-note">{actionNote}</p>}

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
      ) : g && g.kind === 'uno' ? (
        <UnoBoard
          game={g}
          players={room.players}
          youId={state.youId}
          canPlay={!isSpectator}
          onPlay={(cardId, chosenColor, uno) => arcade.move({ action: 'play', cardId, chosenColor, uno })}
          onDraw={() => arcade.move({ action: 'draw' })}
          onPass={() => arcade.move({ action: 'pass' })}
        />
      ) : g && g.kind === 'memory' ? (
        <MemoryBoard
          game={g}
          players={room.players}
          youId={state.youId}
          canPlay={!isSpectator}
          onFlip={(index) => arcade.move({ action: 'flip', index })}
        />
      ) : (
        <div className="board-placeholder">
          <span className="big-icon">{info.icon}</span>
          <WaitingLobby room={room} youId={state.youId} onStart={(options) => arcade.startGame(options)} />
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

const MEMORY_SIZES: Array<{ key: 'small' | 'medium' | 'large'; label: string; sub: string }> = [
  { key: 'small', label: 'Small', sub: '4×4 · 8 pairs' },
  { key: 'medium', label: 'Medium', sub: '4×6 · 12 pairs' },
  { key: 'large', label: 'Large', sub: '6×6 · 18 pairs' },
];

/** Lobby shown while a room waits to start: roster + host Start button. */
function WaitingLobby({
  room,
  youId,
  onStart,
}: {
  room: NonNullable<ReturnType<typeof useArcade>['state']['room']>;
  youId: string;
  onStart: (options?: GameOptions) => void;
}) {
  const info = GAMES[room.game];
  const isHost = youId === room.hostId;
  const enough = room.players.length >= info.minPlayers;
  const [size, setSize] = useState<'small' | 'medium' | 'large'>('medium');

  if (isHost && enough) {
    return (
      <>
        <p>
          Everyone in?{' '}
          {room.players.length < info.maxPlayers
            ? `Start now, or wait for up to ${info.maxPlayers} players.`
            : 'Room is full — start when ready!'}
        </p>
        {room.game === 'memory' && (
          <div className="size-picker">
            <span className="field-label">Board size</span>
            <div className="size-options">
              {MEMORY_SIZES.map((s) => (
                <button
                  key={s.key}
                  className={`size-btn ${size === s.key ? 'selected' : ''}`}
                  onClick={() => setSize(s.key)}
                >
                  <b>{s.label}</b>
                  <span>{s.sub}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        <button
          className="btn primary big"
          onClick={() => onStart(room.game === 'memory' ? { size } : undefined)}
        >
          Start game ▶
        </button>
      </>
    );
  }
  if (!enough) {
    return (
      <p>
        Share the code below so {info.maxPlayers > 2 ? 'friends' : 'a friend'} can join! (
        {room.players.length}/{info.maxPlayers})
      </p>
    );
  }
  return <p>Waiting for the host to start…</p>;
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
