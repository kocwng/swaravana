// Service worker: simpan semua aset (termasuk model MediaPipe ±19 MB) agar aplikasi
// tetap terbuka dan bisa dimainkan walau server dimatikan.
const VERSI = 'swaravana-v61';
const ASET = [
  '/', '/index.html', '/style.css', '/manifest.webmanifest', '/ikon.svg', '/brand/ikon-192.png', '/brand/ikon-512.png', '/brand/ikon-maskable-512.png', '/brand/apple-touch-icon.png',
  '/js/app.js', '/js/teori.js', '/js/gestur.js', '/js/sintesis.js', '/js/suara.js', '/js/pelacak.js', '/js/lagu.js', '/js/pola.js', '/js/pemutar.js', '/js/diagram.js', '/js/gambar-diagram.js', '/js/koleksi.js',
  '/vendor/mediapipe/vision_bundle.mjs',
  '/vendor/mediapipe/wasm/vision_wasm_internal.js',
  '/vendor/mediapipe/wasm/vision_wasm_internal.wasm',
  '/vendor/mediapipe/hand_landmarker.task',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSI).then((c) => c.addAll(ASET)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== VERSI).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Kode aplikasi: jaringan dulu (supaya pembaruan langsung terasa), cache bila offline.
// Vendor (besar & tidak berubah): cache dulu.
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  if (url.pathname.startsWith('/vendor/')) {
    e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request)));
    return;
  }
  e.respondWith(
    fetch(e.request)
      .then((r) => {
        if (r.ok) { const salin = r.clone(); caches.open(VERSI).then((c) => c.put(e.request, salin)); }
        return r;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match('/index.html'))),
  );
});
