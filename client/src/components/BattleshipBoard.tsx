import { useEffect, useMemo, useRef, useState } from 'react';
import { BattleshipState, PublicPlayer } from '../../../shared/protocol.ts';
import { sfx } from '../sounds.ts';

type Orient = 'H' | 'V';
interface Placed {
  name: string;
  size: number;
  cells: number[];
}

export function BattleshipBoard({
  game,
  players,
  youId,
  canPlay,
  onPlace,
  onFire,
}: {
  game: BattleshipState;
  players: PublicPlayer[];
  youId: string;
  canPlay: boolean;
  onPlace: (ships: Array<{ name: string; cells: number[] }>) => void;
  onFire: (cell: number) => void;
}) {
  const size = game.size;
  const oppId = players.find((p) => p.id !== youId)?.id ?? '';
  const isSpectator = !canPlay;

  if (game.phase === 'placing') {
    if (isSpectator) {
      return <p className="bs-status">Players are placing their fleets…</p>;
    }
    if (game.ready.includes(youId)) {
      return (
        <div className="bs-wrap">
          <p className="bs-status">✅ Fleet ready! Waiting for your opponent…</p>
          <FleetGrid size={size} ships={myShips(game, youId)} shots={[]} hits={[]} label="Your fleet" />
        </div>
      );
    }
    return <PlacementEditor game={game} onPlace={onPlace} />;
  }

  // Firing phase (and finished).
  if (isSpectator) {
    return (
      <div className="bs-wrap bs-two">
        {players.map((p) => (
          <TrackingGrid
            key={p.id}
            size={size}
            board={game.boards[p.id]}
            label={`${p.avatar} ${p.name}`}
            canFire={false}
            onFire={() => {}}
          />
        ))}
      </div>
    );
  }

  const myTurn = game.turn === youId && !game.winner;
  return (
    <div className="bs-wrap bs-two">
      <TrackingGrid
        size={size}
        board={game.boards[oppId]}
        label="🎯 Enemy waters"
        canFire={myTurn}
        onFire={onFire}
      />
      <FleetGrid
        size={size}
        ships={myShips(game, youId)}
        shots={game.boards[youId]?.shots ?? []}
        hits={game.boards[youId]?.hits ?? []}
        label="🛡️ Your fleet"
      />
    </div>
  );
}

function myShips(game: BattleshipState, youId: string) {
  return game.boards[youId]?.ships ?? [];
}

// ---------------------------------------------------------------------------
// Placement editor
// ---------------------------------------------------------------------------

function PlacementEditor({
  game,
  onPlace,
}: {
  game: BattleshipState;
  onPlace: (ships: Array<{ name: string; cells: number[] }>) => void;
}) {
  const size = game.size;
  const [placed, setPlaced] = useState<Placed[]>([]);
  const [orient, setOrient] = useState<Orient>('H');
  const [hover, setHover] = useState<number | null>(null);

  // Reset placement whenever a new round begins (rematch re-enters placing).
  const prevPhase = useRef(game.phase);
  useEffect(() => {
    if (prevPhase.current !== 'placing' && game.phase === 'placing') setPlaced([]);
    prevPhase.current = game.phase;
  }, [game.phase]);

  const occupied = useMemo(() => new Set(placed.flatMap((s) => s.cells)), [placed]);
  const activeSpec = game.fleet[placed.length]; // next ship to place, or undefined when done
  const done = placed.length === game.fleet.length;

  const preview = useMemo(() => {
    if (hover === null || !activeSpec) return null;
    return shipCellsFrom(hover, activeSpec.size, orient, size);
  }, [hover, activeSpec, orient, size]);
  const previewValid = preview !== null && preview.every((c) => !occupied.has(c));

  function tryPlace(anchor: number) {
    if (!activeSpec) return;
    const cells = shipCellsFrom(anchor, activeSpec.size, orient, size);
    if (!cells || cells.some((c) => occupied.has(c))) {
      sfx.error();
      return;
    }
    sfx.place();
    setPlaced((p) => [...p, { name: activeSpec.name, size: activeSpec.size, cells }]);
  }

  function randomize() {
    const result = randomFleet(game.fleet, size);
    if (result) {
      sfx.place();
      setPlaced(result);
    }
  }

  return (
    <div className="bs-wrap">
      <div className="bs-place-head">
        <span className="bs-status">
          {done ? '🎉 Fleet placed!' : `Place your ${activeSpec?.name} (${activeSpec?.size})`}
        </span>
      </div>

      <FleetGrid
        size={size}
        ships={placed}
        shots={[]}
        hits={[]}
        label=""
        previewCells={!done ? preview : null}
        previewValid={previewValid}
        onCellEnter={(c) => setHover(c)}
        onCellLeave={() => setHover(null)}
        onCellClick={(c) => !done && tryPlace(c)}
      />

      <div className="bs-fleet-list">
        {game.fleet.map((s, i) => (
          <span key={s.name} className={`bs-chip ${i < placed.length ? 'placed' : i === placed.length ? 'active' : ''}`}>
            {s.name} <b>{s.size}</b>
          </span>
        ))}
      </div>

      <div className="room-actions">
        <button className="btn ghost" onClick={() => setOrient((o) => (o === 'H' ? 'V' : 'H'))}>
          {orient === 'H' ? '↔︎ Horizontal' : '↕︎ Vertical'}
        </button>
        <button className="btn ghost" onClick={randomize}>
          🎲 Randomize
        </button>
        <button className="btn ghost" onClick={() => setPlaced([])} disabled={placed.length === 0}>
          ↺ Clear
        </button>
        <button
          className="btn primary"
          disabled={!done}
          onClick={() => onPlace(placed.map((s) => ({ name: s.name, cells: s.cells })))}
        >
          Ready ✓
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Grids
// ---------------------------------------------------------------------------

/** Your own fleet: shows ships, with incoming hits/misses overlaid. */
function FleetGrid({
  size,
  ships,
  shots,
  hits,
  label,
  previewCells,
  previewValid,
  onCellEnter,
  onCellLeave,
  onCellClick,
}: {
  size: number;
  ships: Array<{ cells: number[]; sunk?: boolean }>;
  shots: number[];
  hits: number[];
  label: string;
  previewCells?: number[] | null;
  previewValid?: boolean;
  onCellEnter?: (cell: number) => void;
  onCellLeave?: () => void;
  onCellClick?: (cell: number) => void;
}) {
  const shipCells = useMemo(() => new Set(ships.flatMap((s) => s.cells)), [ships]);
  const sunkCells = useMemo(
    () => new Set(ships.filter((s) => s.sunk).flatMap((s) => s.cells)),
    [ships],
  );
  const hitSet = useMemo(() => new Set(hits), [hits]);
  const shotSet = useMemo(() => new Set(shots), [shots]);
  const previewSet = useMemo(() => new Set(previewCells ?? []), [previewCells]);
  const interactive = !!onCellClick;

  return (
    <div className="bs-grid-block">
      {label && <span className="bs-grid-label">{label}</span>}
      <div className={`bs-grid ${interactive ? 'interactive' : ''}`} style={gridStyle(size)}>
        {Array.from({ length: size * size }, (_, i) => {
          const isShip = shipCells.has(i);
          const isHit = hitSet.has(i);
          const isMiss = shotSet.has(i) && !isHit;
          const inPreview = previewSet.has(i);
          const cls = [
            'bs-cell',
            isShip ? (sunkCells.has(i) ? 'ship sunk' : 'ship') : '',
            isHit ? 'hit' : '',
            isMiss ? 'miss' : '',
            inPreview ? (previewValid ? 'preview' : 'preview-bad') : '',
          ]
            .filter(Boolean)
            .join(' ');
          return (
            <button
              key={i}
              className={cls}
              disabled={!interactive}
              onClick={() => onCellClick?.(i)}
              onMouseEnter={() => onCellEnter?.(i)}
              onMouseLeave={() => onCellLeave?.()}
            >
              {isHit ? '💥' : isMiss ? '•' : ''}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Tracking grid: your shots on the enemy. Un-fired cells are tappable on your turn. */
function TrackingGrid({
  size,
  board,
  label,
  canFire,
  onFire,
}: {
  size: number;
  board: { ships: Array<{ cells: number[]; sunk: boolean }>; shots: number[]; hits: number[] } | undefined;
  label: string;
  canFire: boolean;
  onFire: (cell: number) => void;
}) {
  const shots = board?.shots ?? [];
  const hits = board?.hits ?? [];
  const sunkCells = useMemo(
    () => new Set((board?.ships ?? []).filter((s) => s.sunk).flatMap((s) => s.cells)),
    [board],
  );
  const hitSet = useMemo(() => new Set(hits), [hits]);
  const shotSet = useMemo(() => new Set(shots), [shots]);

  return (
    <div className="bs-grid-block">
      <span className="bs-grid-label">{label}</span>
      <div className={`bs-grid ${canFire ? 'interactive aim' : ''}`} style={gridStyle(size)}>
        {Array.from({ length: size * size }, (_, i) => {
          const isHit = hitSet.has(i);
          const isMiss = shotSet.has(i) && !isHit;
          const fireable = canFire && !shotSet.has(i);
          const cls = [
            'bs-cell track',
            isHit ? (sunkCells.has(i) ? 'hit sunk' : 'hit') : '',
            isMiss ? 'miss' : '',
            fireable ? 'fireable' : '',
          ]
            .filter(Boolean)
            .join(' ');
          return (
            <button key={i} className={cls} disabled={!fireable} onClick={() => fireable && onFire(i)}>
              {isHit ? '💥' : isMiss ? '•' : ''}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

function gridStyle(size: number) {
  return { gridTemplateColumns: `repeat(${size}, 1fr)` } as const;
}

/** Cells for a ship anchored at `anchor`, extending right (H) or down (V). null if off-board. */
function shipCellsFrom(anchor: number, len: number, orient: Orient, size: number): number[] | null {
  const r = Math.floor(anchor / size);
  const c = anchor % size;
  const cells: number[] = [];
  for (let k = 0; k < len; k++) {
    const rr = orient === 'V' ? r + k : r;
    const cc = orient === 'H' ? c + k : c;
    if (rr >= size || cc >= size) return null;
    cells.push(rr * size + cc);
  }
  return cells;
}

/** Randomly place a whole fleet without overlaps. */
function randomFleet(
  fleet: Array<{ name: string; size: number }>,
  size: number,
): Placed[] | null {
  const occupied = new Set<number>();
  const placed: Placed[] = [];
  for (const spec of fleet) {
    let ok = false;
    for (let attempt = 0; attempt < 500 && !ok; attempt++) {
      const orient: Orient = Math.random() < 0.5 ? 'H' : 'V';
      const anchor = Math.floor(Math.random() * size * size);
      const cells = shipCellsFrom(anchor, spec.size, orient, size);
      if (!cells || cells.some((c) => occupied.has(c))) continue;
      cells.forEach((c) => occupied.add(c));
      placed.push({ name: spec.name, size: spec.size, cells });
      ok = true;
    }
    if (!ok) return null; // extremely unlikely on a 10x10
  }
  return placed;
}
