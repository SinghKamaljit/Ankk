// Ankk Service Worker
// Bump this version string to force cache refresh on all users
const CACHE_VERSION = 'ankk-v4';
const CACHE_NAME    = `ankk-cache-${CACHE_VERSION}`;

const ASSETS = [
    './index.html',
    './ankk-manifest.json',
    './icon-192.png',
    './icon-512.png'
];

// ── Install — cache core assets ───────────────────────────────────
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
    );
    self.skipWaiting();
});

// ── Activate — delete old caches ──────────────────────────────────
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys
                    .filter(key => key.startsWith('ankk-cache-') && key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            )
        )
    );
    self.clients.claim();
});

// ── Fetch — serve from cache, fall back to network ────────────────
self.addEventListener('fetch', event => {
    // Only intercept same-origin and CDN requests for app assets
    const url = new URL(event.request.url);

    // Always go network-first for Firebase
    if (url.hostname.includes('firebase') || url.hostname.includes('google')) {
        event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
        return;
    }

    // Cache-first for everything else
    event.respondWith(
        caches.match(event.request).then(cached => {
            if (cached) return cached;
            return fetch(event.request).then(response => {
                if (!response || response.status !== 200 || response.type === 'opaque') {
                    return response;
                }
                const toCache = response.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(event.request, toCache));
                return response;
            }).catch(() => cached);
        })
    );
});
