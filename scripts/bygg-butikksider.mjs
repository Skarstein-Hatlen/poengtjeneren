// Lager én statisk side per butikk og land i dist/ (f.eks. dist/no/kicks/index.html),
// pluss landsider, 404.html, sitemap.xml og robots.txt. Kjøres etter `vite build`.
// Sidene har tittel, beskrivelse og satser i HTML-en, så søkemotorer ser dem uten JavaScript;
// appen tar over når den laster.

import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';

const DOMENE = 'https://pointmaxing.no';
const dist = new URL('../dist/', import.meta.url);
const les = async (sti) => JSON.parse(await readFile(new URL(sti, import.meta.url), 'utf8'));

const mal = await readFile(new URL('index.html', dist), 'utf8');
const { programmer, land: landInfo } = await les('../src/data/programs.json');
const stores = await les('../src/data/stores.json');
const partnere = await les('../src/data/partners.json');

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
  },
};

const idag = new Date().toISOString().slice(0, 10);
const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** EuroBonus-poeng per 100 kr med standardvalg (Trumf automatisk, Klarna Max). null når satsen er ukjent. */
function per100(program, sats) {
  const verdi = sats.kampanje && sats.kampanje.slutt >= idag ? sats.kampanje.verdi : sats.verdi;
  if (program.satsEnhet === 'poengPer100') return verdi;
  const konv = program.konverteringer[0];
  if (!konv || konv.poengPerKrone == null) return null;
  const max = program.nivaer.find((n) => n.id === 'max');
  const effektiv = max ? verdi * max.butikkFaktor + max.ekstraProsent : verdi;
  return effektiv * konv.poengPerKrone;
}

function side({ lang, tittel, beskrivelse, url, kropp }) {
  return mal
    .replace(/<html lang="[^"]*">/, `<html lang="${lang}">`)
    .replace(/<title>[^<]*<\/title>/, `<title>${escape(tittel)}</title>`)
    .replace(/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${escape(beskrivelse)}" />`)
    .replace(
      '</head>',
      `    <link rel="canonical" href="${url}" />\n    <meta property="og:title" content="${escape(tittel)}" />\n    <meta property="og:description" content="${escape(beskrivelse)}" />\n    <meta property="og:url" content="${url}" />\n  </head>`,
    )
    .replace('<div id="root"></div>', `<div id="root">${kropp}</div>`);
}

const urler = [`${DOMENE}/`];
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

  // Landside
  const landUrl = `${DOMENE}/${sprak.sti}/`;
  await mkdir(new URL(`${sprak.sti}/`, dist), { recursive: true });
  await writeFile(
    new URL(`${sprak.sti}/index.html`, dist),
    side({
      lang: sprak.lang,
      tittel: sprak.landTittel,
      beskrivelse: sprak.landTekst,
      url: landUrl,
      kropp: `<main><h1>${escape(landInfo[land].navn)}</h1><p>${escape(sprak.landTekst)}</p><ul>${[...butikker.values()]
        .map((b) => `<li><a href="/${sprak.sti}/${b.id}">${escape(b.navn)}</a></li>`)
        .join('')}</ul></main>`,
    }),
  );
  urler.push(landUrl);

  // Butikksider
  for (const b of butikker.values()) {
    const deler = [];
    const linjer = [];
    for (const p of prog) {
      const sats = b.satser[p.id];
      if (!sats) continue;
      const verdi = sats.kampanje && sats.kampanje.slutt >= idag ? sats.kampanje.verdi : sats.verdi;
      const rå = p.satsEnhet === 'prosent' ? `${sats.opptil ? '≤' : ''}${fmt.format(verdi)} %` : `${fmt.format(verdi)} ${sprak.poeng}/100 kr`;
      const eb = per100(p, sats);
      const ebTekst = eb === null ? '' : ` (${fmt.format(eb)} ${sprak.poeng}${p.nivaer.length ? ` ${sprak.med}` : ''})`;
      deler.push(`${p.kortnavn} ${rå}${ebTekst}`);
      linjer.push(`<li><strong>${escape(p.kortnavn)}</strong>: ${escape(rå)}${escape(ebTekst)}</li>`);
    }
    const url = `${DOMENE}/${sprak.sti}/${b.id}`;
    const tittel = sprak.tittel(b.navn, prog.filter((p) => b.satser[p.id]).map((p) => p.kortnavn).join(', '));
    const beskrivelse = `${sprak.intro(b.navn)} ${deler.join(' · ')}.`;
    await mkdir(new URL(`${sprak.sti}/${b.id}/`, dist), { recursive: true });
    await writeFile(
      new URL(`${sprak.sti}/${b.id}/index.html`, dist),
      side({
        lang: sprak.lang,
        tittel,
        beskrivelse,
        url,
        kropp: `<main><h1>${escape(b.navn)}</h1><p>${escape(sprak.intro(b.navn))}</p><ul>${linjer.join('')}</ul><p><a href="/${sprak.sti}/">${escape(sprak.alleButikker)}</a></p></main>`,
      }),
    );
    urler.push(url);
    antall++;
  }
}

// Ukjente adresser laster appen likevel (GitHub Pages serverer 404.html).
await copyFile(new URL('index.html', dist), new URL('404.html', dist));
await writeFile(
  new URL('sitemap.xml', dist),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urler
    .map((u) => `  <url><loc>${u}</loc><lastmod>${stores.hentet}</lastmod></url>`)
    .join('\n')}\n</urlset>\n`,
);
await writeFile(new URL('robots.txt', dist), `User-agent: *\nAllow: /\nSitemap: ${DOMENE}/sitemap.xml\n`);
console.log(`Butikksider: ${antall}, sitemap med ${urler.length} adresser`);
