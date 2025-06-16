const CACHE_NAME = 'jeju-tour-cache-v1';
// 注意：請確保您真的有這些檔案和路徑
const urlsToCache = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './images/icon-192.png',
    './images/icon-512.png'
];

// Service Worker 安裝事件
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

// Service Worker 攔截請求事件
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // 如果快取中有對應的回應，就直接回傳
                if (response) {
                    return response;
                }
                // 否則，透過網路發出請求
                return fetch(event.request);
            })
    );
});