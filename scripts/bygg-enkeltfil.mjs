// Pakker Vite-bygget (dist/) til én HTML-fil med CSS og JS inline: dist/poengtjeneren.html.
// Brukes til å publisere som artifact eller sende som én fil. Kjør etter `npm run build`.

import { readFile, writeFile } from 'node:fs/promises';

const dist = new URL('../dist/', import.meta.url);
const html = await readFile(new URL('index.html', dist), 'utf8');

const css = html.match(/<link rel="stylesheet"[^>]*href="\.?\/?([^"]+\.css)"/)?.[1];
const js = html.match(/<script type="module"[^>]*src="\.?\/?([^"]+\.js)"/)?.[1];
if (!css || !js) throw new Error('Fant ikke CSS/JS i dist/index.html – kjør npm run build først.');

const stil = await readFile(new URL(css, dist), 'utf8');
// «</script>» inne i JS-en ville avsluttet script-taggen for tidlig.
const kode = (await readFile(new URL(js, dist), 'utf8')).replace(/<\/script/gi, '<\\/script');
const tittel = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? 'Poengtjeneren';

const ut = `<title>${tittel}</title>
<style>
${stil}
</style>
<div id="root"></div>
<script type="module">
${kode}
</script>
`;
await writeFile(new URL('poengtjeneren.html', dist), ut);
console.log(`Skrev dist/poengtjeneren.html (${Math.round(ut.length / 1024)} kB)`);
