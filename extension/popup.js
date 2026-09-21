// Viser programmene og poengene for butikken i den aktive fanen.

const PROGRAMNAVN = {
  trumf: 'Trumf',
  klarna: 'Klarna',
  'sas-online-shopping': 'SAS Shopping',
  'klarna-se': 'Klarna',
  'sas-online-shopping-se': 'SAS Shopping',
  'klarna-dk': 'Klarna',
  'sas-online-shopping-dk': 'SAS Shopping',
};

function domeneFor(url) {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
}

function finnButikk(perDomene, domene) {
  if (!domene || !perDomene) return null;
  const deler = domene.split('.');
  for (let i = 0; i < deler.length - 1; i++) {
    const kandidat = deler.slice(i).join('.');
    if (perDomene[kandidat]) return perDomene[kandidat];
  }
  return null;
}

const escape = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

async function hentDirekte() {
  for (const kilde of ['https://pointmaxing.no/api/butikker.json', 'http://pointmaxing.no/api/butikker.json']) {
    try {
      const svar = await fetch(kilde, { cache: 'no-store' });
      if (!svar.ok) continue;
      const data = await svar.json();
      const perDomene = {};
      const sti = { NO: 'no', SE: 'se', DK: 'dk' };
      for (const [land, butikker] of Object.entries(data.land)) {
        for (const b of butikker) if (b.domene && !perDomene[b.domene]) perDomene[b.domene] = { land, sti: sti[land], id: b.id, navn: b.navn, satser: b.satser };
      }
      await chrome.storage.local.set({ perDomene, hentet: data.hentet, oppdatert: Date.now() });
      return { perDomene, hentet: data.hentet };
    } catch {
      /* prøv neste */
    }
  }
  return {};
}

async function vis() {
  const el = document.getElementById('innhold');
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  let { perDomene, hentet } = await chrome.storage.local.get(['perDomene', 'hentet']);
  if (!perDomene) ({ perDomene, hentet } = await hentDirekte());
  const butikk = finnButikk(perDomene, domeneFor(tab?.url));

  if (!perDomene) {
    el.innerHTML = `<p class="tom">Fikk ikke hentet butikklisten fra pointmaxing.no. Prøv igjen om litt.</p>`;
    return;
  }
  if (!butikk) {
    el.innerHTML = `<p class="tom">Ingen poengavtale funnet for denne siden.</p><a class="knapp" href="https://pointmaxing.no/" target="_blank" rel="noreferrer">Åpne Pointmaxing →</a>`;
    return;
  }

  const rader = Object.entries(butikk.satser)
    .map(([id, s]) => ({ navn: PROGRAMNAVN[id] ?? id, tekst: s.tekst, per100: s.per100 }))
    .sort((a, b) => (b.per100 ?? -1) - (a.per100 ?? -1));
  const beste = rader[0]?.per100 ?? null;

  el.innerHTML = `
    <h1>${escape(butikk.navn)}</h1>
    <ul>${rader
      .map(
        (r) =>
          `<li class="${r.per100 !== null && r.per100 === beste ? 'best' : ''}"><span>${escape(r.navn)} <span class="sats">${escape(r.tekst)}</span></span><span class="poeng">${r.per100 === null ? '–' : `${String(r.per100).replace('.', ',')} p/100 kr`}</span></li>`,
      )
      .join('')}</ul>
    <a class="knapp" href="https://pointmaxing.no/${butikk.sti}/${butikk.id}" target="_blank" rel="noreferrer">Regn ut kjøpet →</a>
    <p class="fot">Klarna med Max, Trumf med automatisk overføring. Satser hentet ${escape(hentet ?? '')}.</p>`;
}

vis();
