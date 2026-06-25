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
      {muted ? 'Muted' : 'Sound'}
    </button>
  );
}
