// Henter kampanjer som ikke er butikksatser, fra offisielle sider, og skriver src/data/kampanjer.json:
// - velkomsttilbud i SAS Online Shopping (tilbud med faste poeng i portalens eget API),
// - partnernes egne EuroBonus-sider (Verisure, Tryg, Trygg-Hansa, matkasser, mobil, strøm, kort),
// - Trumf-partnere (Talkmore, Fjordkraft) og Amex' velkomsttilbud,
// - EuroBonus-bonuser på Klarnas medlemskapssider og Klarna-butikker med kampanje.
// Tallet leses fra kilden hver dag – ingenting gjettes – og en kampanje forsvinner den dagen tallet er
// borte. Faste vilkårstekster har `må`: tekster som må stå på siden, ellers hoppes tilbudet over.
// Kjøres av den daglige jobben.

import { access, mkdir, readdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const FIL = new URL('../src/data/kampanjer.json', import.meta.url);
const idag = new Date().toISOString().slice(0, 10);
const HODER = { 'user-agent': 'Mozilla/5.0 (pointmaxing.no)', 'accept-language': 'nb-NO,sv-SE,da-DK' };
const ENTITETER = { nbsp: ' ', aring: 'å', oslash: 'ø', aelig: 'æ', auml: 'ä', ouml: 'ö', Aring: 'Å', Oslash: 'Ø', Aelig: 'Æ', Auml: 'Ä', Ouml: 'Ö', amp: '&', quot: '"', ndash: '–', mdash: '—', shy: '' };

const tekstAv = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, navn) => ENTITETER[navn] ?? m)
    .replace(/\u00ad/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const tall = (s) => Number(String(s).replace(/[^\d,]/g, '').replace(',', '.'));
const LOCALE = { NO: 'nb-NO', SE: 'sv-SE', DK: 'da-DK' };
const fmt = (land, n) => n.toLocaleString(LOCALE[land]);

const MND = {
  januar: 1, januari: 1, jan: 1, februar: 2, februari: 2, feb: 2, mars: 3, marts: 3, mar: 3, april: 4, apr: 4, mai: 5, maj: 5,
  juni: 6, jun: 6, juli: 7, jul: 7, august: 8, augusti: 8, aug: 8, september: 9, sep: 9, sept: 9, oktober: 10, okt: 10,
  november: 11, nov: 11, desember: 12, december: 12, des: 12, dec: 12,
};
const FORAN = String.raw`(?:innen|senest|til og med|t\.o\.m\.?|frem til|fram til|gjelder til|gäller till|gælder til|senast)`;
const iso = (aar, mnd, dag) => `${aar}-${String(mnd).padStart(2, '0')}-${String(dag).padStart(2, '0')}`;

/** «innen 11. august», «t.o.m. 31.12.2026», «t.o.m. 31 dec 2026» → ISO-dato (neste år hvis datoen uten år er passert). */
function sluttDato(tekst) {
  const tallDato = tekst.match(new RegExp(`${FORAN}\\s+(\\d{1,2})\\.(\\d{1,2})\\.(\\d{4})`, 'i'));
  if (tallDato) return iso(tallDato[3], tallDato[2], tallDato[1]);
  const m = tekst.match(new RegExp(`${FORAN}\\s+(\\d{1,2})\\.?\\s*([a-zæøåä]+)\\.?(?:\\s+(\\d{4}))?`, 'i'));
  if (!m || !MND[m[2].toLowerCase()]) return null;
  const aar = m[3] ? Number(m[3]) : Number(idag.slice(0, 4));
  const dato = iso(aar, MND[m[2].toLowerCase()], m[1]);
  return dato < idag && !m[3] ? `${aar + 1}${dato.slice(4)}` : dato;
}

/** «29.09.2026» (SAS NO/DK) eller «2026-09-29» (SAS SE) → ISO-dato. */
const isoDato = (s) => {
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  return m ? iso(m[3], m[2], m[1]) : null;
};

const dekod = (s) => s.replace(/&amp;/g, '&').replace(/&#39;|&#x27;|&apos;/g, "'").replace(/&quot;/g, '"').trim();

async function hent(url) {
  const svar = await fetch(url, { headers: HODER, signal: AbortSignal.timeout(30000) });
  if (!svar.ok) throw new Error(`HTTP ${svar.status}`);
  return svar.text();
}

// Logoer. Håndplukkede, offisielle logoer ligger i public/logos/partnere (src/data/partnerlogoer.json, med kilde).
// Andre hentes én gang og lagres i public/logos/kampanjer: SAS-feedens logo bare når den er en ekte logo (gjennomsiktig
// bakgrunn – feeden har ellers hvite flater og skjermbilder av skjemaer), ellers butikklogoen vår (ikke de som kom fra
// SAS) eller merkevarens ikon i Klarnas katalog med samme navn. Uten treff viser siden forbokstaven.
const LOGO_MAPPE = new URL('../public/logos/kampanjer/', import.meta.url);
const norm = (s) => s.toLowerCase().replace(/&amp;/g, '&').replace(/\.(no|se|dk|com)\b/g, '').replace(/[^a-z0-9æøåäö+]+/g, '');
const partnerlogoer = JSON.parse(await readFile(new URL('../src/data/partnerlogoer.json', import.meta.url), 'utf8'));
const PARTNERLOGO = new Map(Object.values(partnerlogoer).flatMap((l) => l.navn.map((n) => [norm(n), l.fil])));
const BUTIKKLOGO = new Map();
{
  const butikker = JSON.parse(await readFile(new URL('../src/data/stores.json', import.meta.url), 'utf8'));
  const manifest = JSON.parse(await readFile(new URL('../public/logos/manifest.json', import.meta.url), 'utf8'));
  for (const [land, liste] of Object.entries(butikker.land)) {
    for (const b of liste) {
      if (!b.logo?.startsWith('/logos/') || /loyaltykey/.test(manifest[`${land}/${b.id}`] ?? '')) continue;
      BUTIKKLOGO.set(`${land}:${norm(b.navn)}`, b.logo);
      if (!BUTIKKLOGO.has(`*:${norm(b.navn)}`)) BUTIKKLOGO.set(`*:${norm(b.navn)}`, b.logo);
    }
  }
}
const finnes = (url) => access(url).then(() => true, () => false);

/** Laster ned, trimmer og lagrer som 240×96 webp. `ekte` krever gjennomsiktig bakgrunn (SAS-feedens logoer). */
async function lagreLogo(id, url, { ekte = false } = {}) {
  try {
    const svar = await fetch(url, { headers: HODER, signal: AbortSignal.timeout(30000) });
    if (!svar.ok) return null;
    const original = Buffer.from(await svar.arrayBuffer());
    if (ekte) {
      const { data } = await sharp(original).toColourspace('srgb').ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      let gjennomsiktig = 0;
      for (let i = 3; i < data.length; i += 4) if (data[i] < 128) gjennomsiktig++;
      if (gjennomsiktig / (data.length / 4) < 0.4) return null;
    }
    await mkdir(LOGO_MAPPE, { recursive: true });
    const bilde = await sharp(original, { density: 300 }).ensureAlpha().trim({ threshold: 12 }).toBuffer();
    await sharp(bilde).resize(240, 96, { fit: 'inside' }).webp({ quality: 88 }).toFile(fileURLToPath(new URL(`${id}.webp`, LOGO_MAPPE)));
    return `/logos/kampanjer/${id}.webp`;
  } catch (e) {
    console.error(`logo ${id}: ${url} – ${e.message}`);
    return null;
  }
}

const klarnaIkoner = new Map();
/** Merkevarens ikon i Klarnas katalog når navnet er likt (søket finner også merker uten cashback). */
async function klarnaIkon(land, navn) {
  if (klarnaIkoner.has(navn)) return klarnaIkoner.get(navn);
  let ikon = null;
  for (const l of [land, ...['NO', 'SE', 'DK'].filter((x) => x !== land)]) {
    try {
      const j = JSON.parse(await hent(`https://www.klarna.com/${l.toLowerCase()}/api/store-edge-rest/public/stores/directory/search/${l}?q=${encodeURIComponent(navn)}&offset=0&size=10`));
      const treff = (j.stores ?? []).find((s) => norm(s.displayName) === norm(navn));
      ikon = treff ? ((treff.icons ?? []).find((i) => i.type === 'X3')?.url ?? treff.icons?.[0]?.url ?? null) : null;
    } catch {
      /* prøv neste land */
    }
    if (ikon) break;
  }
  klarnaIkoner.set(navn, ikon);
  return ikon;
}

/** Riktig logo for et tilbud – se rekkefølgen over. */
async function logoFor(id, land, partner, sasLogo = null) {
  const fast = PARTNERLOGO.get(norm(partner));
  if (fast) return fast;
  if (await finnes(new URL(`${id}.webp`, LOGO_MAPPE))) return `/logos/kampanjer/${id}.webp`;
  if (sasLogo) {
    const logo = await lagreLogo(id, sasLogo, { ekte: true });
    if (logo) return logo;
  }
  const butikk = BUTIKKLOGO.get(`${land}:${norm(partner)}`) ?? BUTIKKLOGO.get(`*:${norm(partner)}`);
  if (butikk) return butikk;
  const ikon = await klarnaIkon(land, partner);
  return ikon ? lagreLogo(id, ikon) : null;
}

/** Setningen rundt et treff, som sitat. */
const setning = (tekst, i) => {
  const start = tekst.lastIndexOf('. ', i) + 2;
  const slutt = tekst.indexOf('.', i);
  return tekst.slice(start > 1 ? start : 0, slutt > 0 ? slutt + 1 : i + 120).trim();
};

// Tall på partnernes egne sider: «35 000», «35.000», «3000».
const N = String.raw`(\d[\d .]*\d|\d)`;

/**
 * Tilbud på en partners egen EuroBonus-side. `re` finner poengtallet (første gruppe), `vilkar` er en kort
 * fast tekst på landets språk, og `må` er tekster som må stå på siden for at vilkårsteksten fortsatt stemmer.
 */
const partnerside = ({ id, land, program = 'eurobonus', partner, url, re, vilkar, må = [] }) => ({
  id,
  land,
  program,
  partner,
  url,
  finn(tekst) {
    const m = tekst.match(new RegExp(re, 'i'));
    if (!m) return null;
    const mangler = må.find((krav) => !krav.test(tekst));
    if (mangler) {
      console.error(`${id}: vilkårene har endret seg (fant ikke ${mangler}) – hoppet over`);
      return null;
    }
    return { tittel: partner, tekst: vilkar, verdi: tall(m[1]), enhet: 'poeng' };
  },
});

const KILDER = [
  // Trumf-partnere: velkomstgave i kroner (vises omregnet til poeng).
  {
    id: 'talkmore-trumf',
    land: 'NO',
    program: 'trumf',
    partner: 'Talkmore',
    url: 'https://talkmore.no/privat/abonnement/partner/trumf',
    finn(tekst) {
      const m = tekst.match(/få (\d[\d .]*),?-? i Trumf-velkomstgave/i) ?? tekst.match(/(\d[\d .]*) (?:kr|kroner) i Trumf-(?:bonus|velkomstgave)/i);
      if (!m) return null;
      const sitat = tekst.match(/Bli Talkmore-kunde og få [^.]{0,60}?velkomstgave/i)?.[0] ?? m[0];
      return { tittel: 'Talkmore', tekst: `${sitat}.`, verdi: tall(m[1]), enhet: 'kr' };
    },
  },
  {
    id: 'fjordkraft-trumf',
    land: 'NO',
    program: 'trumf',
    partner: 'Fjordkraft',
    url: 'https://www.fjordkraft.no/trumf/',
    finn(tekst) {
      const m = tekst.match(/(\d[\d .]*) (?:kr|kroner|,-) i (?:Trumf-)?velkomst(?:bonus|gave)/i) ?? tekst.match(/velkomst(?:bonus|gave) på (\d[\d .]*) (?:kr|kroner)/i) ?? tekst.match(/få (\d[\d .]*) (?:kr|kroner)[^.]{0,40}Trumf/i);
      if (!m) return null;
      const sitat = tekst.match(/Bytt til Fjordkraft og få [^.]{0,80}?velkomstgave/i)?.[0] ?? m[0];
      return { tittel: 'Fjordkraft', tekst: `${sitat}.`, verdi: tall(m[1]), enhet: 'kr' };
    },
  },

  // Amex: velkomsttilbud i EuroBonus-poeng på kortsidene (JSON-feltet offerHeader).
  ...[
    ['sas-amex-classic', 'NO', 'SAS Amex Classic', 'https://www.americanexpress.com/nb-no/kredittkort/sas-classic/'],
    ['sas-amex-premium', 'NO', 'SAS Amex Premium', 'https://www.americanexpress.com/nb-no/kredittkort/sas-premium/'],
    ['sas-amex-elite', 'NO', 'SAS Amex Elite', 'https://www.americanexpress.com/nb-no/kredittkort/sas-elite/'],
    ['se-sas-amex-classic', 'SE', 'SAS Amex Classic', 'https://www.americanexpress.com/se/kreditkort/sas-eurobonus-classic/'],
    ['se-sas-amex-premium', 'SE', 'SAS Amex Premium', 'https://www.americanexpress.com/se/kreditkort/sas-eurobonus-premium/'],
    ['se-sas-amex-elite', 'SE', 'SAS Amex Elite', 'https://www.americanexpress.com/se/kreditkort/sas-eurobonus-elite/'],
  ].map(([kort, land, navn, url]) => ({
    id: `${kort}-velkomst`,
    land,
    program: kort,
    partner: navn,
    url,
    raa: true,
    finn(html) {
      const m = html.match(/"offerHeader":"(?:F[åa]|Get)\s+(\d[\d .]*)\s+EuroBonus\s+Bonuspo(?:eng|äng)[^"]*"/i);
      if (!m) return null;
      const krav = tekstAv(html).match(/minst (\d[\d .]*) kr (?:i løpet av|under) medlemskapets f(?:ørste|örsta) (\d+) m(?:åneder|ånader)/i);
      const kr = krav ? fmt(land, tall(krav[1])) : null;
      const tekst = krav
        ? land === 'SE'
          ? `När du handlar för minst ${kr} kr under de första ${krav[2]} månaderna.`
          : `Når du handler for minst ${kr} kr de første ${krav[2]} månedene.`
        : land === 'SE'
          ? 'Välkomstbonus.'
          : 'Velkomstbonus.';
      return { tittel: navn, tekst, verdi: tall(m[1]), enhet: 'poeng' };
    },
  })),

  // Klarna: EuroBonus-bonus for nye medlemmer på medlemskapssidene.
  ...[
    ['klarna', 'NO', 'https://www.klarna.com/no/medlemskap/'],
    ['klarna-se', 'SE', 'https://www.klarna.com/se/medlemskap/'],
    ['klarna-dk', 'DK', 'https://www.klarna.com/dk/medlemskab/'],
  ].flatMap(([program, land, base]) =>
    ['plus', 'premium', 'max'].map((niva) => ({
      id: `${program}-${niva}-eurobonus`,
      land,
      program,
      partner: `Klarna ${niva[0].toUpperCase()}${niva.slice(1)}`,
      url: `${base}${niva}/`,
      finn(tekst) {
        const m = tekst.match(/(?:få|get|opptil|op til|upp till|tjen|tjäna)\s[^.]{0,50}?(\d[\d .]{3,7})\s*(?:SAS\s+)?EuroBonus[- ]?(?:bonus)?(?:poeng|poäng|point)\b(?![^.]*per 100)/i);
        if (!m) return null;
        return { tittel: `Klarna ${niva[0].toUpperCase()}${niva.slice(1)}`, tekst: setning(tekst, m.index), verdi: tall(m[1]), enhet: 'poeng' };
      },
    })),
  ),

  // Partnernes egne EuroBonus-sider. Verifisert 24.09.2026.
  // Matkasser (samme konsern i tre land): poeng etter fjerde levering, sluttdato står på siden.
  partnerside({
    id: 'godtlevert-eurobonus', land: 'NO', partner: 'Godtlevert',
    url: 'https://www.godtlevert.no/kampanje/eurobonus',
    re: `Få ${N} EuroBonus-poeng etter din fjerde levering`,
    vilkar: 'Nye kunder, etter fjerde levering. Deretter 250 poeng per matkasse.', må: [/deretter 250 poeng/i],
  }),
  partnerside({
    id: 'linas-eurobonus', land: 'SE', partner: 'Linas Matkasse',
    url: 'https://www.linasmatkasse.se/kampanj/eurobonus',
    re: `Få ${N} EuroBonus-poäng efter din fjärde leverans`,
    vilkar: 'Nya kunder, efter fjärde leveransen. Därefter 250 poäng per matkasse.', må: [/därefter 250 p/i],
  }),
  partnerside({
    id: 'retnemt-eurobonus', land: 'DK', partner: 'Retnemt',
    url: 'https://www.retnemt.dk/kampagne/sas-eurobonus',
    re: `Få ${N} EuroBonus-point efter din fjerde levering`,
    vilkar: 'Nye kunder, efter fjerde levering. Derefter 250 point per måltidskasse.', må: [/derefter får du 250 point/i],
  }),
  // Boligalarm
  partnerside({
    id: 'verisure-no-eurobonus', land: 'NO', partner: 'Verisure',
    url: 'https://www.verisure.no/sas',
    re: `${N} EuroBonus-bonuspoeng`,
    vilkar: 'Når du bestiller boligalarm.', må: [/boligalarm/i],
  }),
  partnerside({
    id: 'verisure-se-eurobonus', land: 'SE', partner: 'Verisure',
    url: 'https://www.verisure.se/funnel/standalone/sas/',
    re: `få ${N} EuroBonus-poäng`,
    vilkar: 'Nya kunder som beställer hemlarm, plus 2 000 kr rabatt.', må: [/nya kunder/i, /\+ ?2 ?000 kr rabatt/i],
  }),
  partnerside({
    id: 'verisure-dk-eurobonus', land: 'DK', partner: 'Verisure',
    url: 'https://www.verisure.dk/partner/SAS',
    re: `Optjen ${N} bonuspoint, når du bestiller`,
    vilkar: 'Nye alarmabonnementer med 24/7 eller Totalsikring.', må: [/24\/7/, /Totalsikring/i],
  }),
  // Forsikring
  partnerside({
    id: 'tryg-no-eurobonus', land: 'NO', partner: 'Tryg',
    url: 'https://www.tryg.no/partnere/sas-eurobonus',
    re: `kan få inntil ${N} EuroBonus-poeng`,
    vilkar: 'Nye kunder via rådgiver. Flere forsikringer gir flere poeng.', må: [/rådgiver/i],
  }),
  partnerside({
    id: 'tryg-dk-eurobonus', land: 'DK', partner: 'Tryg',
    url: 'https://tryg.dk/partner/eurobonus',
    re: `op til ${N} EuroBonus-point`,
    vilkar: 'Nye kunder. Flere forsikringer giver flere point.', må: [/ny kunde/i],
  }),
  {
    id: 'trygghansa-eurobonus',
    land: 'SE',
    program: 'eurobonus',
    partner: 'Trygg-Hansa',
    url: 'https://www.trygghansa.se/samarbeten/sas-eurobonus',
    finn(tekst) {
      // Poeng per forsikringstype, rett fra siden: «Villa 10 000 EuroBonus-poäng» osv.
      const typer = new Map();
      for (const m of tekst.matchAll(/(Villa|Bostadsrätt|Fritidshus|Bilförsäkring|Hyresrätt|Hund|Katt)\s+(\d[\d .]*\d)\s+EuroBonus-poäng/gi)) {
        const navn = m[1].toLowerCase().replace('bilförsäkring', 'bil');
        if (!typer.has(navn)) typer.set(navn, tall(m[2]));
      }
      if (typer.size === 0) return null;
      const liste = [...typer].sort((a, b) => b[1] - a[1]);
      const tre = liste.slice(0, 3).map(([navn, p]) => `${navn} ${fmt('SE', p)}`).join(', ');
      return { tittel: 'Trygg-Hansa', tekst: `Per ny försäkring: ${tre}${liste.length > 3 ? ' m.fl.' : ''}.`, verdi: liste[0][1], enhet: 'poeng' };
    },
  },
  // Kort
  partnerside({
    id: 'lunar-no-eurobonus', land: 'NO', program: 'lunar', partner: 'Lunar',
    url: 'https://www.lunar.app/no/privat/sas-eurobonus',
    re: `Velkomstbonus: Få ${N} Bonuspoeng`,
    vilkar: 'Nye Lunar-kunder. Behold kortet i 3 måneder og bruk minst 15 000 kr.', må: [/3 måneder/i, /15[ .]?000/],
  }),
  partnerside({
    id: 'lunar-se-eurobonus', land: 'SE', program: 'lunar', partner: 'Lunar',
    url: 'https://www.lunar.se/privat/sas-eurobonus',
    re: `Välkomstbonus: Få ${N} Bonuspoäng`,
    vilkar: 'Nya Lunar-kunder. Behåll kortet i 3 månader och handla för minst 15 000 kr.', må: [/3 månader/i, /15[ .]?000/],
  }),
  partnerside({
    id: 'lunar-dk-eurobonus', land: 'DK', program: 'lunar', partner: 'Lunar',
    url: 'https://www.lunar.app/dk/privat/sas-eurobonus',
    re: `Velkomstbonus: Tilmeld dig og få ${N} Bonuspoint`,
    vilkar: 'Nye Lunar-kunder. Behold kortet i 3 måneder og brug mindst 15.000 kr.', må: [/3 måneder/i, /15[ .]?000/],
  }),
  partnerside({
    id: 'se-sas-mastercard-world-velkomst', land: 'SE', program: 'se-sas-mastercard-world', partner: 'SAS EuroBonus World Mastercard',
    url: 'https://saseurobonusmastercard.se/korten/mastercard/',
    re: `${N} Bonuspoäng i välkomstpremie då du gör`,
    vilkar: 'Tre köp inom 30 dagar. Gäller inte om du haft kortet de senaste två åren.', må: [/30 dagar/i, /två åren/i],
  }),
  partnerside({
    id: 'se-sas-mastercard-premium-velkomst', land: 'SE', program: 'se-sas-mastercard-premium', partner: 'SAS EuroBonus Mastercard Premium',
    url: 'https://saseurobonusmastercard.se/korten/mastercard-premium/',
    re: `får du ${N} Bonuspoäng i välkomstpremie`,
    vilkar: 'Tre köp inom 30 dagar.', må: [/inom 30 dagar/i],
  }),
  partnerside({
    id: 'dk-sas-mastercard-world-velkomst', land: 'DK', program: 'dk-sas-mastercard-world', partner: 'SAS EuroBonus World Mastercard',
    url: 'https://saseurobonusmastercard.dk/kortene/mastercard/',
    re: `${N} Bonuspoint i velkomst, ved tre køb`,
    vilkar: 'Tre køb inden for 30 dage. Gælder ikke, hvis du har haft kortet de seneste to år.', må: [/30 dage/i, /to år/i],
  }),
  partnerside({
    id: 'dk-sas-mastercard-premium-velkomst', land: 'DK', program: 'dk-sas-mastercard-premium', partner: 'SAS EuroBonus Mastercard Premium',
    url: 'https://saseurobonusmastercard.dk/kortene/mastercard-premium/',
    re: `får du ${N} Bonuspoint i velkomst`,
    vilkar: 'Tre køb inden for 30 dage.', må: [/30 dage/i],
  }),
  // Mobil og strøm
  partnerside({
    id: 'tre-se-eurobonus', land: 'SE', partner: 'Tre',
    url: 'https://www.tre.se/handla/erbjudanden/eurobonus',
    re: `och få ${N} EuroBonus-poäng`,
    vilkar: 'Mobilabonnemang med 24 månaders bindningstid.', må: [/24 mån bindningstid/i],
  }),
  partnerside({
    id: 'tre-dk-eurobonus', land: 'DK', partner: '3',
    url: 'https://www.3.dk/kampagner/eurobonus-point/',
    re: `giver vi dig ${N} EuroBonus-point`,
    vilkar: 'Når du køber et Fri Tale-abonnement.', må: [/Fri Tale/i],
  }),
  partnerside({
    id: 'fortum-se-eurobonus', land: 'SE', partner: 'Fortum',
    url: 'https://www.fortum.com/se/el/teckna-elavtal/kampanj/elavtal-med-extra-sas-eurobonus-poang',
    re: `Du får hela ${N} Eurobonus-poäng under första året`,
    vilkar: 'Första året med nytt elavtal. Därefter 250 poäng per månad.', må: [/250 EuroBonus-bonuspoäng per månad/i],
  }),
  // SAS' eget bedriftskort
  ...[
    ['NO', 'no', 'Velkomsttilbud', 'Bonuspoeng', 'Bedriftskort for firmaer.'],
    ['SE', 'sv', 'Välkomsterbjudande', 'Bonuspoäng', 'Företagskort för företag.'],
    ['DK', 'da', 'Velkomsttilbud', 'Bonuspoint', 'Firmakort til virksomheder.'],
  ].map(([land, sti, ord, poeng, vilkar]) =>
    partnerside({
      id: `sas-business-${land.toLowerCase()}-velkomst`, land, partner: 'SAS EuroBonus Business',
      url: `https://eurobonusbusiness.flysas.com/${sti}`,
      re: `${ord} ${N} EuroBonus ${poeng}`,
      vilkar,
    }),
  ),
];

const ut = [];
for (const k of KILDER) {
  try {
    const html = await hent(k.url);
    const tekst = tekstAv(html);
    const funn = k.finn(k.raa ? html : tekst);
    if (!funn) continue;
    const slutt = sluttDato(funn.tekst) ?? sluttDato(tekst);
    const logo = await logoFor(k.id, k.land, k.partner);
    ut.push({ id: k.id, land: k.land, program: k.program, partner: k.partner, ...funn, slutt, url: k.url, ...(logo ? { logo } : {}) });
  } catch (e) {
    console.error(`${k.id}: ${e.message}`);
  }
}

// SAS Online Shopping: tilbud med faste poeng (velkomsttilbud hos strøm, mobil, matkasser, forsikring …).
// Butikkskriptet tar bare med prosentsatser; her er resten av det samme API-et.
const SAS = [
  ['NO', 'nb', 'nb-NO/butikker', 'sas-online-shopping', 'nye kunder'],
  ['SE', 'sv', 'sv-SE/butiker', 'sas-online-shopping-se', 'nya kunder'],
  ['DK', 'da', 'da-DK/butikker', 'sas-online-shopping-dk', 'nye kunder'],
];
const egneSider = new Set(ut.map((k) => `${k.land}:${k.partner.toLowerCase()}`));
for (const [land, sprak, sti, program, nye] of SAS) {
  try {
    const url = `https://onlineshopping.loyaltykey.com/api/v1/shops?filter[channel]=SAS&filter[language]=${sprak}&filter[country]=${land}&filter[amount]=5000`;
    const { data } = JSON.parse(await hent(url));
    for (const s of data ?? []) {
      if (s.commission_type !== 'fixed' || !(s.points > 0)) continue;
      const navn = dekod(s.name);
      // Partnere med egen EuroBonus-side over vises bare én gang, med tilbudet derfra.
      if (egneSider.has(`${land}:${navn.toLowerCase()}`)) continue;
      const kampanje = s.has_campaign && s.points_campaign > s.points ? isoDato(s.campaign_ends_date) : null;
      const aktiv = kampanje && kampanje >= idag;
      const vilkar = tekstAv(s.description ?? '');
      const deler = ['Via SAS Shopping'];
      if (/\bny(?:e|a)?\s+kund/i.test(vilkar)) deler.push(nye);
      if (aktiv) deler.push(`normalt ${fmt(land, s.points)}`);
      const id = `sas-${land.toLowerCase()}-${s.slug}`;
      const logo = await logoFor(id, land, navn, s.logo);
      ut.push({
        id,
        land,
        program,
        partner: navn,
        tittel: navn,
        tekst: deler.join(' · '),
        verdi: aktiv ? s.points_campaign : s.points,
        enhet: 'poeng',
        slutt: aktiv ? kampanje : null,
        url: `https://onlineshopping.flysas.com/${sti}/${s.slug}/${s.uuid}`,
        ...(logo ? { logo } : {}),
      });
    }
  } catch (e) {
    console.error(`${program}: ${e.message}`);
  }
}

// Klarna-butikker med kampanje: katalog-API-et setter campaignLabel/campaignUrl når det pågår noe.
for (const [program, land, sti] of [['klarna', 'NO', 'no'], ['klarna-se', 'SE', 'se'], ['klarna-dk', 'DK', 'dk']]) {
  try {
    for (let offset = 0; offset < 1000; offset += 99) {
      const j = JSON.parse(await hent(`https://www.klarna.com/${sti}/api/store-edge-rest/public/stores/directory/search/${land}?cashback=true&offset=${offset}&size=99`));
      for (const s of j.stores ?? []) {
        if (!s.campaignLabel && !s.campaignUrl) continue;
        const sats = s.cashbackDiscount?.discountLabel?.body ?? '';
        const id = `${program}-butikk-${s.merchantId ?? s.displayName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
        const ikon = (s.icons ?? []).find((i) => i.type === 'X3')?.url ?? s.icons?.[0]?.url;
        const logo = PARTNERLOGO.get(norm(s.displayName)) ?? ((await finnes(new URL(`${id}.webp`, LOGO_MAPPE))) ? `/logos/kampanjer/${id}.webp` : ikon ? await lagreLogo(id, ikon) : null);
        ut.push({
          id,
          land,
          program,
          partner: s.displayName,
          tittel: s.displayName,
          tekst: [s.campaignLabel, sats ? `${sats} cashback` : ''].filter(Boolean).join(' · '),
          verdi: sats ? tall(sats) : null,
          enhet: '%',
          slutt: null,
          url: s.campaignUrl ? `https://www.klarna.com${s.campaignUrl}` : `https://www.klarna.com${s.storeUrl}`,
          ...(logo ? { logo } : {}),
        });
      }
      if ((j.stores ?? []).length < 99) break;
    }
  } catch (e) {
    console.error(`${program}: ${e.message}`);
  }
}

// Logoer for tilbud som er borte, slettes (de hentes på nytt hvis tilbudet kommer tilbake).
const iBruk = new Set(ut.map((k) => k.logo).filter(Boolean));
try {
  for (const fil of await readdir(LOGO_MAPPE)) {
    if (!iBruk.has(`/logos/kampanjer/${fil}`)) await unlink(new URL(fil, LOGO_MAPPE));
  }
} catch {
  /* ingen mappe ennå */
}

ut.sort((a, b) => a.land.localeCompare(b.land) || a.id.localeCompare(b.id));
let gammel = { hentet: null, kampanjer: [] };
try {
  gammel = JSON.parse(await readFile(FIL, 'utf8'));
} catch {
  /* første kjøring */
}
if (JSON.stringify(gammel.kampanjer) !== JSON.stringify(ut)) {
  await writeFile(FIL, JSON.stringify({ hentet: idag, kampanjer: ut }, null, 2) + '\n');
  console.log(`Kampanjer: ${ut.length} (endret, skrevet)`);
} else {
  console.log(`Kampanjer: ${ut.length} (uendret)`);
}
for (const land of ['NO', 'SE', 'DK']) console.log(`- ${land}: ${ut.filter((k) => k.land === land).length}`);
