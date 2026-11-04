/* Estudio Tracker · service worker (funciona sin internet) */
const VERSION = 'et-6.0.0-dev.29';
const FONTS = VERSION + '-fonts';
const CHART = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js';
const CORE = ["./","analytics-DIrH-qs1.js","apple-touch-icon-152.png","apple-touch-icon-167.png","apple-touch-icon.png","auto-C6VQxMGW.js","cursor-editorTextHighlight-kG3uUOwL.svg","defineProperty-BbfpZ9Tg.js","docParser-CZsBeRM0.js","favicon-32.png","icon-1024.png","icon-192.png","icon-512.png","icon.svg","index-CpW94VJ_.css","index-GtpErVIl.js","index.html","lucky.png","manifest.webmanifest","maskable-512.png","og-image.png","pdf-Dx5uTa3N.js","pdf.worker.min-CIqJB0yW.mjs","pdf.worker.min-DjWTMx_n.js","reader-BI_hLG0O.css","reader-CHUxJ7Q9.js"];

self.addEventListener('install', e => {
  // Se guarda cada archivo por separado: si alguno falta, la app igual se instala.
  e.waitUntil(caches.open(VERSION).then(c => Promise.all(CORE.map(f => c.add(f).catch(() => null)))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== FONTS).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);
  // Páginas: primero la red (así llegan las actualizaciones) y, sin internet, la copia guardada.
  if(req.mode === 'navigate') {
    // Una página de error del servidor nunca reemplaza la copia guardada.
    e.respondWith(fetch(req).then(res => {
        if(!res.ok) return caches.match('index.html').then(r => r || res);
        const copy = res.clone(); caches.open(VERSION).then(c => c.put('index.html', copy)); return res;
      })
      .catch(() => caches.match('index.html').then(r => r || caches.match('./'))));
    return;
  }
  // Archivos de la app: copia guardada al instante y se refresca en segundo plano.
  if(url.origin === self.location.origin) {
    e.respondWith(caches.match(req).then(hit => {
      const net = fetch(req).then(res => { if(res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); } return res; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }
  // Librería de gráficos: la versión está fija, así que alcanza con la copia guardada.
  if(req.url === CHART) {
    e.respondWith(caches.match(CHART).then(hit => hit || fetch(req)));
    return;
  }
  // Tipografías de Google: se guardan la primera vez para usarlas sin conexión.
  if(/(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith(caches.open(FONTS).then(c => c.match(req).then(hit => {
      const net = fetch(req).then(res => { c.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    })));
  }
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({type: 'window', includeUncontrolled: true}).then(cs => {
    for(const c of cs) { if('focus' in c) return c.focus(); }
    return self.clients.openWindow('./');
  }));
});
