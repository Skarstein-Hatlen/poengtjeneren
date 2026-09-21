import { describe, expect, it } from 'vitest';
import type { Butikk } from '../data/types';
import { gjeldendeSats, sokButikker } from './butikker';

const liste: Butikk[] = [
  { id: 'kicks', navn: 'Kicks', satser: {} },
  { id: 'lyko', navn: 'Lyko', satser: {} },
  { id: 'skickstore', navn: 'Skick Store', satser: {} },
];

describe('sokButikker', () => {
  it('setter treff på starten av navnet først', () => {
    expect(sokButikker(liste, 'kick').map((b) => b.navn)).toEqual(['Kicks', 'Skick Store']);
  });
  it('gir ingenting for tomt søk', () => {
    expect(sokButikker(liste, '  ')).toEqual([]);
  });
});

describe('gjeldendeSats', () => {
  it('bruker kampanjesats til og med sluttdatoen', () => {
    const sats = { verdi: 25, kampanje: { verdi: 50, slutt: '2026-09-27' }, kilde: '' };
    expect(gjeldendeSats(sats, '2026-09-27')).toEqual({ verdi: 50, kampanje: true });
    expect(gjeldendeSats(sats, '2026-09-28')).toEqual({ verdi: 25, kampanje: false });
  });
});
