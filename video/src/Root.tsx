import { Composition } from 'remotion';
import { AmexKlarna, type AmexProps } from './AmexKlarna';
import { Kortduell, type KortProps } from './Kortduell';
import { SammeKjop, type ButikkProps } from './SammeKjop';
import { UkensBeste, ukensLengde, type UkensProps } from './UkensBeste';
import data from './video.json';

// 9:16 til Reels, TikTok og historier, 30 bilder i sekundet. Tallene kommer fra src/video.json (node hent-data.mjs).
const felles = { fps: 30, width: 1080, height: 1920 };
const totalt = data.butikkerTotalt;
const ukens = { uke: data.uke, ...data.ukens, butikkerTotalt: totalt } as UkensProps;

export const Root = () => (
  <>
    <Composition id="UkensBeste" component={UkensBeste} durationInFrames={ukensLengde(ukens)} {...felles} defaultProps={ukens} />
    {data.butikkduell ? (
      <Composition id="Butikkduell" component={SammeKjop} durationInFrames={450} {...felles} defaultProps={{ ...data.butikkduell, belop: 1000, butikkerTotalt: totalt } as ButikkProps} />
    ) : null}
    {data.kortduell ? <Composition id="Kortduell" component={Kortduell} durationInFrames={480} {...felles} defaultProps={{ ...data.kortduell, butikkerTotalt: totalt } as KortProps} /> : null}
    {data.amexklarna ? <Composition id="AmexKlarna" component={AmexKlarna} durationInFrames={540} {...felles} defaultProps={{ ...data.amexklarna, butikkerTotalt: totalt } as AmexProps} /> : null}
    <Composition id="Lyko" component={SammeKjop} durationInFrames={450} {...felles} defaultProps={{ ...data.eksempel, butikkerTotalt: totalt } as ButikkProps} />
  </>
);
