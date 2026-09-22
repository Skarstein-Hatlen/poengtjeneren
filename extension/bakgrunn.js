// Henter butikklisten fra pointmaxing.no én gang i døgnet, tar imot brukerens oppsett fra
// nettsiden, og setter et merke på ikonet («84») med beste poeng per 100 kr på kjente butikker.

importScripts('felles.js');

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

chrome.runtime.onMessage.addListener((melding, _avsender, svar) => {
  // Google-søk og popup ber om data når lageret er tomt.
  if (melding?.type === 'hent') {
    PMX.data().then((d) => svar(d));
    return true;
  }
  // Nettsiden (synk.js) og popupen sender brukerens kort og nivå.
  if (melding?.type === 'oppsett' && melding.oppsett && typeof melding.oppsett === 'object') {
    chrome.storage.local.set({ oppsett: melding.oppsett }).then(async () => {
      await oppdaterAktivFane();
      svar({ ok: true });
    });
    return true;
  }
  return false;
});

chrome.runtime.onInstalled.addListener(() => {
  PMX.hent();
  chrome.alarms.create('hent', { periodInMinutes: 60 * 24 });
});
chrome.runtime.onStartup.addListener(() => PMX.hent());
chrome.alarms.onAlarm.addListener((a) => {
  if (a.name === 'hent') PMX.hent();
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
