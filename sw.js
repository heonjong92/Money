// [Codex] 정적 자산을 선캐시해 홈 화면 앱이나 오프라인 환경에서도 기본 화면이 열리게 합니다.
// [Codex] 앱 쉘이 이전 정적 파일을 계속 재사용하지 않도록 캐시 버전을 올려 이번 수정이 즉시 반영되게 합니다.
// [Codex] 레이아웃을 크게 바꿨기 때문에 새 앱 셸이 즉시 반영되도록 캐시 버전을 갱신합니다.
const CACHE_NAME = "money-pocket-cache-v16";
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

// [Codex] 배포 환경에서는 HTML, JS, CSS 같은 앱 셸 파일을 네트워크 우선으로 읽어 GitHub Pages에서도 최신 동작이 먼저 반영되게 합니다.
function isAppShellRequest(request) {
  if (request.mode === "navigate") {
    return true;
  }

  const url = new URL(request.url);
  return ["/index.html", "/app.js", "/styles.css", "/manifest.webmanifest"].some((suffix) => url.pathname.endsWith(suffix));
}

function cacheResponse(request, response) {
  if (!response || response.status !== 200) {
    return response;
  }

  const responseClone = response.clone();
  caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
  return response;
}

async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    return cacheResponse(request, networkResponse);
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    if (request.mode === "navigate") {
      const fallbackResponse = await caches.match("./index.html");
      if (fallbackResponse) {
        return fallbackResponse;
      }
    }

    throw error;
  }
}

async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  const networkResponse = await fetch(request);
  return cacheResponse(request, networkResponse);
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(isAppShellRequest(event.request) ? networkFirst(event.request) : cacheFirst(event.request));
});
