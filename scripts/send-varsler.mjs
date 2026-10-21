// Sender push-varsler til dem som følger butikker der satsen gikk opp i dag. Kjøres av hent-satser.yml etter
// `npm run hent`: hendelsene er historikkens målinger med dagens dato som er høyere enn forrige (eller programmet er
// tilbake). Abonnementene ligger i Supabase (supabase/varsler.sql). Uten SUPABASE_SERVICE_KEY og VAPID_PRIVAT gjør
// skriptet ingenting.

import { readFile } from 'node:fs/promises';
import webpush from 'web-push';

const les = async (sti) => JSON.parse(await readFile(new URL(sti, import.meta.url), 'utf8'));
const konfig = await les('../src/data/varsler.json');
const { SUPABASE_SERVICE_KEY: NOKKEL, VAPID_PRIVAT } = process.env;
if (!konfig.supabaseUrl || !konfig.vapidPublic || !NOKKEL || !VAPID_PRIVAT) {
  console.log('Varsler er ikke satt opp – hopper over.');
  process.exit(0);
}

const idag = new Date().toISOString().slice(0, 10);
const historikk = await les('../src/data/history.json');
const { land: butikker } = await les('../src/data/stores.json');
const { programmer } = await les('../src/data/programs.json');
const SPRAK = {
  NO: { sti: 'no', locale: 'nb-NO', opp: 'Satsen gikk opp i dag. Trykk for å se.', ogsa: 'nå også hos', flere: (n) => `${n} butikker du følger gikk opp` },
  SE: { sti: 'se', locale: 'sv-SE', opp: 'Satsen gick upp i dag. Tryck för att se.', ogsa: 'nu även hos', flere: (n) => `${n} butiker du följer gick upp` },
  DK: { sti: 'dk', locale: 'da-DK', opp: 'Satsen steg i dag. Tryk for at se.', ogsa: 'nu også hos', flere: (n) => `${n} butikker, du følger, steg` },
};
const pent = (navn) => navn.replace(/\s+(NO|SE|DK)$/i, '');

// Hendelser i dag, per «LAND:butikk».
const hendelser = new Map();
for (const [land, serierPerButikk] of Object.entries(historikk)) {
  const s = SPRAK[land];
  if (!s) continue;
  const navnFor = new Map((butikker[land] ?? []).map((b) => [b.id, pent(b.navn)]));
  for (const [id, serier] of Object.entries(serierPerButikk)) {
    for (const [pid, m] of Object.entries(serier)) {
      const [dato, til] = m[m.length - 1];
      if (dato !== idag || til === null) continue;
      const fra = m.length > 1 ? m[m.length - 2][1] : null;
      if (fra !== null && til <= fra) continue;
      if (fra === null && m.length === 1) continue; // første måling for en ny butikk er ingen nyhet
      const p = programmer.find((x) => x.id === pid);
      if (!p) continue;
      const fmt = (v) => `${v.toLocaleString(s.locale)}${p.satsEnhet === 'prosent' ? ' %' : ' p/100'}`;
      const liste = hendelser.get(`${land}:${id}`) ?? [];
      liste.push({ land, id, navn: navnFor.get(id) ?? id, tekst: fra === null ? `${s.ogsa} ${p.kortnavn}: ${fmt(til)}` : `${p.kortnavn} ${fmt(fra)} → ${fmt(til)}` });
      hendelser.set(`${land}:${id}`, liste);
    }
  }
}
if (!hendelser.size) {
  console.log('Ingen satser gikk opp i dag – ingen varsler.');
  process.exit(0);
}

const hoder = { apikey: NOKKEL, Authorization: `Bearer ${NOKKEL}` };
const svar = await fetch(`${konfig.supabaseUrl}/rest/v1/varsel_abonnement?select=endpoint,p256dh,auth,butikker`, { headers: hoder });
if (!svar.ok) throw new Error(`Supabase: ${svar.status}`);
const abonnementer = await svar.json();
webpush.setVapidDetails('mailto:kjetil@inora.no', konfig.vapidPublic, VAPID_PRIVAT);

let sendt = 0;
let slettet = 0;
for (const a of abonnementer) {
  const treff = (a.butikker ?? []).filter((k) => hendelser.has(k)).flatMap((k) => hendelser.get(k));
  if (!treff.length) continue;
  const s = SPRAK[treff[0].land];
  const butikkerMedTreff = [...new Map(treff.map((t) => [`${t.land}:${t.id}`, t])).values()];
  const melding =
    butikkerMedTreff.length === 1
      ? { tittel: `${treff[0].navn}: ${treff.map((t) => t.tekst).join(', ')}`, tekst: s.opp, url: `/${s.sti}/${treff[0].id}`, tag: `opp-${treff[0].land}-${treff[0].id}` }
      : { tittel: s.flere(butikkerMedTreff.length), tekst: butikkerMedTreff.map((t) => t.navn).join(', '), url: `/${s.sti}/nytt`, tag: 'opp-flere' };
  try {
    await webpush.sendNotification({ endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } }, JSON.stringify(melding), { TTL: 86400 });
    sendt++;
  } catch (e) {
    // Utløpt eller avmeldt i nettleseren: fjern abonnementet.
    if (e.statusCode === 404 || e.statusCode === 410) {
      await fetch(`${konfig.supabaseUrl}/rest/v1/varsel_abonnement?endpoint=eq.${encodeURIComponent(a.endpoint)}`, { method: 'DELETE', headers: hoder });
      slettet++;
    } else {
      console.warn(`Varsel feilet (${e.statusCode ?? e.message})`);
    }
  }
}
console.log(`Varsler: ${hendelser.size} butikker gikk opp, ${sendt} sendt, ${slettet} utløpte abonnementer fjernet (av ${abonnementer.length}).`);
