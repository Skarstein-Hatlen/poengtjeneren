import type { CSSProperties } from 'react';
import kortbilder from '../data/kortbilder.json';

const BILDER = kortbilder as Record<string, string>;

/** Tegnet kort for dem vi ikke har bilde av (Trumf Kredittkort), i kortets egne farger. */
const TEGNET: Record<string, { bakgrunn: string; farge: string; merke: string }> = {
  'trumf-kredittkort': { bakgrunn: 'linear-gradient(135deg, #2b2b2b, #0d0d0d)', farge: '#fff', merke: 'Trumf' },
};

/** Kortet slik det ser ut: bildet fra kortlisten, et tegnet kort der bildet mangler, og et stiplet omriss uten kredittkort. */
export default function Kortbilde({ kortId, liten }: { kortId: string | null; liten?: boolean }) {
  const klasse = liten ? ' liten' : '';
  if (!kortId) return <span className={`kortbilde uten${klasse}`} aria-hidden="true" />;
  const bilde = BILDER[kortId];
  if (bilde) {
    return (
      <span className={`kortbilde bilde${klasse}`} aria-hidden="true">
        <img src={bilde} alt="" loading="lazy" />
      </span>
    );
  }
  const u = TEGNET[kortId];
  return (
    <span className={`kortbilde${klasse}`} style={{ background: u?.bakgrunn ?? '#d9dde5', color: u?.farge ?? '#13203d' } as CSSProperties} aria-hidden="true">
      {!liten && u && <span>{u.merke}</span>}
    </span>
  );
}
