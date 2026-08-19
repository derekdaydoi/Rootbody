const CACHE_NAME = "rootbody-v7-human-guides-v41";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css?v=41",
  "./food-data.js?v=41",
  "./coach-data.js?v=41",
  "./app.js?v=41",
  "./coach.js?v=41",
  "./manifest.webmanifest",
  "./brand/rootbody-symbol.svg",
  "./brand/rootbody-logo.svg",
  "./brand/rootbody-wordmark.svg",
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
  "./exercise-art/stair-steady.webp"
  ,"./exercise-form/assisted-pullup.webp"
  ,"./exercise-form/bike-steady.webp"
  ,"./exercise-form/calf-raise.webp"
  ,"./exercise-form/chest-press.webp"
  ,"./exercise-form/db-bench.webp"
  ,"./exercise-form/db-curl.webp"
  ,"./exercise-form/db-rdl.webp"
  ,"./exercise-form/db-row.webp"
  ,"./exercise-form/dead-bug.webp"
  ,"./exercise-form/goblet-squat.webp"
  ,"./exercise-form/hip-abduction.webp"
  ,"./exercise-form/hip-adduction.webp"
  ,"./exercise-form/incline-press.webp"
  ,"./exercise-form/incline-walk.webp"
  ,"./exercise-form/lateral-raise.webp"
  ,"./exercise-form/plank.webp"
  ,"./exercise-form/rear-delt-fly.webp"
  ,"./exercise-form/reverse-crunch.webp"
  ,"./exercise-form/shoulder-press.webp"
  ,"./exercise-form/split-squat.webp"
  ,"./exercise-form/stair-steady.webp"
  ,"./exercise-form/triceps-extension.webp"
];

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

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put("./index.html", copy));
        return response;
      }).catch(() => caches.match("./index.html"))
    );
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
