import type { ReactNode } from 'react';

/**
 * Minimal, flat-color animal avatars (24×24) that replace the emoji avatars.
 * Same minimal spirit as the catalog icons, but these get to be colorful and
 * don't have to match the neon theme. One entry per avatar id in AVATARS.
 */

const ART: Record<string, ReactNode> = {
  duck: (
    <>
      <circle cx="11" cy="12" r="7.5" fill="#f5c84b" />
      <ellipse cx="18.4" cy="13" rx="3.4" ry="1.8" fill="#ef8a22" />
      <circle cx="9.6" cy="10" r="1.2" fill="#22202c" />
    </>
  ),
  opossum: (
    <>
      <circle cx="7" cy="7.5" r="2.6" fill="#c7cad1" />
      <circle cx="17" cy="7.5" r="2.6" fill="#c7cad1" />
      <circle cx="7" cy="7.5" r="1.1" fill="#e394ad" />
      <circle cx="17" cy="7.5" r="1.1" fill="#e394ad" />
      <path d="M4.5 9.5Q12 6.5 19.5 9.5L12 20.5Z" fill="#dfe2e7" />
      <circle cx="9.6" cy="11" r="1.1" fill="#22202c" />
      <circle cx="14.4" cy="11" r="1.1" fill="#22202c" />
      <circle cx="12" cy="17.4" r="1.3" fill="#e394ad" />
    </>
  ),
  dog: (
    <>
      <ellipse cx="5.6" cy="12.5" rx="2.4" ry="4.6" fill="#7d5436" />
      <ellipse cx="18.4" cy="12.5" rx="2.4" ry="4.6" fill="#7d5436" />
      <circle cx="12" cy="11.5" r="7" fill="#b87b4e" />
      <ellipse cx="12" cy="15" rx="3.6" ry="3" fill="#e7c89f" />
      <circle cx="12" cy="13.4" r="1.3" fill="#22202c" />
      <circle cx="9.3" cy="10" r="1.1" fill="#22202c" />
      <circle cx="14.7" cy="10" r="1.1" fill="#22202c" />
    </>
  ),
  ferret: (
    <>
      <circle cx="8" cy="7" r="2.1" fill="#d9cbb0" />
      <circle cx="16" cy="7" r="2.1" fill="#d9cbb0" />
      <circle cx="12" cy="12" r="7.5" fill="#efe7d4" />
      <path d="M6 11Q9.5 9.3 11.2 11.4Q9.4 13.6 6 12Z" fill="#5b4a3a" />
      <path d="M18 11Q14.5 9.3 12.8 11.4Q14.6 13.6 18 12Z" fill="#5b4a3a" />
      <circle cx="8.9" cy="11.2" r="1" fill="#22202c" />
      <circle cx="15.1" cy="11.2" r="1" fill="#22202c" />
      <circle cx="12" cy="15.4" r="1.3" fill="#e394ad" />
    </>
  ),
  // Emerson — traced from his photo: short light-brown hair, little smile.
  emerson: (
    <>
      <circle cx="5.6" cy="13.5" r="1.5" fill="#f0c4a0" />
      <circle cx="18.4" cy="13.5" r="1.5" fill="#f0c4a0" />
      <circle cx="12" cy="13" r="7" fill="#f4caa3" />
      <path d="M5 12.6Q5 4.8 12 4.8Q19 4.8 19 12.6Q16 9.6 12 9.9Q8 9.6 5 12.6Z" fill="#a9885a" />
      <circle cx="9.6" cy="13" r="1" fill="#3a2c20" />
      <circle cx="14.4" cy="13" r="1" fill="#3a2c20" />
      <path d="M8.3 11.4 10.6 11.2M13.4 11.2 15.7 11.4" stroke="#8a6a3f" strokeWidth="0.9" strokeLinecap="round" fill="none" />
      <path d="M10.2 16.1Q12 17.5 13.8 16.1" stroke="#bf6f55" strokeWidth="1" strokeLinecap="round" fill="none" />
    </>
  ),
};

const DEFAULT = 'duck';

export function AvatarIcon({ id, className }: { id: string | undefined; className?: string }) {
  const art = (id && ART[id]) || ART[DEFAULT];
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" className={`avatar-icon ${className ?? ''}`} aria-hidden="true">
      {art}
    </svg>
  );
}
