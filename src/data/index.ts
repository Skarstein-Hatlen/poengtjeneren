import programmerJson from './programs.json';
import kortJson from './cards.json';
import butikkerJson from './stores.json';
import partnereJson from './partners.json';
import type { Butikk, Butikkliste, Datasett, Kort, Program } from './types';

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
  const hentet = butikkerJson.hentet;
  const partnere = partnereJson as Butikkliste;
  return {
    sistOppdatert: programmerJson.sistOppdatert,
    programmer: programmerJson.programmer as Program[],
    kort: kortJson as Kort[],
    butikker: { hentet, butikker: slaSammen((butikkerJson as Butikkliste).butikker, partnere.butikker) },
  };
}
