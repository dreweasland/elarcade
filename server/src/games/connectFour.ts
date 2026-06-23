import {
  C4_COLS,
  C4_ROWS,
  ConnectFourMove,
  ConnectFourState,
} from '../../../shared/protocol.js';

const idx = (row: number, col: number) => row * C4_COLS + col;

/**
 * Create a fresh Connect Four round.
 * `firstPlayerId` moves first and plays Red; the other plays Yellow.
 */
export function createConnectFour(
  playerIds: string[],
  firstPlayerId: string,
): ConnectFourState {
  const [a, b] = playerIds;
  const redPlayer = firstPlayerId === b ? b : a;
  const yellowPlayer = redPlayer === a ? b : a;
  return {
    kind: 'connectFour',
    board: Array(C4_ROWS * C4_COLS).fill(null),
    marks: { [redPlayer]: 'R', [yellowPlayer]: 'Y' },
    turn: redPlayer,
    winner: null,
    winningLine: null,
  };
}

export interface MoveResult {
  state: ConnectFourState;
  error?: string;
}

export function applyConnectFourMove(
  state: ConnectFourState,
  playerId: string,
  move: ConnectFourMove,
): MoveResult {
  if (state.winner) return { state, error: 'The round is already over.' };
  if (state.turn !== playerId) return { state, error: 'It is not your turn.' };

  const { column } = move;
  if (!Number.isInteger(column) || column < 0 || column >= C4_COLS) {
    return { state, error: 'That column does not exist.' };
  }

  // Find the lowest empty row in the chosen column (discs fall down).
  let landingRow = -1;
  for (let row = C4_ROWS - 1; row >= 0; row--) {
    if (state.board[idx(row, column)] === null) {
      landingRow = row;
      break;
    }
  }
  if (landingRow === -1) return { state, error: 'That column is full.' };

  const mark = state.marks[playerId];
  const board = state.board.slice();
  const cell = idx(landingRow, column);
  board[cell] = mark;

  const winningLine = findFour(board, landingRow, column, mark);
  const isFull = board.every((c) => c !== null);

  let winner: ConnectFourState['winner'] = null;
  if (winningLine) winner = playerId;
  else if (isFull) winner = 'draw';

  const opponentId = Object.keys(state.marks).find((id) => id !== playerId)!;
  const turn = winner ? null : opponentId;

  return { state: { ...state, board, turn, winner, winningLine } };
}

/** Check the four directions through the just-placed disc for a run of 4. */
function findFour(
  board: ConnectFourState['board'],
  row: number,
  col: number,
  mark: 'R' | 'Y',
): number[] | null {
  const directions = [
    [0, 1], // horizontal
    [1, 0], // vertical
    [1, 1], // diagonal down-right
    [1, -1], // diagonal down-left
  ];

  for (const [dr, dc] of directions) {
    const line = [idx(row, col)];
    // Extend forward and backward along this direction.
    for (const sign of [1, -1]) {
      let r = row + dr * sign;
      let c = col + dc * sign;
      while (
        r >= 0 &&
        r < C4_ROWS &&
        c >= 0 &&
        c < C4_COLS &&
        board[idx(r, c)] === mark
      ) {
        line.push(idx(r, c));
        r += dr * sign;
        c += dc * sign;
      }
    }
    if (line.length >= 4) {
      // Return exactly the four (or more) connected cells, sorted for tidiness.
      return line.sort((x, y) => x - y);
    }
  }
  return null;
}
