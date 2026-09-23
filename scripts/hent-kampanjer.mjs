// Henter kampanjer som ikke er butikksatser, fra offisielle sider, og skriver src/data/kampanjer.json:
// Klarna-butikker med kampanje (katalog-API-et), EuroBonus-bonuser på Klarnas medlemskapssider,
// Trumf-partnere (Talkmore, Fjordkraft) og Amex' velkomsttilbud. Teksten siteres fra siden – ingenting
// gjettes – og en kampanje forsvinner den dagen teksten er borte. Kjøres av den daglige jobben.

import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const FIL = new URL('../src/data/kampanjer.json', import.meta.url);
const idag = new Date().toISOString().slice(0, 10);
const HODER = { 'user-agent': 'Mozilla/5.0 (pointmaxing.no)', 'accept-language': 'nb-NO,sv-SE,da-DK' };
const ENTITETER = { nbsp: ' ', aring: 'å', oslash: 'ø', aelig: 'æ', auml: 'ä', ouml: 'ö', Aring: 'Å', Oslash: 'Ø', Aelig: 'Æ', Auml: 'Ä', Ouml: 'Ö', amp: '&', quot: '"', ndash: '–', mdash: '—' };

const tekstAv = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, navn) => ENTITETER[navn] ?? m)
    .replace(/\s+/g, ' ')
    .trim();

const tall = (s) => Number(String(s).replace(/[^\d,]/g, '').replace(',', '.'));
const MND = { januar: 1, februar: 2, mars: 3, april: 4, mai: 5, juni: 6, juli: 7, august: 8, september: 9, oktober: 10, november: 11, desember: 12, januari: 1, februari: 2, maj: 5, augusti: 8, marts: 3 };

/** «innen 11. august» → ISO-dato i år (eller neste år hvis datoen er passert). null uten treff. */
function sluttDato(tekst) {
  const m = tekst.match(/(?:innen|senest|til og med|t\.o\.m\.?|frem til|fram til|gjelder til|gäller till|senast)\s+(\d{1,2})\.?\s*([a-zæøåä]+)(?:\s+(\d{4}))?/i);
  if (!m || !MND[m[2].toLowerCase()]) return null;
  const aar = m[3] ? Number(m[3]) : Number(idag.slice(0, 4));
  const iso = `${aar}-${String(MND[m[2].toLowerCase()]).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`;
  return iso < idag && !m[3] ? `${aar + 1}${iso.slice(4)}` : iso;
}

async function hent(url) {
  const svar = await fetch(url, { headers: HODER });
  if (!svar.ok) throw new Error(`HTTP ${svar.status}`);
  return svar.text();
}

// Partnerlogoer, hentet én gang og lagret som 240×96 webp under public/logos/kampanjer (som butikklogoene).
const LOGO_MAPPE = new URL('../public/logos/kampanjer/', import.meta.url);
const LOGOER = {
  talkmore: 'https://talkmore.no/-/media/logoer/talkmore-logo/talkmore_logo.svg?la=en&h=2084&w=2750&hash=04D4B02DC546B75394CA9E4948671724',
  fjordkraft: ['https://www.fjordkraft.no/favicons/apple-icon-180x180.png', 'https://www.fjordkraft.no/favicons/apple-icon-152x152.png', 'https://www.fjordkraft.no/favicons/apple-icon-72x72.png'],
  amex: 'https://www.aexp-static.com/cdaas/one/statics/axp-static-assets/1.8.0/package/dist/img/logos/dls-logo-bluebox-solid.svg',
  klarna: ['https://www.klarna.com/apple-touch-icon.png', 'https://www.klarna.com/favicon-32x32.png'],
};
async function hentLogo(nokkel, kilder) {
  if (!kilder) return null;
  const fil = new URL(`${nokkel}.webp`, LOGO_MAPPE);
  const sti = `/logos/kampanjer/${nokkel}.webp`;
  try {
    await access(fil);
    return sti;
  } catch {
    /* ikke hentet ennå */
  }
  await mkdir(LOGO_MAPPE, { recursive: true });
  for (const url of [kilder].flat()) {
    try {
      const svar = await fetch(url, { headers: HODER });
      if (!svar.ok) continue;
      const original = Buffer.from(await svar.arrayBuffer());
      const bilde = await sharp(original, { density: 300 }).ensureAlpha().trim({ threshold: 12 }).toBuffer();
      await sharp(bilde).resize(240, 96, { fit: 'inside', withoutEnlargement: false }).webp({ quality: 88 }).toFile(fileURLToPath(fil));
      return sti;
    } catch (e) {
      console.error(`logo ${nokkel}: ${url} – ${e.message}`);
    }
  }
  return null;
}

/** Setningen rundt et treff, som sitat. */
const setning = (tekst, i) => {
  const start = tekst.lastIndexOf('. ', i) + 2;
  const slutt = tekst.indexOf('.', i);
  return tekst.slice(start > 1 ? start : 0, slutt > 0 ? slutt + 1 : i + 120).trim();
};

const KILDER = [
  // Trumf-partnere: velkomstgave i kroner + løpende prosent.
  {
    id: 'talkmore-trumf',
    land: 'NO',
    program: 'trumf',
    partner: 'Talkmore',
    logo: 'talkmore',
    url: 'https://talkmore.no/privat/abonnement/partner/trumf',
    finn(tekst) {
      const m = tekst.match(/få (\d[\d .]*),?-? i Trumf-velkomstgave/i) ?? tekst.match(/(\d[\d .]*) (?:kr|kroner) i Trumf-(?:bonus|velkomstgave)/i);
      if (!m) return null;
      const kr = tall(m[1]);
      const sitat = tekst.match(/Bli Talkmore-kunde og få [^.]{0,60}?velkomstgave/i)?.[0] ?? m[0];
      return { tittel: `Talkmore: ${kr} kr i Trumf-velkomstgave`, tekst: `${sitat}.`, verdi: kr, enhet: 'kr' };
    },
  },
  {
    id: 'fjordkraft-trumf',
    land: 'NO',
    program: 'trumf',
    partner: 'Fjordkraft',
    logo: 'fjordkraft',
    url: 'https://www.fjordkraft.no/trumf/',
    finn(tekst) {
      const m = tekst.match(/(\d[\d .]*) (?:kr|kroner|,-) i (?:Trumf-)?velkomst(?:bonus|gave)/i) ?? tekst.match(/velkomst(?:bonus|gave) på (\d[\d .]*) (?:kr|kroner)/i) ?? tekst.match(/få (\d[\d .]*) (?:kr|kroner)[^.]{0,40}Trumf/i);
      if (!m) return null;
      const kr = tall(m[1]);
      const sitat = tekst.match(/Bytt til Fjordkraft og få [^.]{0,80}?velkomstgave/i)?.[0] ?? m[0];
      return { tittel: `Fjordkraft: ${kr} kr i Trumf-bonus til nye kunder`, tekst: `${sitat}.`, verdi: kr, enhet: 'kr' };
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
    logo: 'amex',
    url,
    raa: true,
    finn(html) {
      const m = html.match(/"offerHeader":"(?:F[åa]|Get)\s+(\d[\d .]*)\s+EuroBonus\s+Bonuspo(?:eng|äng)[^"]*"/i);
      if (!m) return null;
      const poeng = tall(m[1]);
      const tekst = tekstAv(html);
      const krav = tekst.match(/minst (\d[\d .]*) kr (?:i løpet av|under) medlemskapets f(?:ørste|örsta) (\d+) m(?:åneder|ånader)/i);
      return {
        tittel: `${navn}: ${poeng.toLocaleString('nb-NO')} EuroBonus-poeng i velkomstbonus`,
        tekst: krav ? `${poeng.toLocaleString('nb-NO')} poeng når du handler for minst ${tall(krav[1]).toLocaleString('nb-NO')} kr de første ${krav[2]} månedene.` : `${poeng.toLocaleString('nb-NO')} EuroBonus-poeng i velkomstbonus.`,
        verdi: poeng,
        enhet: 'poeng',
      };
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
      logo: 'klarna',
      url: `${base}${niva}/`,
      finn(tekst) {
        const m = tekst.match(/(?:få|get|opptil|op til|upp till|tjen|tjäna)\s[^.]{0,50}?(\d[\d .]{3,7})\s*(?:SAS\s+)?EuroBonus[- ]?(?:bonus)?(?:poeng|poäng|point)\b(?![^.]*per 100)/i);
        if (!m) return null;
        return { tittel: `Klarna ${niva[0].toUpperCase()}${niva.slice(1)}: ${tall(m[1]).toLocaleString('nb-NO')} EuroBonus-poeng`, tekst: setning(tekst, m.index), verdi: tall(m[1]), enhet: 'poeng' };
      },
    })),
  ),
];

const ut = [];
for (const k of KILDER) {
  try {
    const html = await hent(k.url);
    const funn = k.finn(k.raa ? html : tekstAv(html));
    if (!funn) continue;
    const slutt = sluttDato(k.raa ? tekstAv(html) : funn.tekst) ?? sluttDato(k.raa ? '' : tekstAv(html));
    const logo = k.logo ? await hentLogo(k.logo, LOGOER[k.logo]) : null;
    ut.push({ id: k.id, land: k.land, program: k.program, partner: k.partner, ...funn, slutt, url: k.url, ...(logo ? { logo } : {}) });
  } catch (e) {
    console.error(`${k.id}: ${e.message}`);
  }
}

// Klarna-butikker med kampanje: katalog-API-et setter campaignLabel/campaignUrl når det pågår noe.
for (const [program, land, sti] of [['klarna', 'NO', 'no'], ['klarna-se', 'SE', 'se'], ['klarna-dk', 'DK', 'dk']]) {
  try {
    for (let offset = 0; offset < 1000; offset += 99) {
      const j = await (await fetch(`https://www.klarna.com/${sti}/api/store-edge-rest/public/stores/directory/search/${land}?cashback=true&offset=${offset}&size=99`, { headers: HODER })).json();
      for (const s of j.stores ?? []) {
        if (!s.campaignLabel && !s.campaignUrl) continue;
        const sats = s.cashbackDiscount?.discountLabel?.body ?? '';
        const id = `${program}-butikk-${s.merchantId ?? s.displayName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
        const ikon = (s.icons ?? []).find((i) => i.type === 'X3')?.url ?? s.icons?.[0]?.url;
        const logo = await hentLogo(id, ikon);
        ut.push({
          id,
          land,
          program,
          partner: s.displayName,
          tittel: `${s.displayName}: ${s.campaignLabel ?? 'kampanje'}${sats ? ` – ${sats} cashback` : ''}`,
          tekst: s.campaignLabel ?? '',
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
for (const k of ut) console.log(`- [${k.land}] ${k.tittel}${k.slutt ? ` (til ${k.slutt})` : ''}`);
