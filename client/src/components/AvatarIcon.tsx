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
      {/* his ever-present food smudge */}
      <circle cx="9.3" cy="16.8" r="0.9" fill="#e07a2a" />
      <circle cx="10.3" cy="17.4" r="0.55" fill="#ef9540" />
      <circle cx="13.7" cy="17.1" r="0.6" fill="#e07a2a" />
    </>
  ),
  // Leighton — Emerson's brother: wavier/fuller hair, blue eyes.
  leighton: (
    <>
      <circle cx="5.6" cy="13.5" r="1.5" fill="#f4caa3" />
      <circle cx="18.4" cy="13.5" r="1.5" fill="#f4caa3" />
      <circle cx="12" cy="13" r="7" fill="#f4caa3" />
      <path d="M4.6 13Q4.4 4.6 12 4.4Q19.6 4.6 19.4 13Q18 10.6 16.4 11.3Q15 9.9 13 10.4Q12 9.7 11 10.4Q9 9.9 7.6 11.3Q6 10.6 4.6 13Z" fill="#b6905c" />
      <circle cx="9.6" cy="13" r="1.05" fill="#5a9bd8" />
      <circle cx="14.4" cy="13" r="1.05" fill="#5a9bd8" />
      <circle cx="9.6" cy="13" r="0.45" fill="#22202c" />
      <circle cx="14.4" cy="13" r="0.45" fill="#22202c" />
      <path d="M8.3 11.4 10.6 11.3M13.4 11.3 15.7 11.4" stroke="#8a6a3f" strokeWidth="0.9" strokeLinecap="round" fill="none" />
      <path d="M10 16.1Q12 17.6 14 16.1" stroke="#bf6f55" strokeWidth="1" strokeLinecap="round" fill="none" />
    </>
  ),
  // Nicole — long dark hair framing the face.
  nicole: (
    <>
      <path d="M5 12Q5 4 12 4Q19 4 19 12L19 21.5Q16.5 21 16.4 16Q14.2 14.4 12 14.6Q9.8 14.4 7.6 16Q7.5 21 5 21.5Z" fill="#3a2a24" />
      <circle cx="12" cy="12.6" r="6.2" fill="#f4caa3" />
      <path d="M6 12Q6 5.4 12 5.3Q18 5.4 18 12Q15.5 9.6 12 9.9Q8.5 9.6 6 12Z" fill="#3a2a24" />
      <circle cx="9.7" cy="12.7" r="0.95" fill="#3a2c20" />
      <circle cx="14.3" cy="12.7" r="0.95" fill="#3a2c20" />
      <path d="M8.5 11.2 10.5 11.1M13.5 11.1 15.5 11.2" stroke="#2a1f1a" strokeWidth="0.8" strokeLinecap="round" fill="none" />
      <path d="M10.2 15.5Q12 16.9 13.8 15.5" stroke="#c56f63" strokeWidth="1" strokeLinecap="round" fill="none" />
    </>
  ),
  // Drew — spiky hair, light stubble, blue eyes.
  drew: (
    <>
      <circle cx="5.6" cy="13.5" r="1.5" fill="#efbf94" />
      <circle cx="18.4" cy="13.5" r="1.5" fill="#efbf94" />
      <circle cx="12" cy="13" r="7" fill="#efbf94" />
      <path d="M6.4 15Q12 21.5 17.6 15Q15 18.4 12 18.4Q9 18.4 6.4 15Z" fill="#9c7c57" opacity="0.55" />
      <path d="M6 12Q6 7.6 8 7L8.5 9L10 6.2L11.2 8.7L12.5 6L13.8 8.7L15.2 6.4L16 9Q18 7.6 18 12Q15.5 10.2 12 10.4Q8.5 10.2 6 12Z" fill="#bfa069" />
      <circle cx="9.6" cy="13" r="1.05" fill="#5a9bd8" />
      <circle cx="14.4" cy="13" r="1.05" fill="#5a9bd8" />
      <circle cx="9.6" cy="13" r="0.45" fill="#22202c" />
      <circle cx="14.4" cy="13" r="0.45" fill="#22202c" />
      <path d="M8.4 11.5 10.5 11.4M13.5 11.4 15.6 11.5" stroke="#8a6a3f" strokeWidth="0.9" strokeLinecap="round" fill="none" />
      <path d="M10 16.2Q12 17.5 14 16.2" stroke="#a85f4a" strokeWidth="1" strokeLinecap="round" fill="none" />
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
