// Lager bildene som vises når en lenke deles i Messenger, Facebook, Slack osv. (og:image, 1200×630):
// ett per butikkside med poengene per 1 000 kr i hvert program, ett per land til de andre sidene og ett til Black Friday-guiden.
// Kjøres etter bygg-butikksider.mjs (leser dist/api/butikker.json og dist/api/blackfriday.json).

import { mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { F, flis, fly, linjer, logo, mål, rot, S, tekst } from './tegning.mjs';

const dist = new URL('dist/', rot);
const UT = new URL('og/', dist);
const les = async (sti) => JSON.parse(await readFile(new URL(sti, rot), 'utf8'));
const B = 1200;
const H = 630;

const api = await les('dist/api/butikker.json');
const bf = await les('dist/api/blackfriday.json');
const stores = await les('src/data/stores.json');
const partnere = await les('src/data/partners.json');
const { programmer } = await les('src/data/programs.json');

const LAND = {
  NO: { sti: 'no', locale: 'nb-NO', per1000: 'EuroBonus-poeng per 1 000 kr', oppdatert: 'Oppdatert hver natt', opptil: 'OPPTIL', flest: ['Flest EuroBonus-', 'poeng på netthandel'], sideOmSide: 'side om side', og: 'og', butikker: 'butikker', bfFlest: 'Flest EuroBonus-poeng' },
  SE: { sti: 'se', locale: 'sv-SE', per1000: 'EuroBonus-poäng per 1 000 kr', oppdatert: 'Uppdateras varje natt', opptil: 'UPP TILL', flest: ['Flest EuroBonus-', 'poäng på nätet'], sideOmSide: 'sida vid sida', og: 'och', butikker: 'butiker', bfFlest: 'Flest EuroBonus-poäng' },
  DK: { sti: 'dk', locale: 'da-DK', per1000: 'EuroBonus-point per 1.000 kr', oppdatert: 'Opdateres hver nat', opptil: 'OP TIL', flest: ['Flest EuroBonus-', 'point på nettet'], sideOmSide: 'side om side', og: 'og', butikker: 'butikker', bfFlest: 'Flest EuroBonus-point' },
};

const navnFor = (pid) => {
  const p = api.programmer[pid];
  return p.nivaer.some((n) => n.id === 'max') ? `${p.navn} Max` : p.navn;
};

function ramme(innhold, t) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${B}" height="${H}" viewBox="0 0 ${B} ${H}">
<rect width="${B}" height="${H}" fill="${F.navy}"/>
${fly(60, 46, 0.42, F.krem)}
${tekst('POINTMAXING', { x: 114, y: 84, str: 38, font: S.smalHalv, farge: F.krem, sperring: 5 })}
${innhold}
${tekst('pointmaxing.no', { x: 60, y: 588, str: 42, font: S.smalHalv, farge: F.gullfyll, sperring: 1 })}
${tekst(t.oppdatert, { x: B - 60, y: 584, str: 26, font: S.medium, farge: F.lys, anker: 'end' })}
</svg>`;
}

/** Lyst kort med gul stripe øverst, som på SoMe-bildene. */
function kort(id, x, y, b, h, innhold) {
  return `<defs><clipPath id="${id}"><rect x="${x}" y="${y}" width="${b}" height="${h}" rx="26"/></clipPath></defs>
<rect x="${x}" y="${y}" width="${b}" height="${h}" rx="26" fill="${F.papir}"/>
<rect x="${x}" y="${y}" width="${b}" height="10" fill="${F.gullfyll}" clip-path="url(#${id})"/>
${innhold}`;
}

async function butikkbilde(land, t, b, logoSti) {
  const fmt = new Intl.NumberFormat(t.locale, { maximumFractionDigits: 0 });
  const tall = (n) => fmt.format(n).replace(/[  ]/g, ' ');
  // Navn og logo til venstre.
  let svg = flis(60, 150, 260, 130, await logo(logoSti), b.navn);
  const navn = linjer(b.navn, S.smalFet, 84, 490).slice(0, 2);
  navn.forEach((l, i) => (svg += tekst(l, { x: 60, y: 380 + i * 84, str: 84, font: S.smalFet, farge: F.krem, maks: 490 })));
  svg += tekst(t.per1000, { x: 60, y: 380 + (navn.length - 1) * 84 + 54, str: 30, font: S.regular, farge: F.lys });
  // Programmene til høyre, flest poeng øverst.
  const rader = Object.entries(b.satser)
    .map(([pid, s]) => ({ navn: navnFor(pid), farge: api.programmer[pid].farge, per1000: s.per100 === null ? null : s.per100 * 10, opptil: s.tekst.startsWith('≤') }))
    .sort((a, c) => (c.per1000 ?? -1) - (a.per1000 ?? -1));
  const kx = 600;
  const ky = 150;
  const kb = 540;
  const kh = 370;
  const rh = (kh - 30) / Math.max(rader.length, 2);
  const y0 = ky + 10 + (kh - 10 - rh * rader.length) / 2;
  let innhold = '';
  rader.forEach((r, i) => {
    const midt = y0 + i * rh + rh / 2;
    if (i > 0) innhold += `<rect x="${kx + 36}" y="${y0 + i * rh}" width="${kb - 72}" height="2" fill="${F.strek}"/>`;
    innhold += `<circle cx="${kx + 48}" cy="${midt}" r="11" fill="${r.farge}"/>`;
    innhold += tekst(r.navn, { x: kx + 72, y: midt + 12, str: 34, font: S.semibold, farge: F.blekk, maks: 220 });
    const verdi = r.per1000 === null ? '–' : tall(r.per1000);
    innhold += tekst(verdi, { x: kx + kb - 40, y: midt + 26, str: 76, font: S.smalFet, farge: i === 0 ? F.blekk : F.dempet, anker: 'end' });
    if (r.opptil) innhold += tekst(t.opptil, { x: kx + kb - 40 - mål(verdi, S.smalFet, 76) - 12, y: midt + 22, str: 18, font: S.semibold, farge: F.dempet, anker: 'end', sperring: 2 });
  });
  svg += kort('k', kx, ky, kb, kh, innhold);
  return ramme(svg, t);
}

function landbilde(land, t, antall) {
  const navn = programmer.filter((p) => p.land === land).map((p) => p.kortnavn);
  const liste = navn.length > 1 ? `${navn.slice(0, -1).join(', ')} ${t.og} ${navn.at(-1)}` : navn[0];
  let svg = tekst(t.flest[0], { x: 60, y: 262, str: 112, font: S.smalFet, farge: F.krem });
  svg += tekst(t.flest[1], { x: 60, y: 372, str: 112, font: S.smalFet, farge: F.gullfyll });
  svg += tekst(`${liste} ${t.sideOmSide}`, { x: 60, y: 446, str: 38, font: S.regular, farge: F.lys, maks: B - 120 });
  svg += tekst(`${new Intl.NumberFormat(t.locale).format(antall).replace(/[  ]/g, ' ')} ${t.butikker}`, { x: 60, y: 500, str: 38, font: S.medium, farge: F.krem });
  return ramme(svg, t);
}

async function blackFridayBilde(land, t, logoFor) {
  const dato = new Intl.DateTimeFormat(t.locale, { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(bf.dato));
  let svg = tekst(dato.toUpperCase(), { x: 60, y: 186, str: 28, font: S.semibold, farge: F.gullfyll, sperring: 4 });
  svg += tekst('Black Friday', { x: 60, y: 312, str: 128, font: S.smalFet, farge: F.krem });
  linjer(t.bfFlest, S.smalFet, 64, 480).forEach((l, i) => (svg += tekst(l, { x: 60, y: 392 + i * 66, str: 64, font: S.smalFet, farge: F.gullfyll })));
  // De tre butikkene med flest poeng i guiden.
  const topp = (bf.land[land] ?? [])
    .flatMap((k) => k.butikker)
    .filter((b, i, a) => a.findIndex((x) => x.id === b.id) === i)
    .sort((a, c) => c.per100 - a.per100)
    .slice(0, 3);
  if (topp.length) {
    const fmt = new Intl.NumberFormat(t.locale, { maximumFractionDigits: 0 });
    const kx = 640;
    const ky = 130;
    const kb = 500;
    const rh = 104;
    let innhold = tekst(t.per1000.toUpperCase(), { x: kx + 36, y: ky + 58, str: 17, font: S.semibold, farge: F.dempet, sperring: 2, maks: kb - 72 });
    for (const [i, b] of topp.entries()) {
      const y = ky + 80 + i * rh;
      innhold += `<rect x="${kx + 36}" y="${y}" width="${kb - 72}" height="2" fill="${F.strek}"/>`;
      const verdi = fmt.format(b.per100 * 10).replace(/[  ]/g, ' ');
      innhold += flis(kx + 36, y + 20, 120, 64, await logo(logoFor(b.id)), b.navn);
      innhold += tekst(b.navn, { x: kx + 172, y: y + 48, str: 30, font: S.semibold, farge: F.blekk, maks: kb - 208 - mål(verdi, S.smalFet, 60) - 16 });
      innhold += tekst(b.program, { x: kx + 172, y: y + 80, str: 24, font: S.regular, farge: F.dempet });
      innhold += tekst(verdi, { x: kx + kb - 36, y: y + 72, str: 60, font: S.smalFet, farge: i === 0 ? F.blekk : F.dempet, anker: 'end' });
      if (b.opptil) innhold += tekst(t.opptil, { x: kx + kb - 36, y: y + 22, str: 15, font: S.semibold, farge: F.dempet, anker: 'end', sperring: 2 });
    }
    svg += kort('bf', kx, ky, kb, 80 + topp.length * rh + 20, innhold);
  }
  return ramme(svg, t);
}

async function lagre(svg, fil) {
  await sharp(Buffer.from(svg)).png({ palette: true, quality: 90, compressionLevel: 9 }).toFile(fileURLToPath(new URL(fil, UT)));
}

const start = Date.now();
let antall = 0;
for (const [land, t] of Object.entries(LAND)) {
  await mkdir(new URL(`${t.sti}/`, UT), { recursive: true });
  const logoer = new Map();
  for (const b of [...(stores.land[land] ?? []), ...(partnere.land[land] ?? [])]) if (b.logo && !logoer.has(b.id)) logoer.set(b.id, b.logo);
  const butikker = api.land[land] ?? [];
  await lagre(landbilde(land, t, butikker.length), `${t.sti}.png`);
  await lagre(await blackFridayBilde(land, t, (id) => logoer.get(id)), `${t.sti}/black-friday.png`);
  // Noen få om gangen: sharp bruker flere tråder selv.
  const kø = [...butikker];
  await Promise.all(
    Array.from({ length: 6 }, async () => {
      for (let b = kø.shift(); b; b = kø.shift()) {
        await lagre(await butikkbilde(land, t, b, logoer.get(b.id)), `${t.sti}/${b.id}.png`);
        antall++;
      }
    }),
  );
}
console.log(`Delingsbilder: ${antall} butikker + land og Black Friday i dist/og (${Math.round((Date.now() - start) / 1000)} s)`);
