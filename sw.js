// Minimal offline shell — cache-first for the app's own files, straight to
// the network for anything else (e.g. the arcade SDK, which needs to be live
// to see fresh cross-device state).
//
// Every game and the launcher share ONE origin, which is what makes the three
// arcade rules (tools/templates/game-sw.js) load-bearing here: own nothing
// outside /sowduku/, never clean up anything that isn't ours, and never
// activate unannounced.
//
// The hand-bumped shell counter this file used to carry (v8 fixed a precache
// list that had been rejecting install() outright since the audio overhaul; v9
// carried sound pack v5.1; v10 retired the chiptune fallback) is gone. It was
// reliable here only because someone remembered every time — and remembering
// is exactly what failed elsewhere in the fleet, twice, shipping fixes that no
// returning player ever executed. CI owns the version now.

// Written by fleet CI on every deploy (fleet-ci.yml, "Bump patch version").
// DO NOT EDIT BY HAND. Single quotes and no leading whitespace are required:
// CI finds this line with `grep -q "^const APP_VERSION = '"` and rewrites it
// with an anchored sed, so the quoting style that would match the rest of this
// file would silently disable the rewrite. That is deliberate ugliness.
const APP_VERSION = '0.0.1';

// Prefixed so OURS below still matches, and so the old hand-numbered
// "sowduku-shell-v10" cache is collected rather than orphaned.
const CACHE = `sowduku-shell-v${APP_VERSION}`;
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
  // Sound. The element library itself (/arcade-audio.js) is launcher-
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
  // Deliberately NOT skipWaiting(). The new worker installs and waits; the
  // launcher's update control offers the player a reload and then sends the
  // message below once they accept. Activating unannounced swaps the cache
  // under a running game — and this game is cache-first, so the swap decides
  // which build every lazily-fetched asset comes from.
});

self.addEventListener("message", (e) => {
  // Sent by the launcher's update control (menu → "Check for Updates", or the
  // automatic prompt) once the player accepts the reload. Without this handler
  // the worker above waits forever.
  if (e.data && e.data.type === "arcade:sw.skipWaiting") self.skipWaiting();
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
