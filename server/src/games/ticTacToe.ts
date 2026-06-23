import { TicTacToeState, TicTacToeMove, WINNING_LINES } from '../../../shared/protocol.js';

/**
 * Create a fresh tic-tac-toe round.
 * `firstPlayerId` moves first and plays X; the other plays O.
 */
export function createTicTacToe(playerIds: string[], firstPlayerId: string): TicTacToeState {
  const [a, b] = playerIds;
  const xPlayer = firstPlayerId === b ? b : a;
  const oPlayer = xPlayer === a ? b : a;
  return {
    kind: 'ticTacToe',
    board: Array(9).fill(null),
    marks: { [xPlayer]: 'X', [oPlayer]: 'O' },
    turn: xPlayer,
    winner: null,
    winningLine: null,
  };
}

export interface MoveResult {
  state: TicTacToeState;
  error?: string;
}

/** Apply a move, returning the next state or an error string (state unchanged on error). */
export function applyTicTacToeMove(
  state: TicTacToeState,
  playerId: string,
  move: TicTacToeMove,
): MoveResult {
  if (state.winner) return { state, error: 'The round is already over.' };
  if (state.turn !== playerId) return { state, error: 'It is not your turn.' };

  const { cell } = move;
  if (!Number.isInteger(cell) || cell < 0 || cell > 8) {
    return { state, error: 'That square does not exist.' };
  }
  if (state.board[cell] !== null) return { state, error: 'That square is taken.' };

  const mark = state.marks[playerId];
  const board = state.board.slice();
  board[cell] = mark;

  const winningLine = findWinningLine(board);
  const isFull = board.every((c) => c !== null);

  let winner: TicTacToeState['winner'] = null;
  if (winningLine) winner = playerId;
  else if (isFull) winner = 'draw';

  // Hand turn to the other player, or stop the clock when the round ends.
  const opponentId = Object.keys(state.marks).find((id) => id !== playerId)!;
  const turn = winner ? null : opponentId;

  return { state: { ...state, board, turn, winner, winningLine } };
}

function findWinningLine(board: TicTacToeState['board']): number[] | null {
  for (const line of WINNING_LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return line;
  }
  return null;
}
