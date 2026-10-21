import { describe, expect, it } from 'vitest';
import type { Maling } from '../data/types';
import { vurderSats } from './vurdering';

describe('vurderSats', () => {
  it('finner toppen når satsen er den høyeste i perioden', () => {
    const m: Maling[] = [['2026-09-21', 3.9], ['2026-10-01', 2.5], ['2026-10-15', 6.2]];
    expect(vurderSats(m, '2026-10-20')).toMatchObject({ type: 'topp', fra: '2026-09-21', maks: 6.2, min: 2.5 });
  });

  it('sier lav når satsen er den laveste, og husker toppen', () => {
    const m: Maling[] = [['2026-09-21', 6.2], ['2026-10-18', 3.9]];
    expect(vurderSats(m, '2026-10-20')).toMatchObject({ type: 'lav', naa: 3.9, maks: 6.2 });
  });

  it('sier uendret uten endringer', () => {
    expect(vurderSats([['2026-09-21', 3]], '2026-10-20')?.type).toBe('uendret');
  });

  it('ser bare på perioden, men tar med satsen som gjaldt ved starten', () => {
    const m: Maling[] = [['2026-01-01', 9], ['2026-06-01', 4], ['2026-10-01', 5]];
    const v = vurderSats(m, '2026-10-20', 90);
    expect(v).toMatchObject({ type: 'topp', maks: 5, min: 4, fra: '2026-07-22' });
  });

  it('gir ingen vurdering når programmet ikke har butikken lenger', () => {
    expect(vurderSats([['2026-09-21', 3], ['2026-10-07', null]], '2026-10-20')).toBeNull();
  });
});
