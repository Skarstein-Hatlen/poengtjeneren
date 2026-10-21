import type { CSSProperties } from 'react';

/**
 * Et lite, tegnet kort i kortets egne farger (etter utstedernes bilder, oktober 2026) – ikke kortbildet selv, som vi
 * ikke har rett til å bruke. Klarna-kortet tegnes i Klarnas rosa. Uten kredittkort: et stiplet omriss.
 */
const UTSEENDE: Record<string, { bakgrunn: string; farge: string; merke: string }> = {
  'sas-amex-elite': { bakgrunn: 'linear-gradient(118deg, #3c3c3f 0%, #19191b 52%, #29292c 52%, #1d1d1f 100%)', farge: '#fff', merke: 'SAS' },
  'sas-amex-premium': { bakgrunn: 'linear-gradient(118deg, #cfcfcf 0%, #a2a2a2 52%, #bdbdbd 52%, #e2e2e2 100%)', farge: '#13203d', merke: 'SAS' },
  'sas-amex-classic': { bakgrunn: 'linear-gradient(118deg, #3248e2 0%, #1a29bd 52%, #2539d2 52%, #0f1c9e 100%)', farge: '#fff', merke: 'SAS' },
  'amex-platinum': { bakgrunn: 'linear-gradient(135deg, #f2f2f2, #bdbdbd)', farge: '#13203d', merke: 'AMEX' },
  'amex-platinum-points-plus': { bakgrunn: 'linear-gradient(135deg, #f2f2f2, #bdbdbd)', farge: '#13203d', merke: 'AMEX' },
  'amex-gold': { bakgrunn: 'linear-gradient(135deg, #f0dd9e, #c6a345)', farge: '#13203d', merke: 'AMEX' },
  'amex-green': { bakgrunn: 'linear-gradient(135deg, #d3eed7, #94d0a0)', farge: '#13203d', merke: 'AMEX' },
  'sas-mastercard-world': { bakgrunn: 'linear-gradient(160deg, #eef0f3 0%, #eef0f3 56%, #1c2e6e 56%, #1c2e6e 100%)', farge: '#13203d', merke: 'SAS' },
  'sas-mastercard-premium': { bakgrunn: 'linear-gradient(135deg, #e2e4e7, #a8acb2)', farge: '#13203d', merke: 'SAS' },
  'dnb-mastercard-upgrade': { bakgrunn: 'linear-gradient(135deg, #2d3034, #121315)', farge: '#fff', merke: 'DNB' },
  'dnb-saga-mastercard-upgrade': { bakgrunn: 'linear-gradient(135deg, #2d3034, #121315)', farge: '#fff', merke: 'DNB' },
  lunar: { bakgrunn: 'linear-gradient(135deg, #1d2c4d, #0a1122)', farge: '#fff', merke: 'SAS' },
  'trumf-kredittkort': { bakgrunn: 'linear-gradient(135deg, #2b2b2b, #0d0d0d)', farge: '#fff', merke: 'Trumf' },
  klarna: { bakgrunn: '#ffa8cd', farge: '#0b051d', merke: 'Klarna' },
};

/** Utseendet for et kort: svenske og danske kort (se-/dk-) ser ut som de norske, Klarna-kortet er likt på alle nivåer. */
const utseendeFor = (kortId: string) => (kortId.startsWith('klarna') ? UTSEENDE.klarna : UTSEENDE[kortId.replace(/^(se|dk)-/, '')]);

export default function Kortbilde({ kortId, liten }: { kortId: string | null; liten?: boolean }) {
  const u = kortId ? utseendeFor(kortId) : null;
  if (!kortId) return <span className={`kortbilde uten${liten ? ' liten' : ''}`} aria-hidden="true" />;
  return (
    <span className={`kortbilde${liten ? ' liten' : ''}`} style={{ background: u?.bakgrunn ?? '#d9dde5', color: u?.farge ?? '#13203d' } as CSSProperties} aria-hidden="true">
      {!liten && u && <span>{u.merke}</span>}
    </span>
  );
}
