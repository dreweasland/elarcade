import { GameId, GameMove, GameOptions, GameState } from '../../../shared/protocol.js';
import { applyTicTacToeMove, createTicTacToe } from './ticTacToe.js';
import { applyConnectFourMove, createConnectFour } from './connectFour.js';
import { applyBattleshipMove, createBattleship, viewBattleship } from './battleship.js';
import { applyUnoMove, createUno, viewUno } from './uno.js';
import { applyMemoryMove, createMemory, viewMemory } from './memory.js';
import { applyPigMove, createPig } from './pig.js';
import { applyDotsMove, createDots } from './dots.js';
import { applyDrawGuessMove, createDrawGuess, tickDrawGuess, viewDrawGuess } from './drawguess.js';
import { applyZombieMove, createZombie, viewZombie } from './zombie.js';
import { applyChutesMove, createChutes } from './chutes.js';
import { applyCantStopMove, createCantStop } from './cantstop.js';

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
  /**
   * Optional server-driven clock. The room calls this ~once per second while
   * the game is live; return changed:true to trigger a broadcast. Used by
   * real-time games like Draw & Guess (round countdown).
   */
  tick?(state: GameState): { state: GameState; changed: boolean };
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
  pig: {
    createState: (ids, first, options) => createPig(ids, first, options),
    applyMove: (state, playerId, move) => applyPigMove(state as any, playerId, move as any),
  },
  dots: {
    createState: (ids, first, options) => createDots(ids, first, options),
    applyMove: (state, playerId, move) => applyDotsMove(state as any, playerId, move as any),
  },
  drawguess: {
    createState: (ids, first) => createDrawGuess(ids, first),
    applyMove: (state, playerId, move) => applyDrawGuessMove(state as any, playerId, move as any),
    viewFor: (state, viewerId) => viewDrawGuess(state as any, viewerId),
    tick: (state) => tickDrawGuess(state as any),
  },
  zombie: {
    createState: (ids, first) => createZombie(ids, first),
    applyMove: (state, playerId, move) => applyZombieMove(state as any, playerId, move as any),
    viewFor: (state, viewerId) => viewZombie(state as any, viewerId),
  },
  chutes: {
    createState: (ids, first) => createChutes(ids, first),
    applyMove: (state, playerId, move) => applyChutesMove(state as any, playerId, move as any),
  },
  cantstop: {
    createState: (ids, first) => createCantStop(ids, first),
    applyMove: (state, playerId, move) => applyCantStopMove(state as any, playerId, move as any),
  },
};
