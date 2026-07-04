// Minimal offline shell — cache-first for the app's own files, straight to
// the network for anything else (e.g. the arcade SDK, which needs to be live
// to see fresh cross-device state). Bump CACHE on any shell/asset change so
// old installs pick up the new files instead of serving stale ones forever.
const CACHE = "sowdoku-shell-v3";
const SHELL = [
  "./",
  "index.html",
  "sowdoku.js",
  "campaigns.js",
  "assets/fonts/fraunces-variable.woff2",
  "assets/fonts/inter-variable.woff2",
  "assets/favicon/favicon.ico",
  "assets/favicon/favicon-16x16.png",
  "assets/favicon/favicon-32x32.png",
  "assets/favicon/favicon-192x192.png",
  "assets/favicon/favicon-512x512.png",
  "assets/favicon/apple-touch-icon.png",
  "assets/favicon/site.webmanifest",
  "assets/logo/wordmark.png",
  "assets/logo/mark-square.png",
  "assets/piggy/settled.png",
  "assets/piggy/unimpressed.png",
  "assets/board/heart-full.png",
  "assets/board/heart-empty.png",
  "assets/board/hoofprint.png",
  "assets/illustration/win-vignette.png",
  "assets/illustration/fail-vignette.png",
  "assets/illustration/misty-badge.png",
  "assets/illustration/empty-history.png",
  "assets/illustration/empty-curated.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return; // leave the arcade SDK etc. to the network

  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      }).catch(() => cached);
    })
  );
});
