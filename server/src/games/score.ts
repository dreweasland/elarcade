/**
 * The single highest scorer, or 'draw' on a tie (including the all-zero case).
 * Shared by the score-based games (Memory, Dots & Boxes, Draw & Guess).
 */
export function highestScorer(
  seating: string[],
  scores: Record<string, number>,
): string | 'draw' {
  let best = -1;
  let winners: string[] = [];
  for (const id of seating) {
    const s = scores[id] ?? 0;
    if (s > best) {
      best = s;
      winners = [id];
    } else if (s === best) {
      winners.push(id);
    }
  }
  return winners.length === 1 ? winners[0] : 'draw';
}
