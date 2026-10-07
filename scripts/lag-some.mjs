// Lager ferdige bilder til Instagram (4:5) og TikTok (9:16) fra ukens tall, med tekst til posten, og en enkel
// side på /some der bildene kan lagres fra mobilen. Kjøres etter bygg-butikksider.mjs (leser dist/api/ukens.json).
// Skriften er Barlow fra scripts/fonter (gjort om til vektorer med opentype.js), så bildene ser like ut overalt.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import opentype from 'opentype.js';
import sharp from 'sharp';

const rot = new URL('../', import.meta.url);
const dist = new URL('dist/', rot);
const UT = new URL('some/', dist);
const les = async (sti) => JSON.parse(await readFile(new URL(sti, rot), 'utf8'));
const skrift = (fil) => opentype.loadSync(fileURLToPath(new URL(`scripts/fonter/${fil}`, rot)));
const S = {
  regular: skrift('Barlow-Regular.ttf'),
  medium: skrift('Barlow-Medium.ttf'),
  semibold: skrift('Barlow-SemiBold.ttf'),
  smalHalv: skrift('BarlowCondensed-SemiBold.ttf'),
  smalFet: skrift('BarlowCondensed-Bold.ttf'),
};

// Fargene fra nettsiden (styles.css).
const F = { navy: '#0b1f4b', navy2: '#163a7a', papir: '#faf7f0', papir2: '#f1ece0', blekk: '#13203d', dempet: '#6d7385', strek: '#d8d1c0', gull: '#a5780b', gullfyll: '#f0c14b', lys: '#8ea0c4', krem: '#faf7f0' };
const FLY = 'M50 4 Q58 8 58 26 L58 40 L94 62 L94 71 L58 59 L58 78 L74 91 L74 97 L57 92 L50 95 L43 92 L26 97 L26 91 L42 78 L42 59 L6 71 L6 62 L42 40 L42 26 Q42 8 50 4 Z';
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

// ---------- tekst som vektorer ----------

function glyfer(t, font, str, sperring) {
  const g = font.stringToGlyphs(t);
  const skala = str / font.unitsPerEm;
  let x = 0;
  const pos = [];
  for (let i = 0; i < g.length; i++) {
    pos.push(x);
    x += g[i].advanceWidth * skala;
    if (i < g.length - 1) x += font.getKerningValue(g[i], g[i + 1]) * skala + sperring;
  }
  return { g, pos, bredde: x };
}
const mål = (t, font, str, sperring = 0) => glyfer(t, font, str, sperring).bredde;

/** Tekst som <path>. `maks` korter av med … så teksten aldri renner over. */
function tekst(t, { x, y, str, font = S.regular, farge = F.blekk, anker = 'start', sperring = 0, maks = Infinity }) {
  let s = String(t);
  if (mål(s, font, str, sperring) > maks) {
    while (s.length > 1 && mål(`${s}…`, font, str, sperring) > maks) s = s.slice(0, -1).trimEnd();
    s = `${s}…`;
  }
  const { g, pos, bredde } = glyfer(s, font, str, sperring);
  const x0 = anker === 'end' ? x - bredde : anker === 'middle' ? x - bredde / 2 : x;
  const d = g.map((gl, i) => gl.getPath(x0 + pos[i], y, str).toPathData(1)).join('');
  return `<path d="${d}" fill="${farge}"/>`;
}

/** Bryter teksten i linjer som får plass i `maks`. */
function linjer(t, font, str, maks) {
  const ut = [];
  let linje = '';
  for (const ord of String(t).split(/\s+/)) {
    const prøv = linje ? `${linje} ${ord}` : ord;
    if (mål(prøv, font, str) > maks && linje) {
      ut.push(linje);
      linje = ord;
    } else linje = prøv;
  }
  if (linje) ut.push(linje);
  return ut;
}

/** Pil mot høyre, like høy som en versal i `str`. */
function pil(x, y, str, farge) {
  const h = str * 0.62;
  const b = str * 0.78;
  const t = Math.max(2.5, str * 0.085);
  return `<path d="M${x} ${y - h / 2}H${x + b}M${x + b - h * 0.45} ${y - h * 0.95}L${x + b} ${y - h / 2}L${x + b - h * 0.45} ${y - h * 0.05}" fill="none" stroke="${farge}" stroke-width="${t}" stroke-linecap="round" stroke-linejoin="round"/>`;
}

/** Hake, tegnet. */
function hake(x, y, str, farge) {
  const t = Math.max(3, str * 0.12);
  return `<path d="M${x} ${y - str * 0.32}L${x + str * 0.3} ${y - str * 0.04}L${x + str * 0.8} ${y - str * 0.66}" fill="none" stroke="${farge}" stroke-width="${t}" stroke-linecap="round" stroke-linejoin="round"/>`;
}

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

const logoer = new Map();
async function logo(sti) {
  if (!sti || !sti.startsWith('/')) return null;
  if (!logoer.has(sti)) {
    logoer.set(
      sti,
      sharp(fileURLToPath(new URL(`public${sti}`, rot)))
        .png()
        .toBuffer()
        .then((b) => `data:image/png;base64,${b.toString('base64')}`)
        .catch(() => null),
    );
  }
  return logoer.get(sti);
}
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
<path d="${FLY}" fill="${F.krem}" transform="translate(${f.kortX} ${f.toppY - 40}) scale(0.48) translate(50 50) rotate(45) translate(-50 -50)"/>
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

async function flis(x, y, b, h, bilde, navn) {
  const kant = `<rect x="${x}" y="${y}" width="${b}" height="${h}" rx="14" fill="#ffffff" stroke="#e4ddcc" stroke-width="2"/>`;
  if (bilde) return `${kant}<image href="${bilde}" x="${x + 12}" y="${y + 9}" width="${b - 24}" height="${h - 18}" preserveAspectRatio="xMidYMid meet"/>`;
  return `${kant}${tekst(navn.charAt(0).toUpperCase(), { x: x + b / 2, y: y + h / 2 + 15, str: 42, font: S.smalFet, farge: F.blekk, anker: 'middle' })}`;
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

async function forside(f) {
  const x = f.kortX;
  const y = f.H * (f.H > 1500 ? 0.27 : 0.25);
  let svg = etikett(`Ukens beste · uke ${uke}`, x, y, F.gullfyll);
  const tittel = ['Flest EuroBonus-', 'poeng denne uken'];
  tittel.forEach((l, i) => (svg += tekst(l, { x, y: y + 150 + i * 138, str: 142, font: S.smalFet, farge: F.krem })));
  const under = linjer('Trumf, Klarna eller SAS Shopping? Vi har regnet ut hvor du får mest.', S.regular, 42, f.kortB - 40);
  under.forEach((l, i) => (svg += tekst(l, { x, y: y + 400 + i * 56, str: 42, font: S.regular, farge: F.lys })));
  const t = topp[0];
  if (t) {
    const ky = y + 400 + under.length * 56 + 60;
    const innhold =
      etikett('Flest poeng nå', x + 40, ky + 70) +
      (await flis(x + 40, ky + 110, 150, 76, await butikkLogo(t.id), t.navn)) +
      tekst(t.navn, { x: x + 218, y: ky + 146, str: 44, font: S.semibold, farge: F.blekk, maks: f.kortB - 480 }) +
      `<circle cx="${x + 227}" cy="${ky + 176}" r="9" fill="${farge(t.program)}"/>` +
      tekst(`via ${programNavn(t.program)}`, { x: x + 246, y: ky + 186, str: 30, font: S.regular, farge: F.dempet }) +
      tekst(per100Tekst(t.per100), { x: x + f.kortB - 44, y: ky + 162, str: 84, font: S.smalFet, farge: F.blekk, anker: 'end' }) +
      tekst('poeng/100 kr', { x: x + f.kortB - 44, y: ky + 198, str: 26, font: S.medium, farge: F.dempet, anker: 'end' });
    svg += kort(f, 'forside', innhold, ky, 240);
  }
  return ramme(f, svg);
}

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

// ---------- skriv ----------

await mkdir(UT, { recursive: true });
const slides = [forside, flestPoeng, ...(opp.length ? [gikkOpp] : []), ...(bonuser.length ? [velkomst] : []), ...(ut.length ? [sisteSjanse] : []), slutt];
const filer = { instagram: [], tiktok: [] };
for (const [navn, f] of Object.entries(FORMATER)) {
  for (let i = 0; i < slides.length; i++) {
    const svg = await slides[i](f);
    const fil = `${navn}-${i + 1}.png`;
    await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(fileURLToPath(new URL(fil, UT)));
    filer[navn].push(fil);
  }
}

const t1 = topp[0];
const o1 = opp[0];
const b1 = bonuser[0];
const v = (n, p) => (enhet(p) === '%' ? `${tall(n, 1)} %` : `${tall(n)} poeng/100 kr`);
const tekstTilPost = [
  `Ukens beste for EuroBonus-jegere ✈️ (uke ${uke})`,
  '',
  t1 ? `Flest poeng nå: ${t1.navn} gir ${per100Tekst(t1.per100)} poeng per 100 kr via ${programNavn(t1.program)}.` : '',
  o1 ? `Gikk opp: ${o1.navn} hos ${o1.program}, fra ${v(o1.fra, o1.program)} til ${v(o1.til, o1.program)}.` : '',
  b1 ? `Største velkomstbonus: ${b1.partner}, ${tall(Math.round(b1.poeng))} poeng.` : '',
  '',
  'Sveip for hele lista 👉 Sjekk din butikk på pointmaxing.no (lenke i bio)',
  '',
  '#eurobonus #saseurobonus #sas #trumf #klarna #bonuspoeng #flypoeng #reisemedpoeng #poengjakt #reisetips',
]
  .filter((l, i, a) => l !== '' || a[i - 1] !== '')
  .join('\n');
await writeFile(new URL('tekst.txt', UT), `${tekstTilPost}\n`);

const bilder = (navn) => filer[navn].map((fil, i) => `<a href="${fil}" target="_blank"><img src="${fil}" alt="Bilde ${i + 1}" loading="lazy"></a>`).join('');
await writeFile(
  new URL('index.html', UT),
  `<!doctype html>
<html lang="nb"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>Pointmaxing – innhold uke ${uke}</title>
<style>
:root{--navy:#0b1f4b;--krem:#faf7f0;--lys:#8ea0c4;--gull:#f0c14b}
*{box-sizing:border-box}body{margin:0;background:var(--navy);color:var(--krem);font:16px/1.5 system-ui,-apple-system,'Segoe UI',sans-serif;padding:24px 16px 48px}
main{max-width:980px;margin:0 auto}h1{font-size:22px;margin:0 0 4px}p{color:var(--lys);margin:0 0 20px}
h2{font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:var(--gull);margin:28px 0 10px}
.rutenett{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}
.rutenett img{width:100%;display:block;border-radius:10px}
textarea{width:100%;min-height:220px;border-radius:10px;border:0;padding:12px;font:15px/1.5 system-ui,sans-serif;background:var(--krem);color:#13203d}
button{margin-top:8px;padding:10px 16px;border:0;border-radius:999px;background:var(--gull);color:#13203d;font-weight:700;font-size:15px;cursor:pointer}
</style></head><body><main>
<h1>Innhold til Instagram og TikTok · uke ${uke}</h1>
<p>Laget ${idag} fra dagens tall. Trykk på et bilde og hold inne for å lagre det.</p>
<h2>Tekst til posten</h2>
<textarea id="tekst" readonly>${esc(tekstTilPost)}</textarea>
<button type="button" onclick="navigator.clipboard.writeText(document.getElementById('tekst').value).then(()=>{this.textContent='Kopiert ✓'})">Kopier teksten</button>
<h2>Instagram · 4:5</h2>
<div class="rutenett">${bilder('instagram')}</div>
<h2>TikTok · 9:16</h2>
<div class="rutenett">${bilder('tiktok')}</div>
</main></body></html>
`,
);
console.log(`SoMe: ${slides.length} bilder per format (uke ${uke}) i dist/some`);
