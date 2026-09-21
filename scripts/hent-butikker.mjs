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

/** «Opptil 6,2 %» → { verdi: 6.2, opptil: true }. Faste kronebeløp («270 kr») gir null. */
function lesProsent(tekst) {
  const m = tekst.match(/(opptil)?\s*([\d.,]+)\s*%/i);
  if (!m) return null;
  return { verdi: Number(m[2].replace(',', '.')), opptil: Boolean(m[1]) };
}

async function hentTrumf() {
  const ut = [];
  for (let side = 0; side < 30; side++) {
    const html = await (await hent(`https://trumfnetthandel.no/category/paged/all/60/${side}/popularity`)).text();
    const re = /<a href="(\/cashback\/[^"]+)"[^>]*data-percentage="([^"]*)"[^>]*data-name="([^"]*)"[^>]*>\s*(?:<img src="([^"]*)")?/g;
    let antall = 0;
    for (const m of html.matchAll(re)) {
      antall++;
      const sats = lesProsent(m[2]);
      if (sats) ut.push({ navn: dekod(m[3]), ...sats, logo: m[4] || undefined, kilde: `https://trumfnetthandel.no${m[1]}` });
    }
    if (antall < 60) break;
  }
  return ut;
}

async function hentSas({ country, language, sti }) {
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
      ut.push({
        navn: pyntNavn(dekod(s.displayName)),
        verdi: cb.discountPercentage / 100,
        opptil: Boolean(cb.showUpToPrefix),
        logo,
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
      const eksisterende = butikker.get(id) ?? { id, navn: rad.navn, satser: {} };
      if (eksisterende.navn === eksisterende.navn.toUpperCase() && rad.navn !== rad.navn.toUpperCase()) eksisterende.navn = rad.navn;
      const { navn: _navn, logo, ...sats } = rad;
      if (logo && !eksisterende.logo) eksisterende.logo = logo;
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

await writeFile(UT, JSON.stringify({ hentet: new Date().toISOString().slice(0, 10), land: resultat }, null, 2) + '\n');
console.log(logg.join('\n'));
console.log(`Logoer: ${lokale} lokale`);
