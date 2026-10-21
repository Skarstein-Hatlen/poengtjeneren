import { describe, expect, it } from 'vitest';
import type { Butikk, Kort, Program } from '../data/types';
import { beregnOppsett, manederTil, oreVerdi, velgOppsett, type PlanData } from './plan';

const klarna = {
  id: 'klarna',
  kortnavn: 'Klarna',
  satsEnhet: 'prosent',
  kortlag: false,
  konverteringer: [{ id: 'app', poengPerKrone: 12 }],
  nivaer: [
    { id: 'ingen', navn: 'Ingen', ekstraProsent: 0, butikkFaktor: 1, kanVeksle: false, prisPerMnd: 0 },
    { id: 'max', navn: 'Max', ekstraProsent: 1.5, butikkFaktor: 4, prisPerMnd: 500 },
  ],
} as unknown as Program;
const trumf = { id: 'trumf', kortnavn: 'Trumf', satsEnhet: 'prosent', kortlag: true, konverteringer: [{ id: 'a', poengPerKrone: 10 }], nivaer: [] } as unknown as Program;
const kort = { id: 'elite', navn: 'Elite', poengPer100: 20, prisPerMnd: 500, status: 'verifisert', nivaapoengPer100: 6 } as Kort;
const butikk: Butikk = { id: 'b', navn: 'B', satser: { klarna: { verdi: 2, kilde: '' }, trumf: { verdi: 5, kilde: '' } } };

const data: PlanData = { programmer: [klarna, trumf], butikker: [butikk], kort: [kort], dagligvareProsent: 1, trumfKort: null, idag: '2026-10-21' };

describe('beregnOppsett', () => {
  const alle = beregnOppsett(data, { netthandel: 1000, dagligvare: 5000, kortbruk: 5000 });
  const finn = (id: string) => alle.find((o) => o.id === id)!;

  it('regner netthandel, Trumf på dagligvare og kortpoeng for hver kombinasjon', () => {
    // Uten Klarna og uten kort: Trumf 5 % × 10 = 50 p/100 på netthandel, 1 % × 10 på dagligvare.
    const bare = finn('ingen|ingen');
    expect(bare.deler.netthandel).toBeCloseTo(12000 * 0.5);
    expect(bare.deler.dagligvare).toBeCloseTo(60000 * 0.01 * 10);
    expect(bare.kostnadAr).toBe(0);
    // Med kortet gir Trumf-kjøpet kortpoeng i tillegg, og dagligvare + kortbruk gir 20 p/100.
    const medKort = finn('ingen|elite');
    expect(medKort.deler.netthandel).toBeCloseTo(12000 * 0.7);
    expect(medKort.deler.kort).toBeCloseTo(120000 * 0.2);
    expect(medKort.nivapoengAr).toBeCloseTo(120000 * 0.06);
    expect(medKort.kostnadAr).toBe(6000);
  });

  it('bruker Klarna Max når det gir mest, og regner med medlemskapet i kostnaden', () => {
    // Klarna Max: (2 × 4 + 1,5) × 12 = 114 p/100, mer enn Trumf.
    const max = finn('max|ingen');
    expect(max.deler.netthandel).toBeCloseTo(12000 * 1.14);
    expect(max.kostnadAr).toBe(6000);
    // Klarna-kortet gir 1,5 % × 12 = 18 p/100 på kortbruk.
    const maxKort = finn('max|klarna-kort-max');
    expect(maxKort.deler.kort).toBeCloseTo(120000 * 0.18);
  });

  it('sorterer med flest poeng først og regner øre per poeng', () => {
    expect(alle[0].poengAr).toBeGreaterThanOrEqual(alle[1].poengAr);
    const o = finn('ingen|elite');
    expect(o.ore).toBeCloseTo((6000 * 100) / o.poengAr);
  });

  it('velger flest poeng, best verdi og gratis', () => {
    const { flest, gratis } = velgOppsett(alle);
    expect(flest?.id).toBe(alle[0].id);
    expect(gratis?.kostnadAr).toBe(0);
  });
});

describe('manederTil og oreVerdi', () => {
  it('regner måneder til målet', () => {
    expect(manederTil(12000, 24000)).toBe(6);
    expect(manederTil(0, 1000)).toBe(0);
    expect(manederTil(1000, 0)).toBeNull();
  });

  it('regner verdien av et poeng i en poengbillett', () => {
    expect(oreVerdi(4000, 30000, 1000)).toBeCloseTo(10);
    expect(oreVerdi(4000, 0, 0)).toBeNull();
  });
});
