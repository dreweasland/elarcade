import { useState } from 'react';
import { AVATARS, GAMES, GameId } from '../../../shared/protocol.ts';
import { useArcade } from '../useArcade.ts';
import { sfx } from '../sounds.ts';

const NAME_KEY = 'el-arcade-name';
const AVATAR_KEY = 'el-arcade-avatar';

export function HomeScreen() {
  const { state, arcade } = useArcade();
  const [name, setName] = useState(() => localStorage.getItem(NAME_KEY) ?? '');
  const [avatar, setAvatar] = useState(
    () => localStorage.getItem(AVATAR_KEY) ?? AVATARS[0],
  );
  const [code, setCode] = useState(
    () => (new URLSearchParams(location.search).get('code') ?? '').toUpperCase().replace(/[^A-Z]/g, ''),
  );
  const connecting = state.status === 'connecting';

  const ready = name.trim().length > 0;

  function remember() {
    localStorage.setItem(NAME_KEY, name.trim());
    localStorage.setItem(AVATAR_KEY, avatar);
  }

  function createGame(game: GameId) {
    if (!ready) return;
    remember();
    sfx.click();
    arcade.createRoom(game, { name: name.trim(), avatar });
  }

  function joinGame() {
    if (!ready || code.trim().length < 4) return;
    remember();
    sfx.click();
    arcade.joinRoom(code, { name: name.trim(), avatar });
  }

  return (
    <div className="home">
      <p className="insert-coin">▸ Insert player ◂</p>

      <section className="panel identity">
        <div className="identity-row">
          <div className="avatar-preview" aria-hidden="true">
            {avatar}
          </div>
          <input
            className="text-input"
            value={name}
            maxLength={16}
            placeholder="Your name"
            aria-label="Your name"
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="avatar-strip" role="radiogroup" aria-label="Pick your avatar">
          {AVATARS.map((a) => (
            <button
              key={a}
              role="radio"
              aria-checked={a === avatar}
              className={`avatar-cell ${a === avatar ? 'selected' : ''}`}
              onClick={() => {
                setAvatar(a);
                sfx.place();
              }}
              aria-label={`avatar ${a}`}
            >
              {a}
            </button>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2 className="panel-title">Choose a game</h2>
        <div className="cabinets">
          {Object.values(GAMES).map((g) => (
            <button
              key={g.id}
              className="cabinet"
              disabled={!ready || connecting}
              onClick={() => createGame(g.id)}
            >
              <span className="cabinet-icon">{g.icon}</span>
              <span className="cabinet-name">{g.name}</span>
              <span className="cabinet-tag">{g.tagline}</span>
              <span className="cabinet-cta">{connecting ? 'Starting…' : 'Create room'}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="panel join">
        <h2 className="panel-title">Join a friend</h2>
        <div className="join-row">
          <input
            className="text-input code-input"
            value={code}
            maxLength={4}
            placeholder="CODE"
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
            onKeyDown={(e) => e.key === 'Enter' && joinGame()}
          />
          <button
            className="btn primary"
            disabled={!ready || code.trim().length < 4 || connecting}
            onClick={joinGame}
          >
            Join
          </button>
        </div>
        {!ready && <p className="hint">Enter your name first to play.</p>}
      </section>
    </div>
  );
}
