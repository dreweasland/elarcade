import {
  BATTLESHIP_FLEET,
  BATTLESHIP_SIZE,
  BattleshipMove,
  BattleshipState,
} from '../../../shared/protocol.js';

export function createBattleship(
  playerIds: string[],
  firstPlayerId: string,
): BattleshipState {
  const boards: BattleshipState['boards'] = {};
  for (const id of playerIds) boards[id] = { ships: [], shots: [], hits: [] };
  return {
    kind: 'battleship',
    size: BATTLESHIP_SIZE,
    fleet: BATTLESHIP_FLEET.map((s) => ({ ...s })),
    phase: 'placing',
    ready: [],
    // Whoever was chosen to start fires first once both fleets are placed.
    turn: firstPlayerId,
    boards,
    winner: null,
    lastSunk: null,
  };
}

export interface MoveResult {
  state: BattleshipState;
  error?: string;
}

export function applyBattleshipMove(
  state: BattleshipState,
  playerId: string,
  move: BattleshipMove,
): MoveResult {
  const next: BattleshipState = structuredClone(state);

  if (move.action === 'place') {
    if (next.phase !== 'placing') return { state, error: 'Ships are already placed.' };
    if (next.ready.includes(playerId)) return { state, error: 'You already placed your fleet.' };

    const validation = validateFleet(move.ships, next.size);
    if (validation) return { state, error: validation };

    next.boards[playerId] = {
      ships: move.ships.map((s) => ({
        name: s.name,
        size: s.cells.length,
        cells: [...s.cells].sort((a, b) => a - b),
        sunk: false,
      })),
      shots: [],
      hits: [],
    };
    next.ready.push(playerId);
    if (next.ready.length >= 2) next.phase = 'firing';
    return { state: next };
  }

  // action === 'fire'
  if (next.phase !== 'firing') return { state, error: 'Place your ships first.' };
  if (next.turn !== playerId) return { state, error: 'It is not your turn.' };

  const oppId = Object.keys(next.boards).find((id) => id !== playerId);
  if (!oppId) return { state, error: 'No opponent.' };

  const cell = move.cell;
  if (!Number.isInteger(cell) || cell < 0 || cell >= next.size * next.size) {
    return { state, error: 'That square does not exist.' };
  }
  const oppBoard = next.boards[oppId];
  if (oppBoard.shots.includes(cell)) return { state, error: 'You already fired there.' };

  oppBoard.shots.push(cell);

  const hitShip = oppBoard.ships.find((s) => s.cells.includes(cell));
  oppBoard.hits = oppBoard.shots.filter((c) => oppBoard.ships.some((s) => s.cells.includes(c)));

  next.lastSunk = null;
  if (hitShip) {
    const sunk = hitShip.cells.every((c) => oppBoard.shots.includes(c));
    if (sunk) {
      hitShip.sunk = true;
      next.lastSunk = { by: playerId, ship: hitShip.name };
    }
  }

  const allSunk = oppBoard.ships.every((s) => s.cells.every((c) => oppBoard.shots.includes(c)));
  if (allSunk) {
    next.winner = playerId;
    next.turn = null;
  } else {
    // Strict alternating turns — one shot each, hit or miss.
    next.turn = oppId;
  }
  return { state: next };
}

/**
 * Produce the view of the game a particular viewer is allowed to see. A
 * player sees their own fleet in full but only the opponent's *sunk* ships
 * (plus individual hits). Spectators (viewerId === null) see neither fleet.
 * This is the guarantee that ship positions never travel to the wrong client.
 */
export function viewBattleship(
  state: BattleshipState,
  viewerId: string | null,
): BattleshipState {
  const view: BattleshipState = structuredClone(state);

  for (const ownerId of Object.keys(view.boards)) {
    const board = view.boards[ownerId];
    const occupied = (cell: number) => board.ships.some((s) => s.cells.includes(cell));
    board.hits = board.shots.filter(occupied);

    const ownFleet = ownerId === viewerId;
    if (ownFleet) {
      // Reveal everything, with up-to-date sunk flags.
      board.ships = board.ships.map((s) => ({
        ...s,
        sunk: s.cells.every((c) => board.shots.includes(c)),
      }));
    } else {
      // Reveal only fully-sunk ships; hide the rest entirely.
      board.ships = board.ships
        .filter((s) => s.cells.every((c) => board.shots.includes(c)))
        .map((s) => ({ ...s, sunk: true }));
    }
  }
  return view;
}

// ---------------------------------------------------------------------------

function validateFleet(
  ships: Array<{ name: string; cells: number[] }>,
  size: number,
): string | null {
  if (!Array.isArray(ships) || ships.length !== BATTLESHIP_FLEET.length) {
    return 'Place your whole fleet.';
  }

  // Names/sizes must match the fleet exactly (each ship once).
  const expected = new Map(BATTLESHIP_FLEET.map((s) => [s.name, s.size]));
  const seen = new Set<string>();
  const occupied = new Set<number>();

  for (const ship of ships) {
    const expectedSize = expected.get(ship.name);
    if (expectedSize === undefined) return `Unknown ship: ${ship.name}.`;
    if (seen.has(ship.name)) return `Duplicate ship: ${ship.name}.`;
    seen.add(ship.name);

    const cells = ship.cells;
    if (!Array.isArray(cells) || cells.length !== expectedSize) {
      return `${ship.name} is the wrong size.`;
    }
    if (cells.some((c) => !Number.isInteger(c) || c < 0 || c >= size * size)) {
      return `${ship.name} is off the board.`;
    }
    if (!isStraightLine(cells, size)) return `${ship.name} must be a straight line.`;
    for (const c of cells) {
      if (occupied.has(c)) return 'Ships cannot overlap.';
      occupied.add(c);
    }
  }
  if (seen.size !== BATTLESHIP_FLEET.length) return 'Place your whole fleet.';
  return null;
}

/** Cells must form a contiguous horizontal or vertical run. */
function isStraightLine(cells: number[], size: number): boolean {
  const sorted = [...cells].sort((a, b) => a - b);
  const rows = sorted.map((c) => Math.floor(c / size));
  const cols = sorted.map((c) => c % size);
  const sameRow = rows.every((r) => r === rows[0]);
  const sameCol = cols.every((c) => c === cols[0]);

  if (sameRow) {
    // Columns must be consecutive.
    return cols.every((c, i) => i === 0 || c === cols[i - 1] + 1);
  }
  if (sameCol) {
    return rows.every((r, i) => i === 0 || r === rows[i - 1] + 1);
  }
  return false;
}
