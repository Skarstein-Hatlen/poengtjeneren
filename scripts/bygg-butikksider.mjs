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
const historikk = await les('../src/data/history.json');
const { kampanjer: partnerkampanjer } = await les('../src/data/kampanjer.json');
const flyforsinkelse = await les('../src/data/flyforsinkelse.json');

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
    flyTittel: 'Forsinket fly? Du kan ha krav på opptil 600 € | Pointmaxing',
    flyH1: 'Forsinket fly',
    flyProvisjon: (navn) => `Vi får provisjon hvis du sender saken via ${navn}. Det påvirker ikke tallene.`,
    flyTekst: (navn, p) => `Over 3 timer forsinket eller innstilt fly kan gi 250–600 € i erstatning etter EU 261/2004. Krev selv hos flyselskapet, gratis, eller la ${navn} gjøre det – de tar ${p} % bare hvis de vinner.`,
    flyAvstand: { flyKort: 'til og med 1 500 km', flyMiddels: '1 500–3 500 km', flyLang: 'over 3 500 km utenfor EU' },
    kortTekst: 'Alle betalingskort i Norge som gir SAS EuroBonus-poeng, med poeng per 100 kr og pris.',
    kampanjerNaa: 'Kampanjer nå',
    andreKampanjer: 'Andre kampanjer',
    per1000Tittel: (navn, n) => `${navn}: opptil ${n} EuroBonus-poeng per 1 000 kr | Pointmaxing`,
    per1000Tekst: (navn, n, prog) => `Hos ${navn} får du opptil ${n} SAS EuroBonus-poeng per 1 000 kr via ${prog}. Satsene hos Trumf, Klarna og SAS Online Shopping side om side, oppdatert hver natt.`,
    belop: 'Beløp',
    slikFar: (prog) => `Slik får du poengene via ${prog}`,
    faqSporsmal: (prog, navn) => `Hvordan får jeg EuroBonus-poeng via ${prog} hos ${navn}?`,
    hentet: (dato) => `Satser hentet ${dato} fra programmenes egne sider. Klarna regnet med Max, Trumf med automatisk overføring.`,
    ukensTittel: 'Ukens beste EuroBonus-satser | Pointmaxing',
    ukensTekst: 'Butikkene som gir flest EuroBonus-poeng nå, satser som gikk opp siste 7 dager og kampanjer som snart utløper.',
    toppNaa: 'Flest poeng nå',
    okninger: 'Gikk opp siste 7 dager',
    utloper: 'Utløper innen 7 dager',
    feedTittel: (navn) => `${navn} – EuroBonus-satser`,
    endring: (prog, fra, til) => `${prog}: ${fra} → ${til}`,
    forsteMaling: (prog, sats) => `${prog}: ${sats} (første måling)`,
    landFeed: 'Satsendringer siste 30 dager',
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
    andreKampanjer: 'Andra kampanjer',
    per1000Tittel: (navn, n) => `${navn}: upp till ${n} EuroBonus-poäng per 1 000 kr | Pointmaxing`,
    per1000Tekst: (navn, n, prog) => `Hos ${navn} får du upp till ${n} SAS EuroBonus-poäng per 1 000 kr via ${prog}. Satserna hos Klarna och SAS Online Shopping sida vid sida, uppdaterade varje natt.`,
    belop: 'Belopp',
    slikFar: (prog) => `Så får du poängen via ${prog}`,
    faqSporsmal: (prog, navn) => `Hur får jag EuroBonus-poäng via ${prog} hos ${navn}?`,
    hentet: (dato) => `Satser hämtade ${dato} från programmens egna sidor. Klarna räknat med Max.`,
    ukensTittel: 'Veckans bästa EuroBonus-satser | Pointmaxing',
    ukensTekst: 'Butikerna som ger flest EuroBonus-poäng just nu, satser som gick upp senaste 7 dagarna och kampanjer som snart går ut.',
    toppNaa: 'Flest poäng just nu',
    okninger: 'Gick upp senaste 7 dagarna',
    utloper: 'Går ut inom 7 dagar',
    feedTittel: (navn) => `${navn} – EuroBonus-satser`,
    endring: (prog, fra, til) => `${prog}: ${fra} → ${til}`,
    forsteMaling: (prog, sats) => `${prog}: ${sats} (första mätningen)`,
    landFeed: 'Ändrade satser senaste 30 dagarna',
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
    andreKampanjer: 'Andre kampagner',
    per1000Tittel: (navn, n) => `${navn}: op til ${n} EuroBonus-point per 1 000 kr | Pointmaxing`,
    per1000Tekst: (navn, n, prog) => `Hos ${navn} får du op til ${n} SAS EuroBonus-point per 1 000 kr via ${prog}. Satserne hos Klarna og SAS Online Shopping side om side, opdateret hver nat.`,
    belop: 'Beløb',
    slikFar: (prog) => `Sådan får du pointene via ${prog}`,
    faqSporsmal: (prog, navn) => `Hvordan får jeg EuroBonus-point via ${prog} hos ${navn}?`,
    hentet: (dato) => `Satser hentet ${dato} fra programmernes egne sider. Klarna regnet med Max.`,
    ukensTittel: 'Ugens bedste EuroBonus-satser | Pointmaxing',
    ukensTekst: 'Butikkerne, der giver flest EuroBonus-point lige nu, satser, der steg de seneste 7 dage, og kampagner, der snart udløber.',
    toppNaa: 'Flest point lige nu',
    okninger: 'Steg de seneste 7 dage',
    utloper: 'Udløber inden for 7 dage',
    feedTittel: (navn) => `${navn} – EuroBonus-satser`,
    endring: (prog, fra, til) => `${prog}: ${fra} → ${til}`,
    forsteMaling: (prog, sats) => `${prog}: ${sats} (første måling)`,
    landFeed: 'Satsændringer de seneste 30 dage',
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

/** Atom-strøm: satsendringer for én butikk eller et helt land. */
function atom({ tittel, url, self, oppdatert, innslag }) {
  const dato = (d) => `${d}T00:00:00Z`;
  return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${escape(tittel)}</title>
  <link href="${url}"/>
  <link rel="self" href="${self}"/>
  <id>${self}</id>
  <updated>${dato(oppdatert)}</updated>
${innslag
  .map(
    (i) => `  <entry>
    <title>${escape(i.tittel)}</title>
    <link href="${i.url}"/>
    <id>${i.url}#${i.id}</id>
    <updated>${dato(i.dato)}</updated>
    <summary>${escape(i.tekst)}</summary>
  </entry>`,
  )
  .join('\n')}
</feed>
`;
}

function side({ lang, tittel, beskrivelse, url, kropp, noindex = false, feed = null, jsonld = null }) {
  return mal
    .replace(/<html lang="[^"]*">/, `<html lang="${lang}">`)
    .replace(/<title>[^<]*<\/title>/, `<title>${escape(tittel)}</title>`)
    .replace(/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${escape(beskrivelse)}" />`)
    .replace(
      '</head>',
      `    <link rel="canonical" href="${url}" />\n${noindex ? '    <meta name="robots" content="noindex" />\n' : ''}${feed ? `    <link rel="alternate" type="application/atom+xml" title="${escape(feed.tittel)}" href="${feed.url}" />\n` : ''}${jsonld ? `    <script type="application/ld+json">${JSON.stringify(jsonld).replace(/</g, '\\u003c')}</script>\n` : ''}    <meta property="og:title" content="${escape(tittel)}" />\n    <meta property="og:description" content="${escape(beskrivelse)}" />\n    <meta property="og:url" content="${url}" />\n  </head>`,
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
const api = { hentet: stores.hentet, land: {}, programmer: {}, ukens: {} };
const dagerMellom = (fra, til) => (new Date(til).getTime() - new Date(fra).getTime()) / 86_400_000;
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
  const andre = partnerkampanjer
    .filter((k) => k.land === land && (!k.slutt || k.slutt >= idag))
    .sort((a, b) => (b.enhet === 'poeng' ? b.verdi : 0) - (a.enhet === 'poeng' ? a.verdi : 0));
  await skriv(`${sprak.sti}/nytt`, side({ lang: sprak.lang, tittel: sprak.nyttTittel, beskrivelse: sprak.nyttTekst, url: nyttUrl, kropp: `<main>${andre.length ? `<h2>${escape(sprak.andreKampanjer)}</h2><ul>${andre.map((k) => `<li><a href="${escape(k.url)}" rel="noreferrer">${escape(k.tittel)}</a>${k.enhet === 'poeng' && k.verdi ? `: ${fmt.format(k.verdi)} ${sprak.poeng}` : ''} – ${escape(k.tekst)}</li>`).join('')}</ul>` : ''}<h1>${escape(sprak.kampanjerNaa)}</h1><ul>${kampanjer.map(({ b, p }) => `<li><a href="${lenkeTil(b)}">${escape(b.navn)}</a>: ${escape(p.kortnavn)} ${escape(satsTekst(p, b.satser[p.id]))}</li>`).join('')}</ul></main>` }));
  urler.push(nyttUrl);
  const kortUrl = `${DOMENE}/${sprak.sti}/kort`;
  const kortILand = kort.filter((k) => k.land.includes(land));
  await skriv(`${sprak.sti}/kort`, side({ lang: sprak.lang, tittel: sprak.kortTittel, beskrivelse: sprak.kortTekst, url: kortUrl, kropp: `<main><h1>${escape(sprak.kortTittel.split(' | ')[0])}</h1><ul>${kortILand.map((k) => `<li>${escape(k.navn)}: ${fmt.format(k.poengPer100)} ${sprak.poeng}/100 kr – ${fmt.format(k.prisPerMnd)} kr/${sprak.lang === 'sv' ? 'mån' : 'mnd'}</li>`).join('')}</ul></main>` }));
  urler.push(kortUrl);
  // Forsinket fly: bare i land der vi har en avtale med en tjeneste.
  const fly = flyforsinkelse.tjeneste[land];
  if (fly && sprak.flyTittel) {
    const flyUrl = `${DOMENE}/${sprak.sti}/flyforsinkelse`;
    const flyTekst = sprak.flyTekst(fly.navn, fly.honorar);
    await skriv(
      `${sprak.sti}/flyforsinkelse`,
      side({
        lang: sprak.lang,
        tittel: sprak.flyTittel,
        beskrivelse: flyTekst,
        url: flyUrl,
        kropp: `<main><h1>${escape(sprak.flyH1)}</h1><p>${escape(flyTekst)}</p><ul>${flyforsinkelse.belop.map((b) => `<li>${fmt.format(b.euro)} € – ${escape(sprak.flyAvstand[b.id])}</li>`).join('')}</ul><p><a href="${escape(fly.lenke)}" rel="sponsored noreferrer">${escape(fly.navn)}</a></p><p>${escape(sprak.flyProvisjon(fly.navn))}</p></main>`,
      }),
    );
    urler.push(flyUrl);
  }

  // Ukens beste: flest poeng nå, økninger siste 7 dager, kampanjer som utløper innen 7 dager.
  const hist = historikk[land] ?? {};
  const besteFor = (b) => {
    let topp = null;
    for (const p of prog) {
      const s = b.satser[p.id];
      if (!s) continue;
      const v = per100(p, s);
      if (v !== null && (topp === null || v > topp.per100)) topp = { b, p, per100: v };
    }
    return topp;
  };
  const topp10 = liste.map(besteFor).filter(Boolean).sort((a, b) => b.per100 - a.per100).slice(0, 10);
  const okninger = [];
  const endringer30 = [];
  for (const [bid, serier] of Object.entries(hist)) {
    const b = butikker.get(bid);
    if (!b) continue;
    for (const [pid, m] of Object.entries(serier)) {
      const p = prog.find((x) => x.id === pid);
      if (!p || m.length < 2) continue;
      const [dato, til] = m[m.length - 1];
      const fra = m[m.length - 2][1];
      if (dagerMellom(dato, idag) <= 30) endringer30.push({ b, p, fra, til, dato });
      if (til > fra && dagerMellom(dato, idag) <= 7) okninger.push({ b, p, fra, til, dato });
    }
  }
  okninger.sort((a, b) => b.til / b.fra - a.til / a.fra);
  endringer30.sort((a, b) => b.dato.localeCompare(a.dato));
  const utloper = kampanjer
    .filter(({ b, p }) => dagerMellom(idag, b.satser[p.id].kampanje.slutt) <= 7)
    .sort((x, y) => x.b.satser[x.p.id].kampanje.slutt.localeCompare(y.b.satser[y.p.id].kampanje.slutt));
  api.ukens[land] = {
    topp: topp10.map(({ b, p, per100: v }) => ({ id: b.id, navn: b.navn, sti: sprak.sti, program: p.kortnavn, sats: satsTekst(p, b.satser[p.id]), per100: Math.round(v * 10) / 10 })),
    okninger: okninger.map(({ b, p, fra, til, dato }) => ({ id: b.id, navn: b.navn, sti: sprak.sti, program: p.kortnavn, fra, til, dato })),
    utloper: utloper.map(({ b, p }) => ({ id: b.id, navn: b.navn, sti: sprak.sti, program: p.kortnavn, sats: satsTekst(p, b.satser[p.id]), slutt: b.satser[p.id].kampanje.slutt })),
  };
  const ukensUrl = `${DOMENE}/${sprak.sti}/ukens`;
  const rad = (b, tekst) => `<li><a href="${lenkeTil(b)}">${escape(b.navn)}</a>: ${escape(tekst)}</li>`;
  await skriv(
    `${sprak.sti}/ukens`,
    side({
      lang: sprak.lang,
      tittel: sprak.ukensTittel,
      beskrivelse: sprak.ukensTekst,
      url: ukensUrl,
      kropp: `<main><h1>${escape(sprak.ukensTittel.split(' | ')[0])}</h1><h2>${escape(sprak.toppNaa)}</h2><ul>${topp10.map(({ b, p, per100: v }) => rad(b, `${p.kortnavn} ${satsTekst(p, b.satser[p.id])} = ${fmt.format(v)} ${sprak.poeng}/100 kr`)).join('')}</ul><h2>${escape(sprak.okninger)}</h2><ul>${okninger.map(({ b, p, fra, til }) => rad(b, sprak.endring(p.kortnavn, fmt.format(fra), fmt.format(til)))).join('')}</ul><h2>${escape(sprak.utloper)}</h2><ul>${utloper.map(({ b, p }) => rad(b, `${p.kortnavn} ${satsTekst(p, b.satser[p.id])} – ${b.satser[p.id].kampanje.slutt}`)).join('')}</ul></main>`,
    }),
  );
  urler.push(ukensUrl);

  // Atom-strøm for landet: alle satsendringer siste 30 dager.
  await writeFile(
    new URL(`${sprak.sti}/feed.xml`, dist),
    atom({
      tittel: `Pointmaxing – ${sprak.landFeed}`,
      url: landUrl,
      self: `${DOMENE}/${sprak.sti}/feed.xml`,
      oppdatert: stores.hentet,
      innslag: endringer30.slice(0, 100).map(({ b, p, fra, til, dato }) => ({ id: `${p.id}-${dato}`, dato, url: `${DOMENE}${lenkeTil(b)}`, tittel: `${b.navn} – ${sprak.endring(p.kortnavn, fmt.format(fra), fmt.format(til))}`, tekst: sprak.endring(p.kortnavn, fmt.format(fra), fmt.format(til)) })),
    }),
  );

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
      apiSatser[p.id] = { tekst: rå, verdi: gjeldende(sats), per100: eb === null ? null : Math.round(eb * 10) / 10, lenke: sats.lenke ?? sats.kilde ?? null };
    }
    api.land[land].push({ id: b.id, navn: b.navn, domene: b.domene ?? null, satser: apiSatser });
    const url = `${DOMENE}${lenkeTil(b)}`;
    const best = besteFor(b);
    const medSats = prog.filter((p) => b.satser[p.id]);
    const tittel = best ? sprak.per1000Tittel(b.navn, fmt.format(Math.round(best.per100 * 10))) : sprak.tittel(b.navn, medSats.map((p) => p.kortnavn).join(', '));
    const beskrivelse = best ? sprak.per1000Tekst(b.navn, fmt.format(Math.round(best.per100 * 10)), best.p.kortnavn) : `${sprak.intro(b.navn)} ${deler.join(' · ')}.`;
    // Tabell: poeng ved 500, 1 000 og 5 000 kr per program – det folk faktisk søker etter.
    const belopene = [500, 1000, 5000];
    const tabell = `<table><thead><tr><th>${escape(sprak.belop)}</th>${medSats.map((p) => `<th>${escape(p.kortnavn)}</th>`).join('')}</tr></thead><tbody>${belopene
      .map((kr) => `<tr><td>${fmt.format(kr)} kr</td>${medSats.map((p) => { const v = per100(p, b.satser[p.id]); return `<td>${v === null ? '–' : fmt.format(Math.round((v * kr) / 100))}</td>`; }).join('')}</tr>`)
      .join('')}</tbody></table>`;
    const faq = medSats.map((p) => ({ '@type': 'Question', name: sprak.faqSporsmal(p.kortnavn, b.navn), acceptedAnswer: { '@type': 'Answer', text: `${p.kortnavn}: ${satsTekst(p, b.satser[p.id])}. ${p.vilkar.join(' ')}` } }));
    const jsonld = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq };
    const feed = { tittel: sprak.feedTittel(b.navn), url: `${url}/feed.xml` };
    await skriv(
      `${sprak.sti}/${b.id}`,
      side({
        lang: sprak.lang,
        tittel,
        beskrivelse,
        url,
        feed,
        jsonld,
        kropp: `<main><h1>${escape(b.navn)}</h1><p>${escape(sprak.intro(b.navn))}</p><ul>${linjer.join('')}</ul>${tabell}${medSats.map((p) => `<h2>${escape(sprak.slikFar(p.kortnavn))}</h2><ol>${p.vilkar.map((v) => `<li>${escape(v)}</li>`).join('')}</ol>`).join('')}<p>${escape(sprak.hentet(stores.hentet))}</p><p><a href="/${sprak.sti}/butikker">${escape(sprak.alleButikker)}</a> · <a href="${feed.url}">RSS</a></p></main>`,
      }),
    );
    // Atom-strøm for butikken: hver satsendring, ellers første måling.
    const innslag = [];
    for (const p of medSats) {
      const m = hist[b.id]?.[p.id] ?? [];
      if (m.length === 0) continue;
      const sats = (v) => (p.satsEnhet === 'prosent' ? `${fmt.format(v)} %` : `${fmt.format(v)} ${sprak.poeng}/100 kr`);
      if (m.length === 1) innslag.push({ id: `${p.id}-${m[0][0]}`, dato: m[0][0], url, tittel: sprak.forsteMaling(p.kortnavn, sats(m[0][1])), tekst: sprak.forsteMaling(p.kortnavn, sats(m[0][1])) });
      for (let i = 1; i < m.length; i++) {
        const tekst = sprak.endring(p.kortnavn, sats(m[i - 1][1]), sats(m[i][1]));
        innslag.push({ id: `${p.id}-${m[i][0]}`, dato: m[i][0], url, tittel: tekst, tekst });
      }
    }
    innslag.sort((a, c) => c.dato.localeCompare(a.dato));
    await writeFile(new URL(`${sprak.sti}/${b.id}/feed.xml`, dist), atom({ tittel: `${sprak.feedTittel(b.navn)} | Pointmaxing`, url, self: feed.url, oppdatert: innslag[0]?.dato ?? stores.hentet, innslag }));
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

// One-pageren til FlyMedPoeng: samarbeidsforslag, ikke i sitemap og ikke indeksert.
await skriv(
  'flymedpoeng',
  side({
    lang: 'nb',
    tittel: 'Pointmaxing × FlyMedPoeng',
    beskrivelse: 'Samarbeidsforslag: Pointmaxing hjelper folk å tjene EuroBonus-poeng, FlyMedPoeng hjelper dem å bruke dem.',
    url: `${DOMENE}/flymedpoeng`,
    noindex: true,
    kropp: '<main><h1>Pointmaxing × FlyMedPoeng</h1><p>Samarbeidsforslag: vi hjelper folk å tjene poengene, FlyMedPoeng hjelper dem å bruke dem.</p></main>',
  }),
);

// Personvern og utvidelse: norske sider uten land i adressen.
await skriv('personvern', side({ lang: 'nb', tittel: 'Personvern | Pointmaxing', beskrivelse: 'Pointmaxing samler ikke inn personopplysninger – verken nettsiden eller nettleserutvidelsen.', url: `${DOMENE}/personvern`, kropp: '<main><h1>Personvern</h1><p>Pointmaxing samler ikke inn personopplysninger. Nettsiden setter ingen informasjonskapsler og sporer deg ikke; valgene dine lagres bare i nettleseren. Lenker merket «Annonse» går via annonsenettverket Partner-ads, som kan sette informasjonskapsler for å registrere at du kom fra oss. Utvidelsen leser adressen til fanen lokalt for å kjenne igjen butikken, henter én offentlig satsfil fra pointmaxing.no daglig og sender ingenting videre.</p></main>' }));
urler.push(`${DOMENE}/personvern`);
await skriv('utvidelse', side({ lang: 'nb', tittel: 'Chrome-utvidelse | Pointmaxing', beskrivelse: 'Se EuroBonus-poengene rett i Google-søk og i nettbutikken, og få varsel når satsen går opp.', url: `${DOMENE}/utvidelse`, kropp: '<main><h1>Chrome-utvidelse</h1><p>Poengene i Google-søk, et kort med satsene i nettbutikken og varsel når butikker du følger går opp.</p><p><a href="/pointmaxing-utvidelse.zip">Last ned utvidelsen (zip)</a></p></main>' }));
urler.push(`${DOMENE}/utvidelse`);

// Ukjente adresser laster appen likevel (GitHub Pages serverer 404.html).
await copyFile(new URL('index.html', dist), new URL('404.html', dist));
await mkdir(new URL('api/', dist), { recursive: true });
await writeFile(new URL('api/butikker.json', dist), JSON.stringify({ hentet: api.hentet, land: api.land, programmer: api.programmer }));
await writeFile(new URL('api/ukens.json', dist), JSON.stringify({ hentet: api.hentet, land: api.ukens }));
await writeFile(
  new URL('sitemap.xml', dist),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urler
    .map((u) => `  <url><loc>${u}</loc><lastmod>${stores.hentet}</lastmod></url>`)
    .join('\n')}\n</urlset>\n`,
);
await writeFile(new URL('robots.txt', dist), `User-agent: *\nAllow: /\nSitemap: ${DOMENE}/sitemap.xml\n`);
console.log(`Butikksider: ${antall}, sitemap med ${urler.length} adresser, api/butikker.json`);
