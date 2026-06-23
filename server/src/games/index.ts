import { GameId, GameMove, GameState } from '../../../shared/protocol.js';
import { applyTicTacToeMove, createTicTacToe } from './ticTacToe.js';
import { applyConnectFourMove, createConnectFour } from './connectFour.js';

export interface MoveOutcome {
  state: GameState;
  error?: string;
}

/** Common shape every game in the arcade implements. */
export interface GameModule {
  createState(playerIds: string[], firstPlayerId: string): GameState;
  applyMove(state: GameState, playerId: string, move: GameMove): MoveOutcome;
}

export const GAME_MODULES: Record<GameId, GameModule> = {
  ticTacToe: {
    createState: (ids, first) => createTicTacToe(ids, first),
    applyMove: (state, playerId, move) =>
      applyTicTacToeMove(state as any, playerId, move as any),
  },
  connectFour: {
    createState: (ids, first) => createConnectFour(ids, first),
    applyMove: (state, playerId, move) =>
      applyConnectFourMove(state as any, playerId, move as any),
  },
};
