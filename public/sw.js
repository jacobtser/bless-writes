/*
 * Bless Writes service worker.
 *
 * Strategy:
 *   - Bypass every /api/ request entirely (network only, never cached). The
 *     book-byte endpoint must never be stored; offline reading relies on the
 *     encrypted IndexedDB copy instead.
 *   - Cache-first for hashed build output and static assets (/ _next/static,
 *     fonts, images, icons) — safe because those URLs are content-addressed.
 *   - Network-first for page navigations, falling back to a cached app shell
 *     and finally the /offline page when the network is unavailable.
 *
 * Bump CACHE_VERSION on any change to invalidate old caches on activate.
 */

const CACHE_VERSION = "v4";
const STATIC_CACHE = `bless-static-${CACHE_VERSION}`;
const PAGES_CACHE = `bless-pages-${CACHE_VERSION}`;
const OFFLINE_URL = "/offline";

const PRECACHE_URLS = [
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/icon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/maskable-192.png",
  "/icons/maskable-512.png",
  "/icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PAGES_CACHE);
      // Cache each shell asset independently: one missing icon must never stop
      // the worker from installing and making the app launchable.
      await Promise.all(
        PRECACHE_URLS.map(async (url) => {
          try {
            const response = await fetch(new Request(url, { cache: "reload" }));
            if (response.ok) await cache.put(url, response);
          } catch {
            /* best-effort precache */
          }
        }),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== PAGES_CACHE)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only GET requests are cacheable; let everything else hit the network.
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Same-origin only, and never intercept API traffic or Next internals that
  // must stay live (RSC/prefetch data is intentionally left to the network).
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  // Navigations: network-first, with an offline shell fallback.
  if (request.mode === "navigate") {
    event.respondWith(handleNavigate(request));
    return;
  }

  // The manifest is stable but updated on deploy: refresh it when online and
  // fall back to the precached copy when not.
  if (url.pathname === "/manifest.webmanifest") {
    event.respondWith(networkFirst(request, PAGES_CACHE));
    return;
  }

  // Vendored assets (e.g. the pdf.js worker) live at a *stable, non-hashed*
  // path, so cache-first would pin an old copy forever. Use network-first and
  // only fall back to cache when offline.
  if (url.pathname.startsWith("/vendor/")) {
    event.respondWith(networkFirst(request, STATIC_CACHE));
    return;
  }

  // Content-addressed build assets & static media: cache-first.
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
  }
});

async function handleNavigate(request) {
  try {
    const response = await fetch(request);
    if (isCacheablePage(response)) {
      const cache = await caches.open(PAGES_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cache = await caches.open(PAGES_CACHE);
    const cached = await cache.match(request);
    if (cached) return cached;
    const offline = await cache.match(OFFLINE_URL);
    if (offline) return offline;
    return new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } });
  }
}

// Only store clean, non-personalized page shells. Anything marked no-store,
// carrying Set-Cookie (an auth token was just refreshed), or not 2xx is left
// out of the cache so credentials and stale states are never replayed.
function isCacheablePage(response) {
  if (!response.ok) return false;
  if (response.headers.has("set-cookie")) return false;
  const cacheControl = response.headers.get("cache-control") || "";
  if (/no-store|private/i.test(cacheControl)) return false;
  return true;
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return cached ?? new Response("", { status: 504 });
  }
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    return cached ?? new Response("", { status: 504 });
  }
}

function isStaticAsset(url) {
  if (url.pathname.startsWith("/_next/static/")) return true;
  return /\.(?:css|js|mjs|woff2?|ttf|otf|png|jpe?g|gif|svg|webp|avif|ico)$/i.test(url.pathname);
}
