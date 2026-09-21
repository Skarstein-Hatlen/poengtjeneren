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
  const punkter: Maling[] = [...malinger, [idag, malinger[malinger.length - 1][1]]];
  const t0 = tid(punkter[0][0]);
  const t1 = Math.max(tid(idag), t0 + 1);
  const verdier = punkter.map((p) => p[1]);
  const min = Math.min(...verdier);
  const maks = Math.max(...verdier);
  const x = (d: string) => 2 + ((tid(d) - t0) / (t1 - t0)) * (B - 4);
  const y = (v: number) => (maks === min ? H / 2 : H - 3 - ((v - min) / (maks - min)) * (H - 6));

  let d = '';
  punkter.forEach(([dato, verdi], i) => {
    const px = x(dato);
    const py = y(verdi);
    if (i === 0) d += `M${px.toFixed(1)},${py.toFixed(1)}`;
    else d += ` H${px.toFixed(1)} V${py.toFixed(1)}`;
  });

  return (
    <svg className="sparkline" viewBox={`0 0 ${B} ${H}`} width={B} height={H} aria-hidden="true">
      <path d={d} fill="none" stroke={farge} strokeWidth="2" strokeLinejoin="round" />
      <circle cx={x(idag)} cy={y(verdier[verdier.length - 1])} r="2.5" fill={farge} />
    </svg>
  );
}
