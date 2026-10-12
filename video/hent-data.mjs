// Henter tallene til videoene og skriver src/video.json:
// - ukens poster fra pointmaxing.no/some/video.json (samme tall som bildene; --lokal leser ../dist/some/video.json)
// - eksempelet «Samme kjøp» for én butikk fra pointmaxing.no/api/butikker.json (--butikk=lyko)
// Logoer og kortbilder kopieres fra ../public (eller lastes ned fra siden) til public/, med samme sti.

import { access, copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DOMENE = 'https://pointmaxing.no';
const lokal = process.argv.includes('--lokal');
const id = process.argv.find((a) => a.startsWith('--butikk='))?.slice(9) ?? 'lyko';
const her = (sti) => new URL(sti, import.meta.url);

const uke = lokal ? JSON.parse(await readFile(her('../dist/some/video.json'), 'utf8')) : await (await fetch(`${DOMENE}/some/video.json?t=${Date.now()}`)).json();
const api = await (await fetch(`${DOMENE}/api/butikker.json`)).json();

// Eksempelet: én butikk, flest poeng sist.
const b = api.land.NO.find((x) => x.id === id);
if (!b) throw new Error(`Fant ikke ${id} i Norge`);
const navnFor = (pid) => {
  const p = api.programmer[pid];
  return p.nivaer.some((n) => n.id === 'max') ? `${p.navn} Max` : p.navn;
};
const stores = JSON.parse(await readFile(her('../src/data/stores.json'), 'utf8'));
const eksempel = {
  butikk: { id, navn: b.navn.replace(/\s+(NO|SE|DK)$/i, ''), logo: stores.land.NO.find((x) => x.id === id)?.logo ?? null },
  rader: Object.entries(b.satser)
    .filter(([, s]) => s.per100 !== null)
    .map(([pid, s]) => ({ navn: navnFor(pid), farge: api.programmer[pid].farge, poeng: Math.round(s.per100 * 10), opptil: s.tekst.startsWith('≤') }))
    .sort((a, c) => a.poeng - c.poeng),
  belop: 1000,
};

// Alle bildestier i dataene → kopier dem til public/.
const stier = new Set();
JSON.stringify({ uke, eksempel }, (k, v) => {
  if ((k === 'logo' || k === 'bilde') && typeof v === 'string' && v.startsWith('/')) stier.add(v);
  return v;
});
const finnes = (u) => access(u).then(() => true, () => false);
for (const sti of stier) {
  const mål = her(`public${sti}`);
  await mkdir(dirname(fileURLToPath(mål)), { recursive: true });
  if (await finnes(her(`../public${sti}`))) await copyFile(her(`../public${sti}`), mål);
  else {
    const svar = await fetch(`${DOMENE}${sti}`);
    if (svar.ok) await writeFile(mål, Buffer.from(await svar.arrayBuffer()));
  }
}

await writeFile(her('src/video.json'), `${JSON.stringify({ ...uke, eksempel }, null, 2)}\n`);
console.log(`Uke ${uke.uke} (laget ${uke.laget}), ${stier.size} bilder. Eksempel: ${eksempel.butikk.navn} ${eksempel.rader.map((r) => `${r.navn} ${r.poeng}`).join(', ')}`);
