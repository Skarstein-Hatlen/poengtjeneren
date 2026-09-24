// Kortbildene i kortvelgeren (Kortvelger.tsx). Amex publiserer ren kortkunst – flat forside – og den hentes.
// Klarna, SEB (SAS Mastercard), Lunar og Revolut viser bare fotografier, så for dem tegnes en forside i samme
// format etter hvordan kortene ser ut: farge, logo, brikke og nettverk. Skriver public/kort/ og
// src/data/kortbilder.json (kort-id → bilde), og sletter bilder som ikke lenger brukes. `npm run kortbilder`.

import { mkdir, readdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const rot = new URL('../', import.meta.url);
const MAPPE = new URL('public/kort/', rot);
const HODER = { 'user-agent': 'Mozilla/5.0 (pointmaxing.no)' };

// ---------- Tegnede forsider ----------

const B = 856; // kortformatet 85,6 × 54 mm, i tideler
const H = 540;
const SANS = "'Helvetica Neue', Helvetica, Arial, sans-serif";
const TUNG = "'Arial Black', 'Helvetica Neue', Arial, sans-serif";

const stopp = (liste) => liste.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join('');
const gradient = (id, liste, [x2, y2] = [1, 1]) => `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stopp(liste)}</linearGradient>`;

/** Kortflaten: metallisk gradient, børstet struktur, glans, avrundede hjørner og evt. hakk i underkanten. */
function kort({ flate, retning = [1, 1], glans = 0.28, hakk = null, defs = '', innhold }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${B} ${H}" width="${B}" height="${H}">
<defs>
${gradient('flate', flate, retning)}
${gradient('glans', [[0, '#fff', glans], [0.42, '#fff', 0], [0.7, '#fff', glans * 0.45], [1, '#fff', 0]], [1, 0.55])}
${gradient('solv', [[0, '#f8f8f9'], [0.5, '#bfc3c8'], [1, '#eceef0']])}
<pattern id="borstet" width="8" height="4" patternUnits="userSpaceOnUse"><rect width="8" height="1" fill="#fff" opacity="0.07"/><rect y="2" width="8" height="1" fill="#000" opacity="0.025"/></pattern>
<mask id="form"><rect width="${B}" height="${H}" rx="34" fill="#fff"/>${hakk === null ? '' : `<ellipse cx="${hakk}" cy="${H + 8}" rx="70" ry="26" fill="#000"/>`}</mask>
${defs}
</defs>
<g mask="url(#form)">
<rect width="${B}" height="${H}" fill="url(#flate)"/>
<rect width="${B}" height="${H}" fill="url(#borstet)"/>
${innhold}
<rect width="${B}" height="${H}" fill="url(#glans)"/>
<rect x="1" y="1" width="${B - 2}" height="${H - 2}" rx="33" fill="none" stroke="#000" stroke-opacity="0.14" stroke-width="2"/>
</g>
</svg>
`;
}

/** Gravert tekst: mørk skygge litt forskjøvet og lys tekst oppå. Bredden låses så skriften ikke endrer formen. */
function gravert(tekst, { x, y, storrelse, lys, mork = null, familie = TUNG, vekt = 900, kursiv = false, bredde = null }) {
  const felles = `font-family="${familie}" font-weight="${vekt}" font-size="${storrelse}"${kursiv ? ' font-style="italic"' : ''}${bredde ? ` textLength="${bredde}" lengthAdjust="spacingAndGlyphs"` : ''}`;
  return `${mork ? `<text x="${x + 3}" y="${y + 3}" ${felles} fill="${mork}">${tekst}</text>` : ''}<text x="${x}" y="${y}" ${felles} fill="${lys}">${tekst}</text>`;
}

const tekst = (t, { x, y, storrelse, farge, vekt = 500, anker = 'start', sperring = 0 }) =>
  `<text x="${x}" y="${y}" font-family="${SANS}" font-weight="${vekt}" font-size="${storrelse}" fill="${farge}" text-anchor="${anker}"${sperring ? ` letter-spacing="${sperring}"` : ''}>${t}</text>`;

/** EMV-brikke i sølv. */
const brikke = (x, y) =>
  `<g transform="translate(${x} ${y})"><rect width="106" height="82" rx="15" fill="url(#solv)" stroke="#000" stroke-opacity="0.18" stroke-width="2"/><path d="M0 28h36M0 54h36M70 28h36M70 54h36M36 0v82M70 0v82M36 41h34" fill="none" stroke="#000" stroke-opacity="0.28" stroke-width="3"/></g>`;

/** Mastercard-sirklene. */
function mastercard(x, y, r = 44) {
  const [midt, topp, bunn] = [r * 1.65, r * 0.24, r * 1.76].map((n) => n.toFixed(1));
  return `<g transform="translate(${x} ${y})"><circle cx="${r}" cy="${r}" r="${r}" fill="#eb001b"/><circle cx="${r * 2.3}" cy="${r}" r="${r}" fill="#f79e1b"/><path d="M${midt} ${topp}A${r} ${r} 0 0 1 ${midt} ${bunn}A${r} ${r} 0 0 1 ${midt} ${topp}Z" fill="#ff5f00"/></g>`;
}

/** Klarna-kortet: metall med VISA øverst, brikke til høyre og ordmerket stort nederst – og hakket i kanten. */
const klarna = (flate, lys, mork, glans) =>
  kort({
    flate,
    glans,
    hakk: B / 2,
    innhold: [gravert('VISA', { x: 64, y: 124, storrelse: 80, lys, mork, kursiv: true, bredde: 190 }), brikke(688, 58), gravert('Klarna', { x: 58, y: 470, storrelse: 172, lys, mork, bredde: 540 })].join(''),
  });

/** SAS EuroBonus Mastercard (SEB): SAS EuroBonus øverst, brikke, en bue nederst, «world» og Mastercard. */
const sasMastercard = (flate, bue, lys) =>
  kort({
    flate,
    retning: [0.4, 1],
    glans: 0.16,
    hakk: 250,
    defs: gradient('bue', bue, [1, 0.4]),
    innhold: [
      `<path d="M0 ${H}V440Q560 430 ${B} 186V${H}Z" fill="url(#bue)"/>`,
      gravert('SAS', { x: 62, y: 120, storrelse: 88, lys, mork: 'rgba(0,0,0,0.12)', kursiv: true, bredde: 176 }),
      tekst('EuroBonus', { x: 64, y: 168, storrelse: 40, farge: lys }),
      brikke(286, 60),
      tekst('world', { x: B - 62, y: 394, storrelse: 42, farge: lys, anker: 'end' }),
      mastercard(B - 62 - 145, 414),
    ].join(''),
  });

/** Revolut: ordmerket øverst og brikken på plass til venstre. Planene skilles på farge. */
const revolut = (flate, farge, glans = 0.25) =>
  kort({ flate, glans, innhold: [tekst('Revolut', { x: 62, y: 118, storrelse: 72, farge, vekt: 700, sperring: -1 }), brikke(62, 200)].join('') });

/** DNB Mastercard: DNB øverst til venstre, «Credit» til høyre, fine skrålinjer, brikke og Mastercard. Kortet er
 * stående hos DNB – her lagt ned i samme format som de andre kortene. */
const dnb = (flate, logo, credit, etikett = null) =>
  kort({
    flate,
    retning: [0.6, 1],
    glans: 0.14,
    defs: `<pattern id="skra" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><rect width="1.4" height="14" fill="${credit}" opacity="0.05"/></pattern>`,
    innhold: [
      `<rect width="${B}" height="${H}" fill="url(#skra)"/>`,
      tekst('DNB', { x: 62, y: 146, storrelse: 112, farge: logo, vekt: 300, sperring: 4 }),
      tekst('Credit', { x: 794, y: 100, storrelse: 34, farge: credit, anker: 'end' }),
      etikett ? tekst(etikett, { x: 66, y: 208, storrelse: 32, farge: logo, vekt: 500, sperring: 6 }) : '',
      brikke(66, 262),
      mastercard(640, 402, 44),
    ].join(''),
  });

const TEGNET = {
  'klarna-max.svg': klarna([[0, '#f1d3c5'], [0.3, '#dcae9b'], [0.55, '#c99985'], [0.8, '#dcb2a0'], [1, '#efcfc1']], '#fbf3ef', 'rgba(120,66,48,0.32)', 0.28),
  'klarna-premium.svg': klarna([[0, '#f3f4f6'], [0.3, '#d3d6da'], [0.55, '#b9bec4'], [0.8, '#d0d3d8'], [1, '#eef0f2']], '#ffffff', 'rgba(60,66,75,0.3)', 0.3),
  'klarna-plus.svg': klarna([[0, '#3b3c40'], [0.35, '#232427'], [0.6, '#141517'], [1, '#2d2e32']], '#d5d7da', 'rgba(0,0,0,0.6)', 0.14),
  'sas-mastercard-world.svg': sasMastercard([[0, '#dcdddf'], [1, '#c9cacd']], [[0, '#23449e'], [1, '#162f7a']], '#ffffff'),
  'sas-mastercard-premium.svg': sasMastercard([[0, '#d6d7da'], [1, '#c4c6ca']], [[0, '#b0b3b8'], [1, '#9da0a5']], '#fbfbfb'),
  'lunar.svg': kort({
    flate: [[0, '#0b1233'], [0.5, '#15286c'], [1, '#2b5cc6']],
    retning: [0.5, 1],
    glans: 0.12,
    innhold: [
      gravert('SAS', { x: 62, y: 112, storrelse: 74, lys: '#fff', kursiv: true, bredde: 148 }),
      tekst('EuroBonus', { x: 64, y: 154, storrelse: 34, farge: '#fff' }),
      brikke(688, 58),
      tekst('LUNAR', { x: 62, y: 478, storrelse: 46, farge: '#fff', vekt: 700, sperring: 10 }),
    ].join(''),
  }),
  'revolut-standard.svg': revolut([[0, '#ffffff'], [1, '#e9ebef']], '#191c1f'),
  'revolut-premium.svg': revolut([[0, '#1c2466'], [0.55, '#2f3fa6'], [1, '#5a45c9']], '#ffffff', 0.2),
  'revolut-metal.svg': revolut([[0, '#55585e'], [0.4, '#303236'], [0.7, '#1f2124'], [1, '#44474c']], '#e7e8ea', 0.16),
  'revolut-ultra.svg': revolut([[0, '#f0f1f3'], [0.35, '#ced2d7'], [0.6, '#b3b8bf'], [1, '#e7e9ec']], '#23262b', 0.3),
  'dnb-mastercard.svg': dnb([[0, '#ffffff'], [1, '#e9ecec']], '#007272', '#2b2b2b'),
  'dnb-saga-gold.svg': dnb([[0, '#2c2b29'], [0.5, '#141413'], [1, '#2a2825']], '#c9a55a', '#e8e6e1', 'SAGA Gold'),
};

// ---------- Amex' egen kortkunst ----------

const AMEX = 'https://icm.aexp-static.com/Internet/internationalcardshop/sv_se/images/cards/';
const HENTET = {
  'amex-sas-classic.webp': `${AMEX}Sas_Classic_Revolve.png`,
  'amex-sas-premium.webp': `${AMEX}Sas_Premium_Revolve.png`,
  'amex-sas-elite.webp': `${AMEX}Sas_Elite_Revolve.png`,
  'amex-green.webp': `${AMEX}Green_Card.png`,
  'amex-gold.webp': `${AMEX}Gold_Card.png`,
  'amex-platinum.webp': `${AMEX}Platinum_Card.png`,
  'amex-gold-rewards.webp': `${AMEX}GRCC_GoldBold_Metal.png`,
};

// ---------- Kort-id → bilde ----------

const KORT = {
  'sas-amex-classic': 'amex-sas-classic.webp',
  'se-sas-amex-classic': 'amex-sas-classic.webp',
  'sas-amex-premium': 'amex-sas-premium.webp',
  'se-sas-amex-premium': 'amex-sas-premium.webp',
  'sas-amex-elite': 'amex-sas-elite.webp',
  'se-sas-amex-elite': 'amex-sas-elite.webp',
  'amex-green': 'amex-green.webp',
  'se-amex-green': 'amex-green.webp',
  'amex-gold': 'amex-gold.webp',
  'se-amex-gold': 'amex-gold.webp',
  'amex-platinum': 'amex-platinum.webp',
  'amex-platinum-points-plus': 'amex-platinum.webp',
  'se-amex-platinum': 'amex-platinum.webp',
  'se-amex-gold-rewards': 'amex-gold-rewards.webp',
  'sas-mastercard-world': 'sas-mastercard-world.svg',
  'se-sas-mastercard-world': 'sas-mastercard-world.svg',
  'dk-sas-mastercard-world': 'sas-mastercard-world.svg',
  'sas-mastercard-premium': 'sas-mastercard-premium.svg',
  'se-sas-mastercard-premium': 'sas-mastercard-premium.svg',
  'dk-sas-mastercard-premium': 'sas-mastercard-premium.svg',
  lunar: 'lunar.svg',
  'revolut-standard': 'revolut-standard.svg',
  'revolut-premium': 'revolut-premium.svg',
  'revolut-metal': 'revolut-metal.svg',
  'revolut-ultra': 'revolut-ultra.svg',
  'dnb-mastercard-upgrade': 'dnb-mastercard.svg',
  'dnb-saga-mastercard-upgrade': 'dnb-saga-gold.svg',
};
// Klarna-kortet følger medlemskapet: «klarna-kort-max» osv. for hvert land.
const { programmer } = JSON.parse(await readFile(new URL('src/data/programs.json', rot), 'utf8'));
for (const p of programmer.filter((x) => x.kort && x.id.startsWith('klarna'))) {
  KORT[`${p.id}-kort`] = 'klarna-max.svg';
  for (const n of p.nivaer.filter((x) => x.ekstraProsent > 0)) if (TEGNET[`klarna-${n.id}.svg`]) KORT[`${p.id}-kort-${n.id}`] = `klarna-${n.id}.svg`;
}

await mkdir(MAPPE, { recursive: true });
for (const [fil, svg] of Object.entries(TEGNET)) await writeFile(new URL(fil, MAPPE), svg);
const feilet = new Set();
for (const [fil, url] of Object.entries(HENTET)) {
  try {
    const svar = await fetch(url, { headers: HODER });
    if (!svar.ok) throw new Error(`HTTP ${svar.status}`);
    const original = Buffer.from(await svar.arrayBuffer());
    // Trim luft rundt kortet og skaler til 240 px – nok for små fliser på skarpe skjermer.
    await sharp(original).ensureAlpha().trim({ threshold: 10 }).resize(240, 150, { fit: 'inside' }).webp({ quality: 86 }).toFile(fileURLToPath(new URL(fil, MAPPE)));
  } catch (e) {
    feilet.add(fil);
    console.error(`${fil}: ${e.message}`);
  }
}

const oppslag = Object.fromEntries(
  Object.entries(KORT)
    .filter(([, fil]) => !feilet.has(fil))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, fil]) => [id, `/kort/${fil}`]),
);
await writeFile(new URL('src/data/kortbilder.json', rot), JSON.stringify(oppslag, null, 2) + '\n');

// Bilder som ikke lenger brukes, fjernes.
const brukt = new Set(Object.values(KORT));
for (const fil of await readdir(MAPPE)) if (!brukt.has(fil)) await unlink(new URL(fil, MAPPE));

// Kort i cards.json uten bilde får monogram – si fra hvilke.
const alleKort = JSON.parse(await readFile(new URL('src/data/cards.json', rot), 'utf8'));
const uten = alleKort.filter((k) => !oppslag[k.id]).map((k) => k.id);
console.log(`Kortbilder: ${Object.keys(TEGNET).length} tegnet, ${Object.keys(HENTET).length - feilet.size} fra Amex, ${Object.keys(oppslag).length} kort-id-er${uten.length ? ` – uten bilde: ${uten.join(', ')}` : ''}`);
