// Henter butikklisten fra pointmaxing.no én gang i døgnet, tar imot brukerens oppsett fra
// nettsiden, setter et merke på ikonet («84») med beste poeng per 100 kr på kjente butikker,
// og varsler når satsen går opp hos en butikk brukeren følger.

if (typeof importScripts === 'function') importScripts('felles.js'); // Firefox laster felles.js via background.scripts

async function oppdaterMerke(tabId, url) {
  const { perDomene, programmer, oppsett } = await PMX.data();
  const butikk = PMX.finnButikk(perDomene, PMX.domeneFor(url));
  try {
    if (!butikk) {
      await chrome.action.setBadgeText({ tabId, text: '' });
      await chrome.action.setTitle({ tabId, title: 'Pointmaxing' });
      return;
    }
    const beste = PMX.rader(butikk, programmer, oppsett)[0];
    const per100 = beste?.per100 ?? 0;
    await chrome.action.setBadgeBackgroundColor({ tabId, color: '#0b1f4b' });
    if (chrome.action.setBadgeTextColor) await chrome.action.setBadgeTextColor({ tabId, color: '#ffffff' });
    await chrome.action.setBadgeText({ tabId, text: per100 > 0 ? String(Math.round(per100)) : '•' });
    await chrome.action.setTitle({
      tabId,
      title: per100 > 0 ? `${butikk.navn}: ${Math.round(per100)} EuroBonus-poeng per 100 kr via ${beste.navn}` : `${butikk.navn}: poengavtale finnes`,
    });
  } catch {
    /* fanen kan være lukket */
  }
}

async function oppdaterAktivFane() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id && tab.url) await oppdaterMerke(tab.id, tab.url);
  } catch {
    /* ingen aktiv fane */
  }
}

/** Butikkene brukeren følger: fra nettsiden (synk.js) og fra popupen, per land. */
function fulgte(oppsett, ekstra) {
  const ut = {};
  for (const kilde of [oppsett?.folger ?? {}, ekstra ?? {}]) {
    for (const [land, liste] of Object.entries(kilde)) ut[land] = [...new Set([...(ut[land] ?? []), ...liste])];
  }
  return ut;
}

/** Sammenligner gammel og ny liste for fulgte butikker og varsler om satser som gikk opp. */
async function varsle(gammel, ny) {
  if (!gammel?.alle || !ny?.alle || !chrome.notifications) return;
  const { oppsett, folgerEkstra } = await chrome.storage.local.get(['oppsett', 'folgerEkstra']);
  const programmer = ny.programmer ?? {};
  for (const [land, ider] of Object.entries(fulgte(oppsett, folgerEkstra))) {
    for (const id of ider) {
      const for_ = gammel.alle[land]?.[id];
      const naa = ny.alle[land]?.[id];
      if (!for_ || !naa) continue;
      const forRader = new Map(PMX.rader(for_, gammel.programmer ?? programmer, oppsett).map((r) => [r.id, r]));
      for (const r of PMX.rader(naa, programmer, oppsett)) {
        const f = forRader.get(r.id);
        if (!f || r.per100 == null || f.per100 == null || r.per100 <= f.per100) continue;
        chrome.notifications.create(`pmx:${land}:${id}:${r.id}`, {
          type: 'basic',
          iconUrl: 'ikon128.png',
          title: `${naa.navn}: ${r.navn} går opp`,
          message: `${f.tekst} → ${r.tekst} · ${PMX.tall(r.per100)} p/100 kr`,
        });
      }
    }
  }
}

/** Daglig henting: sammenligner med forrige liste før den skrives over. */
async function hentOgVarsle() {
  const gammel = await chrome.storage.local.get(['alle', 'programmer']);
  const ny = await PMX.hent();
  if (ny) await varsle(gammel, ny);
}

chrome.runtime.onMessage.addListener((melding, _avsender, svar) => {
  // Google-søk, butikkortet og popupen ber om data når lageret er tomt.
  if (melding?.type === 'hent') {
    PMX.data().then((d) => svar(d));
    return true;
  }
  // Nettsiden (synk.js) og popupen sender brukerens kort, nivå og fulgte butikker.
  if (melding?.type === 'oppsett' && melding.oppsett && typeof melding.oppsett === 'object') {
    chrome.storage.local.set({ oppsett: melding.oppsett }).then(async () => {
      await oppdaterAktivFane();
      svar({ ok: true });
    });
    return true;
  }
  return false;
});

if (chrome.notifications) {
  chrome.notifications.onClicked.addListener((id) => {
    const [, land, butikkId] = id.split(':');
    const sti = { NO: 'no', SE: 'se', DK: 'dk' }[land];
    if (sti && butikkId) chrome.tabs.create({ url: `https://pointmaxing.no/${sti}/${butikkId}` });
    chrome.notifications.clear(id);
  });
}

chrome.runtime.onInstalled.addListener(() => {
  PMX.hent();
  chrome.alarms.create('hent', { periodInMinutes: 60 * 24 });
});
chrome.runtime.onStartup.addListener(() => hentOgVarsle());
chrome.alarms.onAlarm.addListener((a) => {
  if (a.name === 'hent') hentOgVarsle();
});

chrome.tabs.onUpdated.addListener((tabId, info, tab) => {
  if (info.status === 'complete' || info.url) oppdaterMerke(tabId, tab.url ?? info.url);
});
chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (tab.url) oppdaterMerke(tabId, tab.url);
  } catch {
    /* fanen finnes ikke lenger */
  }
});
