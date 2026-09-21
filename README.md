# Poengtjeneren

Kalkulator som viser hvor mange SAS EuroBonus-poeng et kjøp gir via Trumf Netthandel, Klarna, SAS Online Shopping og EuroBonus Everyday, og hvilket program som lønner seg. Landvalg: Norge, Sverige og Danmark (Trumf bare i Norge; programmer, satser og butikker ligger per land i datafilene). Brukeren skriver inn kjøpesum og butikkens sats i hvert program, velger betalingskort og Klarna-abonnement, og får en rangert sammenligning.

## Kjøre

```bash
npm install
npm run dev
```

`npm test` kjører regnetestene, `npm run build` bygger til `dist/`.

`npm run hent` henter butikksatser på nytt fra Trumf Netthandel (paginert liste), SAS Online Shopping (JSON-API) og Klarna (katalog-API-et bak klarna.com/no/store/?type=CASHBACK) og skriver `src/data/stores.json`. `npm run build:enkeltfil` pakker bygget til én HTML-fil (`dist/poengtjeneren.html`).

## Struktur

- `src/data/programs.json` og `src/data/cards.json` – alle satser, vilkår, kilder og «sist verifisert». Ingen satser i koden.
- `src/data/stores.json` (generert av `npm run hent`) og `src/data/partners.json` (håndholdt, f.eks. Wolt i EuroBonus Everyday) – butikksatser og logoer, slått sammen i `src/data/index.ts`.
- `src/data/index.ts` – eneste stedet som leser datafilene. Bytt ut denne for API/database.
- `src/lib/calc.ts` – ren regnemodul (testet i `calc.test.ts`).
- `src/components/` – skjema og resultatvisning.
- `docs/research.md` – researchen satsene bygger på.
