// Pakker utvidelsen til dist/pointmaxing-utvidelse.zip (Chrome) og dist/pointmaxing-utvidelse-firefox.zip,
// så nettsiden kan tilby nedlasting og zip-en kan lastes opp til Chrome Web Store. Kjøres etter bygging.

import { cp, mkdir, rename, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const rot = new URL('../', import.meta.url);
const dist = new URL('dist/', rot);
const sti = (u) => fileURLToPath(u);

async function pakk(navn, firefox) {
  const midl = new URL(`dist/tmp-${navn}/`, rot);
  await rm(midl, { recursive: true, force: true });
  await mkdir(midl, { recursive: true });
  await cp(new URL('extension/', rot), midl, {
    recursive: true,
    filter: (kilde) => !/manifest\.firefox\.json$|BUTIKK\.md$|\.DS_Store$/.test(kilde) || (firefox && kilde.endsWith('manifest.firefox.json')),
  });
  if (firefox) await rename(new URL('manifest.firefox.json', midl), new URL('manifest.json', midl));
  const zip = new URL(`${navn}.zip`, dist);
  await rm(zip, { force: true });
  if (process.platform === 'win32') {
    execFileSync('powershell.exe', ['-NoProfile', '-Command', `Compress-Archive -Path '${sti(midl)}*' -DestinationPath '${sti(zip)}' -Force`]);
  } else {
    execFileSync('zip', ['-qr', sti(zip), '.'], { cwd: sti(midl) });
  }
  await rm(midl, { recursive: true, force: true });
  return zip;
}

await pakk('pointmaxing-utvidelse', false);
await pakk('pointmaxing-utvidelse-firefox', true);
console.log('Utvidelsen pakket: dist/pointmaxing-utvidelse.zip og dist/pointmaxing-utvidelse-firefox.zip');
