import { GameId, GameMove, GameOptions, GameState } from '../../../shared/protocol.js';
import { applyTicTacToeMove, createTicTacToe } from './ticTacToe.js';
import { applyConnectFourMove, createConnectFour } from './connectFour.js';
import { applyBattleshipMove, createBattleship, viewBattleship } from './battleship.js';
import { applyUnoMove, createUno, removeUnoPlayer, viewUno } from './uno.js';
import { applyMemoryMove, createMemory, removeMemoryPlayer, viewMemory } from './memory.js';
import { applyPigMove, createPig, removePigPlayer } from './pig.js';
import { applyDotsMove, createDots, removeDotsPlayer } from './dots.js';
import { applyDrawGuessMove, createDrawGuess, tickDrawGuess, viewDrawGuess } from './drawguess.js';
import { applyZombieMove, createZombie, removeZombiePlayer, viewZombie } from './zombie.js';
import { applyChutesMove, createChutes, removeChutesPlayer } from './chutes.js';
import { applyCantStopMove, createCantStop, removeCantStopPlayer } from './cantstop.js';
import { applyTelephoneMove, createTelephone, tickTelephone, viewTelephone } from './telephone.js';
import { applyFishbowlMove, createFishbowl, tickFishbowl, viewFishbowl } from './fishbowl.js';
import { applyGoFishMove, createGoFish, viewGoFish } from './gofish.js';
import { applyOldMaidMove, createOldMaid, viewOldMaid } from './oldmaid.js';
import { applyRpsMove, createRps, viewRps } from './rps.js';
import { applyCheckersMove, createCheckers } from './checkers.js';
import { applyLudoMove, createLudo, removeLudoPlayer } from './ludo.js';
import {
  botCheckers,
  botChutes,
  botConnectFour,
  botGoFish,
  botLudo,
  botOldMaid,
  botPig,
  botRps,
  botTicTacToe,
} from './bots.js';

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
  /**
   * Optional CPU opponent. Returns the move the bot should make now, or null
   * if it isn't this bot's turn / there's nothing to do. The room engine calls
   * this on a timer so CPU moves feel natural. Omit for games without a bot.
   */
  botMove?(state: GameState, botId: string): GameMove | null;
  /**
   * Optional mid-game player removal (for games that seat 3+). Returns the
   * state with the player removed so the rest keep playing, or null if too few
   * remain to continue (the room then ends the round). Omit for games whose
   * structure can't drop a player cleanly (they end the round on a leave).
   */
  removePlayer?(state: GameState, playerId: string): GameState | null;
}

export const GAME_MODULES: Record<GameId, GameModule> = {
  ticTacToe: {
    createState: (ids, first) => createTicTacToe(ids, first),
    applyMove: (state, playerId, move) =>
      applyTicTacToeMove(state as any, playerId, move as any),
    botMove: (state, botId) => botTicTacToe(state as any, botId),
  },
  connectFour: {
    createState: (ids, first) => createConnectFour(ids, first),
    applyMove: (state, playerId, move) =>
      applyConnectFourMove(state as any, playerId, move as any),
    botMove: (state, botId) => botConnectFour(state as any, botId),
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
    removePlayer: (state, id) => removeUnoPlayer(state as any, id),
  },
  memory: {
    createState: (ids, first, options) => createMemory(ids, first, options),
    applyMove: (state, playerId, move) => applyMemoryMove(state as any, playerId, move as any),
    viewFor: (state, viewerId) => viewMemory(state as any, viewerId),
    removePlayer: (state, id) => removeMemoryPlayer(state as any, id),
  },
  pig: {
    createState: (ids, first, options) => createPig(ids, first, options),
    applyMove: (state, playerId, move) => applyPigMove(state as any, playerId, move as any),
    botMove: (state, botId) => botPig(state as any, botId),
    removePlayer: (state, id) => removePigPlayer(state as any, id),
  },
  dots: {
    createState: (ids, first, options) => createDots(ids, first, options),
    applyMove: (state, playerId, move) => applyDotsMove(state as any, playerId, move as any),
    removePlayer: (state, id) => removeDotsPlayer(state as any, id),
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
    removePlayer: (state, id) => removeZombiePlayer(state as any, id),
  },
  chutes: {
    createState: (ids, first) => createChutes(ids, first),
    applyMove: (state, playerId, move) => applyChutesMove(state as any, playerId, move as any),
    botMove: (state, botId) => botChutes(state as any, botId),
    removePlayer: (state, id) => removeChutesPlayer(state as any, id),
  },
  cantstop: {
    createState: (ids, first) => createCantStop(ids, first),
    applyMove: (state, playerId, move) => applyCantStopMove(state as any, playerId, move as any),
    removePlayer: (state, id) => removeCantStopPlayer(state as any, id),
  },
  telephone: {
    createState: (ids) => createTelephone(ids),
    applyMove: (state, playerId, move) => applyTelephoneMove(state as any, playerId, move as any),
    viewFor: (state, viewerId) => viewTelephone(state as any, viewerId),
    tick: (state) => tickTelephone(state as any),
  },
  fishbowl: {
    createState: (ids, _first, options) => createFishbowl(ids, options),
    applyMove: (state, playerId, move) => applyFishbowlMove(state as any, playerId, move as any),
    viewFor: (state, viewerId) => viewFishbowl(state as any, viewerId),
    tick: (state) => tickFishbowl(state as any),
  },
  gofish: {
    createState: (ids, first) => createGoFish(ids, first),
    applyMove: (state, playerId, move) => applyGoFishMove(state as any, playerId, move as any),
    viewFor: (state, viewerId) => viewGoFish(state as any, viewerId),
    botMove: (state, botId) => botGoFish(state as any, botId),
  },
  oldmaid: {
    createState: (ids, first) => createOldMaid(ids, first),
    applyMove: (state, playerId, move) => applyOldMaidMove(state as any, playerId, move as any),
    viewFor: (state, viewerId) => viewOldMaid(state as any, viewerId),
    botMove: (state, botId) => botOldMaid(state as any, botId),
  },
  rps: {
    createState: (ids) => createRps(ids),
    applyMove: (state, playerId, move) => applyRpsMove(state as any, playerId, move as any),
    viewFor: (state, viewerId) => viewRps(state as any, viewerId),
    botMove: (state, botId) => botRps(state as any, botId),
  },
  checkers: {
    createState: (ids, first) => createCheckers(ids, first),
    applyMove: (state, playerId, move) => applyCheckersMove(state as any, playerId, move as any),
    botMove: (state, botId) => botCheckers(state as any, botId),
  },
  ludo: {
    createState: (ids, first) => createLudo(ids, first),
    applyMove: (state, playerId, move) => applyLudoMove(state as any, playerId, move as any),
    botMove: (state, botId) => botLudo(state as any, botId),
    removePlayer: (state, id) => removeLudoPlayer(state as any, id),
  },
};
