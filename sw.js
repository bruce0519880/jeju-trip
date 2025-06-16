// sw.js (v5) - 更新 manifest 的最終版本
const CACHE_NAME = 'jeju-tour-cache-v5'; // <-- 版本號升級到 v5
const urlsToCache = [
    '/jeju-trip/index.html',
    '/jeju-trip/style.css',
    '/jeju-trip/script.js',
    '/jeju-trip/manifest.json', // <-- 確保更新後的 manifest 被快取
    '/jeju-trip/images/icon-192.png',
    '/jeju-trip/images/icon-512.png'
];

self.addEventListener('install', event => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('Opened cache and caching files for v4');
            return cache.addAll(urlsToCache);
        })
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') {
        return;
    }

    // 對於導航請求，總是回傳 index.html
    // 檢查請求的 URL 是否不包含副檔名 (常見的頁面導航)
    if (event.request.mode === 'navigate') {
        event.respondWith(caches.match('/jeju-trip/index.html'));
        return;
    }

    // 對於其他資源
    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request);
        })
    );
});
