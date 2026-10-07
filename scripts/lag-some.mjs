// Lager ukens poster til Instagram (4:5) og TikTok (9:16) fra dagens tall – ukens beste (karusell), butikkduellen, kortduellen
// og Amex eller Klarna Max (roterer etter src/data/some.json) – med tekst til hver post, og en enkel side på /some der alt kan
// lagres fra mobilen. Kjøres etter bygg-butikksider.mjs (leser dist/api/ukens.json).
// Tegneverktøyet (Barlow som vektorer, farger, logoer) ligger i tegning.mjs.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { F, flis, fly, hake, linjer, logo, mål, pil, rot, S, tekst } from './tegning.mjs';

const dist = new URL('dist/', rot);
const UT = new URL('some/', dist);
const les = async (sti) => JSON.parse(await readFile(new URL(sti, rot), 'utf8'));
const FORMATER = {
  instagram: { B: 1080, H: 1350, toppY: 104, kortY: 160, kortH: 1040, bunnY: 1292, kortX: 60, kortB: 960 },
  // TikTok legger knapper langs høyre kant og teksten nederst – innholdet holdes unna begge.
  tiktok: { B: 1080, H: 1920, toppY: 230, kortY: 296, kortH: 1210, bunnY: 1600, kortX: 56, kortB: 880 },
};

const idag = new Date().toISOString().slice(0, 10);
const uke = (() => {
  const d = new Date(`${idag}T00:00:00Z`);
  const dag = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dag + 3);
  const forsteTorsdag = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  return 1 + Math.round(((d - forsteTorsdag) / 864e5 - 3 + ((forsteTorsdag.getUTCDay() + 6) % 7)) / 7);
})();
const tall = (n, des = 0) => n.toLocaleString('nb-NO', { maximumFractionDigits: des }).replace(/[  ]/g, ' ');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

// ---------- data ----------

const ukens = JSON.parse(await readFile(new URL('api/ukens.json', dist), 'utf8')).land.NO;
const alleButikker = (await les('src/data/stores.json')).land;
const butikker = alleButikker.NO;
const butikkerTotalt = Object.values(alleButikker).reduce((n, liste) => n + liste.length, 0);
const { programmer } = await les('src/data/programs.json');
const { kampanjer } = await les('src/data/kampanjer.json');
const PROG = Object.fromEntries(programmer.filter((p) => p.land === 'NO').map((p) => [p.kortnavn, p]));
const farge = (kortnavn) => PROG[kortnavn]?.farge ?? F.navy;
const programNavn = (kortnavn) => (kortnavn === 'Klarna' ? 'Klarna Max' : kortnavn);
const trumfKurs = PROG.Trumf?.konverteringer[0]?.poengPerKrone ?? 0;

const butikkLogo = (id) => logo(butikker.find((b) => b.id === id)?.logo);

const topp = ukens.topp.slice(0, 5);
const opp = ukens.okninger.slice(0, 5);
const ut = ukens.utloper.filter((u) => u.slutt >= idag).slice(0, 5);
const bonuser = kampanjer
  .filter((k) => k.land === 'NO' && !k.id.startsWith('sas-business') && (!k.slutt || k.slutt >= idag) && (k.enhet === 'poeng' || k.enhet === 'kr'))
  .map((k) => ({ ...k, poeng: k.enhet === 'kr' ? k.verdi * trumfKurs : k.verdi }))
  .sort((a, b) => b.poeng - a.poeng)
  .slice(0, 5);
const dagerIgjen = (slutt) => Math.round((Date.parse(slutt) - Date.parse(idag)) / 864e5);
const enhet = (kortnavn) => (PROG[kortnavn]?.satsEnhet === 'poengPer100' ? 'p' : '%');
const per100Tekst = (v) => tall(v, v >= 100 ? 0 : 1);

// ---------- byggeklosser ----------

function ramme(f, innhold, { sveip = true } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${f.B}" height="${f.H}" viewBox="0 0 ${f.B} ${f.H}">
<rect width="${f.B}" height="${f.H}" fill="${F.navy}"/>
${fly(f.kortX, f.toppY - 40, 0.48, F.krem)}
${tekst('POINTMAXING', { x: f.kortX + 62, y: f.toppY, str: 46, font: S.smalHalv, farge: F.krem, sperring: 5 })}
${tekst(`UKE ${uke}`, { x: f.kortX + f.kortB, y: f.toppY - 6, str: 26, font: S.semibold, farge: F.lys, anker: 'end', sperring: 4 })}
${innhold}
${tekst('pointmaxing.no', { x: f.kortX, y: f.bunnY, str: 44, font: S.smalHalv, farge: F.gullfyll, sperring: 1 })}
${sveip ? `${tekst('Sveip', { x: f.kortX + f.kortB - 38, y: f.bunnY - 4, str: 30, font: S.medium, farge: F.lys, anker: 'end' })}${pil(f.kortX + f.kortB - 26, f.bunnY - 14, 30, F.lys)}` : ''}
</svg>`;
}

function kort(f, id, innhold, y = f.kortY, h = f.kortH) {
  return `<defs><clipPath id="${id}"><rect x="${f.kortX}" y="${y}" width="${f.kortB}" height="${h}" rx="30"/></clipPath></defs>
<rect x="${f.kortX}" y="${y}" width="${f.kortB}" height="${h}" rx="30" fill="${F.papir}"/>
<rect x="${f.kortX}" y="${y}" width="${f.kortB}" height="10" fill="${F.gullfyll}" clip-path="url(#${id})"/>
${innhold}`;
}

function etikett(t, x, y, farge = F.dempet) {
  return tekst(t.toUpperCase(), { x, y, str: 26, font: S.semibold, farge, sperring: 4 });
}

/** Fem rader i et kort: logo, navn, linje under, stort tall til høyre. */
async function rader(f, overskrift, liste) {
  const x0 = f.kortX + 40;
  const hoyre = f.kortX + f.kortB - 44;
  const topp0 = f.kortY + 150;
  const rh = (f.kortH - 180) / 5;
  let svg = etikett(overskrift, x0, f.kortY + 92);
  for (let i = 0; i < liste.length; i++) {
    const r = liste[i];
    const y = topp0 + i * rh;
    const midt = y + rh / 2;
    const tallBredde = Math.max(mål(r.tall, S.smalFet, 78), mål(r.enhet, S.medium, 26));
    const tekstX = x0 + 150 + 28;
    const maks = hoyre - tallBredde - 28 - tekstX;
    svg += `<rect x="${x0}" y="${y}" width="${hoyre - x0}" height="2" fill="${F.strek}"/>`;
    svg += await flis(x0, midt - 38, 150, 76, r.logo, r.navn);
    svg += tekst(r.navn, { x: tekstX, y: midt - 4, str: 42, font: S.semibold, farge: F.blekk, maks });
    if (r.prikk) svg += `<circle cx="${tekstX + 9}" cy="${midt + 30}" r="9" fill="${r.prikk}"/>`;
    svg += tekst(r.under, { x: tekstX + (r.prikk ? 28 : 0), y: midt + 40, str: 30, font: S.regular, farge: F.dempet, maks: maks - (r.prikk ? 28 : 0) });
    svg += tekst(r.tall, { x: hoyre, y: midt + 14, str: 78, font: S.smalFet, farge: r.tallFarge ?? F.blekk, anker: 'end' });
    svg += tekst(r.enhet, { x: hoyre, y: midt + 50, str: 26, font: S.medium, farge: F.dempet, anker: 'end' });
  }
  return svg;
}

// ---------- slidene ----------

/** Forside: etikett, tittel på to linjer, en undertekst og et kort med butikken som gir flest poeng. */
async function forsideSlide(f, { etikettTekst, tittel, gullLinje2 = false, underTekst, t }) {
  const x = f.kortX;
  const y = f.H * (f.H > 1500 ? 0.27 : 0.25);
  let svg = etikett(etikettTekst, x, y, F.gullfyll);
  tittel.forEach((l, i) => (svg += tekst(l, { x, y: y + 150 + i * 138, str: 142, font: S.smalFet, farge: gullLinje2 && i === 1 ? F.gullfyll : F.krem, maks: f.kortB })));
  const under = linjer(underTekst, S.regular, 42, f.kortB - 40);
  under.forEach((l, i) => (svg += tekst(l, { x, y: y + 400 + i * 56, str: 42, font: S.regular, farge: F.lys })));
  if (t) {
    const ky = y + 400 + under.length * 56 + 60;
    const innhold =
      etikett('Flest poeng nå', x + 40, ky + 70) +
      (await flis(x + 40, ky + 110, 150, 76, await butikkLogo(t.id), t.navn)) +
      tekst(t.navn, { x: x + 218, y: ky + 146, str: 44, font: S.semibold, farge: F.blekk, maks: f.kortB - 480 }) +
      `<circle cx="${x + 227}" cy="${ky + 176}" r="9" fill="${farge(t.program)}"/>` +
      tekst(`via ${programNavn(t.program)}${t.opptil ? ' · opptil' : ''}`, { x: x + 246, y: ky + 186, str: 30, font: S.regular, farge: F.dempet }) +
      tekst(per100Tekst(t.per100), { x: x + f.kortB - 44, y: ky + 162, str: 84, font: S.smalFet, farge: F.blekk, anker: 'end' }) +
      tekst('poeng/100 kr', { x: x + f.kortB - 44, y: ky + 198, str: 26, font: S.medium, farge: F.dempet, anker: 'end' });
    svg += kort(f, 'forside', innhold, ky, 240);
  }
  return ramme(f, svg);
}
const forside = (f) =>
  forsideSlide(f, { etikettTekst: `Ukens beste · uke ${uke}`, tittel: ['Flest EuroBonus-', 'poeng denne uken'], underTekst: 'Trumf, Klarna eller SAS Shopping? Vi har regnet ut hvor du får mest.', t: topp[0] });

async function flestPoeng(f) {
  const liste = await Promise.all(
    topp.map(async (t) => ({ navn: t.navn, logo: await butikkLogo(t.id), prikk: farge(t.program), under: `via ${programNavn(t.program)}`, tall: per100Tekst(t.per100), enhet: 'poeng/100 kr' })),
  );
  return ramme(f, kort(f, 'topp', await rader(f, 'Flest poeng nå', liste)));
}

async function gikkOpp(f) {
  const liste = await Promise.all(
    opp.map(async (o) => {
      const e = enhet(o.program);
      const v = (n) => (e === '%' ? `${tall(n, 1)} %` : `${tall(n)} p`);
      return { navn: o.navn, logo: await butikkLogo(o.id), prikk: farge(o.program), under: `${o.program}: fra ${v(o.fra)} til ${v(o.til)}`, tall: v(o.til), enhet: e === '%' ? 'bonus' : 'poeng/100 kr', tallFarge: F.gull };
    }),
  );
  return ramme(f, kort(f, 'opp', await rader(f, 'Gikk opp siste 7 dager', liste)));
}

async function velkomst(f) {
  const liste = await Promise.all(
    bonuser.map(async (k) => ({ navn: k.partner, logo: await logo(k.logo), under: k.tekst.replace(/\.$/, ''), tall: tall(Math.round(k.poeng)), enhet: 'poeng' })),
  );
  return ramme(f, kort(f, 'velkomst', await rader(f, 'Velkomstbonuser nå', liste)));
}

async function sisteSjanse(f) {
  const liste = await Promise.all(
    ut.map(async (u) => {
      const d = dagerIgjen(u.slutt);
      return { navn: u.navn, logo: await butikkLogo(u.id), prikk: farge(u.program), under: `${u.program}: ${u.sats}`, tall: d <= 0 ? 'I dag' : `${d} ${d === 1 ? 'dag' : 'dager'}`, enhet: 'igjen', tallFarge: '#b3261e' };
    }),
  );
  return ramme(f, kort(f, 'siste', await rader(f, 'Siste sjanse', liste)));
}

async function slutt(f) {
  const x = f.kortX;
  const y = f.H * (f.H > 1500 ? 0.26 : 0.22);
  let svg = tekst('Sjekk butikken', { x, y, str: 132, font: S.smalFet, farge: F.krem });
  svg += tekst('før du handler', { x, y: y + 132, str: 132, font: S.smalFet, farge: F.gullfyll });
  const ky = y + 220;
  const punkter = ['Trumf, Klarna og SAS Shopping side om side', `${tall(Math.floor(butikkerTotalt / 100) * 100)}+ butikker i Norge, Sverige og Danmark`, 'Kortene og velkomstbonusene som gir mest'];
  let innhold = tekst('pointmaxing.no', { x: x + 48, y: ky + 150, str: 112, font: S.smalFet, farge: F.blekk });
  punkter.forEach((p, i) => {
    const py = ky + 250 + i * 70;
    innhold += hake(x + 50, py, 38, F.gull);
    innhold += tekst(p, { x: x + 100, y: py, str: 36, font: S.medium, farge: F.blekk, maks: f.kortB - 150 });
  });
  innhold += tekst('Gratis · uten innlogging', { x: x + 48, y: ky + 250 + punkter.length * 70 + 30, str: 30, font: S.regular, farge: F.dempet });
  svg += kort(f, 'slutt', innhold, ky, 250 + punkter.length * 70 + 110);
  return ramme(f, svg, { sveip: false });
}

// ---------- dueller ----------

const oppsett = await les('src/data/some.json');
const kortbilder = await les('src/data/kortbilder.json');
const alleKort = await les('src/data/cards.json');
const runde = (liste) => liste[(((uke - oppsett.startUke) % liste.length) + liste.length) % liste.length];
const gjeldende = (s) => (s.kampanje && s.kampanje.slutt >= idag ? s.kampanje.verdi : s.verdi);
const programNO = programmer.filter((p) => p.land === 'NO');

/** EuroBonus-poeng per 100 kr i en butikk, Klarna med Max – samme regning som butikksidene. */
function per100Butikk(p, sats) {
  const v = gjeldende(sats);
  if (p.satsEnhet === 'poengPer100') return v;
  const kurs = p.konverteringer[0]?.poengPerKrone;
  if (!kurs) return null;
  const max = p.nivaer.find((n) => n.id === 'max');
  return (max ? v * max.butikkFaktor + max.ekstraProsent : v) * kurs;
}

const kortBilder = new Map();
async function kortbilde(id) {
  const sti = kortbilder[id];
  if (!sti) return null;
  if (!kortBilder.has(id)) {
    kortBilder.set(
      id,
      sharp(fileURLToPath(new URL(`public${sti}`, rot)), { density: 200 })
        .resize(640)
        .png()
        .toBuffer()
        .then((b) => `data:image/png;base64,${b.toString('base64')}`)
        .catch(() => null),
    );
  }
  return kortBilder.get(id);
}

/** Kortet i en duell: Klarna-nivåene regnes som kort (tillegget på alle kjøp), resten fra cards.json. */
function kortFor(id) {
  const klarna = id.match(/^klarna-kort-(plus|premium|max)$/);
  if (klarna) {
    const p = PROG.Klarna;
    const n = p?.nivaer.find((x) => x.id === klarna[1]);
    if (!p || !n) return null;
    return { id, navn: `Klarna ${n.navn}`, per100: n.ekstraProsent * (p.konverteringer[0]?.poengPerKrone ?? 0), prisPerMnd: n.prisPerMnd, tak: null };
  }
  const k = alleKort.find((x) => x.id === id && x.land.includes('NO'));
  if (!k) return null;
  const pris = k.prisPerMndFra && idag >= k.prisPerMndFra.dato ? k.prisPerMndFra.kr : k.prisPerMnd;
  return { id, navn: k.navn, per100: k.poengPer100, prisPerMnd: pris, tak: k.tak ?? null };
}
function regnKort(k) {
  const poeng = (Math.min(oppsett.kortbruk, k.tak ?? Infinity) * k.per100) / 100;
  const kostnad = k.prisPerMnd * 12;
  return { ...k, poeng, kostnad, ore: poeng > 0 ? (kostnad * 100) / poeng : null };
}

// Ukens butikk: neste i rotasjonen som fortsatt finnes i minst to programmer.
/** Programmene i en butikk med poeng per 100 kr, flest først. */
const raderFor = (b) =>
  programNO
    .filter((p) => b.satser[p.id])
    .map((p) => ({ p, navn: p.id === 'klarna' ? 'Klarna Max' : p.kortnavn, per100: per100Butikk(p, b.satser[p.id]), opptil: Boolean(b.satser[p.id].opptil) }))
    .filter((r) => r.per100 !== null)
    .sort((a, c) => c.per100 - a.per100);

const butikkDuell = (() => {
  const liste = oppsett.butikkduell.map((id) => butikker.find((b) => b.id === id)).filter((b) => b && Object.keys(b.satser).length >= 2);
  if (!liste.length) return null;
  const b = runde(liste);
  const rader = raderFor(b);
  return rader.length >= 2 ? { b, rader } : null;
})();

// Ukens kortpar.
const kortDuell = (() => {
  const par = runde(oppsett.kortduell).map(kortFor);
  if (par.some((k) => !k)) return null;
  const [a, c] = par.map(regnKort);
  // Billigst per poeng vinner; koster begge null, vinner den med flest poeng.
  const vinner = a.ore === c.ore ? (a.poeng >= c.poeng ? a : c) : (a.ore ?? Infinity) < (c.ore ?? Infinity) ? a : c;
  return { a, c, vinner };
})();

// Amex eller Klarna Max: Trumf + Amex-kortet mot Klarna Max i butikker der begge gir fast prosent ("opptil" er utelatt).
const amexDuell = (() => {
  const amex = kortFor(oppsett.amexduell.kort);
  const trumf = PROG.Trumf;
  const klarna = PROG.Klarna;
  if (!amex || !trumf || !klarna) return null;
  const alle = butikker
    .filter((b) => b.satser[trumf.id] && b.satser[klarna.id] && !b.satser[trumf.id].opptil && !b.satser[klarna.id].opptil)
    .map((b) => ({ b, amex: per100Butikk(trumf, b.satser[trumf.id]) + amex.per100, klarna: per100Butikk(klarna, b.satser[klarna.id]) }))
    .filter((r) => r.klarna !== null);
  const amexSeire = alle.filter((r) => r.amex > r.klarna).sort((a, c) => c.amex - c.klarna - (a.amex - a.klarna));
  const klarnaSeire = alle.filter((r) => r.klarna > r.amex).sort((a, c) => c.klarna - c.amex - (a.klarna - a.amex));
  // Det sjeldne utfallet kommer alltid med, så bildet viser at svaret avhenger av butikken.
  const unntak = (amexSeire.length <= klarnaSeire.length ? amexSeire : klarnaSeire)[0];
  const liste = oppsett.amexduell.butikker.map((id) => alle.find((r) => r.b.id === id)).filter((r) => r && r !== unntak);
  const antall = Math.min(unntak ? 3 : 4, liste.length);
  const start = liste.length ? ((((uke - oppsett.startUke) * antall) % liste.length) + liste.length) % liste.length : 0;
  const rader = [...Array.from({ length: antall }, (_, i) => liste[(start + i) % liste.length]), ...(unntak ? [unntak] : [])];
  return rader.length >= 2 ? { amex, rader, alle, amexSeire, klarnaSeire } : null;
})();

/** Én butikk, programmene side om side. Med beløp vises poengene for beløpet, ellers per 100 kr. */
async function butikkSlide(f, { id, etikettTekst, linje1, linje2, b, liste, belop = null }) {
  const x = f.kortX;
  const y0 = f.kortY + 40;
  let svg = etikett(etikettTekst, x, y0, F.gullfyll);
  svg += tekst(linje1, { x, y: y0 + 96, str: 84, font: S.smalFet, farge: F.krem, maks: f.kortB });
  const navnStr = mål(linje2, S.smalFet, 132) > f.kortB ? 100 : 132;
  svg += tekst(linje2, { x, y: y0 + 96 + navnStr + 4, str: navnStr, font: S.smalFet, farge: F.gullfyll, maks: f.kortB });
  const ky = y0 + 96 + navnStr + 60;
  const rh = 150;
  const kh = 140 + liste.length * rh + 150;
  const x0 = x + 40;
  const hoyre = x + f.kortB - 44;
  const maxV = liste[0].per100;
  let innhold = await flis(x0, ky + 40, 200, 92, await butikkLogo(b.id), b.navn);
  innhold += tekst(belop ? `Poeng for ${tall(belop)} kr` : 'Poeng per 100 kr', { x: hoyre, y: ky + 98, str: 28, font: S.medium, farge: F.dempet, anker: 'end' });
  liste.forEach((r, i) => {
    const y = ky + 170 + i * rh;
    const tallTekst = belop ? tall(Math.round((r.per100 * belop) / 100)) : per100Tekst(r.per100);
    const tallB = mål(tallTekst, S.smalFet, 84);
    const barMaks = hoyre - x0 - tallB - 36;
    innhold += `<rect x="${x0}" y="${y - 20}" width="${hoyre - x0}" height="2" fill="${F.strek}"/>`;
    innhold += `<circle cx="${x0 + 10}" cy="${y + 26}" r="10" fill="${farge(r.p.kortnavn)}"/>`;
    innhold += tekst(r.navn, { x: x0 + 32, y: y + 40, str: 40, font: S.semibold, farge: F.blekk });
    if (i === 0) innhold += tekst('FLEST POENG', { x: x0 + 40 + mål(r.navn, S.semibold, 40) + 18, y: y + 36, str: 22, font: S.semibold, farge: F.gull, sperring: 3 });
    innhold += `<rect x="${x0}" y="${y + 62}" width="${Math.max(14, (r.per100 / maxV) * barMaks)}" height="22" rx="11" fill="${i === 0 ? F.gullfyll : farge(r.p.kortnavn)}"/>`;
    innhold += tekst(tallTekst, { x: hoyre, y: y + 84, str: 84, font: S.smalFet, farge: i === 0 ? F.blekk : F.dempet, anker: 'end' });
    if (r.opptil) innhold += tekst('OPPTIL', { x: hoyre, y: y + 12, str: 18, font: S.semibold, farge: F.dempet, anker: 'end', sperring: 2 });
  });
  const sum = belop ?? 1000;
  const linje = `${tall(sum)} kr gir ${liste[0].opptil ? 'opptil ' : ''}${tall(Math.round((liste[0].per100 * sum) / 100))} poeng med ${liste[0].navn} – ${tall(Math.round(((liste[0].per100 - liste[1].per100) * sum) / 100))} flere enn ${liste[1].navn}.`;
  linjer(linje, S.medium, 34, f.kortB - 88).forEach((l, i) => (innhold += tekst(l, { x: x0, y: ky + 170 + liste.length * rh + 20 + i * 46, str: 34, font: S.medium, farge: F.blekk })));
  svg += kort(f, id, innhold, ky, kh);
  return ramme(f, svg, { sveip: false });
}
const butikkduell = (f) =>
  butikkSlide(f, { id: 'bduell', etikettTekst: 'Butikkduellen', linje1: 'Handler du på', linje2: `${butikkDuell.b.navn}?`, b: butikkDuell.b, liste: butikkDuell.rader });

async function kortduell(f) {
  const { a, c, vinner } = kortDuell;
  const x = f.kortX;
  const y0 = f.kortY + 40;
  const hoy = f.H > 1500; // TikTok har plass til tittelen på to linjer
  let svg = etikett('Kortduellen', x, y0, F.gullfyll);
  let ty0;
  if (hoy) {
    svg += tekst('Hvilket kort gir', { x, y: y0 + 96, str: 92, font: S.smalFet, farge: F.krem });
    svg += tekst('mest for pengene?', { x, y: y0 + 190, str: 92, font: S.smalFet, farge: F.gullfyll });
    ty0 = y0 + 250;
  } else {
    svg += tekst('Mest for pengene?', { x, y: y0 + 96, str: 92, font: S.smalFet, farge: F.gullfyll });
    ty0 = y0 + 152;
  }
  svg += tekst(`Ved ${tall(oppsett.kortbruk)} kr i kortbruk i året`, { x, y: ty0, str: 34, font: S.regular, farge: F.lys });
  const ky = ty0 + 46;
  const kh = Math.min(860, f.bunnY - 116 - ky);
  const gap = 24;
  const kolB = (f.kortB - 80 - gap) / 2;
  const radH = hoy ? 96 : 84;
  const verdiStr = hoy ? 54 : 48;
  const navnStr = hoy ? 36 : 32;
  // Kortbildet får plassen som er igjen når navn og fire tallrader er trukket fra.
  const bildeH = Math.min((kolB - 20) * (540 / 856), kh - 56 - 46 - 2 * (navnStr + 8) - 12 - 4 * radH - 24);
  const bildeB = bildeH * (856 / 540);
  let innhold = '';
  for (const [i, k] of [a, c].entries()) {
    const kx = x + 40 + i * (kolB + gap);
    const vant = k === vinner;
    if (vant) innhold += `<rect x="${kx - 10}" y="${ky + 26}" width="${kolB + 20}" height="${kh - 52}" rx="22" fill="none" stroke="${F.gullfyll}" stroke-width="5"/>`;
    const bilde = await kortbilde(k.id);
    if (bilde) innhold += `<image href="${bilde}" x="${kx + (kolB - bildeB) / 2}" y="${ky + 56}" width="${bildeB}" height="${bildeH}" preserveAspectRatio="xMidYMid meet"/>`;
    if (vant) innhold += tekst('BEST VERDI', { x: kx + kolB / 2, y: ky + 50, str: 20, font: S.semibold, farge: F.gull, anker: 'middle', sperring: 3 });
    let ty = ky + 56 + bildeH + 46;
    linjer(k.navn, S.semibold, navnStr, kolB - 20)
      .slice(0, 2)
      .forEach((l) => {
        innhold += tekst(l, { x: kx + 10, y: ty, str: navnStr, font: S.semibold, farge: F.blekk, maks: kolB - 20 });
        ty += navnStr + 8;
      });
    ty += 12;
    const rad = (navn, verdi) => {
      innhold += tekst(navn.toUpperCase(), { x: kx + 10, y: ty, str: 19, font: S.semibold, farge: F.dempet, sperring: 3 });
      innhold += tekst(verdi, { x: kx + 10, y: ty + verdiStr, str: verdiStr, font: S.smalFet, farge: F.blekk, maks: kolB - 20 });
      ty += radH;
    };
    rad('Poeng per 100 kr', tall(k.per100, 2));
    rad('Pris', k.prisPerMnd ? `${tall(k.prisPerMnd)} kr/mnd` : 'Gratis');
    rad('Poeng i året', tall(Math.round(k.poeng)));
    rad('Pris per poeng', k.ore === null ? '–' : k.ore === 0 ? '0 øre' : `${tall(k.ore, 1)} øre`);
  }
  svg += kort(f, 'kduell', innhold, ky, kh);
  svg += tekst('Bare poeng på vanlige kortkjøp. Priser fra utstederne.', { x, y: ky + kh + 46, str: 26, font: S.regular, farge: F.lys, maks: f.kortB });
  return ramme(f, svg, { sveip: false });
}

async function amexKlarna(f) {
  const { amex, rader: liste, alle, amexSeire, klarnaSeire } = amexDuell;
  const x = f.kortX;
  const y0 = f.kortY + 40;
  let svg = etikett('Kortet i butikken', x, y0, F.gullfyll);
  let ty0;
  if (f.H > 1500) {
    svg += tekst('Amex eller', { x, y: y0 + 96, str: 92, font: S.smalFet, farge: F.krem });
    svg += tekst('Klarna Max?', { x, y: y0 + 190, str: 92, font: S.smalFet, farge: F.gullfyll });
    ty0 = y0 + 250;
  } else {
    svg += tekst('Amex eller', { x, y: y0 + 96, str: 92, font: S.smalFet, farge: F.krem });
    svg += tekst('Klarna Max?', { x: x + mål('Amex eller ', S.smalFet, 92), y: y0 + 96, str: 92, font: S.smalFet, farge: F.gullfyll });
    ty0 = y0 + 152;
  }
  svg += tekst('Poeng per 100 kr i samme butikk', { x, y: ty0, str: 34, font: S.regular, farge: F.lys });
  const ky = ty0 + 46;
  const kh = f.bunnY - 100 - ky;
  const x0 = x + 40;
  const hoyre = x + f.kortB - 44;
  const amexNavn = `Trumf + ${amex.navn}`;
  let innhold = `<circle cx="${x0 + 10}" cy="${ky + 62}" r="10" fill="${farge('Trumf')}"/>`;
  innhold += tekst(amexNavn, { x: x0 + 30, y: ky + 72, str: 28, font: S.semibold, farge: F.blekk });
  const x2 = x0 + 30 + mål(amexNavn, S.semibold, 28) + 40;
  innhold += `<circle cx="${x2 + 10}" cy="${ky + 62}" r="10" fill="${farge('Klarna')}"/>`;
  innhold += tekst('Klarna Max', { x: x2 + 30, y: ky + 72, str: 28, font: S.semibold, farge: F.blekk });
  const flest = amexSeire.length > klarnaSeire.length ? amexNavn : 'Klarna Max';
  const oppsum = linjer(`${flest} gir flest poeng i ${Math.max(amexSeire.length, klarnaSeire.length)} av ${alle.length} butikker der både Trumf og Klarna gir fast prosent.`, S.medium, 30, hoyre - x0);
  const radTopp = ky + 104;
  const rh = (kh - 104 - 64 - oppsum.length * 42) / liste.length;
  const maxV = Math.max(...liste.flatMap((r) => [r.amex, r.klarna]));
  const tallB = Math.max(...liste.flatMap((r) => [r.amex, r.klarna].map((v) => mål(per100Tekst(v), S.smalFet, 38))));
  const tx = x0 + 128 + 24;
  const barMaks = hoyre - tx - tallB - 20;
  const stolpe = (verdi, fyll, vant, topp) =>
    `<rect x="${tx}" y="${topp}" width="${Math.max(12, (verdi / maxV) * barMaks)}" height="18" rx="9" fill="${fyll}"/>` +
    tekst(per100Tekst(verdi), { x: hoyre, y: topp + 17, str: 38, font: S.smalFet, farge: vant ? F.blekk : F.dempet, anker: 'end' });
  for (const [i, r] of liste.entries()) {
    const y = radTopp + i * rh;
    const midt = y + rh / 2;
    innhold += `<rect x="${x0}" y="${y}" width="${hoyre - x0}" height="2" fill="${F.strek}"/>`;
    innhold += await flis(x0, midt - 32, 128, 64, await butikkLogo(r.b.id), r.b.navn);
    innhold += tekst(r.b.navn, { x: tx, y: midt - 22, str: 34, font: S.semibold, farge: F.blekk, maks: hoyre - tx });
    innhold += stolpe(r.amex, farge('Trumf'), r.amex > r.klarna, midt - 2);
    innhold += stolpe(r.klarna, farge('Klarna'), r.klarna > r.amex, midt + 38);
  }
  const sy = radTopp + liste.length * rh;
  innhold += `<rect x="${x0}" y="${sy}" width="${hoyre - x0}" height="2" fill="${F.strek}"/>`;
  oppsum.forEach((l, i) => (innhold += tekst(l, { x: x0, y: sy + 56 + i * 42, str: 30, font: S.medium, farge: F.blekk })));
  svg += kort(f, 'amexklarna', innhold, ky, kh);
  svg += tekst('Forutsetter at butikken tar Amex. Månedspris er ikke regnet med.', { x, y: ky + kh + 46, str: 26, font: S.regular, farge: F.lys, maks: f.kortB });
  return ramme(f, svg, { sveip: false });
}

// ---------- Black Friday-serie ----------
// Fem poster med egne datoer frem mot Black Friday og Cyber Monday (datoene i src/data/blackfriday.json). Bygges hver natt
// frem til og med Cyber Monday, så tallene er ferske den dagen posten lagres.

const bf = JSON.parse(await readFile(new URL('api/blackfriday.json', dist), 'utf8'));
const bfKat = (bf.land.NO ?? []).filter((k) => k.butikker.length >= 3);
const bfAktiv = idag <= bf.cyberMonday && bfKat.length > 0;
const bfAr = bf.dato.slice(0, 4);
const datoTekst = (iso) => new Intl.DateTimeFormat('nb-NO', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(iso));
const MANEDER = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'];
const kortDato = (iso) => `${Number(iso.slice(8, 10))}. ${MANEDER[Number(iso.slice(5, 7)) - 1]}`;
const dagerFor = (n) => new Date(Date.parse(bf.dato) - n * 864e5).toISOString().slice(0, 10);
const kortnavn = (program) => program.replace(/ Max$/, '');
// De kjente butikkene, hver én gang, flest poeng først.
const bfTopp = bfKat
  .flatMap((k) => k.butikker)
  .filter((b, i, a) => a.findIndex((x) => x.id === b.id) === i)
  .sort((a, c) => c.per100 - a.per100);
// Kampanjer der kampanjen er beste vei i butikken (alle norske butikker).
const bfKampanjer = butikker
  .map((b) => {
    const r = raderFor(b)[0];
    const sats = r && b.satser[r.p.id];
    return sats?.kampanje && sats.kampanje.slutt >= idag ? { b, ...r, slutt: sats.kampanje.slutt } : null;
  })
  .filter(Boolean)
  .sort((a, c) => c.per100 - a.per100);
const klarnaNO = programNO.find((p) => p.nivaer.some((n) => n.id === 'max'));
const maxNO = klarnaNO?.nivaer.find((n) => n.id === 'max');
const medKortNO = programNO.filter((p) => p.kortlag).map((p) => p.kortnavn);
const bfTips = [
  'Satsene endres. Sjekk butikken rett før du handler.',
  ...(maxNO ? [`${klarnaNO.kortnavn} Max: butikkens sats × ${tall(maxNO.butikkFaktor)} + ${tall(maxNO.ekstraProsent, 1)} %.`] : []),
  ...(medKortNO.length ? [`Via ${medKortNO.join(' og ')} gir betalingskortet poeng i tillegg. Via Klarna gjør det ikke.`] : []),
];
// Regnestykket: første butikk i blackfriday.json (elektronikk først, i listens rekkefølge) med minst to programmer.
const bfOppsett = await les('src/data/blackfriday.json');
const bfRegning = (() => {
  for (const ider of Object.values(bfOppsett.butikker.NO ?? {})) {
    for (const id of ider) {
      const b = butikker.find((y) => y.id === id);
      const rader = b ? raderFor(b) : [];
      if (rader.length >= 2) return { b, rader };
    }
  }
  return null;
})();
const BF_BELOP = 5000;

const bfForside = (f) =>
  forsideSlide(f, {
    etikettTekst: `Black Friday · ${datoTekst(bf.dato)}`,
    tittel: ['Flest poeng på', 'Black Friday'],
    gullLinje2: true,
    underTekst: 'Vi har sjekket de kjente nettbutikkene. Sveip for topp 5 i hver kategori.',
    t: bfTopp[0] && { id: bfTopp[0].id, navn: bfTopp[0].navn, program: kortnavn(bfTopp[0].program), per100: bfTopp[0].per100, opptil: bfTopp[0].opptil },
  });

const bfKategoriSlide = (k) => async (f) => {
  const liste = await Promise.all(
    k.butikker.slice(0, 5).map(async (b) => ({ navn: b.navn, logo: await butikkLogo(b.id), prikk: farge(kortnavn(b.program)), under: `via ${b.program}${b.opptil ? ' · opptil' : ''}`, tall: per100Tekst(b.per100), enhet: 'poeng/100 kr' })),
  );
  return ramme(f, kort(f, `bf-${k.id}`, await rader(f, `Black Friday · ${k.navn}`, liste)));
};

async function bfTipsSlide(f) {
  const x = f.kortX;
  const y = f.H * (f.H > 1500 ? 0.26 : 0.22);
  let svg = etikett(`Black Friday · ${datoTekst(bf.dato)}`, x, y - 120, F.gullfyll);
  svg += tekst('3 ting før', { x, y, str: 132, font: S.smalFet, farge: F.krem });
  svg += tekst('Black Friday', { x, y: y + 132, str: 132, font: S.smalFet, farge: F.gullfyll });
  const ky = y + 220;
  let innhold = '';
  let ty = ky + 100;
  for (const t of bfTips) {
    innhold += hake(x + 50, ty, 38, F.gull);
    linjer(t, S.medium, 38, f.kortB - 150).forEach((l, i) => (innhold += tekst(l, { x: x + 100, y: ty + i * 50, str: 38, font: S.medium, farge: F.blekk })));
    ty += linjer(t, S.medium, 38, f.kortB - 150).length * 50 + 44;
  }
  innhold += tekst('pointmaxing.no', { x: x + 48, y: ty + 40, str: 64, font: S.smalFet, farge: F.blekk });
  svg += kort(f, 'bftips', innhold, ky, ty + 90 - ky);
  return ramme(f, svg, { sveip: false });
}

const bfRegnestykke = (f) =>
  butikkSlide(f, { id: 'bfregning', etikettTekst: `Black Friday · ${datoTekst(bf.dato)}`, linje1: `Handler du for ${tall(BF_BELOP)} kr`, linje2: `hos ${bfRegning.b.navn}?`, b: bfRegning.b, liste: bfRegning.rader, belop: BF_BELOP });

/** Black Friday-dagen og Cyber Monday: kampanjene som er beste vei nå, ellers de kjente butikkene med flest poeng. */
const bfListe = () =>
  bfKampanjer.length >= 3
    ? bfKampanjer.slice(0, 5).map((r) => ({ id: r.b.id, navn: r.b.navn, program: r.p.kortnavn, under: `${r.navn} · kampanje til ${kortDato(r.slutt)}`, per100: r.per100 }))
    : bfTopp.slice(0, 5).map((b) => ({ id: b.id, navn: b.navn, program: kortnavn(b.program), under: `via ${b.program}`, per100: b.per100 }));
const bfListeSlide = (overskrift) => async (f) => {
  const liste = await Promise.all(bfListe().map(async (r) => ({ navn: r.navn, logo: await butikkLogo(r.id), prikk: farge(r.program), under: r.under, tall: per100Tekst(r.per100), enhet: 'poeng/100 kr' })));
  return ramme(f, kort(f, 'bfliste', await rader(f, overskrift, liste)), { sveip: false });
};

// ---------- skriv ----------

const EMNER = '#eurobonus #saseurobonus #sas #trumf #klarna #bonuspoeng #flypoeng #reisemedpoeng #poengjakt #reisetips';
const v = (n, p) => (enhet(p) === '%' ? `${tall(n, 1)} %` : `${tall(n)} poeng/100 kr`);
const avsnitt = (linjer) => linjer.filter((l, i, a) => l !== null && (l !== '' || a[i - 1] !== '')).join('\n');

const poster = [];
{
  const t1 = topp[0];
  const o1 = opp[0];
  const b1 = bonuser[0];
  poster.push({
    id: 'ukens',
    tittel: 'Ukens beste',
    dag: 'mandag',
    slides: [forside, flestPoeng, ...(opp.length ? [gikkOpp] : []), ...(bonuser.length ? [velkomst] : []), ...(ut.length ? [sisteSjanse] : []), slutt],
    tekst: avsnitt([
      `Ukens beste for EuroBonus-jegere ✈️ (uke ${uke})`,
      '',
      t1 ? `Flest poeng nå: ${t1.navn} gir ${per100Tekst(t1.per100)} poeng per 100 kr via ${programNavn(t1.program)}.` : null,
      o1 ? `Gikk opp: ${o1.navn} hos ${o1.program}, fra ${v(o1.fra, o1.program)} til ${v(o1.til, o1.program)}.` : null,
      b1 ? `Største velkomstbonus: ${b1.tittel ?? b1.partner}, ${tall(Math.round(b1.poeng))} poeng.` : null,
      '',
      'Sveip for hele lista 👉 Sjekk din butikk på pointmaxing.no (lenke i bio)',
      '',
      EMNER,
    ]),
  });
}
if (butikkDuell) {
  const { b, rader: liste } = butikkDuell;
  const forskjell = Math.round((liste[0].per100 - liste[1].per100) * 10);
  const emne = `#${b.navn.toLowerCase().replace(/[^a-z0-9æøå]+/g, '')}`;
  poster.push({
    id: 'butikkduell',
    tittel: `Butikkduellen: ${b.navn}`,
    dag: 'onsdag',
    slides: [butikkduell],
    tekst: avsnitt([
      `Handler du på ${b.navn}? 🛍️`,
      '',
      'Så mange EuroBonus-poeng får du per 100 kr i dag:',
      ...liste.map((r) => `${r.navn}: ${per100Tekst(r.per100)} poeng`),
      '',
      `På et kjøp på 1 000 kr er forskjellen ${tall(forskjell)} poeng. Sjekk favorittbutikken din på pointmaxing.no (lenke i bio)`,
      '',
      `${EMNER} ${emne}`,
    ]),
  });
}
if (kortDuell) {
  const { a, c, vinner } = kortDuell;
  const linje = (k) => `${k.navn}: ${tall(Math.round(k.poeng))} poeng i året, ${k.ore === null ? '–' : k.ore === 0 ? 'gratis' : `${tall(k.ore, 1)} øre per poeng`}`;
  poster.push({
    id: 'kortduell',
    tittel: `Kortduellen: ${a.navn} mot ${c.navn}`,
    dag: 'fredag',
    slides: [kortduell],
    tekst: avsnitt([
      `Kortduellen: ${a.navn} mot ${c.navn} 💳`,
      '',
      `Ved ${tall(oppsett.kortbruk)} kr i kortbruk i året:`,
      linje(a),
      linje(c),
      '',
      `Mest for pengene: ${vinner.navn}. Hvilket kort bruker du? 👇`,
      'Se alle kortene på pointmaxing.no (lenke i bio)',
      '',
      `${EMNER} #kredittkort #amex`,
    ]),
  });
}
if (amexDuell) {
  const { amex, rader: liste, alle, amexSeire, klarnaSeire } = amexDuell;
  const klarnaFlest = klarnaSeire.length >= amexSeire.length;
  const unntak = (klarnaFlest ? amexSeire : klarnaSeire).map((r) => r.b.navn);
  const opplisting = (l) => (l.length === 1 ? l[0] : `${l.slice(0, -1).join(', ')} og ${l.at(-1)}`);
  poster.push({
    id: 'amexklarna',
    tittel: 'Amex eller Klarna Max?',
    dag: 'søndag',
    slides: [amexKlarna],
    tekst: avsnitt([
      'Amex eller Klarna Max? 💳',
      '',
      `Med ${amex.navn} kan du handle via Trumf og få poeng to steder. ${klarnaFlest ? 'Klarna Max gir likevel flere poeng i de fleste butikker.' : 'I de fleste butikker slår det Klarna Max.'}`,
      '',
      'Poeng per 100 kr i dag:',
      ...liste.map((r) => `${r.b.navn}: Trumf + Amex ${per100Tekst(r.amex)} · Klarna Max ${per100Tekst(r.klarna)}`),
      '',
      `${klarnaFlest ? 'Klarna Max' : `Trumf + ${amex.navn}`} vinner i ${Math.max(amexSeire.length, klarnaSeire.length)} av ${alle.length} butikker der både Trumf og Klarna gir fast prosent.${unntak.length && unntak.length <= 3 ? ` ${unntak.length === 1 ? 'Unntaket' : 'Unntakene'}: ${opplisting(unntak)}.` : ''}`,
      'Sjekk din butikk på pointmaxing.no (lenke i bio)',
      '',
      'Trumf + Amex forutsetter at butikken tar Amex. Månedspris er ikke regnet med.',
      '',
      `${EMNER} #amex #klarnamax`,
    ]),
  });
}

if (bfAktiv) {
  const BF_EMNER = `${EMNER} #blackfriday #blackfriday${bfAr}`;
  const linjeFor = (r) => `${r.navn}: ${per100Tekst(r.per100)} poeng/100 kr (${r.under})`;
  const serie = [
    {
      id: 'bf-guide',
      dato: dagerFor(22),
      tittel: 'Black Friday: flest poeng i hver kategori',
      slides: [bfForside, ...bfKat.slice(0, 5).map(bfKategoriSlide), slutt],
      tekst: avsnitt([
        `Black Friday er ${datoTekst(bf.dato)} 🛍️`,
        '',
        'Vi har sjekket de kjente nettbutikkene. Flest EuroBonus-poeng per 100 kr i dag:',
        ...bfKat.slice(0, 5).map((k) => `${k.navn}: ${k.butikker[0].navn} ${k.butikker[0].opptil ? 'opptil ' : ''}${per100Tekst(k.butikker[0].per100)} (${k.butikker[0].program})`),
        '',
        'Sveip for topp 5 i hver kategori 👉 Hele guiden på pointmaxing.no (lenke i bio)',
        '',
        BF_EMNER,
      ]),
    },
    bfRegning && {
      id: 'bf-regnestykke',
      dato: dagerFor(15),
      tittel: `Black Friday: ${tall(BF_BELOP)} kr hos ${bfRegning.b.navn}`,
      slides: [bfRegnestykke],
      tekst: avsnitt([
        `Handler du for ${tall(BF_BELOP)} kr hos ${bfRegning.b.navn} på Black Friday? 🧮`,
        '',
        ...bfRegning.rader.map((r) => `${r.navn}: ${r.opptil ? 'opptil ' : ''}${tall(Math.round((r.per100 * BF_BELOP) / 100))} poeng`),
        '',
        `Forskjellen er ${tall(Math.round(((bfRegning.rader[0].per100 - bfRegning.rader[1].per100) * BF_BELOP) / 100))} poeng på ett kjøp. Sjekk butikken din før du handler på pointmaxing.no (lenke i bio)`,
        '',
        BF_EMNER,
      ]),
    },
    {
      id: 'bf-tips',
      dato: dagerFor(8),
      tittel: '3 ting før Black Friday',
      slides: [bfTipsSlide],
      tekst: avsnitt(['3 ting du bør vite før Black Friday ✈️', '', ...bfTips.map((t, i) => `${i + 1}. ${t}`), '', 'Hele Black Friday-guiden på pointmaxing.no (lenke i bio)', '', BF_EMNER]),
    },
    {
      id: 'bf-dagen',
      dato: bf.dato,
      tittel: 'Black Friday: flest poeng nå',
      slides: [bfListeSlide('Black Friday · flest poeng nå')],
      tekst: avsnitt(['Det er Black Friday! 🛍️', '', 'Flest EuroBonus-poeng akkurat nå:', ...bfListe().map(linjeFor), '', 'Sjekk din butikk på pointmaxing.no (lenke i bio)', '', BF_EMNER]),
    },
    {
      id: 'bf-cybermonday',
      dato: bf.cyberMonday,
      tittel: 'Cyber Monday: siste sjanse',
      slides: [bfListeSlide('Cyber Monday · siste sjanse')],
      tekst: avsnitt(['Cyber Monday – siste sjanse ⏳', '', 'Flest EuroBonus-poeng akkurat nå:', ...bfListe().map(linjeFor), '', 'Sjekk din butikk på pointmaxing.no (lenke i bio)', '', `${EMNER} #cybermonday #blackfriday${bfAr}`]),
    },
  ].filter(Boolean);
  for (const post of serie) poster.push({ ...post, dag: datoTekst(post.dato) });
}

await mkdir(UT, { recursive: true });
for (const post of poster) {
  post.filer = { instagram: [], tiktok: [] };
  for (const [navn, f] of Object.entries(FORMATER)) {
    for (let i = 0; i < post.slides.length; i++) {
      const svg = await post.slides[i](f);
      const fil = `${post.id}-${navn}-${i + 1}.png`;
      const bilde = sharp(Buffer.from(svg));
      await bilde.clone().png({ compressionLevel: 9 }).toFile(fileURLToPath(new URL(fil, UT)));
      // Instagram-API-et tar bare JPEG.
      if (navn === 'instagram') await bilde.clone().jpeg({ quality: 92, mozjpeg: true }).toFile(fileURLToPath(new URL(fil.replace(/\.png$/, '.jpg'), UT)));
      post.filer[navn].push(fil);
    }
  }
  await writeFile(new URL(`${post.id}.txt`, UT), `${post.tekst}\n`);
}

// Til scripts/publiser-some.mjs: hvilken post som hører til hvilken dag, med tekst og bildeadresser.
const DOMENE = 'https://pointmaxing.no';
await writeFile(
  new URL('poster.json', UT),
  JSON.stringify({ uke, laget: idag, poster: poster.map((p) => ({ id: p.id, dag: p.dag, dato: p.dato ?? null, tittel: p.tittel, tekst: p.tekst, instagram: p.filer.instagram.map((f) => `${DOMENE}/some/${f.replace(/\.png$/, '.jpg')}`), tiktok: p.filer.tiktok.map((f) => `${DOMENE}/some/${f}`) })) }, null, 2),
);

const bilder = (post, navn) => post.filer[navn].map((fil, i) => `<a href="${fil}" target="_blank"><img src="${fil}" alt="${esc(post.tittel)} – bilde ${i + 1}" loading="lazy"></a>`).join('');
const seksjon = (post, i) => `<section>
<h2>${i + 1}. ${esc(post.tittel)} <span>· post på ${post.dag}</span></h2>
<textarea id="tekst-${post.id}" readonly>${esc(post.tekst)}</textarea>
<button type="button" onclick="navigator.clipboard.writeText(document.getElementById('tekst-${post.id}').value).then(()=>{this.textContent='Kopiert ✓'})">Kopier teksten</button>
<h3>Instagram · 4:5</h3>
<div class="rutenett">${bilder(post, 'instagram')}</div>
<h3>TikTok · 9:16</h3>
<div class="rutenett">${bilder(post, 'tiktok')}</div>
</section>`;
await writeFile(
  new URL('index.html', UT),
  `<!doctype html>
<html lang="nb"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>Pointmaxing – innhold uke ${uke}</title>
<style>
:root{--navy:#0b1f4b;--krem:#faf7f0;--lys:#8ea0c4;--gull:#f0c14b}
*{box-sizing:border-box}body{margin:0;background:var(--navy);color:var(--krem);font:16px/1.5 system-ui,-apple-system,'Segoe UI',sans-serif;padding:24px 16px 48px}
main{max-width:980px;margin:0 auto}h1{font-size:22px;margin:0 0 4px}p{color:var(--lys);margin:0 0 8px}
section{margin-top:36px;padding-top:24px;border-top:1px solid rgba(255,255,255,.15)}
h2{font-size:18px;margin:0 0 10px}h2 span{color:var(--lys);font-weight:400;font-size:15px}
h3{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--gull);margin:22px 0 10px}
.rutenett{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}
.rutenett img{width:100%;display:block;border-radius:10px}
textarea{width:100%;min-height:200px;border-radius:10px;border:0;padding:12px;font:15px/1.5 system-ui,sans-serif;background:var(--krem);color:#13203d}
button{margin-top:8px;padding:10px 16px;border:0;border-radius:999px;background:var(--gull);color:#13203d;font-weight:700;font-size:15px;cursor:pointer}
</style></head><body><main>
<h1>Innhold til Instagram og TikTok · uke ${uke}</h1>
<p>Laget ${idag} fra dagens tall. Trykk på et bilde og hold inne for å lagre det.</p>
<p>Forslag: ukens beste på mandag, butikkduellen på onsdag, kortduellen på fredag og Amex eller Klarna Max på søndag.</p>
${bfAktiv ? '<p>Black Friday-serien har egne datoer. Tallene oppdateres hver natt, så lagre bildene samme dag som du poster.</p>' : ''}
${poster.map(seksjon).join('\n')}
</main></body></html>
`,
);
console.log(`SoMe uke ${uke}: ${poster.map((p) => `${p.id} (${p.slides.length})`).join(', ')} i dist/some`);
