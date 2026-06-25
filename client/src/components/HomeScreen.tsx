import { useMemo, useState } from 'react';
import {
  AVATARS,
  CATEGORIES,
  GAMES,
  GameId,
  GameInfo,
  isDuo,
  playerCountLabel,
} from '../../../shared/protocol.ts';
import { useArcade } from '../useArcade.ts';
import { sfx } from '../sounds.ts';
import { GameIcon } from './GameIcon.tsx';
import { AvatarIcon } from './AvatarIcon.tsx';

const NAME_KEY = 'el-arcade-name';
const AVATAR_KEY = 'el-arcade-avatar';

/** Lobby filter chips. Single-select; each is just a predicate over a game. */
type Filter = { id: string; label: string; test: (g: GameInfo) => boolean };

const FILTERS: Filter[] = [
  { id: 'all', label: 'All', test: () => true },
  { id: 'duo', label: '2-player', test: isDuo },
  { id: 'family', label: 'Family', test: (g) => !isDuo(g) },
  ...CATEGORIES.map((c) => ({
    id: c.id,
    label: c.label,
    test: (g: GameInfo) => g.category === c.id,
  })),
];

export function HomeScreen() {
  const { state, arcade } = useArcade();
  const [name, setName] = useState(() => localStorage.getItem(NAME_KEY) ?? '');
  const [avatar, setAvatar] = useState<string>(() => {
    const saved = localStorage.getItem(AVATAR_KEY);
    return saved && (AVATARS as readonly string[]).includes(saved) ? saved : AVATARS[0];
  });
  const [code, setCode] = useState(
    () => (new URLSearchParams(location.search).get('code') ?? '').toUpperCase().replace(/[^A-Z]/g, ''),
  );
  const [filterId, setFilterId] = useState('all');
  const connecting = state.status === 'connecting';

  const ready = name.trim().length > 0;

  const filter = FILTERS.find((f) => f.id === filterId) ?? FILTERS[0];
  /** Games passing the active filter, grouped into category sections (in order). */
  const sections = useMemo(() => {
    const matches = Object.values(GAMES).filter(filter.test);
    return CATEGORIES.map((c) => ({
      ...c,
      games: matches.filter((g) => g.category === c.id),
    })).filter((s) => s.games.length > 0);
  }, [filter]);

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
            <AvatarIcon id={avatar} />
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
              <AvatarIcon id={a} />
            </button>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2 className="panel-title">Choose a game</h2>

        <div className="game-filters" role="group" aria-label="Filter games">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              className={`chip ${f.id === filterId ? 'active' : ''}`}
              aria-pressed={f.id === filterId}
              onClick={() => {
                setFilterId(f.id);
                sfx.place();
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {sections.length === 0 && <p className="no-games">No games match that filter.</p>}

        {sections.map((s) => (
          <div key={s.id} className="game-section">
            <h3 className="section-head">{s.label}</h3>
            <div className="cabinets">
              {s.games.map((g) => (
                <button
                  key={g.id}
                  className="cabinet"
                  disabled={!ready || connecting}
                  onClick={() => createGame(g.id)}
                >
                  <span className="cabinet-icon">
                    <GameIcon id={g.id} />
                  </span>
                  <span className="cabinet-name">{g.name}</span>
                  <span className="cabinet-players">{playerCountLabel(g)}</span>
                  <span className="cabinet-tag">{g.tagline}</span>
                  <span className="cabinet-cta">{connecting ? 'Starting…' : 'Create room'}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
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
