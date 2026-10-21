import { describe, expect, it } from 'vitest';
import type { Butikk, Kort, Program } from '../data/types';
import { beregnOppsett, manederTil, oreVerdi, velgOppsett, type Oppsett, type PlanData } from './plan';

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

  it('fordeler poengene på Trumf og kortet, uten Klarna for et vanlig kort', () => {
    // Uten kort: Trumf 5 % × 10 = 50 p/100 på netthandel, 1 % × 10 på dagligvare.
    const bare = finn('ingen|ingen');
    expect(bare.deler.trumf).toBeCloseTo(12000 * 0.5 + 60000 * 0.01 * 10);
    expect(bare.deler.kort).toBe(0);
    expect(bare.kostnadAr).toBe(0);
    // Med kortet gir Trumf-kjøpet kortpoeng i tillegg, og dagligvare + kortbruk gir 20 p/100. Ingen Klarna-poeng.
    const medKort = finn('ingen|elite');
    expect(medKort.deler.trumf).toBeCloseTo(12000 * 0.5 + 60000 * 0.01 * 10);
    expect(medKort.deler.kort).toBeCloseTo(12000 * 0.2 + 120000 * 0.2);
    expect(medKort.deler.klarna).toBe(0);
    // Nivåpoeng på alt som betales med kortet, også netthandelen.
    expect(medKort.nivapoengAr).toBeCloseTo(132000 * 0.06);
    expect(medKort.kostnadAr).toBe(6000);
  });

  it('regner Klarna Max som én løsning med Klarna-kortet, og medlemskapet i kostnaden', () => {
    // I Klarna-appen: (2 × 4 + 1,5) × 12 = 114 p/100, mer enn Trumf med Klarna-kortet (50 + 18).
    // Klarna-kortet gir 1,5 % × 12 = 18 p/100 på kortbruk – det er Klarna-cashback, ikke kortpoeng.
    const max = finn('max|klarna-kort-max');
    expect(max.navn).toBe('Klarna Max');
    expect(max.deler.klarna).toBeCloseTo(12000 * 1.14 + 120000 * 0.18);
    expect(max.deler.kort).toBe(0);
    expect(max.kostnadAr).toBe(6000);
  });

  it('blander ikke et kort med et Klarna-medlemskap', () => {
    expect(alle.map((o) => o.id).sort()).toEqual(['ingen|elite', 'ingen|ingen', 'max|klarna-kort-max']);
  });

  it('gir kortpoeng når kjøpet betales rett med kortet, også der bare Klarna gir bonus', () => {
    const bareKlarna: Butikk = { id: 'k', navn: 'K', satser: { klarna: { verdi: 2, kilde: '' } } };
    const elite = beregnOppsett({ ...data, butikker: [bareKlarna] }, { netthandel: 1000, dagligvare: 0, kortbruk: 0 }).find((o) => o.id === 'ingen|elite')!;
    expect(elite.deler.kort).toBeCloseTo(12000 * 0.2);
    expect(elite.deler.klarna).toBe(0);
  });

  it('holder SAS Shopping utenfor – den gir like mange poeng uansett kort', () => {
    const sas = { id: 'sas', kortnavn: 'SAS Shopping', satsEnhet: 'poengPer100', kortlag: true, konverteringer: [], nivaer: [] } as unknown as Program;
    const bareSas: Butikk = { id: 's', navn: 'S', satser: { sas: { verdi: 30, kilde: '' } } };
    const elite = beregnOppsett({ ...data, programmer: [klarna, trumf, sas], butikker: [bareSas] }, { netthandel: 1000, dagligvare: 0, kortbruk: 0 }).find((o) => o.id === 'ingen|elite')!;
    expect(elite.poengAr).toBeCloseTo(12000 * 0.2);
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

  it('finner nesten like mange poeng for langt mindre penger', () => {
    const o = (id: string, poengAr: number, kostnadAr: number) => ({ id, poengAr, kostnadAr, ore: (kostnadAr * 100) / poengAr }) as Oppsett;
    const valg = velgOppsett([o('topp', 100_000, 12_000), o('nesten', 97_000, 6_000), o('dyr', 96_000, 11_000), o('billig', 60_000, 1_500), o('gratis', 40_000, 0)]);
    expect(valg.flest?.id).toBe('topp');
    expect(valg.nesten?.id).toBe('nesten');
    expect(valg.verdi?.id).toBe('billig');
    expect(valg.gratis?.id).toBe('gratis');
    // Sparer for lite: ingen egen rad.
    expect(velgOppsett([o('a', 100_000, 10_000), o('b', 96_000, 9_000)]).nesten).toBeNull();
  });

  it('viser kortet med flest nivåpoeng som egen fordel', () => {
    const o = (id: string, poengAr: number, nivapoengAr: number) => ({ id, poengAr, kostnadAr: 1000, ore: 1, nivapoengAr }) as Oppsett;
    expect(velgOppsett([o('klarna', 100_000, 0), o('elite', 90_000, 13_000), o('mc', 80_000, 8_000)]).nivapoeng?.id).toBe('elite');
    expect(velgOppsett([o('klarna', 100_000, 0)]).nivapoeng).toBeNull();
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
