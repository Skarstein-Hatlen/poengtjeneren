// Henter dagens tall til videoene fra den publiserte siden (pointmaxing.no/api/butikker.json) og kopierer
// butikklogoen, så videoen alltid viser de samme tallene som siden. Bruk: node hent-data.mjs [butikk-id]

import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';

const id = process.argv[2] ?? 'lyko';
const api = await (await fetch('https://pointmaxing.no/api/butikker.json')).json();
const b = api.land.NO.find((x) => x.id === id);
if (!b) throw new Error(`Fant ikke ${id} i Norge`);

const navnFor = (pid) => {
  const p = api.programmer[pid];
  return p.nivaer.some((n) => n.id === 'max') ? `${p.navn} Max` : p.navn;
};
// Flest poeng sist, så vinneren kommer til slutt.
const rader = Object.entries(b.satser)
  .filter(([, s]) => s.per100 !== null)
  .map(([pid, s]) => ({ navn: navnFor(pid), farge: api.programmer[pid].farge, poeng: Math.round(s.per100 * 10), opptil: s.tekst.startsWith('≤') }))
  .sort((a, c) => a.poeng - c.poeng);
if (rader.length < 2) throw new Error(`${b.navn} har bare ${rader.length} program`);

const stores = JSON.parse(await readFile(new URL('../src/data/stores.json', import.meta.url), 'utf8'));
const logo = stores.land.NO.find((x) => x.id === id)?.logo;
let logoFil = null;
if (logo) {
  await mkdir(new URL('public/logoer/', import.meta.url), { recursive: true });
  logoFil = `logoer/${id}${logo.slice(logo.lastIndexOf('.'))}`;
  await copyFile(new URL(`../public${logo}`, import.meta.url), new URL(`public/${logoFil}`, import.meta.url));
}

const butikkerTotalt = Object.values(api.land).reduce((n, l) => n + l.length, 0);
await writeFile(
  new URL('src/data.json', import.meta.url),
  `${JSON.stringify({ hentet: api.hentet, butikk: { id, navn: b.navn, logo: logoFil }, belop: 1000, rader, butikkerTotalt }, null, 2)}\n`,
);
console.log(`${b.navn}: ${rader.map((r) => `${r.navn} ${r.poeng}`).join(', ')} (hentet ${api.hentet})`);
