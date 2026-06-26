/**
 * Helpers for removing a player from an in-progress turn-based game so the
 * remaining players can keep playing (instead of the whole round ending).
 */

export interface SeatRemoval {
  /** Seating order with the player removed. */
  seating: string[];
  /** Turn after removal — advanced to the next seat if it was the leaver's. */
  turn: string | null;
  /** True if the removed player held the turn when they left. */
  wasTurn: boolean;
}

/**
 * Remove `id` from a seating order. Returns `null` when fewer than two players
 * would remain (the caller should end the game in that case). When the leaver
 * held the turn, it advances to the player who would have followed them —
 * honoring `dir` (UNO reverses direction).
 */
export function removeSeat(
  seating: string[],
  turn: string | null,
  id: string,
  dir: 1 | -1 = 1,
): SeatRemoval | null {
  const index = seating.indexOf(id);
  if (index < 0) return { seating, turn, wasTurn: false }; // not seated — no-op
  const next = seating.filter((s) => s !== id);
  if (next.length < 2) return null; // can't continue with one player
  const wasTurn = turn === id;
  let newTurn = turn;
  if (wasTurn) {
    // The follower's id is unchanged; its index in `next` shifts when the
    // leaver sat before it. dir +1 -> the seat now at `index`; dir -1 -> before.
    const at = dir === 1 ? index % next.length : (index - 1 + next.length) % next.length;
    newTurn = next[at];
  }
  return { seating: next, turn: newTurn, wasTurn };
}
