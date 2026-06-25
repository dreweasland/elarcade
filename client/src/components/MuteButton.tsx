import { useState } from 'react';
import { isMuted, toggleMuted, sfx } from '../sounds.ts';

export function MuteButton() {
  const [muted, setMuted] = useState(isMuted());
  return (
    <button
      className="mute-btn"
      aria-label={muted ? 'Unmute' : 'Mute'}
      onClick={() => {
        const next = toggleMuted();
        setMuted(next);
        if (!next) sfx.click();
      }}
    >
      <svg
        viewBox="0 0 24 24"
        width="22"
        height="22"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M4 9.5H7L11 5.5V18.5L7 14.5H4Z" />
        {muted ? (
          <path d="M15 9.5 20 14.5M20 9.5 15 14.5" />
        ) : (
          <>
            <path d="M14.5 9.5Q16.3 12 14.5 14.5" />
            <path d="M16.8 7.5Q20 12 16.8 16.5" />
          </>
        )}
      </svg>
    </button>
  );
}
