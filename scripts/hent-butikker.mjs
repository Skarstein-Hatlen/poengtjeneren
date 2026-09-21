// Henter butikksatser fra Trumf Netthandel, SAS Online Shopping og Klarna for
// Norge, Sverige og Danmark, og skriver dem til src/data/stores.json.
//
//   node scripts/hent-butikker.mjs
//
// Kilder:
// - Trumf (bare Norge): HTML-fragmentene siden selv laster («/category/paged/all/60/<side>/popularity»).
// - SAS: JSON-API-et portalen bruker (onlineshopping.loyaltykey.com), per land.
// - Klarna: katalog-API-et bak klarna.com/<land>/store/?type=CASHBACK (alle butikker med cashback).

import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const HODER = { 'user-agent': 'Mozilla/5.0 (Pointmaxing; henter offentlige satser)', accept: 'application/json, text/html' };
const UT = new URL('../src/data/stores.json', import.meta.url);
// Logoene lagres lokalt, trimmet for luft og i samme format, så alle fyller boksen sin likt.
const LOGO_MAPPE = new URL('../public/logos/', import.meta.url);
const LOGO_MANIFEST = new URL('manifest.json', LOGO_MAPPE);
const LOGO_BREDDE = 240;
const LOGO_HOYDE = 96;

/** Per land: hvilke programmer (id-er fra programs.json) og hvordan kildene adresseres. */
const LAND = {
  NO: {
    trumf: 'trumf',
    sas: { programId: 'sas-online-shopping', country: 'NO', language: 'nb', sti: 'nb-NO/butikker' },
    klarna: { programId: 'klarna', sti: 'no', country: 'NO' },
  },
  SE: {
    sas: { programId: 'sas-online-shopping-se', country: 'SE', language: 'sv', sti: 'sv-SE/butiker' },
    klarna: { programId: 'klarna-se', sti: 'se', country: 'SE' },
  },
  DK: {
    sas: { programId: 'sas-online-shopping-dk', country: 'DK', language: 'da', sti: 'da-DK/butikker' },
    klarna: { programId: 'klarna-dk', sti: 'dk', country: 'DK' },
  },
};

const hent = async (url) => {
  const svar = await fetch(url, { headers: HODER });
  if (!svar.ok) throw new Error(`${svar.status} ${url}`);
  return svar;
};
const vent = (ms) => new Promise((r) => setTimeout(r, ms));

const dekod = (s) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&#x27;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .trim();

/** «Kicks.no», «KICKS» og «Kicks» skal bli samme butikk. */
export function normaliser(navn) {
  return navn
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ø/gi, 'o')
    .replace(/æ/gi, 'ae')
    .toLowerCase()
    .replace(/\b(no|se|dk|com|norge|sverige|danmark|nettbutikk)\b/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/** «kicks.no» → «Kicks»; andre domener (hotels.com) beholdes som de er. */
function pyntNavn(navn) {
  const m = navn.match(/^([a-z0-9-]+)\.(no|se|dk)$/i);
  return m ? m[1].charAt(0).toUpperCase() + m[1].slice(1) : navn;
}

/**
 * Våre kategorier (id → gjenkjennes på nøkkelord i kildenes egne kategorinavn).
 * Ukjente kategorier havner i «tjenester».
 */
const KATEGORIER = {
  mote: ['mote', 'fashion', 'klaer', 'kläder', 'toj', 'sko', 'shoes', 'clothing', 'apparel', 'smykker', 'jewel', 'ur', 'watch', 'accessor'],
  sport: ['sport', 'fritid', 'outdoor', 'trening', 'fitness', 'friluft'],
  elektronikk: ['elektronikk', 'elektronik', 'electronic', 'data', 'computer', 'tech', 'mobil', 'gaming', 'foto'],
  hjem: ['hjem', 'hus', 'bolig', 'home', 'interior', 'interiør', 'mobler', 'möbler', 'hage', 'garden', 'gaver', 'blomster', 'gift'],
  skjonnhet: ['helse', 'skjonhet', 'skjønnhet', 'skönhet', 'beauty', 'health', 'velvære', 'velvare', 'apotek', 'pharm', 'optik'],
  reise: ['reise', 'resor', 'rejse', 'travel', 'hotel', 'fly', 'flight', 'leiebil', 'bil'],
  barn: ['barn', 'baby', 'kids', 'child', 'lek', 'toy'],
  dyr: ['dyr', 'djur', 'pet', 'kjæledyr'],
  underholdning: ['underholdning', 'boker', 'bøker', 'böcker', 'film', 'musikk', 'musik', 'spill', 'spel', 'media', 'entertainment', 'book', 'streaming', 'game'],
  mat: ['mat', 'drikke', 'dryck', 'food', 'drink', 'grocery', 'dagligvare', 'vin'],
};

function kategoriFor(tekst) {
  const t = String(tekst ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
  for (const [id, ord] of Object.entries(KATEGORIER)) if (ord.some((o) => t.includes(o))) return id;
  return 'tjenester';
}

const TRUMF_KATEGORIER = { reise: 'reise', mote: 'mote', sport: 'sport', elektronikk: 'elektronikk', bolig: 'hjem', 'velvære': 'skjonnhet', underholdning: 'underholdning', barn: 'barn', dyr: 'dyr', tjenester: 'tjenester' };

/** «Opptil 6,2 %» → { verdi: 6.2, opptil: true }. Faste kronebeløp («270 kr») gir null. */
function lesProsent(tekst) {
  const m = tekst.match(/(opptil)?\s*([\d.,]+)\s*%/i);
  if (!m) return null;
  return { verdi: Number(m[2].replace(',', '.')), opptil: Boolean(m[1]) };
}

/** Trumf-butikker per kategori: navn → våre kategorier. */
async function hentTrumfKategorier() {
  const per = new Map();
  for (const [trumfKat, vaar] of Object.entries(TRUMF_KATEGORIER)) {
    for (let side = 0; side < 10; side++) {
      const html = await (await hent(`https://trumfnetthandel.no/category/paged/${encodeURIComponent(trumfKat)}/60/${side}/popularity`)).text();
      const navn = [...html.matchAll(/data-name="([^"]*)"/g)].map((m) => normaliser(dekod(m[1])));
      for (const n of navn) (per.get(n) ?? per.set(n, new Set()).get(n)).add(vaar);
      if (navn.length < 60) break;
    }
  }
  return per;
}

async function hentTrumf() {
  const kategorier = await hentTrumfKategorier();
  const ut = [];
  for (let side = 0; side < 30; side++) {
    const html = await (await hent(`https://trumfnetthandel.no/category/paged/all/60/${side}/popularity`)).text();
    const re = /<a href="(\/cashback\/[^"]+)"[^>]*data-percentage="([^"]*)"[^>]*data-name="([^"]*)"[^>]*>\s*(?:<img src="([^"]*)")?/g;
    let antall = 0;
    for (const m of html.matchAll(re)) {
      antall++;
      const sats = lesProsent(m[2]);
      const navn = dekod(m[3]);
      if (sats) ut.push({ navn, ...sats, logo: m[4] || undefined, kategorier: [...(kategorier.get(normaliser(navn)) ?? [])], kilde: `https://trumfnetthandel.no${m[1]}` });
    }
    if (antall < 60) break;
  }
  return ut;
}

let sasKategorier = null;
async function hentSasKategorier() {
  if (sasKategorier) return sasKategorier;
  const { data } = await (await hent('https://onlineshopping.loyaltykey.com/api/v1/shops/categories?filter[language]=nb')).json();
  sasKategorier = new Map(data.map((k) => [k.category_id, kategoriFor(`${k.slug} ${k.name}`)]));
  return sasKategorier;
}

async function hentSas({ country, language, sti }) {
  const kategorier = await hentSasKategorier();
  const url =
    'https://onlineshopping.loyaltykey.com/api/v1/shops' +
    `?filter[channel]=SAS&filter[language]=${language}&filter[country]=${country}&filter[amount]=5000`;
  const { data } = await (await hent(url)).json();
  return data
    .filter((s) => s.commission_type === 'variable' && s.points > 0)
    .map((s) => {
      const kampanje =
        s.has_campaign && s.points_campaign > s.points && s.campaign_ends_date
          ? { verdi: s.points_campaign, slutt: s.campaign_ends_date.split('.').reverse().join('-') }
          : undefined;
      return {
        navn: dekod(s.name),
        verdi: s.points,
        opptil: false,
        kampanje,
        logo: s.logo || s.image_url || undefined,
        kategorier: s.categoryId && kategorier.has(s.categoryId) ? [kategorier.get(s.categoryId)] : [],
        kilde: `https://onlineshopping.flysas.com/${sti}/${s.slug}/${s.uuid}`,
      };
    });
}

async function hentKlarna({ sti, country }) {
  // Butikkatalogen på klarna.com/<land>/store/?type=CASHBACK henter fra dette API-et (maks 99 per side).
  const ut = [];
  for (let offset = 0; ; offset += 99) {
    const url =
      `https://www.klarna.com/${sti}/api/store-edge-rest/public/stores/directory/search/${country}` +
      `?sort=RANK&cashback=true&categories=&klarnaIntegrated=false&applePay=false&googlePay=false&goodOnYouRating=false&inStore=false&q=&otcEnabled=false&offset=${offset}&size=99`;
    const { stores, totalHits } = await (await hent(url)).json();
    for (const s of stores) {
      const cb = s.cashbackDiscount;
      if (!cb || !s.displayName) continue;
      const logo = s.icons?.find((i) => i.type === 'X3')?.url ?? s.icons?.[0]?.url;
      // Butikkens domene ligger i lenken til engangskortet (merchantUrl=kicks.no).
      const domene = s.otcUrl?.match(/merchantUrl=([^&]+)/)?.[1]?.toLowerCase().replace(/^www\./, '');
      ut.push({
        navn: pyntNavn(dekod(s.displayName)),
        verdi: cb.discountPercentage / 100,
        opptil: Boolean(cb.showUpToPrefix),
        logo,
        domene,
        kategorier: s.category ? [kategoriFor(s.category)] : [],
        kilde: `https://www.klarna.com${s.storeUrl}`,
      });
    }
    if (stores.length === 0 || offset + stores.length >= totalHits) break;
    await vent(250);
  }
  return ut;
}

/** Slår rader fra flere programmer sammen til én butikk per navn. */
function slaSammen(kilder) {
  const butikker = new Map();
  for (const [programId, rader] of kilder) {
    for (const rad of rader) {
      const id = normaliser(rad.navn);
      if (!id) continue;
      const eksisterende = butikker.get(id) ?? { id, navn: rad.navn, kategorier: [], satser: {} };
      if (eksisterende.navn === eksisterende.navn.toUpperCase() && rad.navn !== rad.navn.toUpperCase()) eksisterende.navn = rad.navn;
      const { navn: _navn, logo, domene, kategorier, ...sats } = rad;
      if (logo && !eksisterende.logo) eksisterende.logo = logo;
      if (domene && !eksisterende.domene) eksisterende.domene = domene;
      for (const k of kategorier ?? []) if (!eksisterende.kategorier.includes(k)) eksisterende.kategorier.push(k);
      eksisterende.satser[programId] = sats;
      butikker.set(id, eksisterende);
    }
  }
  return [...butikker.values()].sort((a, b) => a.navn.localeCompare(b.navn, 'nb'));
}

const finnes = (url) => access(url).then(() => true, () => false);

/**
 * Laster ned logoen, trimmer bort luft/hvit kant og legger den midt i en fast boks
 * (240×96, gjennomsiktig bakgrunn) som webp. Returnerer stien, eller null hvis det feiler.
 */
async function lagLogo(kildeUrl, land, id, manifest) {
  const nokkel = `${land}/${id}`;
  const fil = new URL(`${nokkel}.webp`, LOGO_MAPPE);
  if (manifest[nokkel] === kildeUrl && (await finnes(fil))) return `logos/${nokkel}.webp`;
  try {
    const svar = await fetch(kildeUrl, { headers: HODER });
    if (!svar.ok) return null;
    const original = Buffer.from(await svar.arrayBuffer());
    let bilde;
    try {
      bilde = await sharp(original).ensureAlpha().trim({ threshold: 12 }).toBuffer();
    } catch {
      bilde = original; // ensfarget/tom logo – bruk den som den er
    }
    const ut = await sharp(bilde)
      .resize(LOGO_BREDDE, LOGO_HOYDE, { fit: 'inside', withoutEnlargement: false })
      .extend({ top: 0, bottom: 0, left: 0, right: 0, background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .webp({ quality: 88 })
      .toBuffer();
    await mkdir(new URL(`${land}/`, LOGO_MAPPE), { recursive: true });
    await writeFile(fil, ut);
    manifest[nokkel] = kildeUrl;
    return `logos/${nokkel}.webp`;
  } catch {
    return null;
  }
}

/** Kjører oppgavene med begrenset parallellitet. */
async function parallelt(oppgaver, antall) {
  const ko = [...oppgaver];
  const arbeidere = Array.from({ length: antall }, async () => {
    while (ko.length) await ko.shift()();
  });
  await Promise.all(arbeidere);
}

const resultat = {};
const logg = [];
for (const [land, oppsett] of Object.entries(LAND)) {
  // Rekkefølgen avgjør hvilken logo som brukes når flere programmer har butikken.
  const kilder = [];
  if (oppsett.trumf) kilder.push([oppsett.trumf, await hentTrumf()]);
  kilder.push([oppsett.sas.programId, await hentSas(oppsett.sas)]);
  kilder.push([oppsett.klarna.programId, await hentKlarna(oppsett.klarna)]);
  resultat[land] = slaSammen(kilder);
  logg.push(`${land}: ${kilder.map(([id, rader]) => `${id} ${rader.length}`).join(', ')} → ${resultat[land].length} butikker`);
}

// Logoer: lokale, trimmede kopier. Beholder lenken til kilden hvis nedlastingen feiler.
await mkdir(LOGO_MAPPE, { recursive: true });
const manifest = (await finnes(LOGO_MANIFEST)) ? JSON.parse(await readFile(LOGO_MANIFEST, 'utf8')) : {};
let lokale = 0;
await parallelt(
  Object.entries(resultat).flatMap(([land, butikker]) =>
    butikker
      .filter((b) => b.logo)
      .map((b) => async () => {
        const sti = await lagLogo(b.logo, land, b.id, manifest);
        if (sti) {
          b.logo = sti;
          lokale++;
        }
      }),
  ),
  8,
);
await writeFile(LOGO_MANIFEST, JSON.stringify(manifest, null, 2) + '\n');

const idag = new Date().toISOString().slice(0, 10);

// Historikk: én linje per butikk med [dato, sats] hver gang satsen endrer seg.
// Kampanjesats teller som gjeldende sats mens den varer.
const HIST = new URL('../src/data/history.json', import.meta.url);
const historikk = (await finnes(HIST)) ? JSON.parse(await readFile(HIST, 'utf8')) : {};
let nyeMalinger = 0;
for (const [land, butikker] of Object.entries(resultat)) {
  const h = (historikk[land] ??= {});
  for (const b of butikker) {
    const hb = (h[b.id] ??= {});
    for (const [programId, sats] of Object.entries(b.satser)) {
      const verdi = sats.kampanje && sats.kampanje.slutt >= idag ? sats.kampanje.verdi : sats.verdi;
      const serie = (hb[programId] ??= []);
      if (serie.length === 0 || serie[serie.length - 1][1] !== verdi) {
        serie.push([idag, verdi]);
        nyeMalinger++;
      }
    }
  }
}
const histLinjer = ['{'];
Object.entries(historikk).forEach(([land, butikker], li, alleLand) => {
  histLinjer.push(` ${JSON.stringify(land)}: {`);
  const rader = Object.entries(butikker);
  rader.forEach(([id, serier], i) => histLinjer.push(`  ${JSON.stringify(id)}: ${JSON.stringify(serier)}${i < rader.length - 1 ? ',' : ''}`));
  histLinjer.push(` }${li < alleLand.length - 1 ? ',' : ''}`);
});
histLinjer.push('}', '');
await writeFile(HIST, histLinjer.join('\n'));

await writeFile(UT, JSON.stringify({ hentet: idag, land: resultat }, null, 2) + '\n');
console.log(logg.join('\n'));
console.log(`Logoer: ${lokale} lokale. Historikk: ${nyeMalinger} nye målinger.`);
