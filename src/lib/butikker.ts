import type { Butikk, ButikkSats } from '../data/types';

/** Finner butikker som matcher søket; treff på starten av navnet kommer først. */
export function sokButikker(liste: Butikk[], sok: string, maks = 6): Butikk[] {
  const q = sok.trim().toLowerCase();
  if (!q) return [];
  const starter: Butikk[] = [];
  const inneholder: Butikk[] = [];
  for (const b of liste) {
    const navn = b.navn.toLowerCase();
    if (navn.startsWith(q)) starter.push(b);
    else if (navn.includes(q)) inneholder.push(b);
  }
  return [...starter, ...inneholder].slice(0, maks);
}

/** Satsen som gjelder i dag: kampanjesats hvis kampanjen ikke er over. */
export function gjeldendeSats(sats: ButikkSats, idag: string): { verdi: number; kampanje: boolean } {
  if (sats.kampanje && sats.kampanje.slutt >= idag) return { verdi: sats.kampanje.verdi, kampanje: true };
  return { verdi: sats.verdi, kampanje: false };
}
