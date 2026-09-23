# Chrome Web Store – oppføring

Lim inn i utviklerkonsollen (https://chrome.google.com/webstore/devconsole). Zip-en som lastes opp
er `dist/pointmaxing-utvidelse.zip` fra `npm run build`. Skjermbilder: 1280×800 PNG, se `docs/butikk/`.

## Butikkoppføring

**Navn:** Pointmaxing

**Kort beskrivelse (maks 132 tegn):**
Se hvor mange SAS EuroBonus-poeng nettbutikken gir via Trumf, Klarna og SAS Online Shopping – i Google-søk og i butikken.

**Detaljert beskrivelse:**
Pointmaxing viser hvor et kjøp gir flest SAS EuroBonus-poeng: Trumf Netthandel, Klarna eller SAS Online Shopping.

Utvidelsen gjør tre ting:
• I Google-søk: en stripe øverst og en linje under treffene som er butikker vi kjenner, med satsene side om side og den beste merket.
• I nettbutikken: et lite kort nede til høyre med satsene og «Åpne via …» til siden kjøpet må starte fra for å få poengene.
• Varsler: følg en butikk på pointmaxing.no, så sier utvidelsen fra når satsen går opp. Klarna-nivået ditt (Plus, Premium, Max) følger med automatisk, så tallene er dine.

Satsene hentes hver natt fra programmenes egne sider. Utvidelsen samler ikke inn noe om deg: ingen konto, ingen sporing, ingen analyse. Personvern: https://pointmaxing.no/personvern

Pointmaxing er ikke tilknyttet SAS, Trumf eller Klarna.

**Kategori:** Shopping
**Språk:** Norsk (bokmål)
**Nettsted:** https://pointmaxing.no
**Personvernerklæring:** https://pointmaxing.no/personvern
**Støtte:** kjetil.skarstein-hatlen@hotmail.no

## Personvern-fanen i konsollen

**Enkelt formål (single purpose):**
Viser hvor mange SAS EuroBonus-poeng nettbutikken brukeren ser på gir via Trumf, Klarna og SAS Online Shopping, og varsler når satsen for fulgte butikker går opp.

**Begrunnelse for tillatelser:**
- `tabs`: leser adressen til den aktive fanen lokalt for å kjenne igjen nettbutikken og vise poengene på ikonet.
- `storage`: lagrer satslisten, brukerens Klarna-nivå og fulgte butikker lokalt.
- `alarms`: henter satsene på nytt én gang i døgnet.
- `notifications`: varsler når satsen hos en fulgt butikk går opp. Lages lokalt.
- Vertstillatelse `pointmaxing.no`: henter satsfilen (api/butikker.json, api/ukens.json) og leser brukerens valg gjort på nettsiden (localStorage) så utvidelsen bruker samme oppsett.
- Innholdsscript på Google-søk (google.com/.no/.se/.dk): leser hvilke domener treffene peker til og legger inn satsene. Leser ikke søkefeltet eller annet innhold.
- Innholdsscript på nettbutikkene i manifestet: viser kortet med satsene på domener vi har satser for. Leser ikke skjemaer eller sideinnhold.

**Bruk av fjernkode:** Nei. All kode ligger i pakken; kun data (JSON) hentes.

**Datainnsamling:** Ingen. Kryss av for «samler ikke inn brukerdata».

## English (for reviewers)

Pointmaxing shows how many SAS EuroBonus points an online store earns you via Trumf, Klarna or SAS Online Shopping – on Google search results, on the store's own site, and as a badge on the icon. Follow a store on pointmaxing.no to get a notification when its rate goes up. No account, no tracking, no analytics: the extension only fetches a public JSON file of rates once a day and keeps your settings locally. Privacy policy: https://pointmaxing.no/personvern
