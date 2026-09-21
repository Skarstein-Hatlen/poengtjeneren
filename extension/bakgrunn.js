// Henter butikklisten fra pointmaxing.no én gang i døgnet, og setter et merke på ikonet
// («84») med beste poeng per 100 kr når fanen er inne på en butikk vi kjenner.

const KILDE = 'https://pointmaxing.no/api/butikker.json';
const LAND_STI = { NO: 'no', SE: 'se', DK: 'dk' };

async function hentButikker() {
  try {
    const svar = await fetch(KILDE, { cache: 'no-store' });
    if (!svar.ok) return;
    const data = await svar.json();
    // Domene → butikk. Norge først, så svensk og dansk – samme butikk kan finnes i flere land.
    const perDomene = {};
    for (const [land, butikker] of Object.entries(data.land)) {
      for (const b of butikker) {
        if (!b.domene || perDomene[b.domene]) continue;
        perDomene[b.domene] = { land, sti: LAND_STI[land], id: b.id, navn: b.navn, satser: b.satser };
      }
    }
    await chrome.storage.local.set({ perDomene, hentet: data.hentet, oppdatert: Date.now() });
  } catch {
    /* prøver igjen neste gang */
  }
}

function domeneFor(url) {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
}

/** Finner butikken for et domene, også for underdomener (shop.kicks.no → kicks.no). */
function finnButikk(perDomene, domene) {
  if (!domene || !perDomene) return null;
  const deler = domene.split('.');
  for (let i = 0; i < deler.length - 1; i++) {
    const kandidat = deler.slice(i).join('.');
    if (perDomene[kandidat]) return perDomene[kandidat];
  }
  return null;
}

async function oppdaterMerke(tabId, url) {
  const { perDomene } = await chrome.storage.local.get('perDomene');
  const butikk = finnButikk(perDomene, domeneFor(url));
  if (!butikk) {
    await chrome.action.setBadgeText({ tabId, text: '' });
    await chrome.action.setTitle({ tabId, title: 'Pointmaxing' });
    return;
  }
  const beste = Math.max(0, ...Object.values(butikk.satser).map((s) => s.per100 ?? 0));
  await chrome.action.setBadgeBackgroundColor({ tabId, color: '#f0c14b' });
  await chrome.action.setBadgeTextColor?.({ tabId, color: '#13203d' });
  await chrome.action.setBadgeText({ tabId, text: beste > 0 ? String(Math.round(beste)) : '•' });
  await chrome.action.setTitle({ tabId, title: `${butikk.navn}: opptil ${Math.round(beste)} EuroBonus-poeng per 100 kr` });
}

chrome.runtime.onInstalled.addListener(() => {
  hentButikker();
  chrome.alarms.create('hent', { periodInMinutes: 60 * 24 });
});
chrome.runtime.onStartup.addListener(hentButikker);
chrome.alarms.onAlarm.addListener((a) => {
  if (a.name === 'hent') hentButikker();
});

chrome.tabs.onUpdated.addListener((tabId, info, tab) => {
  if (info.status === 'complete' || info.url) oppdaterMerke(tabId, tab.url ?? info.url);
});
chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  const tab = await chrome.tabs.get(tabId);
  if (tab.url) oppdaterMerke(tabId, tab.url);
});
