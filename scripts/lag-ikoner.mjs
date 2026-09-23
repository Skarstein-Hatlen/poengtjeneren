// Lager PNG-ikoner fra public/favicon.svg: favicon, Apple-ikon, PWA-ikoner og utvidelsens ikoner.
// Kjøres med `npm run ikoner` når merket endres.

import { readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const rot = new URL('../', import.meta.url);
const svg = await readFile(new URL('public/favicon.svg', rot));

const filer = [
  ['public/favicon-32.png', 32],
  ['public/favicon-192.png', 192],
  ['public/favicon-512.png', 512],
  ['public/apple-touch-icon.png', 180],
  ['extension/ikon16.png', 16],
  ['extension/ikon48.png', 48],
  ['extension/ikon128.png', 128],
];

for (const [sti, px] of filer) {
  await writeFile(new URL(sti, rot), await sharp(svg, { density: 72 * (px / 100) * 4 }).resize(px, px).png().toBuffer());
}
console.log(`Ikoner: ${filer.map(([, px]) => px).join(', ')} px`);
