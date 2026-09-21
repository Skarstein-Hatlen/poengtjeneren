import { useState } from 'react';
import varsler from '../data/varsler.json';
import type { Butikk, Land } from '../data/types';
import { SPRAK, tekst } from '../i18n';

interface Props {
  land: Land;
  butikk: Butikk;
}

/**
 * «Følg butikk»: e-postvarsel når satsen endrer seg. Skjemaet går rett til nyhetsbrevtjenesten
 * (Buttondown) med butikken som tag; scripts/send-varsler.mjs sender e-postene hver natt.
 * Vises ikke før brukernavnet er satt i src/data/varsler.json.
 */
export default function Folg({ land, butikk }: Props) {
  const [apen, setApen] = useState(false);
  if (!varsler.brukernavn) return null;
  const tag = `${SPRAK[land].sti}:${butikk.id}`;

  return (
    <div className="folg">
      {!apen ? (
        <button type="button" className="lenke" onClick={() => setApen(true)}>
          {tekst(land, 'folg', { butikk: butikk.navn })}
        </button>
      ) : (
        <form action={`https://buttondown.com/api/emails/embed-subscribe/${varsler.brukernavn}`} method="post" target="_blank">
          <p className="muted">{tekst(land, 'folgForklaring', { butikk: butikk.navn })}</p>
          <div className="folg-felt">
            <input type="email" name="email" required placeholder={tekst(land, 'epost')} autoComplete="email" />
            <input type="hidden" name="tag" value={tag} />
            <button type="submit">{tekst(land, 'folgKnapp')}</button>
          </div>
        </form>
      )}
    </div>
  );
}
