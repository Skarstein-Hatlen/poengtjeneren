// Kjører på pointmaxing.no: leser oppsettet brukeren har valgt der (kort og Klarna-nivå)
// og gir det til utvidelsen, så merket, popupen og Google-stripen regner med det samme.

(() => {
  const NOKKEL = 'pointmaxing.v8';
  let sist = null;

  function les() {
    try {
      const t = JSON.parse(localStorage.getItem(NOKKEL) ?? 'null');
      if (!t || typeof t !== 'object') return null;
      const niva = {};
      for (const [id, rad] of Object.entries(t.rader ?? {})) if (rad && typeof rad.valgId === 'string') niva[id] = rad.valgId;
      return { niva, kortId: typeof t.kortId === 'string' ? t.kortId : null };
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
