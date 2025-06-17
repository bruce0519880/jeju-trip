// sw.js (v6) - 更新 manifest 的最終版本，並修正後台導覽問題
const CACHE_NAME = 'jeju-tour-cache-v7'; // <-- 版本號已升級
const urlsToCache = [
    '/jeju-trip/index.html',
    '/jeju-trip/style.css',
    '/jeju-trip/script.js',
    '/jeju-trip/manifest.json',
    '/jeju-trip/images/icon-192.png',
    '/jeju-trip/images/icon-512.png'
];

// install 事件：在安裝時寫入快取
self.addEventListener('install', event => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('Opened cache and caching files for v7');
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

// fetch 事件：攔截網路請求 (已修正)
self.addEventListener('fetch', event => {
    // 我們只處理 GET 請求
    if (event.request.method !== 'GET') {
        return;
    }

    // 對於導航請求，檢查 URL
    if (event.request.mode === 'navigate') {
        const url = new URL(event.request.url);
        
        // 【關鍵修改】如果請求的頁面是 admin.html，就直接放行，不使用快取
        if (url.pathname.endsWith('/admin.html')) {
            return; // 讓瀏覽器正常處理，不攔截
        }

        // 對於所有其他的導航請求，才回傳主應用程式頁面
        event.respondWith(caches.match('/jeju-trip/index.html'));
        return;
    }

    // 對於其他資源 (CSS, JS, 圖片等)，使用快取優先策略
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
