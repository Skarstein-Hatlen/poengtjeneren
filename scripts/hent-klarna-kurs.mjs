// Henter Klarnas vekslingskurs til SAS EuroBonus fra medlemskapssidene (Norge, Sverige, Danmark)
// og skriver den inn i programs.json. Siden viser «12,31 SAS EuroBonus-poeng per 100 cashback-poeng»;
// 100 cashback-poeng er 1 kr cashback, så tallet er poeng per krone. Kjøres av den daglige jobben.

import { readFile, writeFile } from 'node:fs/promises';

const FIL = new URL('../src/data/programs.json', import.meta.url);
const KILDER = {
  klarna: 'https://www.klarna.com/no/medlemskap/plus/',
  'klarna-se': 'https://www.klarna.com/se/medlemskap/plus/',
  'klarna-dk': 'https://www.klarna.com/dk/medlemskab/plus/',
};
const idag = new Date().toISOString().slice(0, 10);

async function hentKurs(url) {
  const svar = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (pointmaxing.no)', 'accept-language': 'nb-NO,sv-SE,da-DK' } });
  if (!svar.ok) throw new Error(`${url}: HTTP ${svar.status}`);
  const html = await svar.text();
  // Tallet står både i sidens data («"label":"SAS EuroBonus","description":"12,31 SAS EuroBonus-poeng per 100 cashback-poeng"») og i teksten.
  const m = html.match(/"label":"SAS EuroBonus","description":"(\d+(?:[.,]\d+)?) SAS EuroBonus[^"]*per 100 cashback/i) ?? html.match(/(\d+(?:[.,]\d+)?) SAS EuroBonus[- ]?(?:poeng|poäng|point) per 100 cashback/i);
  if (!m) throw new Error(`${url}: fant ikke vekslingskursen`);
  return Number(m[1].replace(',', '.'));
}

const data = JSON.parse(await readFile(FIL, 'utf8'));
let endret = false;
for (const [id, url] of Object.entries(KILDER)) {
  const program = data.programmer.find((p) => p.id === id);
  const konv = program?.konverteringer[0];
  if (!konv) continue;
  try {
    const kurs = await hentKurs(url);
    if (kurs <= 0 || kurs > 100) throw new Error(`${url}: urimelig kurs ${kurs}`);
    const ny = { ...konv, poengPerKrone: kurs, status: 'verifisert', kilde: url, sistVerifisert: idag };
    delete ny.merknad;
    if (JSON.stringify(ny) !== JSON.stringify(konv)) {
      console.log(`${id}: ${konv.poengPerKrone ?? '–'} → ${kurs} poeng per krone (${url})`);
      program.konverteringer[0] = ny;
      endret = true;
    } else {
      console.log(`${id}: uendret, ${kurs} poeng per krone`);
    }
  } catch (e) {
    // Feiler henting, beholdes forrige kurs – den er datert i sistVerifisert.
    console.error(`${id}: ${e.message}`);
  }
}
if (endret) {
  data.sistOppdatert = idag;
  await writeFile(FIL, JSON.stringify(data, null, 2) + '\n');
  console.log('programs.json oppdatert');
}
