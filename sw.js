// [Codex] 정적 자산을 선캐시해 홈 화면 앱이나 오프라인 환경에서도 기본 화면이 열리게 합니다.
// [Codex] 앱 쉘이 이전 정적 파일을 계속 재사용하지 않도록 캐시 버전을 올려 이번 수정이 즉시 반영되게 합니다.
// [Codex] 레이아웃을 크게 바꿨기 때문에 새 앱 셸이 즉시 반영되도록 캐시 버전을 갱신합니다.
const CACHE_NAME = "money-pocket-cache-v11";
const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.webmanifest",
  "./assets/icon.svg",
  "./assets/icon-180.png",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        const responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        return networkResponse;
      });
    })
  );
});
