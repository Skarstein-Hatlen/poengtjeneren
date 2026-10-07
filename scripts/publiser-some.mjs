// Publiserer dagens SoMe-post på Instagram med Metas Instagram API.
// Kjøres av .github/workflows/publiser-some.yml. Leser postene fra den publiserte siden (pointmaxing.no/some/poster.json),
// så bildene ligger på en offentlig adresse når Meta henter dem. Uten IG_TOKEN gjør skriptet ingenting.
// Tokenet skrives aldri ut: feilmeldinger viser bare stien som ble kalt.

import { appendFile, writeFile } from 'node:fs/promises';

const TOKEN = process.env.IG_TOKEN;
// To slags token: fra Instagram-innlogging (begynner med «IG», graph.instagram.com, varer 60 dager og fornyes her)
// eller fra Facebook-innlogging (sidetoken fra Graph API Explorer, graph.facebook.com, utløper ikke).
const INSTAGRAM_LOGIN = TOKEN?.startsWith('IG');
const API = INSTAGRAM_LOGIN ? 'https://graph.instagram.com' : 'https://graph.facebook.com';
const POSTER = 'https://pointmaxing.no/some/poster.json';

if (!TOKEN) {
  console.log('IG_TOKEN er ikke satt – ingenting å gjøre.');
  process.exit(0);
}

const iDag = new Intl.DateTimeFormat('nb-NO', { weekday: 'long', timeZone: 'Europe/Oslo' }).format(new Date());
const idag = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Oslo' }).format(new Date());
const vent = (ms) => new Promise((r) => setTimeout(r, ms));
const oppsummer = async (linje) => {
  console.log(linje);
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, `${linje}\n`);
};

async function kall(sti, data = {}, metode = 'GET') {
  const url = new URL(`${API}/${sti}`);
  const init = { method: metode };
  if (metode === 'GET') {
    for (const [k, v] of Object.entries(data)) url.searchParams.set(k, v);
    url.searchParams.set('access_token', TOKEN);
  } else {
    init.body = new URLSearchParams({ ...data, access_token: TOKEN });
  }
  const svar = await fetch(url, init);
  const json = await svar.json().catch(() => ({}));
  if (!svar.ok || json.error) throw new Error(`${metode} /${sti}: ${json.error?.message ?? `HTTP ${svar.status}`}`);
  return json;
}

// Langtidstokenet varer i 60 dager og kan fornyes når det er minst ett døgn gammelt. Får vi en ny verdi,
// lagres den for neste steg i workflowen (som oppdaterer secreten hvis SECRETS_PAT finnes).
if (INSTAGRAM_LOGIN) try {
  const nytt = await kall('refresh_access_token', { grant_type: 'ig_refresh_token' });
  if (nytt.access_token && nytt.access_token !== TOKEN) {
    console.log(`::add-mask::${nytt.access_token}`);
    if (process.env.NY_TOKEN_FIL) await writeFile(process.env.NY_TOKEN_FIL, nytt.access_token);
  }
  console.log(`Token fornyet, gyldig i ${Math.round(nytt.expires_in / 86400)} dager.`);
} catch (e) {
  console.log(`::warning::Kunne ikke fornye tokenet: ${e.message}`);
}

const svar = await fetch(`${POSTER}?t=${Date.now()}`);
if (!svar.ok) throw new Error(`Fant ikke ${POSTER} (HTTP ${svar.status})`);
const { laget, poster } = await svar.json();
const valgt = process.env.POST_ID?.trim();
const post = valgt ? poster.find((p) => p.id === valgt) : poster.find((p) => p.dag === iDag);
if (!post) {
  console.log(valgt ? `Fant ingen post med id «${valgt}».` : `Ingen post på ${iDag}.`);
  process.exit(valgt ? 1 : 0);
}
// Gamle bilder skal ikke ut: siden bygges hver natt.
if ((Date.parse(idag) - Date.parse(laget)) / 864e5 > 2) throw new Error(`poster.json er laget ${laget} – for gammel. Sjekk deploy.`);

let ig;
let username;
if (INSTAGRAM_LOGIN) {
  const meg = await kall('me', { fields: 'user_id,username' });
  ig = meg.user_id ?? meg.id;
  username = meg.username;
} else {
  // Sidetoken: /me er siden. Brukertoken: første side med en Instagram-konto koblet til.
  const side = await kall('me', { fields: 'instagram_business_account{id,username}' }).catch(() => ({}));
  const konto =
    side.instagram_business_account ??
    (await kall('me/accounts', { fields: 'instagram_business_account{id,username}' })).data?.find((x) => x.instagram_business_account)?.instagram_business_account;
  if (!konto) throw new Error('Fant ingen Instagram-konto koblet til en Facebook-side for dette tokenet.');
  ({ id: ig, username } = konto);
}

// Ikke publiser samme post to ganger (ny kjøring, manuell start): se etter samme første linje siste tre døgn.
const forsteLinje = post.tekst.split('\n')[0];
const siste = await kall(`${ig}/media`, { fields: 'caption,timestamp,permalink', limit: '10' });
const dobbel = siste.data?.find((m) => m.caption?.startsWith(forsteLinje) && Date.now() - Date.parse(m.timestamp) < 3 * 864e5);
if (dobbel) {
  await oppsummer(`Allerede publisert: ${dobbel.permalink}`);
  process.exit(0);
}

async function ferdig(id) {
  for (let i = 0; i < 20; i++) {
    const { status_code: status } = await kall(id, { fields: 'status_code' });
    if (status === 'FINISHED') return;
    if (status === 'ERROR' || status === 'EXPIRED') throw new Error(`Container ${id}: ${status}`);
    await vent(3000);
  }
  throw new Error(`Container ${id} ble ikke ferdig`);
}

let container;
if (post.instagram.length > 1) {
  const barn = [];
  for (const image_url of post.instagram) {
    const { id } = await kall(`${ig}/media`, { image_url, is_carousel_item: 'true' }, 'POST');
    await ferdig(id);
    barn.push(id);
  }
  ({ id: container } = await kall(`${ig}/media`, { media_type: 'CAROUSEL', children: barn.join(','), caption: post.tekst }, 'POST'));
} else {
  ({ id: container } = await kall(`${ig}/media`, { image_url: post.instagram[0], caption: post.tekst }, 'POST'));
}
await ferdig(container);
const { id: media } = await kall(`${ig}/media_publish`, { creation_id: container }, 'POST');
const { permalink } = await kall(media, { fields: 'permalink' });
await oppsummer(`Publisert «${post.tittel}» på @${username}: ${permalink}`);
