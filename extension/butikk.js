// Kjører på nettbutikker vi kjenner (domenene genereres inn i manifestet av scripts/bygg-utvidelse.mjs):
// et lite kort nede til høyre med programmene side om side og «Åpne via …» til siden kjøpet må
// starte fra. Ingen sporing av hva du gjør på siden – bare satsene, regnet med ditt nivå.

(async () => {
  if (window.top !== window) return;
  const SKJUL = 'pmx-skjul-til';
  try {
    if (Number(localStorage.getItem(SKJUL) ?? 0) > Date.now()) return;
  } catch {
    /* lagring kan være sperret */
  }

  let d = await chrome.storage.local.get(['perDomene', 'programmer', 'oppsett']);
  if (!d.perDomene) d = (await new Promise((r) => chrome.runtime.sendMessage({ type: 'hent' }, (svar) => r(svar ?? null)))) ?? {};
  const butikk = PMX.finnButikk(d.perDomene, PMX.domeneFor(location.href));
  if (!butikk) return;

  const TEKST = {
    NO: { apne: 'Åpne via {p} ↗', regn: 'Regn ut →', lukk: 'Skjul i dag', flest: 'flest poeng', per100: 'p/100 kr' },
    SE: { apne: 'Öppna via {p} ↗', regn: 'Räkna ut →', lukk: 'Dölj i dag', flest: 'flest poäng', per100: 'p/100 kr' },
    DK: { apne: 'Åbn via {p} ↗', regn: 'Regn ud →', lukk: 'Skjul i dag', flest: 'flest point', per100: 'p/100 kr' },
  };
  const t = TEKST[butikk.land] ?? TEKST.NO;
  const rader = PMX.rader(butikk, d.programmer ?? {}, d.oppsett ?? {});
  const beste = rader.find((r) => r.per100 != null) ?? null;
  const lenkeFor = (id) => butikk.satser[id]?.lenke ?? null;

  // Alt ligger i en skygge-DOM så butikkens CSS ikke når inn.
  const vert = document.createElement('div');
  vert.id = 'pmx-vert';
  const rot = vert.attachShadow({ mode: 'open' });
  const stil = document.createElement('style');
  stil.textContent = `
    :host { all: initial; }
    .kort {
      position: fixed; right: 16px; bottom: 16px; z-index: 2147483647; width: 292px; box-sizing: border-box;
      padding: 12px 14px 14px; border: 1px solid #dadce0; border-radius: 12px; background: #fff; color: #202124;
      box-shadow: 0 12px 32px rgba(11, 31, 75, 0.18);
      font: 13px/1.35 'Google Sans', Roboto, system-ui, -apple-system, 'Segoe UI', arial, sans-serif;
      font-variant-numeric: tabular-nums;
    }
    .topp { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
    .p { display: inline-grid; place-items: center; width: 18px; height: 18px; border-radius: 4px; background: #0b1f4b; color: #fff; font-size: 11px; font-weight: 700; flex: none; }
    .merke { font-weight: 600; color: #0b1f4b; text-decoration: none; }
    .navn { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #5f6368; }
    .lukk { border: 0; background: none; color: #5f6368; font-size: 18px; line-height: 1; cursor: pointer; padding: 2px 4px; margin-right: -4px; }
    .lukk:hover { color: #202124; }
    .rad { display: flex; align-items: center; gap: 8px; padding: 7px 0; border-top: 1px solid #eceef1; }
    .rad i { width: 8px; height: 8px; border-radius: 50%; flex: none; }
    .rad .pn { flex: 1; min-width: 0; }
    .rad .pn small { color: #5f6368; margin-left: 4px; }
    .rad .pp { font-weight: 600; white-space: nowrap; }
    .rad .pp small { font-weight: 400; color: #5f6368; margin-left: 3px; }
    .rad.best .pn { font-weight: 600; }
    .rad.best .pp { color: #0b1f4b; }
    .bunn { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 10px; }
    .apne { display: inline-flex; align-items: center; padding: 7px 12px; border-radius: 999px; background: #0b1f4b; color: #fff; font-weight: 600; text-decoration: none; white-space: nowrap; }
    .apne:hover { background: #163a7a; }
    .regn { color: #0b1f4b; text-decoration: none; font-weight: 600; white-space: nowrap; }
    .regn:hover { text-decoration: underline; }
    @media (prefers-color-scheme: dark) {
      .kort { background: #303134; border-color: #3c4043; color: #e8eaed; }
      .p { background: #e8eaed; color: #0b1f4b; }
      .merke, .regn { color: #e8eaed; }
      .navn, .lukk, .rad .pn small, .rad .pp small { color: #9aa0a6; }
      .rad { border-top-color: #3c4043; }
      .rad.best .pp { color: #e8eaed; }
      .rad i { box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.35); }
      .apne { background: #e8eaed; color: #0b1f4b; }
      .apne:hover { background: #fff; }
    }
  `;
  const kort = document.createElement('div');
  kort.className = 'kort';
  kort.setAttribute('role', 'complementary');
  kort.setAttribute('aria-label', 'Pointmaxing');

  const topp = document.createElement('div');
  topp.className = 'topp';
  const merke = document.createElement('a');
  merke.className = 'merke';
  merke.href = 'https://pointmaxing.no/';
  merke.target = '_blank';
  merke.rel = 'noreferrer';
  const p = document.createElement('span');
  p.className = 'p';
  p.textContent = 'P';
  merke.append(p);
  const navn = document.createElement('span');
  navn.className = 'navn';
  navn.textContent = butikk.navn;
  const lukk = document.createElement('button');
  lukk.className = 'lukk';
  lukk.type = 'button';
  lukk.title = t.lukk;
  lukk.setAttribute('aria-label', t.lukk);
  lukk.textContent = '×';
  lukk.addEventListener('click', () => {
    try {
      localStorage.setItem(SKJUL, String(Date.now() + 24 * 60 * 60 * 1000));
    } catch {
      /* da vises kortet igjen neste gang */
    }
    vert.remove();
  });
  topp.append(merke, navn, lukk);
  kort.append(topp);

  for (const r of rader) {
    const rad = document.createElement('div');
    rad.className = `rad${beste && r === beste ? ' best' : ''}`;
    const prikk = document.createElement('i');
    prikk.style.background = r.farge;
    const pn = document.createElement('span');
    pn.className = 'pn';
    pn.textContent = r.navn;
    const sats = document.createElement('small');
    sats.textContent = r.tekst;
    pn.append(sats);
    const pp = document.createElement('span');
    pp.className = 'pp';
    pp.textContent = r.per100 == null ? '–' : PMX.tall(r.per100);
    if (r.per100 != null) {
      const enhet = document.createElement('small');
      enhet.textContent = t.per100;
      pp.append(enhet);
    }
    rad.append(prikk, pn, pp);
    kort.append(rad);
  }

  const bunn = document.createElement('div');
  bunn.className = 'bunn';
  const apneLenke = beste ? lenkeFor(beste.id) : null;
  if (apneLenke) {
    const apne = document.createElement('a');
    apne.className = 'apne';
    apne.href = apneLenke;
    apne.target = '_blank';
    apne.rel = 'noreferrer';
    apne.textContent = t.apne.replace('{p}', beste.navn);
    bunn.append(apne);
  }
  const regn = document.createElement('a');
  regn.className = 'regn';
  regn.href = `https://pointmaxing.no/${butikk.sti}/${butikk.id}`;
  regn.target = '_blank';
  regn.rel = 'noreferrer';
  regn.textContent = t.regn;
  bunn.append(regn);
  kort.append(bunn);

  rot.append(stil, kort);
  (document.body ?? document.documentElement).append(vert);
})();
