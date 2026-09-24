// Logoene på Reise-siden: Avis, SAS, Sixt og flyforsinkelsestjenesten i hvert land.
// Lagres under public/logos/reise/. Kjøres med `npm run reiselogoer` når noe endres.

import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const MAPPE = new URL('../public/logos/reise/', import.meta.url);
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36';
const hent = async (url) => {
  const svar = await fetch(url, { headers: { 'user-agent': UA } });
  if (!svar.ok) throw new Error(`${url}: HTTP ${svar.status}`);
  return Buffer.from(await svar.arrayBuffer());
};
/** Trim luft rundt logoen og lagre som 240×96 webp. */
const lagre = async (fil, bilde) => {
  const trimmet = await sharp(bilde, { density: 300 }).ensureAlpha().trim({ threshold: 12 }).toBuffer();
  await sharp(trimmet).resize(240, 96, { fit: 'inside' }).webp({ quality: 90 }).toFile(fileURLToPath(new URL(fil, MAPPE)));
};
/** Bare det fargede ikonet til venstre i logoen (teksten er hvit og står uansett ved siden av på siden). */
const bareIkon = async (bilde) => {
  const { data, info } = await sharp(bilde).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const farget = (i) => Math.max(data[i], data[i + 1], data[i + 2]) - Math.min(data[i], data[i + 1], data[i + 2]) > 60 && data[i + 3] > 128;
  let ikonSlutt = -1;
  for (let i = 0; i < data.length; i += 4) if (farget(i)) ikonSlutt = Math.max(ikonSlutt, (i / 4) % info.width);
  return sharp(bilde).extract({ left: 0, top: 0, width: Math.min(info.width, ikonSlutt + 2), height: info.height }).png().toBuffer();
};

await mkdir(MAPPE, { recursive: true });

// Avis' og SAS' logo fra Avis' EuroBonus-side.
// Avis-logoen er hvit på siden deres; den får Avis-rødt her.
const avis = (await hent('https://avisassets.abgemea.com/.resources/avis-pattern-library/ui/public/img/avis-logo.svg')).toString('utf8');
await lagre('avis.webp', Buffer.from(avis.replaceAll('#ffffff', '#d4002a').replaceAll('#FFFFFF', '#d4002a')));
await lagre('sas.webp', await hent('https://avisassets.abgemea.com/dam/jcr:8bd9d27d-f173-41a6-9dd0-1aca9932ded9/sas_mainlogo.png'));

// Sixt: ordmerket fra sixt.com/favicon.svg (sidene deres stenger for skript), i Sixts oransje.
const SIXT = [
  'M427.923 384.856C410.166 387.17 386.282 387.159 366.954 386.993V450.883H403.045C452.368 450.883 571.807 440.249 607.521 323.757H531.322C508.855 368.093 470.494 379.405 427.923 384.856Z',
  'M902 373.997V439.989H827.689V637.353H750.059V439.989H691.935L641.165 512.221L740.632 637.35H644.103L590 563.923L533.123 637.35L366.95 637.353V472.495H443.001V631.244L540.891 512.221L500.59 462.255C506.537 460.269 513.119 457.707 518.751 455.327C537.262 447.505 553.516 435.579 568.064 423.642L590 455.013L649.197 373.997H902ZM226.806 643.867C302.936 643.523 352.579 620.238 352.579 557.588C352.579 445.503 196.606 493.301 196.606 449.251C196.606 434.119 213.072 428.026 237.617 428.026C267.684 428.026 306.469 438.149 336.545 447.899V384.307C311.568 377.132 275.981 368.971 237.391 368.971C150.474 368.971 122.099 409.897 122 454.198C121.75 566.649 275.381 518.763 275.381 562.446C275.381 577.154 259.091 583.762 226.492 583.787C194.405 583.787 160.103 575.992 124.862 564.355V627.933C144.192 635.791 174.739 643.867 226.806 643.867Z',
];
await writeFile(
  new URL('sixt.svg', MAPPE),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="112 314 800 340" width="800" height="340">${SIXT.map((d) => `<path d="${d}" fill="#ff5000"/>`).join('')}</svg>\n`,
);

// Flyforsinkelser.no / Flygforsening.se / Flyforsinkelse.dk: ikonet fra logoen i toppen av siden.
for (const [land, side] of [['no', 'https://flyforsinkelser.no/'], ['se', 'https://www.flygforsening.se/'], ['dk', 'https://www.flyforsinkelse.dk/']]) {
  const html = (await hent(side)).toString('utf8');
  const filer = [...html.matchAll(/\/assets\/new_design\/logos\/ff_new_logos_[a-z]{2}_white-(\d+)-[^"'\s,]+\.png/g)];
  const sti = filer.sort((a, b) => Number(b[1]) - Number(a[1]))[0]?.[0];
  if (!sti) {
    console.error(`${land}: fant ikke logoen`);
    continue;
  }
  await lagre(`flyforsinkelser-${land}.webp`, await bareIkon(await hent(new URL(sti, side).href)));
}
console.log('Reiselogoer lagret i public/logos/reise/');
