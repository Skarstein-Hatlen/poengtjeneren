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
- Besøkstall: sett `cloudflareToken` i `src/data/analyse.json` (Cloudflare Web Analytics, gratis, uten informasjonskapsler), så legger `main.tsx` inn beacon-scriptet i produksjon og personvernsiden nevner det. Tomt token = ingen måling.
- Kortvelgeren ytterst i sideraden (`Kortvelger.tsx`) bytter kort og Klarna-nivå fra alle sider; kortbildene er utstedernes egen kortkunst hentet av `npm run kortbilder` (`scripts/hent-kortbilder.mjs` → `public/kort/`, oppslag i `src/data/kortbilder.json`); kort uten bilde får et monogram.
- Layout: «Legg til i Chrome» er en diskret knapp øverst ved flaggene (skjult på mobil), stjernen for å følge butikk står ved butikksøket, alt om tallene (merknader, forbehold, kilder, signatur) ligger bak «Om tallene» i bunnen, og under 560 px vises programmene som rader i billetten i stedet for kolonner.
- PWA: `public/manifest.webmanifest` og `public/sw.js` (registreres bare i produksjon) gjør at siden kan legges på hjemskjermen og virker uten nett når den først er åpnet; `share_target` lar deg dele en butikklenke eller tekst til appen fra andre apper (`?url=`/`?tekst=` finner butikken på domene eller navn).
- `/personvern` (nettside + utvidelse, med engelsk oppsummering) og `/utvidelse` (hva utvidelsen gjør, «Legg til i Chrome» når `chromeWebStoreUrl` i `src/data/utvidelse.json` er satt, ellers zip-nedlasting med trinn). `npm run build` pakker `dist/pointmaxing-utvidelse.zip` og `-firefox.zip` (`scripts/pakk-utvidelse.mjs`). Oppføringstekst og tillatelsesbegrunnelser til Chrome Web Store ligger i `extension/BUTIKK.md`, skjermbilder i `docs/butikk/`.
- Nivåpoeng: SAS Online Shopping gir 20 nivåpoeng per 100 bonuspoeng til 30.12.2026 (`nivaapoeng` i programs.json, NO og DK verifisert), SAS Amex Elite 6 per 100 kr og SAS Mastercard Premium 25 % av kortpoengene (`nivaapoengPer100`/`nivaapoengAndel` i cards.json). Vises som «+ N nivåpoeng» under poengene.
- Kort-siden: samme tre tall for alle kort og Klarna-medlemskap – poeng per 100 kr, pris per måned (`prisPerMnd`, basispris uten kampanjer; kort som prises per år er delt på tolv, `prisPerMndFra` for varslede endringer) og øre per poeng ved feltet «Kortbruk per år» (pris × 12 ÷ poeng per år, `tak` for opptjeningstak). Ingen velkomstbonuser eller merknader vises. `scripts/sjekk-kort.mjs` (`sjekk-kort.yml`, hver dag 05:30 UTC) henter utstedernes sider og ser at `sjekk`-tekstene i `cards.json` og Klarnas medlemskapspriser fortsatt står der – avvik blir et issue med etiketten «kortsjekk».
- Kampanjer som ikke er butikksatser: `scripts/hent-kampanjer.mjs` (daglig) leser offisielle sider – Klarnas katalog-API (`campaignLabel`/`campaignUrl` per butikk), Klarnas medlemskapssider (EuroBonus-bonus for nye medlemmer), Talkmore og Fjordkraft (Trumf-velkomstgave) og Amex' kortsider (`offerHeader` med velkomstpoeng) – og skriver `src/data/kampanjer.json` med sitert tekst, beløp, eventuell sluttdato og lenke. Vises som «Andre kampanjer» øverst på Nytt; kroner i Trumf-bonus vises omregnet til poeng. Butikkampanjer med sluttdato kommer fortsatt bare fra SAS Online Shopping (Trumf og Klarna merker dem ikke – økninger vises under «Gikk opp»).
- Klarnas vekslingskurs til EuroBonus står på medlemskapssidene (klarna.com/no/medlemskap/plus/, /se/, /dk/): `scripts/hent-klarna-kurs.mjs` henter «12,31 SAS EuroBonus-poeng per 100 cashback-poeng» daglig og skriver den inn i `programs.json` (Danmark: 17,75). Under listen ligger «Hverdag» (`src/data/hverdag.json`): dagligvare, strøm og mobil via Trumf, med feltet «Mat per måned» og valgt kort lagt oppå.
- Følg butikk uten e-post: stjernen på en butikk lagres i nettleseren (`pointmaxing.folger`) og vises som «Dine butikker» øverst på Nytt. Utvidelsen leser samme liste og varsler når satsen går opp. Hver butikk har en Atom-strøm (`/no/kicks/feed.xml`) med satsendringer, og hvert land har `/no/feed.xml`. `/no/ukens` er ukens beste: flest poeng nå, økninger siste 7 dager og kampanjer som utløper (også i `api/ukens.json` til utvidelsen).
- `/klarna` er partnersiden til Klarna (norske tall, `noindex`, ikke i sitemap): Max-effekten i hver butikk, kortsiden og utvidelsen i Google-søk.
- Nettleserutvidelse (Chrome, Manifest V3) ligger i `extension/`. Den henter `https://pointmaxing.no/api/butikker.json` daglig og viser beste poeng per 100 kr som merke på ikonet når du er inne på en kjent butikk, og legger en stripe øverst på Google-søk med Trumf, Klarna og SAS side om side for butikkene i treffene (lys og mørk drakt følger Google). Klarna-nivået og butikkene du følger på pointmaxing.no synkroniseres til utvidelsen (`synk.js` leser nettsidens localStorage); nivået kan også byttes i popupen. På nettbutikker vi har satser for viser `butikk.js` et lite kort nede til høyre med programmene og «Åpne via …» til siden kjøpet må starte fra – domenene skrives inn i manifestet av `npm run utvidelse` (kjøres også av den daglige jobben). Den daglige hentingen i utvidelsen sammenligner satsene for fulgte butikker og gir Chrome-varsel når en går opp. `manifest.firefox.json` er samme utvidelse for Firefox (bakgrunnsscript i stedet for service worker) – ikke testet. Last inn via chrome://extensions → Utviklermodus → «Last inn upakket».
