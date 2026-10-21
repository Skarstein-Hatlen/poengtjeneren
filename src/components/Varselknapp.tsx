import { useState } from 'react';
import type { Land } from '../data/types';
import { tekst } from '../i18n';
import type { Folger } from '../lib/folger';
import { erAbonnert, slaAv, slaPaa, stotterPush, trengerHjemskjerm, varslerKonfigurert } from '../lib/varsler';

/** Én linje: slå på eller av push-varsler for butikkene brukeren følger. Vises bare når varsler er satt opp. */
export default function Varselknapp({ land, folger }: { land: Land; folger: Folger }) {
  const [paa, setPaa] = useState(erAbonnert);
  const [opptatt, setOpptatt] = useState(false);
  const [melding, setMelding] = useState<'feil' | 'blokkert' | null>(null);
  if (!varslerKonfigurert) return null;
  if (!stotterPush()) return trengerHjemskjerm() ? <p className="varsel muted">{tekst(land, 'varselIos')}</p> : null;

  const handling = async (fn: () => Promise<void>) => {
    setOpptatt(true);
    setMelding(null);
    try {
      await fn();
    } catch {
      setMelding('feil');
    } finally {
      setOpptatt(false);
    }
  };

  return (
    <p className="varsel">
      {paa ? (
        <>
          <span className="muted">{tekst(land, 'varselPaa')}</span>{' '}
          <button type="button" className="lenke" disabled={opptatt} onClick={() => handling(async () => (await slaAv(), setPaa(false)))}>
            {tekst(land, 'varselSlaAv')}
          </button>
        </>
      ) : (
        <button
          type="button"
          className="lenke"
          disabled={opptatt}
          onClick={() =>
            handling(async () => {
              const ok = await slaPaa(folger);
              setPaa(ok);
              if (!ok) setMelding('blokkert');
            })
          }
        >
          {tekst(land, 'varselSlaPaa')}
        </button>
      )}
      {melding && <span className="muted"> · {tekst(land, melding === 'feil' ? 'varselFeil' : 'varselBlokkert')}</span>}
    </p>
  );
}
