// Service worker: appen virker uten nett når den først er åpnet. Sider hentes fra nettet først
// (så nye satser kommer med), og faller tilbake på det som er lagret; bygde filer og logoer
// er uforanderlige og hentes fra lageret.

const LAGER = 'pointmaxing-v1';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(LAGER).then((c) => c.add('/').catch(() => undefined)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((navn) => Promise.all(navn.filter((n) => n !== LAGER).map((n) => caches.delete(n)))));
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request)
        .then((svar) => {
          if (svar.ok) caches.open(LAGER).then((c) => c.put(request, svar.clone()));
          return svar;
        })
        .catch(async () => (await caches.match(request)) ?? (await caches.match('/')) ?? Response.error()),
    );
    return;
  }

  const uforanderlig = url.pathname.startsWith('/assets/') || url.pathname.startsWith('/logos/') || /\.(png|svg|webp|webmanifest)$/.test(url.pathname);
  if (uforanderlig) {
    e.respondWith(
      caches.match(request).then(
        (lagret) =>
          lagret ??
          fetch(request).then((svar) => {
            if (svar.ok) caches.open(LAGER).then((c) => c.put(request, svar.clone()));
            return svar;
          }),
      ),
    );
  }
});
