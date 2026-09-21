// Henter butikksatser fra Trumf Netthandel, SAS Online Shopping og Klarna
// og skriver dem til src/data/stores.json.
//
//   node scripts/hent-butikker.mjs
//
// Kilder:
// - Trumf: HTML-fragmentene siden selv laster («/category/paged/all/60/<side>/popularity»).
// - SAS: JSON-API-et portalen bruker (onlineshopping.loyaltykey.com).
// - Klarna: katalog-API-et bak klarna.com/no/store/?type=CASHBACK (alle butikker med cashback).

import { writeFile } from 'node:fs/promises';

const HODER = { 'user-agent': 'Mozilla/5.0 (Poengtjeneren; henter offentlige satser)', accept: 'application/json, text/html' };
const UT = new URL('../src/data/stores.json', import.meta.url);

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
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ø/gi, 'o')
    .replace(/æ/gi, 'ae')
    .toLowerCase()
    .replace(/\b(no|com|norge|nettbutikk)\b/g, '')
    .replace(/[^a-z0-9]/g, '');
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

async function hentSas() {
  const url =
    'https://onlineshopping.loyaltykey.com/api/v1/shops?filter[channel]=SAS&filter[language]=nb&filter[country]=NO&filter[amount]=5000';
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
        kilde: `https://onlineshopping.flysas.com/nb-NO/butikker/${s.slug}/${s.uuid}`,
      };
    });
}

/** «kicks.no» → «Kicks»; andre domener (hotels.com) beholdes som de er. */
function pyntNavn(navn) {
  const m = navn.match(/^([a-z0-9-]+)\.no$/i);
  return m ? m[1].charAt(0).toUpperCase() + m[1].slice(1) : navn;
}

async function hentKlarna() {
  // Butikkatalogen på klarna.com/no/store/?type=CASHBACK henter fra dette API-et (maks 99 per side).
  const ut = [];
  for (let offset = 0; ; offset += 99) {
    const url =
      'https://www.klarna.com/no/api/store-edge-rest/public/stores/directory/search/NO' +
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

const butikker = new Map();
function leggTil(programId, rad) {
  const id = normaliser(rad.navn);
  if (!id) return;
  const eksisterende = butikker.get(id) ?? { id, navn: rad.navn, satser: {} };
  if (eksisterende.navn === eksisterende.navn.toUpperCase() && rad.navn !== rad.navn.toUpperCase()) eksisterende.navn = rad.navn;
  const { navn: _navn, logo, ...sats } = rad;
  if (logo && !eksisterende.logo) eksisterende.logo = logo;
  eksisterende.satser[programId] = sats;
  butikker.set(id, eksisterende);
}

// Rekkefølgen avgjør hvilken logo som brukes når flere programmer har butikken.
const [trumf, sas, klarna] = await Promise.all([hentTrumf(), hentSas(), hentKlarna()]);
trumf.forEach((r) => leggTil('trumf', r));
sas.forEach((r) => leggTil('sas-online-shopping', r));
klarna.forEach((r) => leggTil('klarna', r));

const liste = [...butikker.values()].sort((a, b) => a.navn.localeCompare(b.navn, 'nb'));
await writeFile(UT, JSON.stringify({ hentet: new Date().toISOString().slice(0, 10), butikker: liste }, null, 2) + '\n');
console.log(`Trumf ${trumf.length}, Klarna ${klarna.length}, SAS ${sas.length} → ${liste.length} butikker skrevet til ${UT.pathname}`);
