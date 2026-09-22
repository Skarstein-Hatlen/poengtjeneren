// Skriver butikkdomenene fra stores.json og partners.json inn i utvidelsens manifest, så
// butikkortet (extension/butikk.js) bare kjører på nettbutikker vi faktisk har satser for.
// Lager også manifest.firefox.json med det Firefox trenger (bakgrunnsscript i stedet for
// service worker og en utvidelses-id). Kjøres av `npm run utvidelse` og av den daglige jobben.

import { readFile, writeFile } from 'node:fs/promises';

const rot = new URL('../', import.meta.url);
const les = async (sti) => JSON.parse(await readFile(new URL(sti, rot), 'utf8'));

const stores = await les('src/data/stores.json');
const partnere = await les('src/data/partners.json');
const manifestUrl = new URL('extension/manifest.json', rot);
const manifest = JSON.parse(await readFile(manifestUrl, 'utf8'));

const domener = new Set();
for (const fil of [stores, partnere]) {
  for (const liste of Object.values(fil.land ?? {})) {
    for (const b of liste) if (b.domene && /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(b.domene)) domener.add(b.domene.toLowerCase());
  }
}
const matches = [...domener].sort().map((d) => `*://*.${d}/*`);

// Bytt ut (eller legg til) innholdsscriptet for butikksidene – kjennes igjen på butikk.js.
const butikkScript = { matches, js: ['felles.js', 'butikk.js'], run_at: 'document_idle' };
const andre = (manifest.content_scripts ?? []).filter((c) => !(c.js ?? []).includes('butikk.js'));
manifest.content_scripts = [...andre, butikkScript];

const json = (o) => `${JSON.stringify(o, null, 2)}\n`;
await writeFile(manifestUrl, json(manifest));

// Firefox: samme kode, men bakgrunnen er et vanlig script og utvidelsen trenger en id.
const firefox = {
  ...manifest,
  background: { scripts: ['felles.js', 'bakgrunn.js'] },
  browser_specific_settings: { gecko: { id: 'utvidelse@pointmaxing.no', strict_min_version: '121.0' } },
};
await writeFile(new URL('extension/manifest.firefox.json', rot), json(firefox));

console.log(`Utvidelsen: ${matches.length} butikkdomener i manifestet, manifest.firefox.json skrevet`);
