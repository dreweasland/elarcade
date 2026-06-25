import { useState } from 'react';
import { FishbowlRound, FishbowlState, PublicPlayer } from '../../../shared/protocol.ts';
import { AvatarIcon } from './AvatarIcon.tsx';

const TEAM_LABELS: [string, string] = ['Team Coral', 'Team Aqua'];
const TEAM_CLASS: [string, string] = ['coral', 'aqua'];

const ROUND_INFO: Record<FishbowlRound, { name: string; how: string }> = {
  describe: { name: 'Describe', how: 'Say anything except the word(s) on the card.' },
  oneword: { name: 'One Word', how: 'Give a single-word clue — that’s it.' },
  charades: { name: 'Charades', how: 'Act it out — no talking, no sounds!' },
};

export function FishbowlBoard({
  game,
  players,
  youId,
  canPlay,
  onSubmitWords,
  onStart,
  onCorrect,
  onSkip,
}: {
  game: FishbowlState;
  players: PublicPlayer[];
  youId: string;
  canPlay: boolean;
  onSubmitWords: (words: string[]) => void;
  onStart: () => void;
  onCorrect: () => void;
  onSkip: () => void;
}) {
  const nameOf = (id: string | null) => players.find((p) => p.id === id)?.name ?? 'Someone';
  const avatarOf = (id: string | null) => players.find((p) => p.id === id)?.avatar;

  const inGame = game.seating.includes(youId);
  const yourTeam = inGame ? game.teams[youId] : null;
  const isClueGiver = canPlay && youId === game.clueGiver;
  const onActiveTeam = yourTeam !== null && yourTeam === game.activeTeam;
  const round = ROUND_INFO[game.roundKind];

  // ---- writing: each player fills the bowl ----
  const [words, setWords] = useState<string[]>(() => Array(game.wordsPerPlayer).fill(''));
  const youSubmitted = game.submitted.includes(youId);

  const teamBadge = (team: 0 | 1) => (
    <span className={`fb-team ${TEAM_CLASS[team]}`}>{TEAM_LABELS[team]}</span>
  );

  const scoreboard = (
    <div className="fb-scores">
      <span className={`fb-team ${TEAM_CLASS[0]} ${game.activeTeam === 0 ? 'up' : ''}`}>
        {TEAM_LABELS[0]} {game.scores[0]}
      </span>
      <span className="fb-vs">vs</span>
      <span className={`fb-team ${TEAM_CLASS[1]} ${game.activeTeam === 1 ? 'up' : ''}`}>
        {TEAM_LABELS[1]} {game.scores[1]}
      </span>
    </div>
  );

  // ============================ WRITING =============================
  if (game.phase === 'writing') {
    if (!canPlay || !inGame) {
      return (
        <div className="fb-board">
          <p className="fb-phase-title">Filling the bowl…</p>
          <p className="fb-wait">
            {game.submitted.length}/{game.seating.length} players have tossed in their words.
          </p>
        </div>
      );
    }
    if (youSubmitted) {
      return (
        <div className="fb-board">
          <p className="fb-phase-title">Filling the bowl…</p>
          <p className="fb-done">
            Your words are in! Waiting for the rest… ({game.submitted.length}/{game.seating.length})
          </p>
        </div>
      );
    }
    const ready = words.every((w) => w.trim());
    return (
      <div className="fb-board">
        <p className="fb-phase-title">Fill the bowl</p>
        <p className="fb-prompt">
          Secretly add {game.wordsPerPlayer} words or names — people, places, things, anything fun.
        </p>
        <form
          className="fb-write"
          onSubmit={(e) => {
            e.preventDefault();
            if (ready) onSubmitWords(words.map((w) => w.trim()));
          }}
        >
          {words.map((w, i) => (
            <input
              key={i}
              className="text-input"
              value={w}
              maxLength={40}
              placeholder={`Word ${i + 1}`}
              onChange={(e) => setWords((prev) => prev.map((x, j) => (j === i ? e.target.value : x)))}
            />
          ))}
          <button className="btn primary big" type="submit" disabled={!ready}>
            Toss them in ▶
          </button>
        </form>
        <p className="fb-hint">Only you can see your words.</p>
      </div>
    );
  }

  // ============================ OVER ===============================
  if (game.phase === 'over') {
    const [a, b] = game.scores;
    const result =
      a === b ? "It's a tie!" : `${TEAM_LABELS[a > b ? 0 : 1]} wins!`;
    return (
      <div className="fb-board">
        <p className="fb-phase-title">That's a wrap!</p>
        {scoreboard}
        <p className="fb-result">{result}</p>
        <p className="fb-hint">Play again to fill a fresh bowl.</p>
      </div>
    );
  }

  // ====================== READY / CLUE (in play) =====================
  const header = (
    <div className="fb-head">
      {scoreboard}
      <div className="fb-roundline">
        <span className="fb-round">Round {game.round + 1}/3</span>
        <span className="fb-roundname">{round.name}</span>
        {game.phase === 'clue' && (
          <span className={`fb-timer ${game.secondsLeft <= 10 ? 'low' : ''}`}>⏱ {game.secondsLeft}s</span>
        )}
        <span className="fb-bowl">{game.bowlCount} left</span>
      </div>
      <p className="fb-how">{round.how}</p>
    </div>
  );

  if (game.phase === 'ready') {
    return (
      <div className="fb-board">
        {header}
        {isClueGiver ? (
          <>
            <p className="fb-prompt">
              You're the clue-giver for {teamBadge(game.activeTeam)}. Get your team ready!
            </p>
            <button className="btn primary big" onClick={onStart}>
              Start turn ▶
            </button>
          </>
        ) : (
          <p className="fb-wait">
            <AvatarIcon id={avatarOf(game.clueGiver)} /> <b>{nameOf(game.clueGiver)}</b> ({teamBadge(game.activeTeam)})
            {onActiveTeam ? ' is about to give you clues — get ready to guess!' : ' is getting ready…'}
          </p>
        )}
      </div>
    );
  }

  // phase === 'clue'
  if (isClueGiver) {
    return (
      <div className="fb-board">
        {header}
        <div className="fb-card">
          <span className="fb-card-label">Get them to say:</span>
          <span className="fb-word">{game.currentWord ?? '…'}</span>
        </div>
        <div className="fb-actions">
          <button className="btn ghost big" onClick={onSkip}>
            ↪ Skip
          </button>
          <button className="btn primary big" onClick={onCorrect}>
            Got it!
          </button>
        </div>
        <p className="fb-turncount">Got {game.turnCorrect} this turn</p>
      </div>
    );
  }

  return (
    <div className="fb-board">
      {header}
      {onActiveTeam ? (
        <p className="fb-guess">
          Guess out loud! <AvatarIcon id={avatarOf(game.clueGiver)} /> {nameOf(game.clueGiver)} is giving clues.
        </p>
      ) : (
        <p className="fb-wait">
          {teamBadge(game.activeTeam)} is up — {nameOf(game.clueGiver)} is giving clues.
        </p>
      )}
      <p className="fb-turncount">Got {game.turnCorrect} this turn</p>
    </div>
  );
}
