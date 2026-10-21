import { useEffect, useMemo, useState } from "react";
import hverdagJson from "../data/hverdag.json";
import type {
  Butikk,
  Kort,
  Land,
  Program,
  Samarbeidspartner,
} from "../data/types";
import { SPRAK, tekst } from "../i18n";
import { fmtPoeng, fmtTall, parseTall } from "../lib/format";
import {
  beregnOppsett,
  manederTil,
  oreVerdi,
  velgOppsett,
  type Oppsett,
} from "../lib/plan";

interface Props {
  land: Land;
  programmer: Program[];
  butikker: Butikk[];
  kort: Kort[];
  /** Butikkene brukeren følger – netthandelen fordeles på dem. */
  folger: string[];
  /** Kjente nettbutikker, brukt når brukeren ikke følger noen. */
  kjente: string[];
  idag: string;
  /** Kortet og Klarna-nivået valgt i kortvelgeren, for «Ditt oppsett nå». */
  mittKortId: string;
  mittNivaId: string | null;
  samarbeid: Samarbeidspartner | null;
}

type Felt =
  | "netthandel"
  | "dagligvare"
  | "kortbruk"
  | "har"
  | "trenger"
  | "nivaMangler"
  | "kontant"
  | "poeng"
  | "avgifter";
const NOKKEL = "pointmaxing.plan";
const STANDARD: Record<Felt, string> = {
  netthandel: "3 000",
  dagligvare: "5 000",
  kortbruk: "8 000",
  har: "",
  trenger: "",
  nivaMangler: "",
  kontant: "",
  poeng: "",
  avgifter: "",
};
const TILLATT = /^[\d\s.,]*$/;

function lesLagret(): Record<Felt, string> {
  try {
    const p = JSON.parse(localStorage.getItem(NOKKEL) ?? "null") as Partial<
      Record<Felt, string>
    > | null;
    return { ...STANDARD, ...(p ?? {}) };
  } catch {
    return STANDARD;
  }
}

const HVERDAG = hverdagJson as Partial<
  Record<
    Land,
    {
      rader: { id: string; prosent: number }[];
      kort?: { navn: string; prisPerMnd: number; dagligvare: number };
    }
  >
>;

/** Planen: hvilket kort og Klarna-nivå som gir mest for forbruket ditt, når du når målet, og hva poengene er verdt. */
export default function Plan({
  land,
  programmer,
  butikker,
  kort,
  folger,
  kjente,
  idag,
  mittKortId,
  mittNivaId,
  samarbeid,
}: Props) {
  const [felt, setFelt] = useState(lesLagret);
  useEffect(() => {
    try {
      localStorage.setItem(NOKKEL, JSON.stringify(felt));
    } catch {
      /* lagring er bare en bekvemmelighet */
    }
  }, [felt]);
  const T = (
    n: Parameters<typeof tekst>[1],
    v?: Record<string, string | number>,
  ) => tekst(land, n, v);
  const tall = (f: Felt) => parseTall(felt[f]);
  const hverdag = HVERDAG[land];
  const harTrumf = programmer.some((p) => p.id === "trumf") && Boolean(hverdag);

  const kurv = useMemo(() => {
    const ider = folger.length ? folger : kjente;
    return butikker.filter((b) => ider.includes(b.id));
  }, [butikker, folger, kjente]);

  const alle = useMemo(
    () =>
      beregnOppsett(
        {
          programmer,
          butikker: kurv,
          kort,
          dagligvareProsent: harTrumf
            ? (hverdag?.rader.find((r) => r.id === "dagligvare")?.prosent ??
              null)
            : null,
          trumfKort: harTrumf && hverdag?.kort ? hverdag.kort : null,
          idag,
        },
        {
          netthandel: tall("netthandel"),
          dagligvare: harTrumf ? tall("dagligvare") : 0,
          kortbruk: tall("kortbruk"),
        },
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      programmer,
      kurv,
      kort,
      idag,
      felt.netthandel,
      felt.dagligvare,
      felt.kortbruk,
      harTrumf,
    ],
  );
  const { flest, verdi, gratis } = velgOppsett(alle);
  const klarna = programmer.find((p) => p.nivaer.some((n) => n.id === "max"));
  const mittKort =
    klarna && mittKortId === `${klarna.id}-kort`
      ? `${klarna.id}-kort-${mittNivaId}`
      : mittKortId;
  const ditt =
    alle.find(
      (o) =>
        o.id ===
        `${mittNivaId && mittNivaId !== "ingen" ? mittNivaId : "ingen"}|${mittKort || "ingen"}`,
    ) ?? null;

  const manedFmt = new Intl.DateTimeFormat(SPRAK[land].locale, {
    month: "long",
    year: "numeric",
  });
  const omMnd = (n: number) => {
    const d = new Date(idag);
    d.setMonth(d.getMonth() + n);
    return manedFmt.format(d);
  };
  const mangler = Math.max(0, tall("trenger") - tall("har"));
  const nivaMangler = tall("nivaMangler");

  const rad = (merke: string, o: Oppsett, fremhev = false) => {
    const mnd = tall("trenger") > 0 ? manederTil(mangler, o.poengAr) : null;
    // Nivåpoeng teller i en personlig kvalifiseringsperiode på 12 måneder.
    const nivaMndRa =
      nivaMangler > 0 ? manederTil(nivaMangler, o.nivapoengAr) : null;
    const nivaMnd = nivaMndRa !== null && nivaMndRa <= 12 ? nivaMndRa : null;
    const nivaIkke = nivaMangler > 0 && (nivaMndRa === null || nivaMndRa > 12);
    return (
      <li
        key={`${merke}-${o.id}`}
        className={fremhev ? "fremhevet" : undefined}
      >
        <span className="plan-merke">{merke}</span>
        <span className="plan-navn">
          {o.kortNavn ?? T("planUtenKort")}
          {o.nivaNavn ? ` + ${o.nivaNavn}` : ""}
        </span>
        <span className="plan-tall">
          {fmtPoeng(o.poengAr)} <small>{T("planPoengAr")}</small>
        </span>
        <span className="muted">
          {o.kostnadAr > 0
            ? T("planKostnad", { kr: fmtTall(Math.round(o.kostnadAr)) })
            : T("planGratis")}
          {o.ore !== null && o.kostnadAr > 0
            ? ` · ${T("planOre", { ore: fmtTall(Math.round(o.ore * 10) / 10) })}`
            : ""}
          {o.nivapoengAr > 0
            ? ` · ${T("planNivapoeng", { n: fmtPoeng(o.nivapoengAr) })}`
            : ""}
        </span>
        {(mnd !== null || nivaMnd !== null || nivaIkke) && (
          <span className="plan-mal">
            {mnd === 0
              ? T("planNokAllerede")
              : mnd !== null
                ? T("planMalOm", { n: mnd, dato: omMnd(mnd) })
                : ""}
            {mnd !== null && (nivaMnd !== null || nivaIkke) ? " · " : ""}
            {nivaMnd !== null
              ? T("planNivaOm", { n: nivaMnd, dato: omMnd(nivaMnd) })
              : nivaIkke
                ? T("planNivaIkke")
                : ""}
          </span>
        )}
      </li>
    );
  };

  const inndata = (f: Felt, etikett: string, enhet: string, hint?: string) => (
    <div key={f}>
      <div className="valg-rad rad-kort kortbruk">
        <label className="etikett" htmlFor={`plan-${f}`}>
          {etikett}
        </label>
        <span className="tall">
          <input
            id={`plan-${f}`}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0"
            value={felt[f]}
            onChange={(e) => {
              if (TILLATT.test(e.target.value))
                setFelt((s) => ({ ...s, [f]: e.target.value }));
            }}
          />
          <span className="enhet">{enhet}</span>
        </span>
        <span />
      </div>
      {hint && <p className="muted plan-hint">{hint}</p>}
    </div>
  );

  const verdiOre = oreVerdi(tall("kontant"), tall("poeng"), tall("avgifter"));
  const referanse = ditt ?? verdi ?? flest;

  return (
    <section className="plan">
      <span className="etikett">{T("navPlan")}</span>
      <h1>{T("planTittel")}</h1>
      <p className="ingress">{T("planIngress")}</p>

      <h2 className="etikett">{T("planForbruk")}</h2>
      {inndata("netthandel", T("planNetthandel"), "kr/mnd")}
      {harTrumf && inndata("dagligvare", T("planDagligvare"), "kr/mnd")}
      {inndata("kortbruk", T("planKortbruk"), "kr/mnd")}

      <h2 className="etikett">{T("planMal")}</h2>
      {inndata("har", T("planHar"), T("planPoengEnhet"))}
      {inndata("trenger", T("planTrenger"), T("planPoengEnhet"))}
      {inndata(
        "nivaMangler",
        T("planNivaMangler"),
        T("planNivaEnhet"),
        T("planNivaHint"),
      )}

      <h2 className="etikett">{T("planBeste")}</h2>
      <ul className="plan-liste">
        {flest && rad(T("planFlest"), flest, true)}
        {verdi && rad(T("planVerdi"), verdi)}
        {gratis && rad(T("planGratisBest"), gratis)}
        {ditt &&
          ditt.id !== flest?.id &&
          ditt.id !== verdi?.id &&
          ditt.id !== gratis?.id &&
          rad(T("planDitt"), ditt)}
      </ul>
      <details className="plan-alle">
        <summary>{T("planAlle", { n: Math.min(alle.length, 15) })}</summary>
        <ul className="plan-liste kompakt">
          {alle.slice(0, 15).map((o, i) => rad(`${i + 1}.`, o))}
        </ul>
      </details>
      <p className="graf-merknad">
        {T("planSlik", {
          butikker: folger.length
            ? T("planFulgte", { n: kurv.length })
            : T("planKjente", { n: kurv.length }),
        })}
        {harTrumf ? ` ${T("planSlikTrumf")}` : ""} {T("planAmex")}
      </p>

      <h2 className="etikett">{T("planBruk")}</h2>
      <p className="muted plan-tekst">{T("planBrukIngress")}</p>
      {inndata("kontant", T("planKontant"), "kr")}
      {inndata("poeng", T("planPoeng"), T("planPoengEnhet"))}
      {inndata("avgifter", T("planAvgifter"), "kr")}
      {verdiOre !== null && (
        <p className="plan-svar">
          <strong>
            {T("planVerdiPer", { v: fmtTall(Math.round(verdiOre * 10) / 10) })}
          </strong>{" "}
          {referanse && referanse.ore !== null && referanse.kostnadAr > 0
            ? T(verdiOre >= referanse.ore ? "planGodBruk" : "planDarligBruk", {
                ore: fmtTall(Math.round(referanse.ore * 10) / 10),
              })
            : T("planGratisPoeng")}
        </p>
      )}
      {samarbeid && (
        <p className="samarbeid">
          <a href={samarbeid.booking} target="_blank" rel="sponsored noopener">
            {T("brukPoengene", { navn: samarbeid.navn })}{" "}
            <span aria-hidden="true">→</span>
          </a>
        </p>
      )}
    </section>
  );
}
