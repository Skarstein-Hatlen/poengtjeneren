// Daglig sjekk av kortene: henter utstedernes egne sider og ser at prisen og poengsatsen vi
// oppgir fortsatt står der (`sjekk`-tekstene i cards.json), og at Klarnas medlemskapspriser
// fortsatt står på medlemskapssidene. Skriver et avvik per linje og avslutter med feilkode
// hvis noe mangler – den daglige jobben lager da et issue.

import { readFile } from 'node:fs/promises';

const les = async (sti) => JSON.parse(await readFile(new URL(sti, import.meta.url), 'utf8'));
const kort = await les('../src/data/cards.json');
const { programmer } = await les('../src/data/programs.json');
const hverdag = await les('../src/data/hverdag.json');

// Hvert medlemskap har sin egen side hos Klarna: /no/medlemskap/plus/, /premium/, /max/ osv.
const KLARNA_SIDER = { klarna: 'https://www.klarna.com/no/medlemskap/', 'klarna-se': 'https://www.klarna.com/se/medlemskap/', 'klarna-dk': 'https://www.klarna.com/dk/medlemskab/' };
const ENTITETER = { nbsp: ' ', aring: 'å', oslash: 'ø', aelig: 'æ', auml: 'ä', ouml: 'ö', Aring: 'Å', Oslash: 'Ø', Aelig: 'Æ', Auml: 'Ä', Ouml: 'Ö', amp: '&', quot: '"' };
const normaliser = (s) =>
  s
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, navn) => ENTITETER[navn] ?? m)
    .replace(/\s+/g, ' ')
    .toLowerCase();

// Noen sider avviser ukjente nettlesere med 403 – da prøves det én gang til som vanlig Chrome.
const CHROME = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36';
const hentSide = async (url, ua) => fetch(url, { headers: { 'user-agent': ua, 'accept-language': 'nb-NO,sv-SE,da-DK' } });
const sider = new Map();
async function side(url) {
  if (!sider.has(url)) {
    sider.set(
      url,
      hentSide(url, 'Mozilla/5.0 (pointmaxing.no)')
        .then((svar) => (svar.status === 403 ? hentSide(url, CHROME) : svar))
        .then(async (svar) => (svar.ok ? normaliser(await svar.text()) : Promise.reject(new Error(`HTTP ${svar.status}`))))
        .catch((e) => ({ feil: e.message })),
    );
  }
  return sider.get(url);
}

const avvik = [];
let sjekket = 0;

for (const k of kort) {
  if (!k.sjekk?.length) continue;
  const tekst = await side(k.kilde);
  if (tekst.feil) {
    avvik.push(`${k.id}: fikk ikke hentet ${k.kilde} (${tekst.feil})`);
    continue;
  }
  for (const snutt of k.sjekk) {
    sjekket++;
    if (!tekst.includes(normaliser(snutt))) avvik.push(`${k.id}: fant ikke «${snutt}» på ${k.kilde}`);
  }
}

for (const [id, base] of Object.entries(KLARNA_SIDER)) {
  const p = programmer.find((x) => x.id === id);
  if (!p) continue;
  for (const n of p.nivaer.filter((x) => x.prisPerMnd > 0)) {
    const url = `${base}${n.id}/`;
    const tekst = await side(url);
    sjekket++;
    if (tekst.feil) avvik.push(`${id}: fikk ikke hentet ${url} (${tekst.feil})`);
    else if (!tekst.includes(`${n.prisPerMnd} kr`)) avvik.push(`${id}: fant ikke prisen «${n.prisPerMnd} kr» for ${n.navn} på ${url}`);
  }
}

// Hverdag: Trumf Kredittkort (bonus på dagligvare og Talkmore, gratis).
for (const h of Object.values(hverdag)) {
  const k = h.kort;
  if (!k?.sjekk?.length) continue;
  const tekst = await side(k.kilde);
  if (tekst.feil) {
    avvik.push(`${k.navn}: fikk ikke hentet ${k.kilde} (${tekst.feil})`);
    continue;
  }
  for (const snutt of k.sjekk) {
    sjekket++;
    if (!tekst.includes(normaliser(snutt))) avvik.push(`${k.navn}: fant ikke «${snutt}» på ${k.kilde}`);
  }
}

if (avvik.length) {
  console.log(`Kortsjekk: ${avvik.length} avvik av ${sjekket} sjekker\n`);
  for (const a of avvik) console.log(`- ${a}`);
  process.exit(1);
}
console.log(`Kortsjekk: alle ${sjekket} sjekker i orden`);
