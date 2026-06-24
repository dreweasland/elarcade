import { useEffect, useRef, useState } from 'react';

const DICE = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
export const ROLL_MS = 560;
const TICK_MS = 70;

/**
 * Returns true while the dice are tumbling, so callers can hold the outcome
 * (e.g. "Busted!") until the dice settle. `rollSig` must change on each new
 * roll and be null when no dice are in play.
 */
export function useDiceReveal(rollSig: string | null, durationMs = ROLL_MS + 80): boolean {
  const [revealing, setRevealing] = useState(false);
  const prev = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (prev.current === undefined) {
      prev.current = rollSig; // first mount — don't reveal
      return;
    }
    if (rollSig === prev.current) return;
    prev.current = rollSig;
    if (rollSig == null) {
      setRevealing(false);
      return;
    }
    setRevealing(true);
    const t = setTimeout(() => setRevealing(false), durationMs);
    return () => clearTimeout(t);
  }, [rollSig]);
  return revealing;
}

/**
 * A numeric die (1-6) that tumbles through random faces before settling on
 * `value`. Re-rolls whenever `rollKey` changes. Shows 🎲 when value is null.
 */
export function RollingDie({
  value,
  rollKey,
  className = '',
}: {
  value: number | null;
  rollKey: string;
  className?: string;
}) {
  const [face, setFace] = useState<number | null>(value);
  const [rolling, setRolling] = useState(false);

  useEffect(() => {
    if (value == null) {
      setFace(null);
      setRolling(false);
      return;
    }
    setRolling(true);
    const iv = window.setInterval(() => setFace(1 + Math.floor(Math.random() * 6)), TICK_MS);
    const to = window.setTimeout(() => {
      clearInterval(iv);
      setFace(value);
      setRolling(false);
    }, ROLL_MS);
    return () => {
      clearInterval(iv);
      clearTimeout(to);
    };
  }, [rollKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <span className={`${className} ${rolling ? 'rolling' : 'settled'}`}>
      {face == null ? '🎲' : DICE[face]}
    </span>
  );
}
