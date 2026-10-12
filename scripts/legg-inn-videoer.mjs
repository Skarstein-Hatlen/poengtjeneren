// Legger ukens videoer (video/out/*.mp4) inn på /some: kopierer filene til dist/some/video/ og fjerner videoavsnittene
// og -adressene for videoer som mangler, så /some og poster.json aldri peker på en fil som ikke finnes.
// Kjøres av deploy.yml etter at videoene er laget.

import { copyFile, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';

const kilde = new URL('../video/out/', import.meta.url);
const some = new URL('../dist/some/', import.meta.url);
const videoer = (await readdir(kilde).catch(() => [])).filter((f) => f.endsWith('.mp4'));

await mkdir(new URL('video/', some), { recursive: true });
for (const f of videoer) await copyFile(new URL(f, kilde), new URL(`video/${f}`, some));

const finnes = (id) => videoer.includes(`${id}.mp4`);
const side = new URL('index.html', some);
const html = await readFile(side, 'utf8');
await writeFile(side, html.replace(/<!--video:([\w-]+)-->[\s\S]*?<!--\/video-->\n?/g, (blokk, id) => (finnes(id) ? blokk : '')));

const manifest = new URL('poster.json', some);
const poster = JSON.parse(await readFile(manifest, 'utf8'));
for (const p of poster.poster) if (p.video && !finnes(p.video.split('/').pop().replace(/\.mp4$/, ''))) p.video = null;
await writeFile(manifest, JSON.stringify(poster, null, 2));

console.log(`Videoer på /some: ${videoer.length ? videoer.join(', ') : 'ingen'}`);
