/* Estudio Tracker · service worker (funciona sin internet) */
// Subir VERSION cada vez que cambie algún archivo de la app: así ninguna copia vieja queda mezclada con la nueva.
const VERSION = 'et-1.6.2';
const FONTS = VERSION + '-fonts';
// Todo lo que la app necesita para funcionar sin internet, incluidas las librerías de PDF, Word, ZIP y OCR
// (son pesadas, pero si no están guardadas la importación de apuntes no funciona offline).
const CORE = [
  './', 'index.html', 'manifest.webmanifest', 'sw.js',
  'icon.svg', 'icon-192.png', 'icon-512.png', 'maskable-512.png', 'apple-touch-icon.png', 'favicon-32.png',
  'chart.umd.js',
  'pdf.min.js', 'pdf.worker.min.js', 'mammoth.browser.min.js', 'jszip.min.js', 'heic2any.min.js',
  'tesseract.min.js', 'tesseract-worker.min.js', 'tesseract-core-lstm.wasm.js', 'tesseract-core-simd-lstm.wasm.js', 'spa.traineddata.gz'
];

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
    e.respondWith(fetch(req).then(res => { const copy = res.clone(); caches.open(VERSION).then(c => c.put('index.html', copy)); return res; })
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
