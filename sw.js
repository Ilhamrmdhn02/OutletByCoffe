/* Service worker Outlet by Coffee.
 *
 * Tujuan: alamat GitHub Pages tetap terbuka saat offline (bukan halaman error).
 * Yang di-cache hanya shell halaman ini + demo offline. Aplikasi Apps Script
 * di dalam iframe tetap butuh internet karena datanya di Google Sheets, dan
 * responsnya sengaja TIDAK di-cache (selalu data terbaru).
 */
const CACHE = 'obc-shell-v1';
const SHELL = [
    './',
    './index.html',
    './manifest.json',
    './icon.svg',
    './icon-192.png',
    './icon-512.png',
    './demo.html'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE)
            .then((cache) => cache.addAll(SHELL))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const request = event.request;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return; // Apps Script & font dibiarkan lewat.

    if (request.mode === 'navigate') {
        // Shell: utamakan jaringan supaya versi terbaru, cache hanya saat offline.
        event.respondWith(
            fetch(request)
                .then((response) => {
                    const copy = response.clone();
                    caches.open(CACHE).then((cache) => cache.put(request, copy));
                    return response;
                })
                .catch(() => caches.match(request).then((hit) => hit || caches.match('./index.html')))
        );
        return;
    }

    event.respondWith(
        caches.match(request).then((hit) => {
            if (hit) return hit;
            return fetch(request).then((response) => {
                if (response.ok) {
                    const copy = response.clone();
                    caches.open(CACHE).then((cache) => cache.put(request, copy));
                }
                return response;
            });
        })
    );
});
