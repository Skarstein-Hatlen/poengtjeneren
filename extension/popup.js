// Viser programmene og poengene for butikken i den aktive fanen, regnet med brukerens nivå.
// Utenfor kjente butikker: ukens beste fra pointmaxing.no.

const escape = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const LAND_STI = { NO: 'no', SE: 'se', DK: 'dk' };

/** Ukens beste (topp 3) – hentes én gang i døgnet. */
async function ukens() {
  const { ukens: lagret, ukensHentet } = await chrome.storage.local.get(['ukens', 'ukensHentet']);
  if (lagret && ukensHentet && Date.now() - ukensHentet < 24 * 60 * 60 * 1000) return lagret;
  for (const kilde of ['https://pointmaxing.no/api/ukens.json', 'http://pointmaxing.no/api/ukens.json']) {
    try {
      const svar = await fetch(kilde, { cache: 'no-store' });
      if (!svar.ok) continue;
      const data = await svar.json();
      await chrome.storage.local.set({ ukens: data, ukensHentet: Date.now() });
      return data;
    } catch {
      /* prøv neste */
    }
  }
  return lagret ?? null;
}

async function vis() {
  const el = document.getElementById('innhold');
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const { perDomene, programmer, hentet, oppsett } = await PMX.data();

  if (!perDomene) {
    el.innerHTML = `<p class="tom">Fikk ikke hentet butikklisten fra pointmaxing.no. Prøv igjen om litt.</p>`;
    return;
  }
  const butikk = PMX.finnButikk(perDomene, PMX.domeneFor(tab?.url));
  if (!butikk) {
    const u = await ukens();
    const topp = u?.land?.NO?.topp?.slice(0, 3) ?? [];
    el.innerHTML = `<p class="tom">Ingen poengavtale funnet for denne siden.</p>${
      topp.length
        ? `<h2 class="etikett">Ukens beste</h2><ul>${topp
            .map((r) => `<li><span><a class="stille" href="https://pointmaxing.no/${escape(r.sti)}/${escape(r.id)}" target="_blank" rel="noreferrer">${escape(r.navn)}</a> <span class="sats">${escape(r.program)} ${escape(r.sats)}</span></span><span class="poeng">${PMX.tall(r.per100)} p/100 kr</span></li>`)
            .join('')}</ul>`
        : ''
    }<a class="knapp" href="https://pointmaxing.no/${topp.length ? 'no/ukens' : ''}" target="_blank" rel="noreferrer">${topp.length ? 'Se hele ukens beste →' : 'Åpne Pointmaxing →'}</a>`;
    return;
  }

  const rader = PMX.rader(butikk, programmer, oppsett);
  const beste = rader[0]?.per100 ?? null;
  const medNiva = Object.keys(butikk.satser)
    .map((id) => programmer[id])
    .filter((p) => p?.nivaer?.length);
  const { folgerEkstra = {} } = await chrome.storage.local.get('folgerEkstra');
  const folger = (oppsett.folger?.[butikk.land] ?? []).includes(butikk.id) || (folgerEkstra[butikk.land] ?? []).includes(butikk.id);

  el.innerHTML = `
    <h1>${escape(butikk.navn)}</h1>
    <ul>${rader
      .map(
        (r) =>
          `<li class="${r.per100 !== null && r.per100 === beste ? 'best' : ''}"><span><i style="background:${escape(r.farge)}"></i>${escape(r.navn)} <span class="sats">${escape(r.tekst)}</span></span><span class="poeng">${r.per100 === null ? '–' : `${PMX.tall(r.per100)} p/100 kr`}</span></li>`,
      )
      .join('')}</ul>
    ${medNiva
      .map(
        (p) =>
          `<label class="niva"><span>${escape(p.navn)}</span><select data-program="${escape(p.id)}">${p.nivaer
            .map((n) => `<option value="${escape(n.id)}"${PMX.niva(p, oppsett)?.id === n.id ? ' selected' : ''}>${escape(n.navn)}</option>`)
            .join('')}</select></label>`,
      )
      .join('')}
    <p class="rad-knapper">
      <a class="knapp" href="https://pointmaxing.no/${butikk.sti}/${butikk.id}" target="_blank" rel="noreferrer">Regn ut kjøpet →</a>
      <button type="button" class="folg${folger ? ' aktiv' : ''}" aria-pressed="${folger}">${folger ? '★ Følger' : '☆ Følg'}</button>
    </p>
    <p class="fot">${folger ? 'Du får varsel når satsen går opp. ' : ''}Trumf med automatisk overføring. Satser hentet ${escape(hentet ?? '')}.</p>`;

  for (const sel of el.querySelectorAll('select[data-program]')) {
    sel.addEventListener('change', async () => {
      const nytt = { ...oppsett, niva: { ...(oppsett.niva ?? {}), [sel.dataset.program]: sel.value } };
      await new Promise((r) => chrome.runtime.sendMessage({ type: 'oppsett', oppsett: nytt }, r));
      vis();
    });
  }
  el.querySelector('.folg').addEventListener('click', async () => {
    // Følging fra popupen lagres i utvidelsen; listen fra nettsiden kommer i tillegg.
    const liste = folgerEkstra[butikk.land] ?? [];
    const ny = { ...folgerEkstra, [butikk.land]: folger ? liste.filter((x) => x !== butikk.id) : [...new Set([...liste, butikk.id])] };
    await chrome.storage.local.set({ folgerEkstra: ny });
    vis();
  });
}

vis();
