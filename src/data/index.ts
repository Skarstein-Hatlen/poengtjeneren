import programmerJson from './programs.json';
import kortJson from './cards.json';
import butikkerJson from './stores.json';
import partnereJson from './partners.json';
import historikkJson from './history.json';
import kampanjerJson from './kampanjer.json';
import flyJson from './flyforsinkelse.json';
import samarbeidJson from './samarbeid.json';
import type { Butikk, Butikkfil, Datasett, Historikk, Kort, Land, LandInfo, Partnerkampanje, Program, Flyforsinkelse, Samarbeidspartner } from './types';

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
// stores.json og history.json fylles av `npm run hent`; partners.json vedlikeholdes for hånd.
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
    historikk: historikkJson as unknown as Historikk,
    kampanjer: (kampanjerJson as { kampanjer: Partnerkampanje[] }).kampanjer,
    fly: flyJson as Flyforsinkelse,
    samarbeid: samarbeidJson as Samarbeidspartner,
  };
}
