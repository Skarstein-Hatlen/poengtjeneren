# Research: bonusprogrammer → SAS EuroBonus

**Dato for research:** 21.09.2026 (alle kilder hentet denne dagen hvis ikke annet er oppgitt)
**Status:** Til godkjenning før koding

Merking i dokumentet:
- **VERIFISERT** = tall lest direkte fra offisiell kilde (programmets egne sider)
- **UVERIFISERT** = ikke funnet i offisiell kilde, eller kildene spriker. Skal merkes tydelig i UI.
- **KAMPANJE** = sats som var merket som midlertidig da den ble lest

---

## 0. Kortversjon

| Program | Hva du tjener | Til EuroBonus | Status |
|---|---|---|---|
| Trumf / Trumf Netthandel | Trumf-bonus i kroner (% av kjøp) | **13,5 poeng per kr** (automatisk overføring) / **10 poeng per kr** (engangsoverføring) | VERIFISERT |
| Klarna Plus / Premium / Max | Cashback i kroner (butikk-% i appen + 0,5 / 1 / 1,5 % medlemscashback) | Veksles i appen. Sats **ikke publisert** av Klarna; observert ca. **12,07–12,2 poeng per cashback-krone** (sept. 2026) | UVERIFISERT (variabel) |
| SAS Online Shopping | EuroBonus-poeng direkte, «X poeng per 100 kr» per butikk | Ingen veksling nødvendig | VERIFISERT (satser lest 21.09.2026, flere merket kampanje) |

**Din antakelse stemmer:** 1 Trumf-krone = 13,5 EuroBonus-poeng – men bare ved *automatisk* overføring. Engangsoverføring gir 10. Trumf Netthandel 7 % → 7 kr → 94,5 poeng (auto) eller 70 poeng (engangs).

**Kicks, 1 000 kr (regneeksempel):**

| Program | Opptjening | EuroBonus-poeng | Per 100 kr |
|---|---|---|---|
| Trumf Netthandel (6,2 %) + auto-overføring | 62 kr Trumf | **837** | 83,7 |
| Trumf Netthandel (6,2 %) + engangsoverføring | 62 kr Trumf | 620 | 62,0 |
| Klarna Max (3 % butikk + 1,5 % medlem = 4,5 %) | 45 kr cashback | ca. 543 (à 12,07) | ca. 54,3 (UVERIFISERT sats) |
| SAS Online Shopping | 50 poeng/100 kr | **500** | 50 |
| Klarna Premium (3 % + 1 % = 4 %) | 40 kr cashback | ca. 483 | ca. 48,3 (UVERIFISERT) |
| Klarna Plus (3 % + 0,5 % = 3,5 %) | 35 kr cashback | ca. 422 | ca. 42,2 (UVERIFISERT) |

Uten kort. Kortlag kommer i tillegg der betaling skjer med eget kort (se del 5).

---

## 1. SAS EuroBonus – grunnlag

- To poengtyper: **Bonuspoeng** (kan brukes) og **Nivåpoeng** (teller til status, kan ikke brukes). Alt i dette dokumentet gjelder Bonuspoeng hvis ikke annet står. Kilde: SAS Online Shopping, «Nivåpoeng»: «100 vanlige bonuspoeng gjennom shopping vil generere 20 ikke-innløsbare nivåpoeng» – https://onlineshopping.flysas.com/nb-NO/nivaapoeng (21.09.2026)
- SAS' egne partnersider (sas.no/eurobonus/partnere/…, sas.no/eurobonus/betalingskort/norge) blokkerte henting (HTTP 403). Kortsatsene under er derfor hentet fra utstedernes egne sider.

---

## 2. Trumf

### 2.1 Overføring Trumf → EuroBonus — VERIFISERT

Kilde: https://www.trumf.no/fordeler/sas-eurobonus og https://www.trumf.no/trumf-profil/bruk-bonus/eurobonus (21.09.2026)

| Punkt | Verdi |
|---|---|
| Automatisk overføring | «1 krone i Trumf-bonus gir 13,5 EuroBonus-poeng ved automatisk overføring» |
| Engangsoverføring | «1 kr i Trumf-bonus gir 10 EuroBonus-poeng» |
| Trinn for automatisk overføring | 50 kr, 100 kr eller 200 kr – overføres når saldoen når valgt beløp |
| Vilkår for å starte automatisk | «Trumf-bonusen din må være lavere enn 200 kr for at du kan starte automatisk overføring» |
| Gebyr | Ingen nevnt |
| Tid | Engangs: «poengene blir umiddelbart tilgjengelig». Auto: «overført … med en gang» når trinnet nås |
| Angre | «vil du ikke kunne overføre poengene tilbake til Trumf igjen» |
| Minstebeløp engangs | Ikke oppgitt på siden – UVERIFISERT |

**Modellering:** Trumf bør ha to «modus» i kalkulatoren: automatisk (13,5) som standard, engangs (10) som valg.

### 2.2 Trumf Netthandel (nettbutikk-portal) — VERIFISERT

Kilder: https://trumfnetthandel.no/ , https://trumfnetthandel.no/about , https://trumfnetthandel.no/faq , https://www.trumf.no/slik-sparer-du-trumf-bonus/bonus-med-trumf-netthandel (21.09.2026)

Slik fungerer det:
- «Klikk deg inn på nettbutikken fra Trumf Netthandel» – start med **tom handlekurv**, logget inn med Trumf.
- Bonus = **prosent av kjøpesum**, varierer per butikk. Noen butikker: «kun … på prisen, ekskludert mva» og «heller ikke Trumf-bonus på leveringskostnader» (FAQ). Grunnlag varierer altså per butikk → UVERIFISERT per butikk, anta inkl. mva/ekskl. frakt som standard og si det i UI.
- **Ikke bonus ved:** adblock, rabattkoder som ikke er listet hos Trumf Netthandel, gavekort (kjøp/innløsning), click & collect, retur/avbestilling, kjøp i butikkens **app** (står på Kicks-, Lyko- og Ellos-sidene), bruk av Prisjakt/Momondo o.l.
- Tid: synlig «innen 7 dager», bekreftet «vanligvis innen 90 dager», «Overført til Trumf» ca. 60 dager etter bekreftelse. Hotell: bekreftes 90 dager etter oppholdet.
- Tak: ikke nevnt.
- Kombinasjon med Trumf Kredittkort / andre kort: **ikke omtalt** i offisielle kilder – UVERIFISERT (se 5).

**Satser lest 21.09.2026** (kategorisidene /kategori/velvære, /mote, /elektronikk, /sport, /reise + butikksider). «Opptil» = varierer per varekategori.

| Butikk | Trumf-bonus | Kilde |
|---|---|---|
| Kicks | 6,2 % («Hele nettbutikken») | https://trumfnetthandel.no/cashback/kicks-trumf |
| Lyko | 6,2 % | https://trumfnetthandel.no/cashback/lyko-trumf |
| Ellos | 6,2 % | https://trumfnetthandel.no/cashback/ellos |
| Blivakker | 3,1 % | https://trumfnetthandel.no/cashback/blivakker-trumf |
| Lensway | 8,5 % | https://trumfnetthandel.no/cashback/lensway-trumf |
| Hotels.com | 4,6 % overnatting / 1,1 % leiebil | https://trumfnetthandel.no/cashback/trumfhotels-no |
| Adidas | 6,2 % | /kategori/sport |
| Stormberg | 6,2 % | /kategori/sport |
| Gymgrossisten | opptil 4,6 % | /kategori/sport |
| Outnorth | opptil 4,6 % | /kategori/sport |
| Løpeshop | 2,3 % | /kategori/sport |
| Gina Tricot | 6,2 % | /kategori/mote |
| Lindex | 9,3 % | /kategori/mote |
| Floyd | 4,6 % | /kategori/mote |
| Bubbleroom | 3,1 % | /kategori/mote |
| Polarn O. Pyret | 7,8 % | /kategori/mote |
| Helly Hansen | opptil 10,1 % | /kategori/mote |
| Apple | 4 % | /kategori/elektronikk |
| Proshop | opptil 3,7 % | /kategori/elektronikk |
| Elektroimportøren | 3,9 % | /kategori/elektronikk |
| CS Megastore | 1,5 % | /kategori/elektronikk |
| inkClub | 11,7 % | /kategori/elektronikk |
| Scandic Hotels | 3,1 % | /kategori/reise |
| Radisson Hotels | 7,8 % | /kategori/reise |
| Strawberry | 5,4 % | /kategori/reise |
| Avis / Budget | opptil 9,3 % | /kategori/reise |
| Expedia | opptil 3,1 % | /kategori/reise |

Ikke funnet på kategorisidene 21.09.2026: **Elkjøp, Zalando, Boozt, Power, XXL, H&M, Apotek 1, Booking.com** (kategorisidene viser 30 butikker hver; full liste krever innlogging/«vis flere»). Komplett har en butikkside (/cashback/komplett-trumf) men den viste ingen sats → UVERIFISERT.

### 2.3 Andre Trumf-kilder (relevant for kortlag og «fri kalkulator»)

Kilder: https://www.trumf.no/slik-sparer-du-trumf-bonus , https://www.trumf.no/trumf-pay , https://www.trumf.no/trumf-kredittkort/fordeler-med-trumf-kredittkort , https://www.trumf.no/trumf-kredittkort/priser-og-vilkar (21.09.2026)

| Kilde | Trumf-bonus | Status |
|---|---|---|
| Dagligvare (KIWI, MENY, SPAR, Joker, Nærbutikken, Jacob's, CC Mat) | 1 % grunnbonus; +1 % med Trumf Pay; Trippel-Trumf-torsdag 3 % (4 % med Trumf Pay, 5 % med Trumf Kredittkort i Trumf Pay) | VERIFISERT |
| Trumf Kredittkort (NorgesGruppen Finans, 0 kr årsavgift, valutapåslag 1,90 %) | 2 % på dagligvare i NorgesGruppen, 4 % på Trippel-Trumf-torsdag, 1 % hos Mester Grønn og Norli. **Generell sats på alle andre kjøp (f.eks. nettbutikker) er ikke oppgitt** på trumf.no | Dagligvare VERIFISERT; generell sats UVERIFISERT |
| Fjordkraft (strøm) | «1 % Trumf-bonus av strømregningen» | VERIFISERT |
| Talkmore (mobil) | «4 % Trumf-bonus av mobilregningen» | VERIFISERT |

---

## 3. Klarna (Plus, Premium, Max)

### 3.1 Medlemskap — VERIFISERT

Kilde: https://www.klarna.com/no/medlemskap/ (21.09.2026)

| Nivå | Pris | Cashback på Klarna-kjøp | Kort | Annet |
|---|---|---|---|---|
| Everywhere | 35 kr/mnd (første mnd gratis) | Ingen | Fysisk og virtuelt Visa-kort | Ingen veksling til reisepoeng nevnt |
| Plus | 99 kr/mnd (første mnd gratis) | «0,5 % cashback på alle Klarna-kjøp» | Plastkort | «Veksle cashback til flymil og hotellopphold» |
| Premium | 199 kr/mnd | «1 % cashback på hvert Klarna-kjøp» | Metallkort | Reiseforsikring, veksling til SAS m.fl. |
| Max | 499 kr/mnd | «1,5 % cashback på hvert Klarna-kjøp» | Metallkort | Lounge, utvidet reiseforsikring, veksling til SAS m.fl. |

- Kampanje ved lesing: «30 % rabatt i 3 måneder» på Premium og Max (KAMPANJE).
- Cashback utløper aldri for Premium/Max; 12 måneder for Everywhere/Plus.
- Eldre tredjepartsartikler (okt. 2025 – mars 2026) oppgir andre priser (Plus 79, Premium 179) og lavere cashback (Max 1 %). Offisiell side per 21.09.2026 gjelder.

### 3.2 Slik opptjenes cashback — VERIFISERT (med ett uavklart punkt)

Kilder: https://www.klarna.com/no/cashback/ og vilkår https://cdn.klarna.com/1.0/shared/content/legal/terms/nb-NO/cashback (gjeldende fra 07.08.2026) (21.09.2026)

- To kilder som **kan kombineres**: (a) butikk-cashback i Klarna-appen (% per butikk), (b) medlemscashback 0,5/1/1,5 % «på hvert kjøp, i tillegg til de vanlige cashback-tilbudene i appen».
- «Du må betale med Klarna for å få cashback.» Medlemscashback gjelder «hvilken som helst Klarna-betalingsmetode», ikke tredjepartskort.
- Enhet: «100 poeng for hver 1 kr kvalifisert cashback». Grunnlag: **ekskl. avgifter, frakt og andre kostnader**.
- Utbetaling/bekreftelse: innen 30 dager for medlemmer, 90 dager uten medlemskap («Klarna Rewards Day»).
- Tak: «maks 500 000 cashback-poeng per måned» fra kjøp (= 5 000 kr cashback/mnd).
- Unntak: fakturabetalinger, kontantuttak, krypto, gambling, renter/gebyrer.
- **UAVKLART:** siden sier «Bli Klarna-medlem og få opptil 4x så mye cashback i appen». Det er ikke oppgitt om butikk-prosentene under er for medlemmer eller ikke-medlemmer. → Butikk-% for medlemmer: UVERIFISERT. Anbefaling: bruk oppgitt % og merk det.

Butikk-cashback vist på klarna.com/no/cashback 21.09.2026:

| Butikk | Klarna app-cashback |
|---|---|
| Kicks.no | 3 % |
| Lyko | 3 % |
| Gina Tricot | 3 % |
| Floyd | 3 % |
| Stormberg | 3 % |
| Autodoc | 3 % |
| eBay | 3,5 % |
| Adidas | 2,5 % |
| Farmasiet | 2 % |
| Zooplus | 2 % |
| VetZoo | 2 % |
| CS Megastore | 1,5 % |

Full butikkliste finnes bare i appen. Elkjøp, Zalando, Boozt, Komplett osv.: ikke offentlig → UVERIFISERT.

### 3.3 Veksling cashback → EuroBonus — sats UVERIFISERT

Offisielt (https://www.klarna.com/no/medlemskap/unlock-sas-eurobonus-points/ , 21.09.2026):
- «Du kan konvertere din Klarna-cashback til lojalitetspoeng direkte i Klarna-appen. Den nøyaktige konverteringssatsen avhenger av ditt land og valuta» – **satsen publiseres ikke** utenfor appen.
- Vilkår: «Vi kan endre innløsningssatsen fra tid til annen». Krever aktivt medlemskap og eget EuroBonus-medlemskap. Behandles «umiddelbart, … opptil to dager». Kan ikke reverseres.
- Manuell veksling i appen, eller automatisk månedlig (tredjepartskilder; ikke funnet på offisiell side → UVERIFISERT).
- Minstebeløp/gebyr: ikke oppgitt.

Observerte satser (tredjepart, sprikende):

| Sats | Kilde | Dato |
|---|---|---|
| 100 cashback-poeng (1 kr) = **12,07** EuroBonus-poeng (lest i appen, Max) | https://penge.app/blog/klarna-max-eurobonus-points | 07.09.2026 |
| **12,2** poeng per cashback-krone (Plus 6,1 / Premium 12,2 / Max 18,3 poeng per 100 kr på medlemscashback alene) | https://sparelosen.no/fordel/eurobonus/kredittkort-eurobonus-opptjening/ | 12.09.2026 |
| 5,50 (Plus/Premium) og 11 (Max) per cashback-enhet, «sist oppdatert 13.11.2025, kan endres daglig» | https://eurobonusguiden.no/2025/11/klarna-og-eurobonus-vekslingskurs-lansert/ | 19.11.2025 |

**Anbefaling:** legg satsen i datafil som `12.07` med status UVERIFISERT + «sist observert 07.09.2026», og la brukeren overstyre den i UI.

### 3.4 Kombinasjon med betalingskort

- Betaler du Klarna-faktura med SAS Mastercard får du **ikke** kortpoeng: «EuroBonus-poeng opptjenes på selve transaksjonen som gjennomføres med SAS Mastercard, ikke på hva du betaler ned på Klarna-faktura.» Kilde: https://kortio.no/spor-eksperten/eurobonus-poeng-klarna-sas-mastercard/ (18.09.2026, tredjepart).
- Medlemscashback krever Klarna-betalingsmetode (offisielt). → I kalkulatoren: **kortlag = 0 for Klarna-programmene.**

### 3.5 Kampanjer (avsluttet – ikke legg i data)

Velkomstbonus 10 000/20 000 poeng (til 30.04.2026) og senere 15 000/30 000 poeng for Premium/Max ble stengt 07.09.2026. Kilder: https://www.kredittkort.nu/klarna-eurobonus-velkomstbonus-2026/ (17.09.2026), https://fordelskompasset.no/2026/06/03/fa-20-000-eurobonus-poeng-med-klarna-max-kampanje/ (08.09.2026).

### 3.6 Modellering

Behandle **Klarna Plus, Klarna Premium og Klarna Max som tre programmer** med samme butikkdata, ulik medlemssats (0,5 / 1 / 1,5 %) og ulik månedspris. Formel: `poeng = beløp × (butikk% + medlem%) × sats`. Vis medlemspris som info; ikke trekk den fra automatisk (kan være et valg senere). «Klarna uten medlemskap» kan ikke veksle → utelates.

---

## 4. SAS Online Shopping (SAS' egen portal) — VERIFISERT

Kilder: https://onlineshopping.flysas.com/nb-NO/ (satser, rendret i nettleser 21.09.2026), https://onlineshopping.flysas.com/nb-NO/vilkaar-og-betingelser , https://onlineshopping.flysas.com/nb-NO/nivaapoeng

- Gir EuroBonus Bonuspoeng direkte, oppgitt som «Tjen X poeng per 100 kr» eller fast beløp («Tjen 6 000 poeng» hos HelloFresh).
- Må være innlogget med EuroBonus-nummer; kjøp via portalens lenker med cookies på. Poeng kan trekkes tilbake ved retur. Gavekort gir ikke poeng i noen butikker.
- Kreditering: «tidligst 4 uker etter og senest 12 uker etter kjøpet».
- Kampanje: +20 % nivåpoeng på alle kjøp, 27.06.2025–30.12.2026 (KAMPANJE, påvirker ikke bonuspoeng).
- Beregningsgrunnlag (mva/frakt): ikke oppgitt → UVERIFISERT.
- Kortlag: betaling skjer i butikken med eget kort → kortpoeng kommer i tillegg.

Satser lest 21.09.2026 (merket «Doble poeng» / «Ekstra poeng» = KAMPANJE):

| Butikk | Poeng | Merknad |
|---|---|---|
| Kicks | 50 per 100 kr | i «Populære butikker», ingen kampanjemerke sett |
| Farmasiet | 50 per 100 kr | Doble poeng (KAMPANJE) |
| Lensway | 50 per 100 kr | Doble poeng (KAMPANJE) |
| Outnorth | 50 per 100 kr | Doble poeng (KAMPANJE) |
| InkClub | 50 per 100 kr | |
| Bubbleroom | 30 per 100 kr | Doble poeng (KAMPANJE) |
| Polarn O. Pyret | 75 per 100 kr | Ekstra poeng (KAMPANJE) |
| Ellos | 25 per 100 kr | |
| Lyko | 25 per 100 kr | |
| Gymgrossisten | 25 per 100 kr | |
| Løpeshop | 25 per 100 kr | |
| Komplett | 15 per 100 kr | |
| HelloFresh | 6 000 poeng fast | |
| CDON | 300 poeng fast | |

Butikksøk på portalen krever JavaScript; Elkjøp, Zalando, Boozt, Adidas m.fl. ikke sjekket.

---

## 5. Kortlag – betalingskort som gir EuroBonus

Alle satser = Bonuspoeng per 100 kr på vanlige kjøp i NOK.

| Kort | Poeng/100 kr | Pris | Tak / vilkår | Kilde (21.09.2026) | Status |
|---|---|---|---|---|---|
| SAS Amex Classic | 10 | 0 kr/mnd (**30 kr/mnd fra 01.11.2026**) | Companion Ticket ved 100 000 kr/år | https://www.americanexpress.com/nb-no/kredittkort/sas-classic/ | VERIFISERT |
| SAS Amex Premium | 15 | 150 kr/mnd | Velkomst 5 000 p (60 000 kr på 9 mnd); CT ved 150 000 kr | https://www.americanexpress.com/nb-no/kredittkort/sas-premium/ | VERIFISERT |
| SAS Amex Elite | 20 (+6 nivåpoeng) | 575 kr/mnd | Velkomst 15 000 p (90 000 kr på 9 mnd); 2 CT | https://www.americanexpress.com/nb-no/kredittkort/sas-elite/ | VERIFISERT |
| SAS EuroBonus World Mastercard (SEB Kort) | 10 (15 i utenlandsk valuta, 20 på sas.no) | 294 kr første år, deretter 588 kr/år | Poeng på maks 200 000 kr kortforbruk/år | https://saseurobonusmastercard.no/kortene/mastercard/ | VERIFISERT |
| SAS EuroBonus Mastercard Premium (SEB Kort) | 15 (20 utland, 25 sas.no) | 3 348 kr/år | Ubegrenset; nivåpoeng 25 % av mnd. bonuspoeng, min. 500 | https://saseurobonusmastercard.no/kortene/mastercard-premium/ | VERIFISERT |
| Lunar SAS EuroBonus (debet) | 8 (opptil 20 på sas.no, 100 på SAS Young) | 49 kr/mnd, inkl. i Unlimited | Velkomst 3 000 p; unntak: overføringer, regninger, kontanter | https://www.lunar.app/no/privat/sas-eurobonus | VERIFISERT |
| Trumf Kredittkort (via Trumf, auto 13,5) | Dagligvare: 2 % → 27 p; generell sats **ikke oppgitt** | 0 kr | – | https://www.trumf.no/trumf-kredittkort/fordeler-med-trumf-kredittkort | Generell sats UVERIFISERT |
| DNB Mastercard Upgrade | 10 (15 utland); Saga/PB 15 (20) | 59 kr/mnd (Saga/PB 169) | Tak 500 000 kr/år | Kun tredjepart: https://sparelosen.no/fordel/eurobonus/kredittkort-eurobonus-opptjening/ (12.09.2026). dnb.no-siden kunne ikke leses | UVERIFISERT |
| Amex Green/Gold/Platinum (Membership Rewards) | ca. 5 (20 MR = 1 EB) | 600–7 800 kr/år | – | Tredjepart: sparelosen (12.09.2026). Amex' egen MR-side ga omdirigeringsløkke | UVERIFISERT |
| Revolut (RevPoints → EuroBonus 1:1) | <1 – 10 avhengig av plan | 0–700 kr/mnd | Ingen minste overføring | Presse/tredjepart nov. 2025 (https://eurobonusguiden.no/2025/09/revolut-lanserer-samarbeid-med-sas-eurobonus/). revolut.com ga 403 | UVERIFISERT |

Kombinasjon:
- Trumf Netthandel og SAS Online Shopping: betaling med eget kort → **program + kort** (ingen offisiell kilde sier noe annet; Trumf Kredittkort-stacking ikke omtalt).
- Klarna: kortlag = 0 (se 3.4).

---

## 6. Andre programmer som gir / kan veksles til EuroBonus (kandidater – du velger)

| Program | Hva | Sats | Kilde | Status |
|---|---|---|---|---|
| **Scandic Friends** | Overføring begge veier | 2 Scandic-poeng = 1 EuroBonus-poeng; «No transaction limits or fees apply»; overførte poeng beholder utløp, maks 12 mnd | https://www.sasgroup.net/newsroom/press-releases/2025/sas-and-scandic-introduce-tier-matching-and-point-transfers/ (30.04.2025); scandichotels.com-vilkårene timet ut | VERIFISERT (SAS-pressemelding) |
| **Revolut RevPoints** | Overføring 1:1 | Se del 5 | – | UVERIFISERT |
| **Amex Membership Rewards** | Overføring | 20:1 (tredjepart) | – | UVERIFISERT |
| **Fjordkraft** (strøm) | 1 % Trumf-bonus → 13,5 p/kr | = 13,5 poeng per 100 kr strøm | trumf.no | VERIFISERT (via Trumf) |
| **Talkmore** (mobil) | 4 % Trumf-bonus | = 54 poeng per 100 kr | trumf.no | VERIFISERT (via Trumf) |
| **Wolt** | Direkte EuroBonus med registrert kort | 10 poeng/100 kr (søkeresultat fra wolt.com); eurobonusguiden sier 20 | https://wolt.com/en/nor/oslo/article/eurobonus-norway (siden kunne ikke leses fullt) | UVERIFISERT |
| Hotell/leiebil-partnere (Radisson, Best Western, Hertz, Avis m.fl.) | Direkte poeng per natt/leie | Faste beløp | Kun tredjepart (eurobonusguiden.no) | UVERIFISERT |
| Marriott Bonvoy / Hilton Honors / IHG / Radisson Rewards | Overføring til EuroBonus | **Ingen direkte overføring funnet** | – | Ikke funnet |
| Klarnas andre reisepartnere (Finnair, Accor, Hilton, IHG, Radisson) | Irrelevant for EuroBonus | – | klarna.com/no/medlemskap | – |

Anbefaling for v1: Trumf (auto/engangs), Klarna Plus/Premium/Max, SAS Online Shopping. Scandic Friends passer i «fri kalkulator» (poeng inn → poeng ut), ikke i butikkalkulatoren.

---

## 7. Butikkoversikt på tvers av programmer (lest 21.09.2026)

| Butikk | Trumf Netthandel | Klarna app-cashback | SAS Online Shopping |
|---|---|---|---|
| Kicks | 6,2 % | 3 % | 50 p/100 kr |
| Lyko | 6,2 % | 3 % | 25 p/100 kr |
| Ellos | 6,2 % | – | 25 p/100 kr |
| Farmasiet | – (ikke sett) | 2 % | 50 p/100 kr (KAMPANJE) |
| Lensway | 8,5 % | – | 50 p/100 kr (KAMPANJE) |
| Komplett | UVERIFISERT | – | 15 p/100 kr |
| Adidas | 6,2 % | 2,5 % | – |
| Gina Tricot | 6,2 % | 3 % | – |
| Stormberg | 6,2 % | 3 % | – |
| Floyd | 4,6 % | 3 % | – |
| Gymgrossisten | opptil 4,6 % | – | 25 p/100 kr |
| Outnorth | opptil 4,6 % | – | 50 p/100 kr (KAMPANJE) |
| Bubbleroom | 3,1 % | – | 30 p/100 kr (KAMPANJE) |
| Polarn O. Pyret | 7,8 % | – | 75 p/100 kr (KAMPANJE) |
| Løpeshop | 2,3 % | – | 25 p/100 kr |
| CS Megastore | 1,5 % | 1,5 % | – |
| Autodoc | opptil 6,2 % | 3 % | – |
| Blivakker | 3,1 % | – | – |
| Hotels.com | 4,6 % / 1,1 % | – | – |

«–» = ikke funnet i offentlig kilde 21.09.2026, ikke nødvendigvis fraværende.

---

## 8. Uavklart / UVERIFISERT-liste (skal vises i UI)

1. Klarna-sats cashback → EuroBonus (12,07 observert; Klarna publiserer ikke, kan endres).
2. Klarna butikk-% for medlemmer vs. ikke-medlemmer («opptil 4x»).
3. Klarna: om automatisk månedlig veksling finnes (kun tredjepart).
4. Trumf Kredittkort: generell sats utenfor NorgesGruppen; om det stacker med Trumf Netthandel.
5. Beregningsgrunnlag (mva/frakt) hos Trumf Netthandel og SAS Online Shopping – varierer per butikk.
6. SAS Online Shopping-satser merket «Doble poeng» er kampanje uten synlig sluttdato.
7. DNB Upgrade, Amex MR, Revolut, Wolt: bare tredjepartskilder.
8. Minstebeløp for Trumf engangsoverføring.

---

## 9. Forslag til datamodell (til godkjenning)

- `programs.json`: id, navn, type (`prosent-til-kr` | `direkte-poeng` | `overføring`), konverteringssats til EuroBonus, modus (Trumf: auto/engangs), medlemspris/mnd, kortlag tillatt (bool), vilkår (liste), kilde-URL, `sistVerifisert`, `status` (verifisert | uverifisert | kampanje).
- `stores.json`: id, navn, kategori, `rates[]` = { programId, verdi, enhet (`%` | `poengPer100` | `fast`), opptil (bool), kilde, sistVerifisert, status, kampanje (bool) }.
- `cards.json`: id, navn, poengPer100 (NOK), pris, tak, kilde, sistVerifisert, status.
- Alle satser i data, ingen i kode. Én `rates`-modul regner: Trumf `beløp × % × 13,5`, Klarna `beløp × (butikk% + medlem%) × sats`, SAS OS `beløp/100 × poeng` (eller fast).

---

## 10. Kildeliste

Offisielle (21.09.2026):
- https://www.trumf.no/fordeler/sas-eurobonus
- https://www.trumf.no/trumf-profil/bruk-bonus/eurobonus
- https://www.trumf.no/slik-sparer-du-trumf-bonus
- https://www.trumf.no/slik-sparer-du-trumf-bonus/bonus-med-trumf-netthandel
- https://www.trumf.no/trumf-pay
- https://www.trumf.no/trumf-kredittkort/fordeler-med-trumf-kredittkort
- https://www.trumf.no/trumf-kredittkort/priser-og-vilkar
- https://trumfnetthandel.no/ (+ /about, /faq, /kategori/velvære, /kategori/mote, /kategori/elektronikk, /kategori/sport, /kategori/reise, /cashback/kicks-trumf, /cashback/lyko-trumf, /cashback/ellos, /cashback/blivakker-trumf, /cashback/lensway-trumf, /cashback/trumfhotels-no)
- https://www.klarna.com/no/medlemskap/
- https://www.klarna.com/no/cashback/
- https://www.klarna.com/no/medlemskap/unlock-sas-eurobonus-points/
- https://cdn.klarna.com/1.0/shared/content/legal/terms/nb-NO/cashback
- https://onlineshopping.flysas.com/nb-NO/ (+ /vilkaar-og-betingelser, /nivaapoeng)
- https://www.americanexpress.com/nb-no/kredittkort/sas-classic/ , /sas-premium/ , /sas-elite/
- https://saseurobonusmastercard.no/kortene/mastercard/ , /kortene/mastercard-premium/
- https://www.lunar.app/no/privat/sas-eurobonus
- https://www.sasgroup.net/newsroom/press-releases/2025/sas-and-scandic-introduce-tier-matching-and-point-transfers/

Tredjepart (brukt der offisiell kilde manglet, merket i teksten):
- https://penge.app/blog/klarna-max-eurobonus-points (07.09.2026)
- https://sparelosen.no/fordel/eurobonus/kredittkort-eurobonus-opptjening/ (12.09.2026)
- https://eurobonusguiden.no/2025/11/klarna-og-eurobonus-vekslingskurs-lansert/ (19.11.2025)
- https://eurobonusguiden.no/2025/10/klarna-og-eurobonus-inngar-samarbeid/ (okt. 2025)
- https://www.kredittkort.nu/klarna-eurobonus-velkomstbonus-2026/ (17.09.2026)
- https://kortio.no/spor-eksperten/eurobonus-poeng-klarna-sas-mastercard/ (18.09.2026)
- https://eurobonusguiden.no/2025/09/revolut-lanserer-samarbeid-med-sas-eurobonus/
- https://eurobonusguiden.no/opptjening-av-bonuspoeng/

Ikke lesbare (403/timeout/omdirigering): sas.no/eurobonus/partnere/opptjen-poeng , sas.no/eurobonus/betalingskort/norge , scandichotels.com (SAS EuroBonus-vilkår) , dnb.no (Mastercard Upgrade) , americanexpress.com (Membership Rewards) , revolut.com/en-NO/rev-points , wolt.com (EuroBonus-artikkel, avkortet).
