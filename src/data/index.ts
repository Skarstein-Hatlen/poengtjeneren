import programmerJson from './programs.json';
import kortJson from './cards.json';
import butikkerJson from './stores.json';
import partnereJson from './partners.json';
import type { Butikk, Butikkfil, Datasett, Kort, Land, LandInfo, Program } from './types';

export const LAND: Land[] = ['NO', 'SE', 'DK'];

/** Slår butikklistene sammen på id; satser fra begge, logo fra den første som har. */
function slaSammen(...lister: Butikk[][]): Butikk[] {
  const map = new Map<string, Butikk>();
  for (const liste of lister) {
    for (const b of liste) {
      const e = map.get(b.id);
      if (e) {
        Object.assign(e.satser, b.satser);
        if (!e.logo && b.logo) e.logo = b.logo;
      } else {
        map.set(b.id, { ...b, satser: { ...b.satser } });
      }
    }
  }
  return [...map.values()].sort((a, b) => a.navn.localeCompare(b.navn, 'nb'));
}

// Eneste stedet som vet hvor satsene kommer fra. Skal data hentes fra et API
// eller en database senere, er det bare denne funksjonen som må byttes ut.
// stores.json fylles av `npm run hent`; partners.json vedlikeholdes for hånd
// (partnere uten åpen liste, f.eks. Wolt).
export function hentData(): Datasett {
  const hentet = butikkerJson as Butikkfil;
  const partnere = partnereJson as Butikkfil;
  const butikker = {} as Record<Land, Butikk[]>;
  for (const land of LAND) butikker[land] = slaSammen(hentet.land[land] ?? [], partnere.land[land] ?? []);
  return {
    sistOppdatert: programmerJson.sistOppdatert,
    hentet: hentet.hentet,
    landInfo: programmerJson.land as Record<Land, LandInfo>,
    programmer: programmerJson.programmer as Program[],
    kort: kortJson as Kort[],
    butikker,
  };
}
