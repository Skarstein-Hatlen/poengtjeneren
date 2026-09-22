// Kjører på Google-søk: viser en rolig stripe øverst med programmene side om side for
// butikkene i treffene, og en linje under hvert treff vi kjenner.

(async () => {
  const PROGRAM = {
    trumf: { navn: 'Trumf', farge: '#1b3f8f' },
    klarna: { navn: 'Klarna', farge: '#ffa8cd' },
    'sas-online-shopping': { navn: 'SAS Shopping', farge: '#001b4d' },
    'klarna-se': { navn: 'Klarna', farge: '#ffa8cd' },
    'sas-online-shopping-se': { navn: 'SAS Shopping', farge: '#001b4d' },
    'klarna-dk': { navn: 'Klarna', farge: '#ffa8cd' },
    'sas-online-shopping-dk': { navn: 'SAS Shopping', farge: '#001b4d' },
  };
  const TEKST = {
    NO: { flest: 'flest poeng', regn: 'Regn ut poengene →', regnKort: 'Regn ut →', per100: 'EuroBonus-poeng per 100 kr', lukk: 'Lukk' },
    SE: { flest: 'flest poäng', regn: 'Räkna ut poängen →', regnKort: 'Räkna ut →', per100: 'EuroBonus-poäng per 100 kr', lukk: 'Stäng' },
    DK: { flest: 'flest point', regn: 'Regn pointene ud →', regnKort: 'Regn ud →', per100: 'EuroBonus-point per 100 kr', lukk: 'Luk' },
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
  const tekster = (butikk) => TEKST[butikk.land] ?? TEKST.NO;
  const lenke = (butikk) => `https://pointmaxing.no/${butikk.sti}/${butikk.id}`;
  // «50 poeng/100 kr» blir «50 p/100 kr», slik nettsiden skriver det.
  const kort = (tekst) => tekst.replace(/(poeng|poäng|point)\/100 kr/, 'p/100 kr');
  const satser = (butikk) =>
    Object.entries(butikk.satser)
      .map(([id, s]) => ({ ...(PROGRAM[id] ?? { navn: id, farge: '#888' }), tekst: kort(s.tekst), per100: s.per100 }))
      .sort((a, b) => (b.per100 ?? -1) - (a.per100 ?? -1));

  // Google kan vise siden mørk uansett hva systemet sier – les bakgrunnen.
  const morkt = (() => {
    const m = getComputedStyle(document.body).backgroundColor.match(/\d+/g);
    if (!m) return false;
    const [r, g, b] = m.map(Number);
    return (r * 299 + g * 587 + b * 114) / 1000 < 128;
  })();

  function satsElement(sats, best, t) {
    const el = document.createElement('span');
    el.className = `pmx-sats${best ? ' pmx-best' : ''}`;
    if (sats.per100 != null) el.title = `≈ ${tall(sats.per100)} ${t.per100}`;
    const prikk = document.createElement('i');
    prikk.style.background = sats.farge;
    el.append(prikk, `${sats.navn} ${sats.tekst}`);
    if (best) {
      const s = document.createElement('small');
      s.textContent = t.flest;
      el.append(s);
    }
    return el;
  }

  function regnLenke(butikk, kort = false) {
    const a = document.createElement('a');
    a.className = 'pmx-regn';
    a.href = lenke(butikk);
    a.target = '_blank';
    a.rel = 'noreferrer';
    a.textContent = kort ? tekster(butikk).regnKort : tekster(butikk).regn;
    return a;
  }

  function pMerke() {
    const p = document.createElement('span');
    p.className = 'pmx-p';
    p.setAttribute('aria-hidden', 'true');
    p.textContent = 'P';
    return p;
  }

  const funnet = new Map();

  function visStripe() {
    if (funnet.size === 0 || sessionStorage.getItem('pmx-skjul')) return;
    let stripe = document.getElementById('pmx-stripe');
    if (!stripe) {
      const forste = funnet.values().next().value;
      const t = tekster(forste);
      stripe = document.createElement('div');
      stripe.id = 'pmx-stripe';
      if (morkt) stripe.classList.add('pmx-morkt');
      const merke = document.createElement('a');
      merke.className = 'pmx-merke';
      merke.href = 'https://pointmaxing.no/';
      merke.target = '_blank';
      merke.rel = 'noreferrer';
      merke.append(pMerke(), 'Pointmaxing');
      const boks = document.createElement('div');
      boks.className = 'pmx-butikker';
      const lukk = document.createElement('button');
      lukk.className = 'pmx-lukk';
      lukk.type = 'button';
      lukk.setAttribute('aria-label', t.lukk);
      lukk.textContent = '×';
      lukk.addEventListener('click', () => {
        sessionStorage.setItem('pmx-skjul', '1');
        stripe.remove();
      });
      stripe.append(merke, boks, regnLenke(forste), lukk);
      document.body.prepend(stripe);
    }
    const boks = stripe.querySelector('.pmx-butikker');
    boks.replaceChildren();
    for (const butikk of funnet.values()) {
      const t = tekster(butikk);
      const rad = document.createElement('span');
      rad.className = 'pmx-butikk';
      const navn = document.createElement('span');
      navn.className = 'pmx-navn';
      navn.textContent = butikk.navn;
      rad.append(navn);
      satser(butikk).forEach((s, i) => rad.append(satsElement(s, i === 0 && s.per100 != null, t)));
      boks.append(rad);
    }
  }

  /** Elementet linjen skal settes inn etter: utenfor alt Google har snudd med transform
   *  eller omvendt flex-rekkefølge, ellers rett etter lenken. */
  function innsettingspunkt(a) {
    let punkt = a;
    for (let el = a; el && el.parentElement && el.id !== 'search' && el.id !== 'rso'; el = el.parentElement) {
      const s = getComputedStyle(el);
      if (s.transform !== 'none' || s.flexDirection.endsWith('reverse')) punkt = el;
    }
    return punkt;
  }

  function merk() {
    for (const h3 of document.querySelectorAll('#search a h3, #rso a h3')) {
      const a = h3.closest('a');
      if (!a || a.dataset.pmx) continue;
      a.dataset.pmx = '1';
      const butikk = finnButikk(domeneFor(a.href));
      if (!butikk || funnet.has(butikk.id)) continue;
      funnet.set(butikk.id, butikk);
      const t = tekster(butikk);
      const linje = document.createElement('div');
      linje.className = `pmx-linje${morkt ? ' pmx-morkt' : ''}`;
      linje.append(pMerke());
      satser(butikk).forEach((s, i) => linje.append(satsElement(s, i === 0 && s.per100 != null, t)));
      linje.append(regnLenke(butikk, true));
      innsettingspunkt(a).after(linje);
    }
    visStripe();
  }

  merk();
  let venter = null;
  new MutationObserver(() => {
    clearTimeout(venter);
    venter = setTimeout(merk, 400);
  }).observe(document.body, { childList: true, subtree: true });
})();
