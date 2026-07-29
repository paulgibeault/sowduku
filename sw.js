// Minimal offline shell — cache-first for the app's own files, straight to
// the network for anything else (e.g. the arcade SDK, which needs to be live
// to see fresh cross-device state). Bump CACHE on any shell/asset change so
// old installs pick up the new files instead of serving stale ones forever.
//
// Every game and the launcher share ONE origin, which is what makes the two
// arcade rules (tools/templates/game-sw.js) load-bearing here: own nothing
// outside /sowduku/, and never clean up anything that isn't ours.
//
// v8: the shell list finally matches what ships — js/soundpack.js and
// js/audio.js were precached but never published, and cache.addAll() is
// all-or-nothing, so install() had been rejecting outright and no visitor
// since the audio overhaul had an offline shell at all.
// v9: sound pack v5.1 (the cozy/cute/fun redesign — seven cues, chime on the
// win, sad trombone on the fail) touched index.html, js/soundpack.js and
// js/audio.js, all of which are precached above this line.
// v10: the chiptune fallback is retired fleet-wide — js/audio.js registers the
// graph pack or nothing, and a stale cache plays silence by design.
const CACHE = "sowduku-shell-v10";
// Caches this game has owned, across the sowdoku→sowduku spelling. Cleanup is
// filtered to exactly these prefixes: caches.keys() returns every cache on the
// origin — the launcher's and every sibling game's — so a bare "not the
// current one" filter deletes the whole arcade's offline support.
const OURS = ["sowduku-", "sowdoku-"];
const SHELL = [
  "./",
  "index.html",
  "sowdoku.js",
  "campaigns.js",
  // Sound. The element library itself (/sdk/v3/arcade-audio.js) is launcher-
  // root and deliberately NOT cached here — same rule as the SDK below: this
  // worker only owns files under its own scope, and the SDK reports a console
  // error when it finds launcher files in a game's cache. If it is
  // unavailable, these two register nothing and the game plays silence — the
  // deliberate stale-cache state, not an error (see js/audio.js).
  "js/soundpack.js",
  "js/audio.js",
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
  // Per-asset add(), not addAll(): addAll rejects the WHOLE install if any one
  // entry 404s, which is how a single unpublished file (js/, for a month) cost
  // every visitor their offline shell with nothing said. One gap should cost
  // one file and a console line. Same reasoning as the launcher's own worker.
  e.waitUntil(caches.open(CACHE).then((c) =>
    Promise.all(SHELL.map((asset) =>
      c.add(asset).catch((err) =>
        console.warn("[sw] precache skipped", asset, err && err.message))
    ))
  ));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE && OURS.some((p) => k.startsWith(p)))
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  // Scope-prefix guard: never cache /arcade-sdk.js or other launcher-root
  // files this worker doesn't own, in the arcade or the dev harness alike.
  if (!url.pathname.startsWith("/sowduku/")) return;

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
