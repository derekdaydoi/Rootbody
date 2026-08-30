const CACHE_NAME = "rootbody-v8-architecture-v62";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css?v=61",
  "./v8.css?v=61",
  "./food-data.js?v=61",
  "./coach-data.js?v=61",
  "./health-engine.js?v=61",
  "./app.js?v=61",
  "./coach.js?v=61",
  "./intelligence.js?v=61",
  "./manifest.webmanifest",
  "./brand/rootbody-symbol.svg",
  "./brand/rootbody-logo.svg",
  "./brand/rootbody-wordmark.svg",
  "./brand/rootbody-mark.svg",
  "./brand/rootbody-mark-dark.svg",
  "./brand/rootbody-lab.svg",
  "./fonts/open-sans-vietnamese.woff2",
  "./fonts/open-sans-latin-ext.woff2",
  "./fonts/open-sans-latin.woff2",
  "./icon-180.png",
  "./icon-192.png",
  "./icon-512.png"
];

const OPTIONAL_MEDIA = [
  "./equipment/multi-press.svg",
  "./equipment/dumbbell.svg",
  "./equipment/stair-climber.svg",
  "./equipment/bike.svg",
  "./equipment/treadmill.svg",
  "./equipment/hip-machine.svg",
  "./equipment/pullup.svg",
  "./equipment/bench.svg",
  "./equipment/core.svg",
  "./exercise-art/assisted-pullup.webp",
  "./exercise-art/bike-steady.webp",
  "./exercise-art/chest-press.webp",
  "./exercise-art/db-bench.webp",
  "./exercise-art/db-curl.webp",
  "./exercise-art/db-rdl.webp",
  "./exercise-art/db-row.webp",
  "./exercise-art/dead-bug.webp",
  "./exercise-art/goblet-squat.webp",
  "./exercise-art/hip-abduction.webp",
  "./exercise-art/hip-adduction.webp",
  "./exercise-art/incline-press.webp",
  "./exercise-art/incline-walk.webp",
  "./exercise-art/lateral-raise.webp",
  "./exercise-art/plank.webp",
  "./exercise-art/reverse-crunch.webp",
  "./exercise-art/shoulder-press.webp",
  "./exercise-art/split-squat.webp",
  "./exercise-art/stair-steady.webp",
  "./exercise-form/assisted-pullup.webp",
  "./exercise-form/bike-steady.webp",
  "./exercise-form/calf-raise.webp",
  "./exercise-form/chest-press.webp",
  "./exercise-form/db-bench.webp",
  "./exercise-form/db-curl.webp",
  "./exercise-form/db-rdl.webp",
  "./exercise-form/db-row.webp",
  "./exercise-form/dead-bug.webp",
  "./exercise-form/goblet-squat.webp",
  "./exercise-form/hip-abduction.webp",
  "./exercise-form/hip-adduction.webp",
  "./exercise-form/incline-press.webp",
  "./exercise-form/incline-walk.webp",
  "./exercise-form/lateral-raise.webp",
  "./exercise-form/plank.webp",
  "./exercise-form/rear-delt-fly.webp",
  "./exercise-form/reverse-crunch.webp",
  "./exercise-form/shoulder-press.webp",
  "./exercise-form/split-squat.webp",
  "./exercise-form/stair-steady.webp",
  "./exercise-form/triceps-extension.webp"
];

const OLD_SPLASH_ROOTS = '<path class="splash-roots" pathLength="1" d="M112 150V228M112 157C97 168 82 176 61 183M112 163C98 181 88 199 84 214M112 157C127 168 142 176 163 183M112 163C126 181 136 199 140 214" fill="none" stroke="#0FA3A3" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>';
const NEW_SPLASH_ROOTS = '<path class="splash-roots" pathLength="1" d="M112 150C112 178 112 204 112 228M110 158C94 169 78 180 58 187M110 168C99 181 91 197 87 214M114 158C130 169 146 180 166 187M114 168C125 181 133 197 137 214" fill="none" stroke="#0FA3A3" stroke-width="7.5" stroke-linecap="round" stroke-linejoin="round"/>';
const MOTION_OVERRIDE = `<style id="rootbody-brand-v62">
.splash-roots{animation-duration:.50s!important;animation-delay:.56s!important}
.splash-wordmark{animation-delay:.94s!important}
.splash-ripples{animation-duration:.64s!important;animation-delay:1.14s!important;opacity:.55}
@media (prefers-reduced-motion: reduce){.splash-ripples{opacity:0!important}}
</style>`;

function transformBrandHtml(html) {
  let next = html.replace(OLD_SPLASH_ROOTS, NEW_SPLASH_ROOTS);
  if (!next.includes('id="rootbody-brand-v62"')) next = next.replace('</head>', `${MOTION_OVERRIDE}\n</head>`);
  return next;
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await cache.addAll(APP_SHELL);
      await Promise.allSettled(OPTIONAL_MEDIA.map((path) => cache.add(path)));
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request, { cache: "no-store" });
    if (!response.ok) throw new Error(`Navigation failed: ${response.status}`);

    const html = await response.clone().text();
    const isCompleteDocument = /^\s*<!doctype html>/i.test(html)
      && /<link\b[^>]*href=["']\.\/styles\.css(?:\?v=\d+)?["']/i.test(html)
      && html.includes('class="app-shell"')
      && /<\/html>\s*$/i.test(html);

    if (!isCompleteDocument) throw new Error("Navigation document is incomplete");

    const transformedHtml = transformBrandHtml(html);
    const headers = new Headers(response.headers);
    headers.set("content-type", "text/html; charset=utf-8");
    const transformedResponse = new Response(transformedHtml, {
      status: response.status,
      statusText: response.statusText,
      headers
    });

    const cache = await caches.open(CACHE_NAME);
    await cache.put("./index.html", transformedResponse.clone());
    return transformedResponse;
  } catch (error) {
    const cached = await caches.match("./index.html");
    if (cached) return cached;
    throw error;
  }
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (event.request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(event.request));
    return;
  }

  event.respondWith(
    fetch(event.request).then((response) => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
      return response;
    }).catch(() => caches.match(event.request))
  );
});
