// sw.js (由 Google Workbox 驅動的全新版本)

// 步驟 1: 引入 Workbox 函式庫
// 我們直接從 Google 的 CDN 引入，這是最簡單的方式。
importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js');

// 步驟 2: 基本設定
// Workbox 存在時，進行後續設定
if (workbox) {
  console.log(`Workbox 載入成功！`);

  // skipWaiting() 會讓新的 Service Worker 在安裝完成後立即啟用。
  // clientsClaim() 會讓新的 Service Worker 立即接管所有開啟的頁面。
  workbox.core.skipWaiting();
  workbox.core.clientsClaim();

  // 步驟 3: 預快取 (Precaching)
  // 這裡列出的是網站核心的「應用程式外殼(App Shell)」檔案。
  // Workbox 會在 Service Worker 安裝時，將它們全部下載並快取起來。
  // 當您未來修改這些檔案時，Workbox 會自動處理版本的更新。
  const precacheManifest = [
    { url: '/jeju-trip/index.html', revision: null },
    { url: '/jeju-trip/style.css', revision: null },
    { url: '/jeju-trip/modules/main.js', revision: null }, // 注意：路徑已更新為模組化的版本
    { url: '/jeju-trip/manifest.json', revision: null },
    { url: '/jeje-trip/images/icon-192.png', revision: null },
    { url: '/jeju-trip/images/icon-512.png', revision: null },
  ];
  
  // 將上面的列表交給 Workbox 處理
  workbox.precaching.precacheAndRoute(precacheManifest);


  // 步驟 4: 設定執行期快取策略 (Runtime Caching)
  // 這裡我們為不同類型的資源設定不同的快取方式。

  // 策略 A: CSS 和 JavaScript 檔案
  // 我們採用 Stale-While-Revalidate 策略，兼顧速度與內容更新。
  workbox.routing.registerRoute(
    ({ request }) => request.destination === 'script' || request.destination === 'style',
    new workbox.strategies.StaleWhileRevalidate({
      cacheName: 'static-resources-cache',
    })
  );

  // 策略 B: 圖片檔案
  // 我們採用 Cache First 策略，因為圖片通常不常變動，快取優先能提供最快的載入速度。
  workbox.routing.registerRoute(
    ({ request }) => request.destination === 'image',
    new workbox.strategies.CacheFirst({
      cacheName: 'image-cache',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 60, // 最多快取 60 張圖片
          maxAgeSeconds: 30 * 24 * 60 * 60, // 快取 30 天
        }),
      ],
    })
  );

  // 步驟 5: 處理離線時的頁面導航
  // 當使用者在離線狀態下瀏覽網站的任何頁面時，我們都回傳預快取好的主頁 (index.html)。
  // 同時，我們需要排除對 /admin.html 的攔截，讓它在離線時能正常顯示錯誤，而不是被導向到主頁。
  const handler = workbox.precaching.createHandlerBoundToURL('/jeju-trip/index.html');
  const navigationRoute = new workbox.routing.NavigationRoute(handler, {
    denylist: [
      // 使用正規表示式，排除所有以 /admin.html 結尾的網址
      new RegExp('/admin\\.html$'),
    ],
  });
  workbox.routing.registerRoute(navigationRoute);

} else {
  console.log(`Workbox 載入失敗！`);
}
