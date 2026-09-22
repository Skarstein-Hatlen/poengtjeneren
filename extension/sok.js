// Kjører på Google-søk: merker treff som er butikker vi kjenner, og viser en stripe øverst
// med butikkene og beste poeng – slik Trumf Netthandel gjør det.

(async () => {
  const PROGRAMNAVN = {
    trumf: 'Trumf',
    klarna: 'Klarna',
    'sas-online-shopping': 'SAS Shopping',
    'klarna-se': 'Klarna',
    'sas-online-shopping-se': 'SAS Shopping',
    'klarna-dk': 'Klarna',
    'sas-online-shopping-dk': 'SAS Shopping',
  };

  let { perDomene } = await chrome.storage.local.get('perDomene');
  if (!perDomene) {
    perDomene = await new Promise((r) => chrome.runtime.sendMessage({ type: 'hent' }, (svar) => r(svar?.perDomene ?? null)));
  }
  if (!perDomene) return;

  const domeneFor = (url) => {
    try {
      return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
    } catch {
      return null;
    }
  };
  const finnButikk = (domene) => {
    if (!domene) return null;
    const deler = domene.split('.');
    for (let i = 0; i < deler.length - 1; i++) {
      const b = perDomene[deler.slice(i).join('.')];
      if (b) return b;
    }
    return null;
  };
  const tall = (n) => String(Math.round(n * 10) / 10).replace('.', ',');
  const satser = (butikk) =>
    Object.entries(butikk.satser)
      .map(([id, s]) => ({ navn: PROGRAMNAVN[id] ?? id, tekst: s.tekst, per100: s.per100 }))
      .sort((a, b) => (b.per100 ?? -1) - (a.per100 ?? -1));
  const lenke = (butikk) => `https://pointmaxing.no/${butikk.sti}/${butikk.id}`;

  const funnet = new Map();

  function visStripe() {
    if (funnet.size === 0 || sessionStorage.getItem('pmx-skjul') || document.getElementById('pmx-stripe')) {
      oppdaterStripe();
      return;
    }
    const stripe = document.createElement('div');
    stripe.id = 'pmx-stripe';
    stripe.innerHTML = `<a class="pmx-merke" href="https://pointmaxing.no/" target="_blank" rel="noreferrer">Pointmaxing</a><div class="pmx-butikker"></div><button class="pmx-lukk" type="button" aria-label="Lukk">×</button>`;
    stripe.querySelector('.pmx-lukk').addEventListener('click', () => {
      sessionStorage.setItem('pmx-skjul', '1');
      stripe.remove();
      document.documentElement.style.removeProperty('--pmx-topp');
      document.body.classList.remove('pmx-med-stripe');
    });
    document.body.prepend(stripe);
    document.body.classList.add('pmx-med-stripe');
    oppdaterStripe();
  }

  function oppdaterStripe() {
    const boks = document.querySelector('#pmx-stripe .pmx-butikker');
    if (!boks) return;
    boks.innerHTML = '';
    for (const butikk of funnet.values()) {
      const beste = satser(butikk)[0];
      const a = document.createElement('a');
      a.href = lenke(butikk);
      a.target = '_blank';
      a.rel = 'noreferrer';
      a.textContent = beste?.per100 != null ? `${butikk.navn} – ${tall(beste.per100)} p/100 kr` : `${butikk.navn} – ${beste?.tekst ?? ''}`;
      boks.append(a);
    }
  }

  function merk() {
    for (const h3 of document.querySelectorAll('#search a h3, #rso a h3')) {
      const a = h3.closest('a');
      if (!a || a.dataset.pmx) continue;
      a.dataset.pmx = '1';
      const butikk = finnButikk(domeneFor(a.href));
      if (!butikk || funnet.has(butikk.id)) continue;
      funnet.set(butikk.id, butikk);
      const linje = document.createElement('a');
      linje.className = 'pmx-linje';
      linje.href = lenke(butikk);
      linje.target = '_blank';
      linje.rel = 'noreferrer';
      linje.textContent = `${satser(butikk)
        .map((s) => `${s.navn} ${s.tekst}`)
        .join(' · ')} – regn ut poengene →`;
      a.after(linje);
    }
    if (funnet.size > 0) visStripe();
  }

  merk();
  let venter = null;
  new MutationObserver(() => {
    clearTimeout(venter);
    venter = setTimeout(merk, 400);
  }).observe(document.body, { childList: true, subtree: true });
})();
