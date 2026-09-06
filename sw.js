const CACHE_NAME = "rootbody-v8-architecture-v71";

const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css?v=71",
  "./v8.css?v=71",
  "./food-data.js?v=71",
  "./coach-data.js?v=71",
  "./health-engine.js?v=71",
  "./app.js?v=71",
  "./coach.js?v=71",
  "./intelligence.js?v=71",
  "./manifest.webmanifest?v=71",
  "./brand/rootbody-symbol.svg",
  "./brand/rootbody-logo.svg",
  "./brand/rootbody-wordmark.svg",
  "./brand/rootbody-mark.svg",
  "./brand/rootbody-mark-dark.svg",
  "./brand/rootbody-base.svg",
  "./brand/rootbody-signal.svg",
  "./brand/rootbody-favicon.svg",
  "./brand/rootbody-lab.svg",
  "./fonts/open-sans-vietnamese.woff2",
  "./fonts/open-sans-latin-ext.woff2",
  "./fonts/open-sans-latin.woff2",
  "./icon-180.png?v=71",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-1024.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request, { cache: "no-store" })
        .then((response) => {
          if (!response.ok) throw new Error("Navigation failed: " + response.status);
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("./index.html", copy));
          return response;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
