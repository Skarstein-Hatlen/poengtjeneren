// Viser programmene og poengene for butikken i den aktive fanen, regnet med brukerens nivå.

const escape = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

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
    el.innerHTML = `<p class="tom">Ingen poengavtale funnet for denne siden.</p><a class="knapp" href="https://pointmaxing.no/" target="_blank" rel="noreferrer">Åpne Pointmaxing →</a>`;
    return;
  }

  const rader = PMX.rader(butikk, programmer, oppsett);
  const beste = rader[0]?.per100 ?? null;
  // Programmer med nivåer (Klarna) kan endres her; valget på nettsiden vinner neste gang du er innom.
  const medNiva = Object.keys(butikk.satser)
    .map((id) => programmer[id])
    .filter((p) => p?.nivaer?.length);

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
    <a class="knapp" href="https://pointmaxing.no/${butikk.sti}/${butikk.id}" target="_blank" rel="noreferrer">Regn ut kjøpet →</a>
    <p class="fot">Trumf med automatisk overføring. Satser hentet ${escape(hentet ?? '')}.</p>`;

  for (const sel of el.querySelectorAll('select[data-program]')) {
    sel.addEventListener('change', async () => {
      const nytt = { ...oppsett, niva: { ...(oppsett.niva ?? {}), [sel.dataset.program]: sel.value } };
      await new Promise((r) => chrome.runtime.sendMessage({ type: 'oppsett', oppsett: nytt }, r));
      vis();
    });
  }
}

vis();
