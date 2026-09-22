// Lager statiske sider i dist/ etter `vite build`: én per butikk og land (dist/no/kicks/index.html),
// landsider, butikkatalog per kategori, «Nytt», «Kort», 404.html, sitemap.xml og robots.txt.
// Sidene har tittel, beskrivelse og satser i HTML-en, så søkemotorer ser dem uten JavaScript;
// appen tar over når den laster. Lager også dist/api/butikker.json til nettleserutvidelsen.

import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';

const DOMENE = 'https://pointmaxing.no';
const dist = new URL('../dist/', import.meta.url);
const les = async (sti) => JSON.parse(await readFile(new URL(sti, import.meta.url), 'utf8'));

const mal = await readFile(new URL('index.html', dist), 'utf8');
const { programmer, land: landInfo } = await les('../src/data/programs.json');
const stores = await les('../src/data/stores.json');
const partnere = await les('../src/data/partners.json');
const kategorier = await les('../src/data/kategorier.json');
const kort = await les('../src/data/cards.json');

const SPRAK = {
  NO: {
    sti: 'no',
    lang: 'nb',
    locale: 'nb-NO',
    poeng: 'poeng',
    tittel: (navn, prog) => `${navn} – EuroBonus-poeng via ${prog} | Pointmaxing`,
    intro: (navn) => `Så mange EuroBonus-poeng får du per 100 kr hos ${navn}:`,
    med: 'med Max',
    landTittel: 'Pointmaxing – EuroBonus-kalkulator for Norge',
    landTekst: 'Skriv inn et kjøp og se hvor mange EuroBonus-poeng det gir via Trumf Netthandel, Klarna og SAS Online Shopping – og hvor det lønner seg å handle.',
    alleButikker: 'Alle butikker',
    butikkerTittel: (kat) => (kat ? `${kat} – flest EuroBonus-poeng | Pointmaxing` : 'Alle butikker med EuroBonus-poeng | Pointmaxing'),
    butikkerTekst: (kat, n) => (kat ? `${n} butikker innen ${kat.toLowerCase()} som gir EuroBonus-poeng via Trumf, Klarna eller SAS Online Shopping.` : `${n} butikker som gir EuroBonus-poeng via Trumf, Klarna eller SAS Online Shopping, med satsene side om side.`),
    nyttTittel: 'EuroBonus-kampanjer og satsendringer nå | Pointmaxing',
    nyttTekst: 'Aktive kampanjer og butikker som nettopp endret sats hos Trumf, Klarna og SAS Online Shopping. Oppdateres hver natt.',
    kortTittel: 'Kort som gir EuroBonus-poeng | Pointmaxing',
    kortTekst: 'Alle betalingskort i Norge som gir SAS EuroBonus-poeng, med poeng per 100 kr og pris.',
    kampanjerNaa: 'Kampanjer nå',
  },
  SE: {
    sti: 'se',
    lang: 'sv',
    locale: 'sv-SE',
    poeng: 'poäng',
    tittel: (navn, prog) => `${navn} – EuroBonus-poäng via ${prog} | Pointmaxing`,
    intro: (navn) => `Så många EuroBonus-poäng får du per 100 kr hos ${navn}:`,
    med: 'med Max',
    landTittel: 'Pointmaxing – EuroBonus-kalkylator för Sverige',
    landTekst: 'Ange ett köp och se hur många EuroBonus-poäng det ger via Klarna och SAS Online Shopping – och var det lönar sig att handla.',
    alleButikker: 'Alla butiker',
    butikkerTittel: (kat) => (kat ? `${kat} – flest EuroBonus-poäng | Pointmaxing` : 'Alla butiker med EuroBonus-poäng | Pointmaxing'),
    butikkerTekst: (kat, n) => (kat ? `${n} butiker inom ${kat.toLowerCase()} som ger EuroBonus-poäng via Klarna eller SAS Online Shopping.` : `${n} butiker som ger EuroBonus-poäng via Klarna eller SAS Online Shopping, med satserna sida vid sida.`),
    nyttTittel: 'EuroBonus-kampanjer och ändrade satser just nu | Pointmaxing',
    nyttTekst: 'Aktiva kampanjer och butiker som nyss ändrade sats hos Klarna och SAS Online Shopping. Uppdateras varje natt.',
    kortTittel: 'Kort som ger EuroBonus-poäng | Pointmaxing',
    kortTekst: 'Alla betalkort i Sverige som ger SAS EuroBonus-poäng, med poäng per 100 kr och pris.',
    kampanjerNaa: 'Kampanjer just nu',
  },
  DK: {
    sti: 'dk',
    lang: 'da',
    locale: 'da-DK',
    poeng: 'point',
    tittel: (navn, prog) => `${navn} – EuroBonus-point via ${prog} | Pointmaxing`,
    intro: (navn) => `Så mange EuroBonus-point får du per 100 kr hos ${navn}:`,
    med: 'med Max',
    landTittel: 'Pointmaxing – EuroBonus-beregner for Danmark',
    landTekst: 'Indtast et køb og se, hvor mange EuroBonus-point det giver via Klarna og SAS Online Shopping – og hvor det bedst kan betale sig at handle.',
    alleButikker: 'Alle butikker',
    butikkerTittel: (kat) => (kat ? `${kat} – flest EuroBonus-point | Pointmaxing` : 'Alle butikker med EuroBonus-point | Pointmaxing'),
    butikkerTekst: (kat, n) => (kat ? `${n} butikker inden for ${kat.toLowerCase()}, der giver EuroBonus-point via Klarna eller SAS Online Shopping.` : `${n} butikker, der giver EuroBonus-point via Klarna eller SAS Online Shopping, med satserne side om side.`),
    nyttTittel: 'EuroBonus-kampagner og satsændringer lige nu | Pointmaxing',
    nyttTekst: 'Aktive kampagner og butikker, der lige har ændret sats hos Klarna og SAS Online Shopping. Opdateres hver nat.',
    kortTittel: 'Kort, der giver EuroBonus-point | Pointmaxing',
    kortTekst: 'Alle betalingskort i Danmark, der giver SAS EuroBonus-point, med point per 100 kr og pris.',
    kampanjerNaa: 'Kampagner lige nu',
  },
};

const idag = new Date().toISOString().slice(0, 10);
const escape = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const gjeldende = (sats) => (sats.kampanje && sats.kampanje.slutt >= idag ? sats.kampanje.verdi : sats.verdi);

/** EuroBonus-poeng per 100 kr med standardvalg (Trumf automatisk, Klarna Max). null når satsen er ukjent. */
function per100(program, sats) {
  const verdi = gjeldende(sats);
  if (program.satsEnhet === 'poengPer100') return verdi;
  const konv = program.konverteringer[0];
  if (!konv || konv.poengPerKrone == null) return null;
  const max = program.nivaer.find((n) => n.id === 'max');
  const effektiv = max ? verdi * max.butikkFaktor + max.ekstraProsent : verdi;
  return effektiv * konv.poengPerKrone;
}

function side({ lang, tittel, beskrivelse, url, kropp, noindex = false }) {
  return mal
    .replace(/<html lang="[^"]*">/, `<html lang="${lang}">`)
    .replace(/<title>[^<]*<\/title>/, `<title>${escape(tittel)}</title>`)
    .replace(/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${escape(beskrivelse)}" />`)
    .replace(
      '</head>',
      `    <link rel="canonical" href="${url}" />\n${noindex ? '    <meta name="robots" content="noindex" />\n' : ''}    <meta property="og:title" content="${escape(tittel)}" />\n    <meta property="og:description" content="${escape(beskrivelse)}" />\n    <meta property="og:url" content="${url}" />\n  </head>`,
    )
    .replace('<div id="root"></div>', `<div id="root">${kropp}</div>`);
}

async function skriv(sti, innhold) {
  await mkdir(new URL(`${sti}/`, dist), { recursive: true });
  await writeFile(new URL(`${sti}/index.html`, dist), innhold);
}

const urler = [`${DOMENE}/`];
// Til utvidelsen: butikker med grunnsats, og programmene med det som trengs for å regne
// poeng med brukerens nivå (Klarna Plus/Premium/Max).
const api = { hentet: stores.hentet, land: {}, programmer: {} };
for (const p of programmer) {
  api.programmer[p.id] = {
    id: p.id,
    navn: p.kortnavn,
    farge: p.farge,
    satsEnhet: p.satsEnhet,
    poengPerKrone: p.konverteringer[0]?.poengPerKrone ?? null,
    standardNiva: p.standardNiva ?? null,
    nivaer: p.nivaer.map((n) => ({ id: n.id, navn: n.navn, butikkFaktor: n.butikkFaktor, ekstraProsent: n.ekstraProsent, kanVeksle: n.kanVeksle !== false })),
  };
}
let antall = 0;

for (const [land, sprak] of Object.entries(SPRAK)) {
  const prog = programmer.filter((p) => p.land === land);
  const fmt = new Intl.NumberFormat(sprak.locale, { maximumFractionDigits: 1 });
  const butikker = new Map();
  for (const b of [...(stores.land[land] ?? []), ...(partnere.land[land] ?? [])]) {
    const e = butikker.get(b.id);
    if (e) Object.assign(e.satser, b.satser);
    else butikker.set(b.id, { ...b, satser: { ...b.satser } });
  }
  const liste = [...butikker.values()];
  const satsTekst = (p, sats) => {
    const verdi = gjeldende(sats);
    return p.satsEnhet === 'prosent' ? `${sats.opptil ? '≤' : ''}${fmt.format(verdi)} %` : `${fmt.format(verdi)} ${sprak.poeng}/100 kr`;
  };
  const lenkeTil = (b) => `/${sprak.sti}/${b.id}`;
  const butikkListe = (bs) => `<ul>${bs.map((b) => `<li><a href="${lenkeTil(b)}">${escape(b.navn)}</a></li>`).join('')}</ul>`;

  // Landside
  const landUrl = `${DOMENE}/${sprak.sti}/`;
  await skriv(sprak.sti, side({ lang: sprak.lang, tittel: sprak.landTittel, beskrivelse: sprak.landTekst, url: landUrl, kropp: `<main><h1>${escape(landInfo[land].navn)}</h1><p>${escape(sprak.landTekst)}</p>${butikkListe(liste)}</main>` }));
  urler.push(landUrl);

  // Butikkatalog, alle og per kategori
  const katalogUrl = `${DOMENE}/${sprak.sti}/butikker`;
  await skriv(`${sprak.sti}/butikker`, side({ lang: sprak.lang, tittel: sprak.butikkerTittel(null), beskrivelse: sprak.butikkerTekst(null, liste.length), url: katalogUrl, kropp: `<main><h1>${escape(sprak.alleButikker)}</h1>${butikkListe(liste)}</main>` }));
  urler.push(katalogUrl);
  for (const [katId, navn] of Object.entries(kategorier)) {
    const iKat = liste.filter((b) => b.kategorier?.includes(katId));
    if (iKat.length === 0) continue;
    const katNavn = navn[sprak.lang];
    const url = `${DOMENE}/${sprak.sti}/butikker/${katId}`;
    await skriv(`${sprak.sti}/butikker/${katId}`, side({ lang: sprak.lang, tittel: sprak.butikkerTittel(katNavn), beskrivelse: sprak.butikkerTekst(katNavn, iKat.length), url, kropp: `<main><h1>${escape(katNavn)}</h1>${butikkListe(iKat)}</main>` }));
    urler.push(url);
  }

  // Nytt og Kort
  const kampanjer = liste.flatMap((b) => prog.filter((p) => b.satser[p.id]?.kampanje && b.satser[p.id].kampanje.slutt >= idag).map((p) => ({ b, p })));
  const nyttUrl = `${DOMENE}/${sprak.sti}/nytt`;
  await skriv(`${sprak.sti}/nytt`, side({ lang: sprak.lang, tittel: sprak.nyttTittel, beskrivelse: sprak.nyttTekst, url: nyttUrl, kropp: `<main><h1>${escape(sprak.kampanjerNaa)}</h1><ul>${kampanjer.map(({ b, p }) => `<li><a href="${lenkeTil(b)}">${escape(b.navn)}</a>: ${escape(p.kortnavn)} ${escape(satsTekst(p, b.satser[p.id]))}</li>`).join('')}</ul></main>` }));
  urler.push(nyttUrl);
  const kortUrl = `${DOMENE}/${sprak.sti}/kort`;
  const kortILand = kort.filter((k) => k.land.includes(land));
  await skriv(`${sprak.sti}/kort`, side({ lang: sprak.lang, tittel: sprak.kortTittel, beskrivelse: sprak.kortTekst, url: kortUrl, kropp: `<main><h1>${escape(sprak.kortTittel.split(' | ')[0])}</h1><ul>${kortILand.map((k) => `<li>${escape(k.navn)}: ${fmt.format(k.poengPer100)} ${sprak.poeng}/100 kr – ${escape(k.pris)}</li>`).join('')}</ul></main>` }));
  urler.push(kortUrl);

  // Butikksider
  api.land[land] = [];
  for (const b of liste) {
    const deler = [];
    const linjer = [];
    const apiSatser = {};
    for (const p of prog) {
      const sats = b.satser[p.id];
      if (!sats) continue;
      const rå = satsTekst(p, sats);
      const eb = per100(p, sats);
      const ebTekst = eb === null ? '' : ` (${fmt.format(eb)} ${sprak.poeng}${p.nivaer.length ? ` ${sprak.med}` : ''})`;
      deler.push(`${p.kortnavn} ${rå}${ebTekst}`);
      linjer.push(`<li><strong>${escape(p.kortnavn)}</strong>: ${escape(rå)}${escape(ebTekst)}</li>`);
      apiSatser[p.id] = { tekst: rå, verdi: gjeldende(sats), per100: eb === null ? null : Math.round(eb * 10) / 10 };
    }
    api.land[land].push({ id: b.id, navn: b.navn, domene: b.domene ?? null, satser: apiSatser });
    const url = `${DOMENE}${lenkeTil(b)}`;
    const tittel = sprak.tittel(b.navn, prog.filter((p) => b.satser[p.id]).map((p) => p.kortnavn).join(', '));
    const beskrivelse = `${sprak.intro(b.navn)} ${deler.join(' · ')}.`;
    await skriv(`${sprak.sti}/${b.id}`, side({ lang: sprak.lang, tittel, beskrivelse, url, kropp: `<main><h1>${escape(b.navn)}</h1><p>${escape(sprak.intro(b.navn))}</p><ul>${linjer.join('')}</ul><p><a href="/${sprak.sti}/butikker">${escape(sprak.alleButikker)}</a></p></main>` }));
    urler.push(url);
    antall++;
  }
}

// Partnersiden til Klarna: norske tall, ikke i sitemap og ikke indeksert.
await skriv(
  'klarna',
  side({
    lang: 'nb',
    tittel: 'Pointmaxing for Klarna',
    beskrivelse: 'Slik viser Pointmaxing Klarna Plus, Premium og Max i hver butikk, på kortsiden og i Google-søk.',
    url: `${DOMENE}/klarna`,
    noindex: true,
    kropp: '<main><h1>Pointmaxing for Klarna</h1><p>Partnerforslag: Max-effekten i hver butikk, kortsiden og utvidelsen i Google-søk.</p></main>',
  }),
);

// Ukjente adresser laster appen likevel (GitHub Pages serverer 404.html).
await copyFile(new URL('index.html', dist), new URL('404.html', dist));
await mkdir(new URL('api/', dist), { recursive: true });
await writeFile(new URL('api/butikker.json', dist), JSON.stringify(api));
await writeFile(
  new URL('sitemap.xml', dist),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urler
    .map((u) => `  <url><loc>${u}</loc><lastmod>${stores.hentet}</lastmod></url>`)
    .join('\n')}\n</urlset>\n`,
);
await writeFile(new URL('robots.txt', dist), `User-agent: *\nAllow: /\nSitemap: ${DOMENE}/sitemap.xml\n`);
console.log(`Butikksider: ${antall}, sitemap med ${urler.length} adresser, api/butikker.json`);
