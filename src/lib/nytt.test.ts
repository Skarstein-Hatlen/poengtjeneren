import { describe, expect, it } from 'vitest';
import type { Butikk, Program } from '../data/types';
import { finnEndringer, finnKampanjer } from './nytt';

const sas = { id: 'sas-online-shopping', kortnavn: 'SAS Shopping', satsEnhet: 'poengPer100' } as Program;
const trumf = { id: 'trumf', kortnavn: 'Trumf', satsEnhet: 'prosent' } as Program;
const kicks: Butikk = { id: 'kicks', navn: 'Kicks', satser: { 'sas-online-shopping': { verdi: 25, kampanje: { verdi: 50, slutt: '2026-09-27' }, kilde: '' }, trumf: { verdi: 6.2, kilde: '' } } };
const lyko: Butikk = { id: 'lyko', navn: 'Lyko', satser: { 'sas-online-shopping': { verdi: 25, kampanje: { verdi: 30, slutt: '2026-09-20' }, kilde: '' } } };

describe('finnKampanjer', () => {
  it('tar bare med kampanjer som ikke er over', () => {
    const k = finnKampanjer([kicks, lyko], [sas, trumf], '2026-09-22');
    expect(k.map((x) => x.butikk.id)).toEqual(['kicks']);
    expect(k[0].naa).toBe(50);
    expect(k[0].normalt).toBe(25);
  });
});

describe('finnEndringer', () => {
  it('finner siste endring innen 30 dager, ikke første måling', () => {
    const historikk = {
      kicks: { trumf: [['2026-08-01', 4.6], ['2026-09-15', 6.2]] as [string, number][] },
      lyko: { 'sas-online-shopping': [['2026-09-01', 25]] as [string, number][] },
    };
    const e = finnEndringer([kicks, lyko], [sas, trumf], historikk, '2026-09-22');
    expect(e).toHaveLength(1);
    expect(e[0]).toMatchObject({ fra: 4.6, til: 6.2, dato: '2026-09-15' });
  });

  it('hopper over gamle endringer', () => {
    const historikk = { kicks: { trumf: [['2026-01-01', 4.6], ['2026-02-01', 6.2]] as [string, number][] } };
    expect(finnEndringer([kicks], [trumf], historikk, '2026-09-22')).toHaveLength(0);
  });
});
