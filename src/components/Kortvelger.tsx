import { useEffect, useRef, useState } from 'react';
import kortbilder from '../data/kortbilder.json';
import type { Kort, Land, Program } from '../data/types';
import { tekst } from '../i18n';
import { fmtTall } from '../lib/format';

interface Valg {
  id: string;
  navn: string;
  under?: string;
  bilde?: string;
  farge?: string;
  /** «Ingen kort»: tom kortramme i stedet for bilde. */
  tom?: boolean;
  aktiv: boolean;
  velg: () => void;
}

interface Props {
  land: Land;
  kortId: string;
  kortListe: Kort[];
  programmer: Program[];
  /** Valgt nivå for et program med eget kort (Klarna). */
  nivaFor: (p: Program) => string;
  onKort: (kortId: string) => void;
  onNiva: (p: Program, valgId: string) => void;
}

const BILDER = kortbilder as Record<string, string>;
const INGEN = 'ingen';
const ANNET = 'annet';

function Bilde({ valg }: { valg: Valg }) {
  if (valg.tom) return <span className="kv-bilde kv-tom" aria-hidden="true" />;
  return (
    <span className="kv-bilde" aria-hidden="true">
      {valg.bilde ? <img src={valg.bilde} alt="" /> : <i style={{ background: valg.farge ?? 'var(--navy)' }}>{valg.navn.charAt(0)}</i>}
    </span>
  );
}

/**
 * Kortvelgeren i sideraden: kortet (og Klarna-nivået) kan byttes fra alle sider.
 * Egen liste i stedet for <select>, så hvert kort kan vises med bilde.
 */
export default function Kortvelger({ land, kortId, kortListe, programmer, nivaFor, onKort, onNiva }: Props) {
  const [apen, setApen] = useState(false);
  const rot = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!apen) return;
    const klikk = (e: MouseEvent) => {
      if (!rot.current?.contains(e.target as Node)) setApen(false);
    };
    const tast = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setApen(false);
    };
    document.addEventListener('mousedown', klikk);
    document.addEventListener('keydown', tast);
    return () => {
      document.removeEventListener('mousedown', klikk);
      document.removeEventListener('keydown', tast);
    };
  }, [apen]);

  const valg: Valg[] = [];
  // Klarna Max, Premium, Plus – kortet og nivået i ett valg.
  for (const p of programmer.filter((x) => x.kort && x.nivaer.length > 0)) {
    const nivaer = p.nivaer.filter((n) => n.kanVeksle !== false && n.ekstraProsent > 0).sort((a, b) => b.ekstraProsent - a.ekstraProsent);
    for (const n of nivaer) {
      valg.push({
        id: `${p.id}-kort:${n.id}`,
        navn: `${p.kortnavn} ${n.navn}`,
        under: tekst(land, 'krPerMnd', { n: fmtTall(n.prisPerMnd) }),
        bilde: BILDER[`${p.id}-kort-${n.id}`] ?? BILDER[`${p.id}-kort`],
        farge: p.farge,
        aktiv: kortId === `${p.id}-kort` && nivaFor(p) === n.id,
        velg: () => onNiva(p, n.id),
      });
    }
  }
  for (const k of kortListe) {
    valg.push({ id: k.id, navn: k.navn, under: `${fmtTall(k.poengPer100)} p/100 kr`, bilde: BILDER[k.id], aktiv: kortId === k.id, velg: () => onKort(k.id) });
  }
  valg.push({ id: INGEN, navn: tekst(land, 'ingenKort'), tom: true, aktiv: kortId === INGEN, velg: () => onKort(INGEN) });

  const gjeldende = valg.find((v) => v.aktiv) ?? null;
  const navn = gjeldende?.navn ?? (kortId === ANNET ? tekst(land, 'annet') : tekst(land, 'ingenKort'));

  return (
    <div className={`kortvelger${apen ? ' apen' : ''}`} ref={rot}>
      <button type="button" className="kortvelger-knapp" aria-haspopup="listbox" aria-expanded={apen} aria-label={tekst(land, 'velgKort')} onClick={() => setApen((v) => !v)}>
        {gjeldende && <Bilde valg={gjeldende} />}
        <span className="kortvelger-navn">{navn}</span>
        <span className="kortvelger-pil" aria-hidden="true" />
      </button>
      {apen && (
        <ul className="kortvelger-liste" role="listbox" aria-label={tekst(land, 'velgKort')}>
          {valg.map((v) => (
            <li key={v.id} role="option" aria-selected={v.aktiv}>
              <button
                type="button"
                className={v.aktiv ? 'aktiv' : undefined}
                onClick={() => {
                  v.velg();
                  setApen(false);
                }}
              >
                <Bilde valg={v} />
                <span className="kv-tekst">
                  <span className="kv-navn">{v.navn}</span>
                  {v.under && <span className="kv-under">{v.under}</span>}
                </span>
                {v.aktiv && (
                  <span className="kv-hake" aria-hidden="true">
                    ✓
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
