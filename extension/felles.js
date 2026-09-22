// Delt av bakgrunn, popup og innholdsscriptene: henting fra pointmaxing.no, oppslag på
// domene og poengregning med brukerens Klarna-nivå (synkronisert fra nettsiden).

// eslint-disable-next-line no-unused-vars
const PMX = (() => {
  const KILDER = ['https://pointmaxing.no/api/butikker.json', 'http://pointmaxing.no/api/butikker.json'];
  const LAND_STI = { NO: 'no', SE: 'se', DK: 'dk' };
  const EN_DAG = 24 * 60 * 60 * 1000;

  /** Henter butikklisten og programmene og lagrer dem. */
  async function hent() {
    for (const kilde of KILDER) {
      try {
        const svar = await fetch(kilde, { cache: 'no-store' });
        if (!svar.ok) continue;
        const data = await svar.json();
        // Domene → butikk. Norge først, så svensk og dansk – samme butikk kan finnes i flere land.
        const perDomene = {};
        for (const [land, butikker] of Object.entries(data.land)) {
          for (const b of butikker) {
            if (!b.domene || perDomene[b.domene]) continue;
            perDomene[b.domene] = { land, sti: LAND_STI[land], id: b.id, navn: b.navn, satser: b.satser };
          }
        }
        const programmer = data.programmer ?? {};
        for (const [id, p] of Object.entries(programmer)) p.id ??= id;
        await chrome.storage.local.set({ perDomene, programmer, hentet: data.hentet, oppdatert: Date.now() });
        return { perDomene, programmer, hentet: data.hentet };
      } catch {
        /* prøv neste kilde */
      }
    }
    return null;
  }

  /** Lagrede data og brukerens oppsett; hentes på nytt hvis de mangler eller er over et døgn gamle. */
  async function data() {
    const lagret = await chrome.storage.local.get(['perDomene', 'programmer', 'hentet', 'oppdatert', 'oppsett']);
    const fersk = lagret.perDomene && lagret.programmer && lagret.oppdatert && Date.now() - lagret.oppdatert < EN_DAG;
    const d = fersk ? lagret : ((await hent()) ?? lagret);
    return { perDomene: d.perDomene ?? null, programmer: d.programmer ?? {}, hentet: d.hentet ?? null, oppsett: lagret.oppsett ?? {} };
  }

  function domeneFor(url) {
    try {
      return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
    } catch {
      return null;
    }
  }

  /** Finner butikken for et domene, også for underdomener (shop.kicks.no → kicks.no). */
  function finnButikk(perDomene, domene) {
    if (!domene || !perDomene) return null;
    const deler = domene.split('.');
    for (let i = 0; i < deler.length - 1; i++) {
      const b = perDomene[deler.slice(i).join('.')];
      if (b) return b;
    }
    return null;
  }

  /** Nivået som gjelder for et program: brukerens valg, ellers programmets standard. */
  function niva(program, oppsett) {
    if (!program?.nivaer?.length) return null;
    const valgt = oppsett?.niva?.[program.id];
    return program.nivaer.find((n) => n.id === valgt) ?? program.nivaer.find((n) => n.id === program.standardNiva) ?? program.nivaer[0];
  }

  /** EuroBonus-poeng per 100 kr for en butikksats med brukerens nivå. null = kan ikke veksles. */
  function per100(program, sats, oppsett) {
    if (!program || sats?.verdi == null) return sats?.per100 ?? null;
    if (program.satsEnhet !== 'prosent') return sats.verdi;
    if (program.poengPerKrone == null) return null;
    const n = niva(program, oppsett);
    if (n && !n.kanVeksle) return null;
    const effektiv = n ? sats.verdi * n.butikkFaktor + n.ekstraProsent : sats.verdi;
    return Math.round(effektiv * program.poengPerKrone * 10) / 10;
  }

  const tall = (x) => String(Math.round(x * 10) / 10).replace('.', ',');

  /** Satsen slik nettsiden viser den: «13,5 %» ferdig regnet med nivået, «50 p/100 kr» for SAS. */
  function satsTekst(program, sats, oppsett) {
    if (!program || sats?.verdi == null) return sats?.tekst ?? '';
    if (program.satsEnhet !== 'prosent') return `${tall(sats.verdi)} p/100 kr`;
    const n = niva(program, oppsett);
    const effektiv = n && n.kanVeksle ? sats.verdi * n.butikkFaktor + n.ekstraProsent : sats.verdi;
    return `${tall(effektiv)} %`;
  }

  /** «Klarna Max» – programnavn med nivå når det gjelder. */
  function navn(program, id, oppsett) {
    if (!program) return id;
    const n = niva(program, oppsett);
    return n && n.kanVeksle ? `${program.navn} ${n.navn}` : program.navn;
  }

  /** Radene for en butikk – navn, farge, sats og poeng per 100 kr – best først. */
  function rader(butikk, programmer, oppsett) {
    return Object.entries(butikk.satser)
      .map(([id, s]) => {
        const p = programmer?.[id];
        return { id, navn: navn(p, id, oppsett), farge: p?.farge ?? '#888', tekst: satsTekst(p, s, oppsett), per100: per100(p, s, oppsett) };
      })
      .sort((a, b) => (b.per100 ?? -1) - (a.per100 ?? -1));
  }

  return { hent, data, domeneFor, finnButikk, niva, per100, satsTekst, navn, rader, tall };
})();
