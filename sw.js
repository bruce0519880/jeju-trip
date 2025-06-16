// sw.js

const CACHE_NAME = 'jeju-tour-cache-v2'; // <--- 版本號從 v1 更新為 v2
const urlsToCache = [
    '/',
    '/index.html',
    '/style.css',
    '/script.js',
    '/manifest.json', // 將 manifest 也加入快取
    '/images/icon-192.png',
    '/images/icon-512.png'
];

// 安裝 Service Worker
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache and caching files');
                return cache.addAll(urlsToCache);
            })
    );
});

// 啟用 Service Worker，並清除舊快取
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
        })
    );
});

// 攔截網路請求，從快取中提供資源
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // 如果快取中有對應的資源，就直接回傳
                if (response) {
                    return response;
                }
                // 否則，透過網路請求
                return fetch(event.request);
            })
    );
});