import { describe, expect, it } from 'vitest';
import { hentData } from '../data';
import { beregnAlle, beregnProgram, butikkProsent, effektivProsent, type ProgramValg } from './calc';
import { parseTall } from './format';

const data = hentData();
const norske = data.programmer.filter((p) => p.land === 'NO');
const trumf = data.programmer.find((p) => p.id === 'trumf')!;
const klarna = data.programmer.find((p) => p.id === 'klarna')!;
const sasOs = data.programmer.find((p) => p.id === 'sas-online-shopping')!;
const amexClassic = data.kort.find((k) => k.id === 'sas-amex-classic')!;

describe('Trumf', () => {
  it('5 % av 1 000 kr med automatisk overføring gir 675 poeng', () => {
    const r = beregnProgram(trumf, { programId: 'trumf', aktiv: true, sats: 5, konverteringId: 'automatisk' }, 1000, null);
    expect(r.opptjentKr).toBe(50);
    expect(r.programPoeng).toBe(675);
    expect(r.per100).toBe(67.5);
    expect(r.status).toBe('verifisert');
  });

  it('engangsoverføring gir 10 poeng per krone', () => {
    const r = beregnProgram(trumf, { programId: 'trumf', aktiv: true, sats: 5, konverteringId: 'engangs' }, 1000, null);
    expect(r.programPoeng).toBe(500);
  });

  it('betalingskort legges oppå', () => {
    const r = beregnProgram(trumf, { programId: 'trumf', aktiv: true, sats: 5, konverteringId: 'automatisk' }, 1000, amexClassic);
    expect(r.kortPoeng).toBe(100);
    expect(r.total).toBe(775);
  });
});

describe('Klarna', () => {
  it('Klarna Max alene: 100 kr gir 150 Klarna-poeng = 18,42 EuroBonus-poeng', () => {
    const r = beregnProgram(klarna, { programId: 'klarna', aktiv: true, sats: 0, nivaId: 'max' }, 100, null);
    expect(r.opptjentKr).toBe(1.5); // 150 Klarna-poeng
    expect(r.programPoeng).toBeCloseTo(18.42, 5);
  });

  it('Kicks 3 % blir 12 % med Max, pluss 1,5 %: 135 kr cashback vekslet til 12,28 poeng per kr', () => {
    const r = beregnProgram(klarna, { programId: 'klarna', aktiv: true, sats: 3, nivaId: 'max' }, 1000, amexClassic);
    expect(r.butikkFaktor).toBe(4);
    expect(r.effektivSats).toBe(13.5);
    expect(r.opptjentKr).toBe(135);
    expect(r.programPoeng).toBeCloseTo(1657.8, 5);
    expect(r.kortPoeng).toBe(0); // kort gir ikke poeng når kjøpet går via Klarna
    expect(r.status).toBe('uverifisert'); // vekslingssatsen er ikke publisert av Klarna
  });

  it('Plus ganger med 2 og legger til 0,5 %; egen vekslingssats overstyrer', () => {
    const r = beregnProgram(klarna, { programId: 'klarna', aktiv: true, sats: 12, nivaId: 'plus', egenPoengPerKrone: 10 }, 1000, null);
    expect(r.butikkFaktor).toBe(2);
    expect(r.effektivSats).toBe(24.5);
    expect(r.poengPerKrone).toBe(10);
    expect(r.programPoeng).toBe(2450);
  });

  it('Premium ganger med 3', () => {
    const r = beregnProgram(klarna, { programId: 'klarna', aktiv: true, sats: 3, nivaId: 'premium' }, 1000, null);
    expect(r.effektivSats).toBe(10);
  });

  it('satsen kan gis ferdig regnet slik den står i feltet (13,5 % med Max)', () => {
    const r = beregnProgram(klarna, { programId: 'klarna', aktiv: true, sats: 13.5, satsErEffektiv: true, nivaId: 'max' }, 1000, null);
    expect(r.effektivSats).toBe(13.5);
    expect(r.butikkSats).toBe(3);
    expect(r.opptjentKr).toBe(135);
  });

  it('effektivProsent og butikkProsent er hverandres motsats', () => {
    const max = klarna.nivaer.find((n) => n.id === 'max')!;
    expect(effektivProsent(3, max)).toBe(13.5);
    expect(butikkProsent(13.5, max)).toBe(3);
    expect(butikkProsent(1, max)).toBe(0); // under nivåets eget tillegg – aldri negativt
    expect(effektivProsent(3, null)).toBe(3);
  });
});

describe('SAS Online Shopping', () => {
  it('25 poeng per 100 kr av 1 000 kr gir 250 poeng pluss kort', () => {
    const r = beregnProgram(sasOs, { programId: 'sas-online-shopping', aktiv: true, sats: 25 }, 1000, amexClassic);
    expect(r.programPoeng).toBe(250);
    expect(r.kortPoeng).toBe(100);
    expect(r.total).toBe(350);
  });
});

describe('beregnAlle', () => {
  it('tar bare med aktive programmer og sorterer med flest poeng først', () => {
    const valg: ProgramValg[] = [
      { programId: 'trumf', aktiv: true, sats: 5, konverteringId: 'automatisk' },
      { programId: 'klarna', aktiv: true, sats: 12, nivaId: 'max' },
      { programId: 'sas-online-shopping', aktiv: false, sats: 25 },
    ];
    const res = beregnAlle(norske, valg, 1000, null);
    expect(res.map((r) => r.program.id)).toEqual(['klarna', 'trumf']);
  });
});

describe('parseTall', () => {
  it('godtar norsk format', () => {
    expect(parseTall('1 234,5')).toBe(1234.5);
    expect(parseTall('12.5')).toBe(12.5);
    expect(parseTall('')).toBe(0);
    expect(parseTall('abc')).toBe(0);
  });
});
