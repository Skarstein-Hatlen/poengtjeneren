import { interpolate, useCurrentFrame } from 'remotion';
import { Avslutning, F, FlyOvergang, Kort, Krok, Logo, Ramme, klamp, per100Tekst, smal, tall, useFrem, useInn } from './felles';

// «Amex eller Klarna Max?»: Trumf + Amex-kortet mot Klarna Max i fire butikker (det sjeldne utfallet sist),
// så hvor mange butikker hver vinner. 18 sekunder.

export type AmexProps = {
  kort: { navn: string; per100: number };
  rader: { id: string; navn: string; logo: string | null; amex: number; klarna: number }[];
  seire: { amex: number; klarna: number };
  alle: number;
  unntak: string[];
  butikkerTotalt: number;
};

const TRUMF = '#1b3f8f';
const KLARNA = '#ffa8cd';

export const AmexKlarna = ({ kort, rader, seire, alle, unntak, butikkerTotalt }: AmexProps) => {
  const frame = useCurrentFrame();
  const inn = useInn();
  const frem = useFrem();
  const ut = interpolate(frame, [318, 336], [1, 0], klamp);
  const maxV = Math.max(...rader.flatMap((r) => [r.amex, r.klarna]));
  const amexNavn = `Trumf + ${kort.navn}`;
  const klarnaFlest = seire.klarna >= seire.amex;
  const flest = Math.max(seire.amex, seire.klarna);
  const unntakTekst = unntak.length && unntak.length <= 3 ? `${unntak.length === 1 ? 'Unntaket' : 'Unntakene'}: ${unntak.join(', ')}` : '';

  const stolpe = (verdi: number, farge: string, p: number, vant: boolean, avgjort: number) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
      <div style={{ flex: 1, height: 24, borderRadius: 12, background: '#efe9db' }}>
        <div style={{ height: '100%', width: `${(verdi / maxV) * 100 * p}%`, borderRadius: 12, background: farge, opacity: vant ? 1 : 1 - 0.55 * avgjort }} />
      </div>
      <div style={{ width: 170, textAlign: 'right', fontFamily: smal, fontWeight: 700, fontSize: 64, lineHeight: 1, fontVariantNumeric: 'tabular-nums', color: vant ? F.blekk : interpolate(avgjort, [0, 1], [0, 1]) > 0.5 ? F.dempet : F.blekk }}>
        {per100Tekst(verdi * p)}
      </div>
    </div>
  );

  return (
    <Ramme>
      <Krok etikett="Kortet i butikken" linjer={['Amex eller', 'Klarna Max?']} oppFra={66} utFra={318} />

      <Kort top={500} style={{ opacity: inn(88, 16) * ut, transform: `translateY(${(1 - inn(88, 16)) * 140}px)` }}>
        <div style={{ padding: '26px 48px 20px', display: 'flex', gap: 40, fontWeight: 600, fontSize: 32, color: F.blekk }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <i style={{ width: 22, height: 22, borderRadius: 11, background: TRUMF }} />
            {amexNavn}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <i style={{ width: 22, height: 22, borderRadius: 11, background: KLARNA }} />
            Klarna Max
          </span>
        </div>
        <div style={{ padding: '0 48px 4px', fontWeight: 500, fontSize: 28, color: F.dempet }}>Poeng per 100 kr</div>
        {rader.map((r, i) => {
          const start = 108 + i * 42;
          const p = frem(start, 40);
          const synlig = inn(start - 6);
          const avgjort = frem(start + 44, 12);
          const amexVant = r.amex > r.klarna;
          return (
            <div key={r.id} style={{ padding: '18px 48px 22px', borderTop: `2px solid ${F.strek}`, marginTop: i ? 0 : 14, opacity: synlig, transform: `translateX(${(1 - synlig) * -50}px)` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 22, marginBottom: 10 }}>
                <Logo src={r.logo} navn={r.navn} b={140} h={68} />
                <span style={{ fontWeight: 600, fontSize: 44, color: F.blekk }}>{r.navn}</span>
                {amexVant ? (
                  <span style={{ fontWeight: 600, fontSize: 24, letterSpacing: '0.16em', color: F.gull, opacity: avgjort }}>AMEX VINNER</span>
                ) : null}
              </div>
              {stolpe(r.amex, TRUMF, p, amexVant, avgjort)}
              <div style={{ height: 8 }} />
              {stolpe(r.klarna, KLARNA, p, !amexVant, avgjort)}
            </div>
          );
        })}
      </Kort>

      {/* Fasiten */}
      <div style={{ position: 'absolute', left: 60, right: 60, top: 520, opacity: inn(340, 14) * interpolate(frame, [412, 426], [1, 0], klamp) }}>
        <div style={{ fontWeight: 600, fontSize: 56, color: F.krem, lineHeight: 1.15 }}>{klarnaFlest ? 'Klarna Max' : amexNavn} gir flest poeng i</div>
        <div style={{ fontFamily: smal, fontWeight: 700, fontSize: 236, lineHeight: 1, color: F.gullfyll, marginTop: 8, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
          {Math.round(flest * frem(346, 34))} av {alle}
        </div>
        <div style={{ fontWeight: 500, fontSize: 52, color: F.krem, lineHeight: 1.2 }}>butikker der begge gir fast prosent</div>
        {unntakTekst ? <div style={{ marginTop: 36, fontWeight: 500, fontSize: 42, color: F.lys, opacity: inn(372) }}>{unntakTekst}</div> : null}
        <div style={{ marginTop: 56, fontSize: 30, color: F.lys, opacity: inn(380), lineHeight: 1.4 }}>
          Trumf + Amex forutsetter at butikken tar Amex.
          <br />
          Månedspris er ikke regnet med.
        </div>
      </div>

      <FlyOvergang fra={412} />
      <Avslutning fra={436} linjer={['Sjekk din butikk', 'før du handler']} under={`Gratis · ${tall(Math.floor(butikkerTotalt / 100) * 100)}+ nettbutikker`} />
    </Ramme>
  );
};
