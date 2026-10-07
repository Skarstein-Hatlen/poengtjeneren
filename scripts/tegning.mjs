// Felles tegneverktøy for bildene bygget lager (SoMe-postene og delingsbildene): Barlow som vektorer, fargene og logoene.
// Skriften er Barlow fra scripts/fonter (gjort om til vektorer med opentype.js), så bildene ser like ut overalt.

import { fileURLToPath } from 'node:url';
import opentype from 'opentype.js';
import sharp from 'sharp';

export const rot = new URL('../', import.meta.url);
const skrift = (fil) => opentype.loadSync(fileURLToPath(new URL(`scripts/fonter/${fil}`, rot)));
export const S = {
  regular: skrift('Barlow-Regular.ttf'),
  medium: skrift('Barlow-Medium.ttf'),
  semibold: skrift('Barlow-SemiBold.ttf'),
  smalHalv: skrift('BarlowCondensed-SemiBold.ttf'),
  smalFet: skrift('BarlowCondensed-Bold.ttf'),
};

// Fargene fra nettsiden (styles.css).
export const F = { navy: '#0b1f4b', navy2: '#163a7a', papir: '#faf7f0', papir2: '#f1ece0', blekk: '#13203d', dempet: '#6d7385', strek: '#d8d1c0', gull: '#a5780b', gullfyll: '#f0c14b', lys: '#8ea0c4', krem: '#faf7f0' };
const FLY = 'M50 4 Q58 8 58 26 L58 40 L94 62 L94 71 L58 59 L58 78 L74 91 L74 97 L57 92 L50 95 L43 92 L26 97 L26 91 L42 78 L42 59 L6 71 L6 62 L42 40 L42 26 Q42 8 50 4 Z';

/** Flyet fra logoen, skråstilt, med øvre venstre hjørne i (x, y). 0,48 gir 48 px. */
export const fly = (x, y, skala, farge) => `<path d="${FLY}" fill="${farge}" transform="translate(${x} ${y}) scale(${skala}) translate(50 50) rotate(45) translate(-50 -50)"/>`;

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
export const mål = (t, font, str, sperring = 0) => glyfer(t, font, str, sperring).bredde;

/** Tekst som <path>. `maks` korter av med … så teksten aldri renner over. */
export function tekst(t, { x, y, str, font = S.regular, farge = F.blekk, anker = 'start', sperring = 0, maks = Infinity }) {
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
export function linjer(t, font, str, maks) {
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
export function pil(x, y, str, farge) {
  const h = str * 0.62;
  const b = str * 0.78;
  const t = Math.max(2.5, str * 0.085);
  return `<path d="M${x} ${y - h / 2}H${x + b}M${x + b - h * 0.45} ${y - h * 0.95}L${x + b} ${y - h / 2}L${x + b - h * 0.45} ${y - h * 0.05}" fill="none" stroke="${farge}" stroke-width="${t}" stroke-linecap="round" stroke-linejoin="round"/>`;
}

/** Hake, tegnet. */
export function hake(x, y, str, farge) {
  const t = Math.max(3, str * 0.12);
  return `<path d="M${x} ${y - str * 0.32}L${x + str * 0.3} ${y - str * 0.04}L${x + str * 0.8} ${y - str * 0.66}" fill="none" stroke="${farge}" stroke-width="${t}" stroke-linecap="round" stroke-linejoin="round"/>`;
}

/** Logo fra public/ som data-URI (PNG), eller null. Hentes én gang per fil. */
const logoer = new Map();
export async function logo(sti) {
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

/** Logoflis: hvit med tynn kant, logoen sentrert – eller forbokstaven når logoen mangler. */
export function flis(x, y, b, h, bilde, navn) {
  const kant = `<rect x="${x}" y="${y}" width="${b}" height="${h}" rx="${Math.round(h * 0.18)}" fill="#ffffff" stroke="#e4ddcc" stroke-width="2"/>`;
  if (bilde) return `${kant}<image href="${bilde}" x="${x + h * 0.16}" y="${y + h * 0.12}" width="${b - h * 0.32}" height="${h * 0.76}" preserveAspectRatio="xMidYMid meet"/>`;
  return `${kant}${tekst(navn.charAt(0).toUpperCase(), { x: x + b / 2, y: y + h / 2 + h * 0.2, str: h * 0.55, font: S.smalFet, farge: F.blekk, anker: 'middle' })}`;
}
