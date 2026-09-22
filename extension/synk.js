// Kjører på pointmaxing.no: leser det brukeren har valgt der (kort, Klarna-nivå og fulgte
// butikker) og gir det til utvidelsen, så merket, popupen, butikkortet og Google-stripen
// regner med det samme – og varslene gjelder de samme butikkene.

(() => {
  const OPPSETT = 'pointmaxing.v8';
  const FOLGER = 'pointmaxing.folger';
  let sist = null;

  function les() {
    try {
      const t = JSON.parse(localStorage.getItem(OPPSETT) ?? 'null');
      const f = JSON.parse(localStorage.getItem(FOLGER) ?? 'null');
      if ((!t || typeof t !== 'object') && (!f || typeof f !== 'object')) return null;
      const niva = {};
      for (const [id, rad] of Object.entries(t?.rader ?? {})) if (rad && typeof rad.valgId === 'string') niva[id] = rad.valgId;
      const folger = {};
      for (const [land, liste] of Object.entries(f ?? {})) if (Array.isArray(liste)) folger[land] = liste.filter((x) => typeof x === 'string');
      return { niva, kortId: typeof t?.kortId === 'string' ? t.kortId : null, folger };
    } catch {
      return null;
    }
  }

  function synk() {
    const oppsett = les();
    if (!oppsett) return;
    const s = JSON.stringify(oppsett);
    if (s === sist) return;
    sist = s;
    try {
      chrome.runtime.sendMessage({ type: 'oppsett', oppsett });
    } catch {
      /* utvidelsen kan være lastet på nytt siden siden ble åpnet */
    }
  }

  synk();
  setInterval(synk, 2000);
})();
