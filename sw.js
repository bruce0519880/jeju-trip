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

// install 事件：在安裝時寫入快取
self.addEventListener('install', event => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('Opened cache and caching files for v5');
            return cache.addAll(urlsToCache);
        })
    );
});

// activate 事件：在啟用時清除舊快取
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

// fetch 事件：攔截網路請求
self.addEventListener('fetch', event => {
    // 我們只處理 GET 請求
    if (event.request.method !== 'GET') {
        return;
    }

    // 對於導航請求 (例如打開 App 或點擊連結)，我們總是回傳 index.html
    if (event.request.mode === 'navigate') {
        event.respondWith(caches.match('/jeju-trip/index.html'));
        return;
    }

    // 對於其他資源 (CSS, JS, 圖片等)
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // 如果快取中有，就直接回傳
                if (response) {
                    return response;
                }
                // 如果快取中沒有，就透過網路去抓
                return fetch(event.request);
            })
    );
});
