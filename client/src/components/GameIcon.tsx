import type { ReactNode } from 'react';
import { GameId } from '../../../shared/protocol.ts';

/**
 * Minimal, crisp line-art icons for the game catalog — drawn on a 24×24 grid,
 * stroked with currentColor so they pick up the neon theme (replacing emoji).
 */

const f = { fill: 'currentColor', stroke: 'none' } as const;

const ICONS: Record<GameId, ReactNode> = {
  ticTacToe: (
    <>
      <path d="M9.5 4.5V19.5M14.5 4.5V19.5M4.5 9.5H19.5M4.5 14.5H19.5" />
      <path d="M5.6 5.6 8 8M8 5.6 5.6 8" />
      <circle cx="17" cy="17" r="1.9" />
    </>
  ),
  connectFour: (
    <>
      <rect x="4.5" y="3.5" width="15" height="17" rx="2" />
      <circle cx="8" cy="6.7" r="1.3" />
      <circle cx="8" cy="10.2" r="1.3" />
      <circle cx="8" cy="13.7" r="1.3" />
      <circle cx="8" cy="17.2" r="1.3" />
      <circle cx="12" cy="6.7" r="1.3" {...f} />
      <circle cx="12" cy="10.2" r="1.3" {...f} />
      <circle cx="12" cy="13.7" r="1.3" {...f} />
      <circle cx="12" cy="17.2" r="1.3" {...f} />
      <circle cx="16" cy="6.7" r="1.3" />
      <circle cx="16" cy="10.2" r="1.3" />
      <circle cx="16" cy="13.7" r="1.3" />
      <circle cx="16" cy="17.2" r="1.3" />
    </>
  ),
  battleship: (
    <>
      <path d="M4 13.5H20L18 17.5H6Z" />
      <path d="M9 13.5V10.5H13V13.5" />
      <path d="M11 10.5V6.5M11 6.5H14.5L13 8.2H11" />
      <path d="M3.5 20q2 -1.4 4 0t4 0t4 0t4 0" />
    </>
  ),
  uno: (
    <>
      <rect x="6.5" y="4" width="11" height="16" rx="2" />
      <ellipse cx="12" cy="12" rx="3.4" ry="5.4" />
    </>
  ),
  memory: (
    <>
      <rect x="4" y="6.5" width="7" height="11" rx="1.5" />
      <rect x="13" y="6.5" width="7" height="11" rx="1.5" />
      <circle cx="7.5" cy="12" r="1.6" />
      <circle cx="16.5" cy="12" r="1.6" />
    </>
  ),
  pig: (
    <>
      <circle cx="12" cy="13" r="7" />
      <path d="M7.5 7.5 9.5 10M16.5 7.5 14.5 10" />
      <ellipse cx="12" cy="14.5" rx="3" ry="2" />
      <path d="M11 14.2V15M13 14.2V15" />
    </>
  ),
  dots: (
    <>
      <circle cx="6" cy="6" r="1" {...f} />
      <circle cx="12" cy="6" r="1" {...f} />
      <circle cx="18" cy="6" r="1" {...f} />
      <circle cx="6" cy="12" r="1" {...f} />
      <circle cx="12" cy="12" r="1" {...f} />
      <circle cx="18" cy="12" r="1" {...f} />
      <circle cx="6" cy="18" r="1" {...f} />
      <circle cx="12" cy="18" r="1" {...f} />
      <circle cx="18" cy="18" r="1" {...f} />
      <path d="M6 6H12M6 6V12M6 12H12M12 6V12" />
    </>
  ),
  drawguess: (
    <>
      <path d="M14.5 5.5 18.5 9.5 10 18 6 19 7 15Z" />
      <path d="M13 7 17 11" />
      <path d="M4 20q2 -2 4 0t4 0" />
    </>
  ),
  zombie: (
    <>
      <rect x="5" y="5.5" width="14" height="13" rx="3" />
      <path d="M8 9.5 10 11.5M10 9.5 8 11.5" />
      <circle cx="15" cy="10.5" r="1.1" {...f} />
      <path d="M8 15l2 -1 2 1 2 -1 2 1" />
    </>
  ),
  chutes: (
    <>
      <path d="M7.5 4V20M11.5 4V20" />
      <path d="M7.5 7.5H11.5M7.5 11.5H11.5M7.5 15.5H11.5" />
      <path d="M16 5Q19.5 10 15.5 13.5Q12 16.5 16 20" />
    </>
  ),
  cantstop: (
    <>
      <path d="M3 19 9 8 13 14 17 6.5 21 19Z" />
      <path d="M17 6.5V3.5M17 3.5H20L19 5H17" />
    </>
  ),
  telephone: (
    <>
      <path d="M5 5.5H19a1.8 1.8 0 0 1 1.8 1.8V13.5a1.8 1.8 0 0 1 -1.8 1.8H11l-4 3v-3H5a1.8 1.8 0 0 1 -1.8 -1.8V7.3A1.8 1.8 0 0 1 5 5.5Z" />
      <path d="M7.5 9.5q2 -1 4 0t4 0" />
    </>
  ),
  fishbowl: (
    <>
      <ellipse cx="12" cy="8" rx="6.5" ry="1.6" />
      <path d="M5.5 8C5.5 19 18.5 19 18.5 8" />
      <path d="M9.5 13q2 -2 4 0q-2 2 -4 0Z" />
      <path d="M13.5 13l2 -1.3v2.6z" />
    </>
  ),
  gofish: (
    <>
      <path d="M5 12q4.5 -5 9.5 0q-5 5 -9.5 0Z" />
      <path d="M14.5 12 18 9.8v4.4z" />
      <circle cx="8" cy="11" r="0.8" {...f} />
    </>
  ),
  oldmaid: (
    <>
      <rect x="3.5" y="9" width="7" height="11" rx="1.4" />
      <rect x="9.5" y="9" width="7" height="11" rx="1.4" />
      <rect x="13.5" y="3.5" width="7" height="11" rx="1.4" />
    </>
  ),
  rps: (
    <>
      <circle cx="6.5" cy="7" r="2.2" />
      <circle cx="6.5" cy="17" r="2.2" />
      <path d="M8.4 8.2 19 13M8.4 15.8 19 11" />
      <circle cx="13" cy="12" r="0.7" {...f} />
    </>
  ),
  checkers: (
    <>
      <ellipse cx="12" cy="15.5" rx="6" ry="2.2" />
      <path d="M6 15.5V12M18 15.5V12" />
      <ellipse cx="12" cy="12" rx="6" ry="2.2" />
      <path d="M9 9.6l1.5 1.8L12 9l1.5 2.4L15 9.6" />
    </>
  ),
  ludo: (
    <>
      <path d="M12 4C9.5 4 8.5 6.8 10 9C7.8 10.5 7.8 13.5 9.5 14.8H14.5C16.2 13.5 16.2 10.5 14 9C15.5 6.8 14.5 4 12 4Z" />
      <path d="M8.5 18H15.5L14.5 15H9.5Z" />
    </>
  ),
};

export function GameIcon({ id, className }: { id: GameId; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      className={`game-icon ${className ?? ''}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONS[id]}
    </svg>
  );
}
