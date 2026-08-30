const CACHE_NAME = "rootbody-v8-architecture-v67";

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

const IOS_STANDALONE_ADAPTER = `<style id="rootbody-ios-v67">
.splash-roots{animation-duration:.50s!important;animation-delay:.56s!important}
.splash-wordmark{animation-delay:.94s!important}
.splash-ripples{animation-duration:.64s!important;animation-delay:1.14s!important;opacity:.55}
.rb-priority-card img,.rb-interpretation-card img{width:112px!important;height:131px!important}
html.standalone-pwa [data-theme-toggle],html.standalone-pwa [data-theme-option]{display:none!important}
@media (prefers-reduced-motion:reduce){.splash-ripples{opacity:0!important}}
</style>
<script id="rootbody-ios-theme-v67">
(()=>{
  const standalone=matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
  const status=document.querySelector('[data-status-bar]');
  let fixingStatus=false;
  const keepDefaultStatus=()=>{
    if(!status||fixingStatus||status.getAttribute('content')==='default')return;
    fixingStatus=true;
    status.setAttribute('content','default');
    fixingStatus=false;
  };
  keepDefaultStatus();
  if(status)new MutationObserver(keepDefaultStatus).observe(status,{attributes:true,attributeFilter:['content']});
  if(!standalone)return;
  const system=matchMedia('(prefers-color-scheme: dark)');
  const syncSystemTheme=()=>{
    const theme=system.matches?'dark':'light';
    document.documentElement.dataset.theme=theme;
    document.documentElement.style.colorScheme=theme;
    document.querySelector('[data-theme-color]')?.setAttribute('content',theme==='dark'?'#08121D':'#F6F8FA');
    try{localStorage.setItem('rootbody.theme',theme);}catch(error){}
  };
  syncSystemTheme();
  if(system.addEventListener)system.addEventListener('change',syncSystemTheme);
  else if(system.addListener)system.addListener(syncSystemTheme);
})();
</script>`;

function transformHtml(html) {
  let next = html.replace(OLD_SPLASH_ROOTS, NEW_SPLASH_ROOTS);
  next = next.replace(
    /<meta name="apple-mobile-web-app-status-bar-style" content="[^"]*" data-status-bar>/,
    '<meta name="apple-mobile-web-app-status-bar-style" content="default" data-status-bar>'
  );
  if (!next.includes('id="rootbody-ios-v67"')) {
    next = next.replace('</head>', `${IOS_STANDALONE_ADAPTER}\n</head>`);
  }
  return next;
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

async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request, { cache: "no-store" });
    if (!response.ok) throw new Error(`Navigation failed: ${response.status}`);

    const html = await response.clone().text();
    const valid = /^\s*<!doctype html>/i.test(html)
      && html.includes('class="app-shell"')
      && /<\/html>\s*$/i.test(html);
    if (!valid) throw new Error("Navigation document is incomplete");

    const transformed = transformHtml(html);
    const headers = new Headers(response.headers);
    headers.set("content-type", "text/html; charset=utf-8");
    const output = new Response(transformed, {
      status: response.status,
      statusText: response.statusText,
      headers
    });

    const cache = await caches.open(CACHE_NAME);
    await cache.put("./index.html", output.clone());
    return output;
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
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
