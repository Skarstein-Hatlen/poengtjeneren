// Lager videoene til out/<id>.mp4. Pakker prosjektet én gang og rendrer hver komposisjon (alle, eller de som er
// nevnt: node render.mjs AmexKlarna Butikkduell). Bruker installert Chrome.

import { bundle } from '@remotion/bundler';
import { renderMedia, renderStill, selectComposition } from '@remotion/renderer';
import { fileURLToPath } from 'node:url';

// Installert Chrome: CHROME, ellers standardstien på Windows. Uten den laster Remotion ned sin egen.
const CHROME = process.env.CHROME || (process.platform === 'win32' ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : undefined);
const args = process.argv.slice(2);
const stillbilder = args.find((a) => a.startsWith('--still='))?.slice(8).split(',').map(Number);
const valgte = args.filter((a) => !a.startsWith('--'));

const serveUrl = await bundle({ entryPoint: fileURLToPath(new URL('src/index.ts', import.meta.url)) });
const { getCompositions } = await import('@remotion/renderer');
const alle = await getCompositions(serveUrl, { browserExecutable: CHROME });
for (const c of alle.filter((x) => !valgte.length || valgte.includes(x.id))) {
  const composition = await selectComposition({ serveUrl, id: c.id, browserExecutable: CHROME });
  if (stillbilder) {
    for (const frame of stillbilder) {
      await renderStill({ composition, serveUrl, frame, output: fileURLToPath(new URL(`out/${c.id}-${frame}.png`, import.meta.url)), browserExecutable: CHROME });
    }
    console.log(`${c.id}: stillbilder ${stillbilder.join(', ')}`);
    continue;
  }
  const output = fileURLToPath(new URL(`out/${c.id}.mp4`, import.meta.url));
  try {
    await renderMedia({ composition, serveUrl, codec: 'h264', crf: 18, outputLocation: output, browserExecutable: CHROME });
    console.log(`${c.id}: ${output}`);
  } catch (e) {
    console.error(`${c.id} feilet: ${e.message}`);
    process.exitCode = 1;
  }
}
