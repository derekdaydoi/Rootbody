const CACHE_NAME = "rootbody-v8-architecture-v68";

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

const OLD_SPLASH_ROOTS = '<path class="splash-roots" pathLength="1" d="M112 150V228M112 157C97 168 82 176 61 183M112 163C98 181 88 199 84 214M112 157C127 168 142 176 163 183M112 163C126 181 136 199 140 214" fill="none" stroke="#0FA3A3" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>';
const NEW_SPLASH_ROOTS = '<path class="splash-roots" pathLength="1" d="M112 150C112 178 112 204 112 228M110 158C94 169 78 180 58 187M110 168C99 181 91 197 87 214M114 158C130 169 146 180 166 187M114 168C125 181 133 197 137 214" fill="none" stroke="#0FA3A3" stroke-width="7.5" stroke-linecap="round" stroke-linejoin="round"/>';

const IOS_SHELL_OVERRIDE = `<style id="rootbody-ios-shell-v68">
/* iOS standalone with status-bar-style=default already lays web content below
   the system status bar. Do not add a second top safe-area or dark overlay. */
html.standalone-pwa{--rb-safe-top:0px!important;}
html.standalone-pwa body::before{content:none!important;display:none!important;background:none!important;}
html.standalone-pwa .screen-heading.rb-screen-heading{
  min-height:66px!important;
  padding-top:13px!important;
}
.rb-priority-card img{width:112px!important;height:131px!important;}
.splash-roots{animation-duration:.50s!important;animation-delay:.56s!important;}
.splash-wordmark{animation-delay:.94s!important;}
.splash-ripples{animation-duration:.64s!important;animation-delay:1.14s!important;opacity:.55;}
@media (prefers-reduced-motion:reduce){.splash-ripples{opacity:0!important;}}
</style>`;

function transformHtml(html) {
  let next = html.replace(OLD_SPLASH_ROOTS, NEW_SPLASH_ROOTS);
  next = next.replace(
    /<meta name="apple-mobile-web-app-status-bar-style" content="[^"]*" data-status-bar>/,
    '<meta name="apple-mobile-web-app-status-bar-style" content="default" data-status-bar>'
  );
  if (!next.includes('id="rootbody-ios-shell-v68"')) {
    next = next.replace('</head>', `${IOS_SHELL_OVERRIDE}\n</head>`);
  }
  return next;
}

function transformAppJs(js) {
  return js.replace(
    /\s*const statusBar = \$\("\[data-status-bar\]"\);\s*if \(statusBar\) statusBar\.setAttribute\("content", "black-translucent"\);/,
    '\n    // iOS standalone status-bar-style is fixed at document bootstrap. Do not mutate it at runtime.'
  );
}

function textResponse(source, text, contentType) {
  const headers = new Headers(source.headers);
  headers.set("content-type", contentType);
  return new Response(text, {
    status: source.status,
    statusText: source.statusText,
    headers
  });
}

async function transformedNavigation(request) {
  try {
    const response = await fetch(request, { cache: "no-store" });
    if (!response.ok) throw new Error(`Navigation failed: ${response.status}`);
    const html = await response.clone().text();
    const valid = /^\s*<!doctype html>/i.test(html)
      && html.includes('class="app-shell"')
      && /<\/html>\s*$/i.test(html);
    if (!valid) throw new Error("Navigation document is incomplete");

    const output = textResponse(response, transformHtml(html), "text/html; charset=utf-8");
    const cache = await caches.open(CACHE_NAME);
    await cache.put("./index.html", output.clone());
    return output;
  } catch (error) {
    const cached = await caches.match("./index.html");
    if (!cached) throw error;
    const html = await cached.clone().text();
    return textResponse(cached, transformHtml(html), "text/html; charset=utf-8");
  }
}

async function transformedAppJs(request) {
  try {
    const response = await fetch(request, { cache: "no-store" });
    if (!response.ok) throw new Error(`app.js failed: ${response.status}`);
    const js = await response.clone().text();
    const output = textResponse(response, transformAppJs(js), "text/javascript; charset=utf-8");
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, output.clone());
    return output;
  } catch (error) {
    const cached = await caches.match(request) || await caches.match("./app.js?v=61");
    if (!cached) throw error;
    const js = await cached.clone().text();
    return textResponse(cached, transformAppJs(js), "text/javascript; charset=utf-8");
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await Promise.allSettled(APP_SHELL.map((path) => cache.add(path)));
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

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (event.request.mode === "navigate") {
    event.respondWith(transformedNavigation(event.request));
    return;
  }

  if (/\/app\.js$/.test(url.pathname)) {
    event.respondWith(transformedAppJs(event.request));
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});