import { describe, expect, it } from 'vitest';
import { TEKSTER, tekst } from './i18n';

const plassholdere = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('oversettelser', () => {
  it('finnes på alle tre språk med samme plassholdere', () => {
    for (const [nokkel, o] of Object.entries(TEKSTER)) {
      expect(o.nb, nokkel).toBeTruthy();
      expect(o.sv, nokkel).toBeTruthy();
      expect(o.da, nokkel).toBeTruthy();
      expect(plassholdere(o.sv), nokkel).toEqual(plassholdere(o.nb));
      expect(plassholdere(o.da), nokkel).toEqual(plassholdere(o.nb));
    }
  });

  it('fyller inn verdier', () => {
    expect(tekst('SE', 'alle', { n: 534 })).toBe('Alla 534 →');
    expect(tekst('DK', 'konklusjonMer', { a: 'Klarna', n: '983', b: 'SAS Shopping' })).toBe('Klarna giver 983 point mere end SAS Shopping.');
  });
});
