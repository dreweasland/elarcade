import { GameId, GameMove, GameOptions, GameState } from '../../../shared/protocol.js';
import { applyTicTacToeMove, createTicTacToe } from './ticTacToe.js';
import { applyConnectFourMove, createConnectFour } from './connectFour.js';
import { applyBattleshipMove, createBattleship, viewBattleship } from './battleship.js';
import { applyUnoMove, createUno, viewUno } from './uno.js';
import { applyMemoryMove, createMemory, viewMemory } from './memory.js';

export interface MoveOutcome {
  state: GameState;
  error?: string;
}

/** Common shape every game in the arcade implements. */
export interface GameModule {
  createState(playerIds: string[], firstPlayerId: string, options?: GameOptions): GameState;
  applyMove(state: GameState, playerId: string, move: GameMove): MoveOutcome;
  /**
   * Optional per-viewer redaction. Games with hidden information (e.g.
   * Battleship) implement this so each client only receives what it may see.
   * `viewerId` is null for spectators. Omit for fully-public games.
   */
  viewFor?(state: GameState, viewerId: string | null): GameState;
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
  battleship: {
    createState: (ids, first) => createBattleship(ids, first),
    applyMove: (state, playerId, move) =>
      applyBattleshipMove(state as any, playerId, move as any),
    viewFor: (state, viewerId) => viewBattleship(state as any, viewerId),
  },
  uno: {
    createState: (ids, first) => createUno(ids, first),
    applyMove: (state, playerId, move) => applyUnoMove(state as any, playerId, move as any),
    viewFor: (state, viewerId) => viewUno(state as any, viewerId),
  },
  memory: {
    createState: (ids, first, options) => createMemory(ids, first, options),
    applyMove: (state, playerId, move) => applyMemoryMove(state as any, playerId, move as any),
    viewFor: (state, viewerId) => viewMemory(state as any, viewerId),
  },
};
