// Henter utstedernes egne kortbilder (offisiell kortkunst, ikke fotografier) og lagrer dem som små
// webp under public/kort/<kort-id>.webp, med src/data/kortbilder.json som oppslag for kortvelgeren.
// Kort uten bilde her får et monogram i stedet. Kjøres med `npm run kortbilder` når listen endres.

import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const rot = new URL('../', import.meta.url);
const MAPPE = new URL('public/kort/', rot);
const HODER = { 'user-agent': 'Mozilla/5.0 (pointmaxing.no)' };
const AMEX = 'https://icm.aexp-static.com/Internet/internationalcardshop/sv_se/images/cards/';
const KLARNA_KORT = 'https://locker.klarna.com/transform/acfe437f-d7e8-43e3-8ab6-28e667b85996/Web_RoseGoldCardFrontAngledLayingLeft_BrandProduct_KlarnaCard_3x2';

/** kort-id → bilde-URL. Samme kunst i flere land bruker samme fil. */
const BILDER = {
  'sas-amex-classic': `${AMEX}Sas_Classic_Revolve.png`,
  'sas-amex-premium': `${AMEX}Sas_Premium_Revolve.png`,
  'sas-amex-elite': `${AMEX}Sas_Elite_Revolve.png`,
  'amex-green': `${AMEX}Green_Card.png`,
  'amex-gold': `${AMEX}Gold_Card.png`,
  'amex-platinum': `${AMEX}Platinum_Card.png`,
  'amex-platinum-points-plus': `${AMEX}Platinum_Card.png`,
  'se-sas-amex-classic': `${AMEX}Sas_Classic_Revolve.png`,
  'se-sas-amex-premium': `${AMEX}Sas_Premium_Revolve.png`,
  'se-sas-amex-elite': `${AMEX}Sas_Elite_Revolve.png`,
  'se-amex-green': `${AMEX}Green_Card.png`,
  'se-amex-gold': `${AMEX}Gold_Card.png`,
  'se-amex-platinum': `${AMEX}Platinum_Card.png`,
  'klarna-kort': KLARNA_KORT,
  'klarna-se-kort': KLARNA_KORT,
  'klarna-dk-kort': KLARNA_KORT,
  'sas-mastercard-world': 'https://saseurobonusmastercard.no/globalassets/sas_global/plain-mc.png',
  'sas-mastercard-premium': 'https://saseurobonusmastercard.no/globalassets/sas_global/plain-mcp.png',
  'se-sas-mastercard-world': 'https://saseurobonusmastercard.no/globalassets/sas_global/plain-mc.png',
  'se-sas-mastercard-premium': 'https://saseurobonusmastercard.no/globalassets/sas_global/plain-mcp.png',
  'dk-sas-mastercard-world': 'https://saseurobonusmastercard.no/globalassets/sas_global/plain-mc.png',
  'dk-sas-mastercard-premium': 'https://saseurobonusmastercard.no/globalassets/sas_global/plain-mcp.png',
};

await mkdir(MAPPE, { recursive: true });
const ut = {};
const hentet = new Map();
for (const [id, url] of Object.entries(BILDER)) {
  try {
    if (!hentet.has(url)) {
      const svar = await fetch(url, { headers: HODER });
      if (!svar.ok) throw new Error(`HTTP ${svar.status}`);
      hentet.set(url, Buffer.from(await svar.arrayBuffer()));
    }
    const fil = new URL(`${id}.webp`, MAPPE);
    // Trim luft rundt kortet, skaler til 240 px bredde – nok for 36 px-fliser på skarpe skjermer.
    await sharp(hentet.get(url)).ensureAlpha().trim({ threshold: 10 }).resize(240, 150, { fit: 'inside', withoutEnlargement: false }).webp({ quality: 86 }).toFile(fileURLToPath(fil));
    ut[id] = `/kort/${id}.webp`;
  } catch (e) {
    console.error(`${id}: ${e.message}`);
  }
}
await writeFile(new URL('src/data/kortbilder.json', rot), JSON.stringify(ut, null, 2) + '\n');
console.log(`Kortbilder: ${Object.keys(ut).length} av ${Object.keys(BILDER).length}`);
