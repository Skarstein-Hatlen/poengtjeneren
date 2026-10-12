import { Composition } from 'remotion';
import { SammeKjop } from './SammeKjop';

// 9:16 til Reels, TikTok og historier. 30 bilder i sekundet.
export const Root = () => <Composition id="SammeKjop" component={SammeKjop} durationInFrames={450} fps={30} width={1080} height={1920} />;
