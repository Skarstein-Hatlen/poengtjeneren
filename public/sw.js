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

// Push-varsler (scripts/send-varsler.mjs): vis meldingen, og åpne butikken når den trykkes.
self.addEventListener('push', (e) => {
  let d = {};
  try {
    d = e.data ? e.data.json() : {};
  } catch {
    d = { tekst: e.data ? e.data.text() : '' };
  }
  e.waitUntil(
    self.registration.showNotification(d.tittel || 'Pointmaxing', {
      body: d.tekst || '',
      icon: '/favicon-192.png',
      badge: '/favicon-192.png',
      tag: d.tag,
      data: { url: d.url || '/' },
    }),
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = new URL(e.notification.data?.url || '/', self.location.origin).href;
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((vinduer) => {
      const apent = vinduer.find((v) => v.url.startsWith(self.location.origin));
      if (apent) return apent.navigate(url).then((v) => (v ?? apent).focus());
      return self.clients.openWindow(url);
    }),
  );
});
