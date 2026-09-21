// Sender e-post til dem som følger en butikk når satsen endret seg i dag (ny måling i history.json).
// Kjøres etter `npm run hent` i GitHub Actions. Trenger BUTTONDOWN_API_KEY; uten den logges bare.
//
//   BUTTONDOWN_API_KEY=… node scripts/send-varsler.mjs

import { readFile } from 'node:fs/promises';

const les = async (sti) => JSON.parse(await readFile(new URL(sti, import.meta.url), 'utf8'));
const historikk = await les('../src/data/history.json');
const stores = await les('../src/data/stores.json');
const { programmer } = await les('../src/data/programs.json');
const varsler = await les('../src/data/varsler.json');

const idag = new Date().toISOString().slice(0, 10);
const STI = { NO: 'no', SE: 'se', DK: 'dk' };
const fmt = (p, v) => (p.satsEnhet === 'prosent' ? `${String(v).replace('.', ',')} %` : `${v} p/100 kr`);

// Endringer i dag: serier der siste måling er datert i dag og ikke er den første.
const endringer = [];
for (const [land, butikker] of Object.entries(historikk)) {
  const navn = new Map((stores.land[land] ?? []).map((b) => [b.id, b.navn]));
  for (const [butikkId, serier] of Object.entries(butikker)) {
    for (const [programId, malinger] of Object.entries(serier)) {
      const siste = malinger[malinger.length - 1];
      if (malinger.length < 2 || siste[0] !== idag) continue;
      const program = programmer.find((p) => p.id === programId);
      if (!program) continue;
      endringer.push({ land, butikkId, butikk: navn.get(butikkId) ?? butikkId, program, fra: malinger[malinger.length - 2][1], til: siste[1] });
    }
  }
}

if (endringer.length === 0) {
  console.log('Ingen endringer i dag – ingen varsler.');
  process.exit(0);
}

const nokkel = process.env.BUTTONDOWN_API_KEY;
const perButikk = new Map();
for (const e of endringer) {
  const tag = `${STI[e.land]}:${e.butikkId}`;
  (perButikk.get(tag) ?? perButikk.set(tag, []).get(tag)).push(e);
}

for (const [tag, liste] of perButikk) {
  const { land, butikkId, butikk } = liste[0];
  const linjer = liste.map((e) => `- ${e.program.kortnavn}: ${fmt(e.program, e.fra)} → ${fmt(e.program, e.til)}`);
  const subject = `${butikk}: ny sats hos ${liste.map((e) => e.program.kortnavn).join(' og ')}`;
  const body = `${butikk} har fått ny sats i dag:\n\n${linjer.join('\n')}\n\nSe alle programmene: https://pointmaxing.no/${STI[land]}/${butikkId}\n\nDu får denne e-posten fordi du følger ${butikk} på Pointmaxing.`;

  if (!nokkel || varsler.leverandor !== 'buttondown') {
    console.log(`[tørrkjøring] ${tag}: ${subject}`);
    continue;
  }
  const svar = await fetch('https://api.buttondown.com/v1/emails', {
    method: 'POST',
    headers: { Authorization: `Token ${nokkel}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ subject, body, status: 'about_to_send', included_tags: [tag] }),
  });
  console.log(`${tag}: ${svar.status} ${svar.ok ? 'sendt' : await svar.text()}`);
}
