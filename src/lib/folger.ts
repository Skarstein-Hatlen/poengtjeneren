import type { Land } from '../data/types';

const NOKKEL = 'pointmaxing.folger';

export type Folger = Partial<Record<Land, string[]>>;

/**
 * Butikkene brukeren følger, per land, lagret i nettleseren. Utvidelsen leser samme nøkkel
 * (extension/synk.js) og varsler når satsen hos en fulgt butikk går opp.
 */
export function lesFolger(): Folger {
  try {
    const p = JSON.parse(localStorage.getItem(NOKKEL) ?? 'null') as unknown;
    if (!p || typeof p !== 'object') return {};
    const ut: Folger = {};
    for (const [land, liste] of Object.entries(p as Record<string, unknown>)) {
      if (Array.isArray(liste)) ut[land as Land] = liste.filter((x): x is string => typeof x === 'string');
    }
    return ut;
  } catch {
    return {};
  }
}

export function skrivFolger(f: Folger): void {
  try {
    localStorage.setItem(NOKKEL, JSON.stringify(f));
  } catch {
    /* lagring er bare en bekvemmelighet */
  }
}

/** Ny liste med butikken lagt til eller fjernet. */
export function vekslFolg(f: Folger, land: Land, id: string): Folger {
  const liste = f[land] ?? [];
  return { ...f, [land]: liste.includes(id) ? liste.filter((x) => x !== id) : [...liste, id] };
}
