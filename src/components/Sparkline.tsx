import type { Maling } from '../data/types';

interface Props {
  malinger: Maling[];
  /** Dagens dato, så siste verdi tegnes helt fram til i dag. */
  idag: string;
  farge: string;
}

const B = 120;
const H = 26;

/** Liten trappekurve over satsen: hver måling holder til neste endring. */
export default function Sparkline({ malinger, idag, farge }: Props) {
  if (malinger.length === 0) return null;
  const tid = (d: string) => new Date(d).getTime();
  const siste = malinger[malinger.length - 1][1];
  const punkter: Maling[] = siste === null ? malinger : [...malinger, [idag, siste]];
  const t0 = tid(punkter[0][0]);
  const t1 = Math.max(tid(idag), t0 + 1);
  const verdier = punkter.map((p) => p[1]).filter((v): v is number => v !== null);
  const min = Math.min(...verdier);
  const maks = Math.max(...verdier);
  const x = (d: string) => 2 + ((tid(d) - t0) / (t1 - t0)) * (B - 4);
  const y = (v: number) => (maks === min ? H / 2 : H - 3 - ((v - min) / (maks - min)) * (H - 6));

  // Trapp: hver måling holder til neste. Etter en slutt-markør (null) starter linjen på nytt ved neste måling.
  let d = '';
  let forrige: number | null = null;
  punkter.forEach(([dato, verdi]) => {
    const px = x(dato);
    if (forrige !== null) d += ` H${px.toFixed(1)}`;
    if (verdi === null) {
      forrige = null;
      return;
    }
    d += forrige === null ? ` M${px.toFixed(1)},${y(verdi).toFixed(1)}` : ` V${y(verdi).toFixed(1)}`;
    forrige = verdi;
  });

  return (
    <svg className="sparkline" viewBox={`0 0 ${B} ${H}`} width={B} height={H} aria-hidden="true">
      <path d={d} fill="none" stroke={farge} strokeWidth="2" strokeLinejoin="round" />
      {siste !== null && <circle cx={x(idag)} cy={y(siste)} r="2.5" fill={farge} />}
    </svg>
  );
}
