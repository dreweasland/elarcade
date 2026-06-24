import { useEffect, useState } from 'react';

const DICE = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
const ROLL_MS = 560;
const TICK_MS = 70;

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
