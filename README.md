# Pointmaxing

Kalkulator som viser hvor mange SAS EuroBonus-poeng et kjøp gir via Trumf Netthandel, Klarna og SAS Online Shopping, og hvilket program som lønner seg. Landvalg: Norge, Sverige og Danmark (Trumf bare i Norge; programmer, satser og butikker ligger per land i datafilene). Brukeren skriver inn kjøpesum og butikkens sats i hvert program, velger betalingskort og Klarna-abonnement, og får en rangert sammenligning.

## Kjøre

```bash
npm install
npm run dev
```

`npm test` kjører regnetestene, `npm run build` bygger til `dist/`.

`npm run hent` henter butikksatser på nytt fra Trumf Netthandel (paginert liste), SAS Online Shopping (JSON-API) og Klarna (katalog-API-et bak klarna.com/no/store/?type=CASHBACK) og skriver `src/data/stores.json`. `npm run build:enkeltfil` pakker bygget til én HTML-fil (`dist/pointmaxing.html`).

## Struktur

- `src/data/programs.json` og `src/data/cards.json` – alle satser, vilkår, kilder og «sist verifisert». Ingen satser i koden.
- `src/data/stores.json` (generert av `npm run hent`) og `src/data/partners.json` (håndholdte partnere, tom nå) – butikksatser og logoer, slått sammen i `src/data/index.ts`.
- `src/data/index.ts` – eneste stedet som leser datafilene. Bytt ut denne for API/database.
- `src/lib/calc.ts` – ren regnemodul (testet i `calc.test.ts`).
- `src/components/` – skjema og resultatvisning.
- `docs/research.md` – researchen satsene bygger på.

## Butikksider, historikk og språk

- `npm run build` lager i tillegg én statisk side per butikk (`dist/no/kicks/index.html` osv.), landsider, `404.html`, `sitemap.xml` og `robots.txt` via `scripts/bygg-butikksider.mjs`. Adressen `/se/kicks` åpner Kicks i Sverige direkte.
- `src/data/history.json` fylles av `npm run hent` med `[dato, sats]` hver gang en sats endrer seg; kalkulatoren viser en liten kurve og «høyeste sats siden …» per program når en butikk er valgt.
- Språk og tallformat følger flagget (norsk, svensk, dansk). Tekstene ligger i `src/i18n.ts`; svenske og danske programtekster ligger i `programs.json`.
- Poengverdi (øre per poeng) kan justeres i kalkulatoren og gir «≈ kr» ved siden av poengene.

## Sider, varsler og utvidelse

- Sider per land: `/no` (kalkulator), `/no/kicks` (butikk), `/no/butikker` og `/no/butikker/elektronikk` (katalog med kategori), `/no/nytt` (kampanjer og satsendringer siste 30 dager) og `/no/kort` (kort som gir EuroBonus). Alle lages statisk av `scripts/bygg-butikksider.mjs`.
- Kategorier og butikkdomener hentes av `npm run hent` (Trumf-kategorisider, SAS-kategorier, Klarnas `category` og `merchantUrl`). Kategorinavn ligger i `src/data/kategorier.json`.
- Varsler: «Følg butikk» sender e-postadressen til Buttondown med butikken som tag. Sett `brukernavn` i `src/data/varsler.json` for å vise knappen, og legg API-nøkkelen som GitHub-secret `BUTTONDOWN_API_KEY`; `scripts/send-varsler.mjs` sender e-post hver natt til dem som følger butikker med ny sats.
- Nettleserutvidelse (Chrome, Manifest V3) ligger i `extension/`. Den henter `https://pointmaxing.no/api/butikker.json` daglig og viser beste poeng per 100 kr som merke på ikonet når du er inne på en kjent butikk. Last inn via chrome://extensions → Utviklermodus → «Last inn upakket».
