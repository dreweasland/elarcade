import { useEffect, useRef, useState } from 'react';
import { DotsState, PublicPlayer } from '../../../shared/protocol.ts';
import { AvatarIcon } from './AvatarIcon.tsx';

const SEAT_COLORS = ['#ff3db5', '#19e6ff', '#4dffa6', '#ffe14d'];

export function DotsBoard({
  game,
  players,
  youId,
  canPlay,
  onEdge,
}: {
  game: DotsState;
  players: PublicPlayer[];
  youId: string;
  canPlay: boolean;
  onEdge: (edge: 'h' | 'v', r: number, c: number) => void;
}) {
  const myTurn = canPlay && game.turn === youId && !game.winner;
  const playerById = (id: string) => players.find((p) => p.id === id);
  const colorOf = (id: string) => SEAT_COLORS[game.seating.indexOf(id) % SEAT_COLORS.length];

  // Animate the freshly-drawn line and any newly-completed boxes.
  const [freshEdge, setFreshEdge] = useState<string | null>(null);
  const [freshBoxes, setFreshBoxes] = useState<Set<number>>(new Set());
  const prev = useRef<{ h: boolean[]; v: boolean[]; owners: (string | null)[] } | null>(null);
  useEffect(() => {
    const snapshot = { h: [...game.hEdges], v: [...game.vEdges], owners: [...game.owners] };
    if (!prev.current) {
      prev.current = snapshot; // first render — don't animate existing state
      return;
    }
    let edge: string | null = null;
    game.hEdges.forEach((b, i) => { if (b && !prev.current!.h[i]) edge = `h-${i}`; });
    game.vEdges.forEach((b, i) => { if (b && !prev.current!.v[i]) edge = `v-${i}`; });
    const boxes = new Set<number>();
    game.owners.forEach((o, i) => { if (o && !prev.current!.owners[i]) boxes.add(i); });
    prev.current = snapshot;
    if (edge || boxes.size) {
      setFreshEdge(edge);
      setFreshBoxes(boxes);
      const t = setTimeout(() => { setFreshEdge(null); setFreshBoxes(new Set()); }, 500);
      return () => clearTimeout(t);
    }
  }, [game.moves]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fixed square box size so rows get real height (1fr rows would collapse).
  const EDGE = 16;
  const box = Math.floor((320 - (game.cols + 1) * EDGE) / game.cols);
  const gridRows = 2 * game.rows + 1;
  const gridCols = 2 * game.cols + 1;
  const cells = [];

  for (let gr = 0; gr < gridRows; gr++) {
    for (let gc = 0; gc < gridCols; gc++) {
      const evenR = gr % 2 === 0;
      const evenC = gc % 2 === 0;

      if (evenR && evenC) {
        cells.push(<span key={`${gr}-${gc}`} className="dot" />);
      } else if (evenR && !evenC) {
        // Horizontal edge
        const r = gr / 2;
        const c = (gc - 1) / 2;
        const drawn = game.hEdges[r * game.cols + c];
        const clickable = myTurn && !drawn;
        const fresh = freshEdge === `h-${r * game.cols + c}`;
        cells.push(
          <button
            key={`${gr}-${gc}`}
            className={`edge h ${drawn ? 'drawn' : ''} ${clickable ? 'clickable' : ''} ${fresh ? 'fresh' : ''}`}
            disabled={!clickable}
            onClick={() => clickable && onEdge('h', r, c)}
            aria-label="horizontal line"
          >
            <span className="line" />
          </button>,
        );
      } else if (!evenR && evenC) {
        // Vertical edge
        const r = (gr - 1) / 2;
        const c = gc / 2;
        const drawn = game.vEdges[r * (game.cols + 1) + c];
        const clickable = myTurn && !drawn;
        const fresh = freshEdge === `v-${r * (game.cols + 1) + c}`;
        cells.push(
          <button
            key={`${gr}-${gc}`}
            className={`edge v ${drawn ? 'drawn' : ''} ${clickable ? 'clickable' : ''} ${fresh ? 'fresh' : ''}`}
            disabled={!clickable}
            onClick={() => clickable && onEdge('v', r, c)}
            aria-label="vertical line"
          >
            <span className="line" />
          </button>,
        );
      } else {
        // Box center
        const r = (gr - 1) / 2;
        const c = (gc - 1) / 2;
        const boxIdx = r * game.cols + c;
        const owner = game.owners[boxIdx];
        const op = owner ? playerById(owner) : undefined;
        cells.push(
          <span
            key={`${gr}-${gc}`}
            className={`box ${freshBoxes.has(boxIdx) ? 'fresh' : ''}`}
            style={owner ? { background: `${colorOf(owner)}33`, color: colorOf(owner) } : undefined}
          >
            {op && <AvatarIcon id={op.avatar} />}
          </span>,
        );
      }
    }
  }

  return (
    <div className="dots-table">
      <div className="dots-scores">
        {game.seating.map((id) => {
          const p = playerById(id);
          return (
            <div
              key={id}
              className={`dots-score ${game.turn === id ? 'turn' : ''}`}
              style={{ borderColor: game.turn === id ? colorOf(id) : undefined }}
            >
              <span className="dots-dot" style={{ background: colorOf(id) }} />
              <span className="dots-score-name">
                <AvatarIcon id={p?.avatar} /> {p?.name}
              </span>
              <span className="dots-score-num">{game.scores[id] ?? 0}</span>
            </div>
          );
        })}
      </div>

      <div
        className="dots-grid"
        style={{
          gridTemplateColumns: `${EDGE}px repeat(${game.cols}, ${box}px ${EDGE}px)`,
          gridTemplateRows: `${EDGE}px repeat(${game.rows}, ${box}px ${EDGE}px)`,
        }}
      >
        {cells}
      </div>
    </div>
  );
}
