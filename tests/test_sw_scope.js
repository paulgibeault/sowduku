// The service worker obeys the three arcade rules.
//
// Every game and the launcher share ONE origin, which makes all three rules
// (GAME_INTEGRATION §10, tools/templates/game-sw.js) load-bearing:
//
//   1. own nothing outside /sowduku/ — a controlled page routes EVERY request
//      through this worker, the SDK included, so the scope guard is what keeps
//      /arcade-sdk.js coming from the network
//   2. never clean up origin-wide — caches.keys() returns the launcher's caches
//      and every sibling game's, so an unfiltered sweep in activate() wipes the
//      whole arcade's offline support. This repo shipped that sweep, filtered
//      only to "not the current one", until it was caught here.
//   3. never activate unannounced — install() must not skipWaiting(); the
//      launcher's update control offers the player a reload and then sends
//      arcade:sw.skipWaiting. Omit the handler and the worker waits forever,
//      which looks exactly like having no update.
//
// Plus the cache identity itself: it must keep the shape fleet CI rewrites and
// derive from it, or the rewrite silently stops firing and every returning
// player is stranded on a stale shell.
//
// No browser: run sw.js in a vm with stub globals and drive its handlers. A
// real registration can't help anyway — the worker skips loopback by design,
// so nothing that runs on 127.0.0.1 will ever exercise it.

const fs = require("fs");
const path = require("path");
const vm = require("vm");

let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; console.log("  ok - " + msg); }
  else { fail++; console.log("  FAIL - " + msg); }
}

// The CURRENT cache name, derived the same way sw.js derives it rather than
// repeated here: the version moves on every deploy (CI rewrites APP_VERSION),
// and a hardcoded copy made this suite fail on every legitimate bump.
const SW_SRC = fs.readFileSync(path.resolve(__dirname, "..", "sw.js"), "utf8");
// Missing is a reported failure, not a throw: a worker that has lost the
// APP_VERSION line has ALSO usually lost the rest of the contract, and
// throwing here would hide every one of those failures behind a stack trace.
const APP_VERSION = (SW_SRC.match(/^const APP_VERSION = '([^']*)';$/m) || [])[1];
const CURRENT_CACHE = `sowduku-shell-v${APP_VERSION}`;

// The prefixes activate() filters cleanup to, read from sw.js for the same
// reason. If a derived cache name ever fell outside them, the worker would
// stop collecting its own stale caches and quietly grow forever.
const OURS_PREFIXES = [...(SW_SRC.match(/const OURS = \[([^\]]*)\]/) || [, ""])[1]
  .matchAll(/"([^"]+)"/g)].map((m) => m[1]);

/** Load sw.js with stub globals; returns its registered handlers. */
function loadWorker() {
  const handlers = {};
  const deleted = [];
  const sandbox = {
    console,
    URL,
    caches: {
      keys: async () => [
        CURRENT_CACHE,        // ours, current
        "sowdoku-shell-v7",   // ours, the old spelling
        "paul-arcade-v63",    // the LAUNCHER's
        "hecknsic-v3",        // a sibling game's
        "moon-lit-shell-v2",  // another sibling's
      ],
      delete: async (name) => { deleted.push(name); return true; },
      open: async () => ({ add: async () => {}, put: async () => {} }),
      match: async () => null,
    },
    fetch: async () => ({ ok: true, clone: () => ({}) }),
    location: { origin: "https://paulgibeault.github.io" },
  };
  const calls = { skipWaiting: 0 };
  sandbox.self = {
    addEventListener: (type, fn) => { handlers[type] = fn; },
    skipWaiting: () => { calls.skipWaiting++; },
    clients: { claim: () => {} },
    location: sandbox.location,
  };
  sandbox.calls = calls;
  vm.createContext(sandbox);
  vm.runInContext(
    SW_SRC,
    sandbox,
    { filename: "sw.js" }
  );
  return { handlers, deleted, sandbox, calls };
}

/** Drive the fetch handler for a URL; true when the worker claims the request. */
function claims(handlers, url) {
  let claimed = false;
  handlers.fetch({
    request: { url, method: "GET" },
    respondWith: () => { claimed = true; },
  });
  return claimed;
}

async function run() {
  const { handlers, deleted } = loadWorker();

  console.log("\n[rule 2] activate deletes our stale caches and nobody else's");
  const waits = [];
  await handlers.activate({ waitUntil: (p) => waits.push(p) });
  await Promise.all(waits);

  ok(deleted.includes("sowdoku-shell-v7"), "our own stale cache is cleaned up");
  ok(!deleted.includes(CURRENT_CACHE), "the current cache survives");
  for (const foreign of ["paul-arcade-v63", "hecknsic-v3", "moon-lit-shell-v2"]) {
    ok(!deleted.includes(foreign), `${foreign} is left alone (not ours)`);
  }

  console.log("\n[rule 1] the fetch handler owns /sowduku/ and nothing else");
  const O = "https://paulgibeault.github.io";
  ok(claims(handlers, `${O}/sowduku/index.html`), "serves our own page");
  ok(claims(handlers, `${O}/sowduku/js/audio.js`), "serves our own module");
  for (const foreign of [
    `${O}/arcade-sdk.js`,          // the SDK — the one that must never be ours
    `${O}/arcade-audio.js`,
    `${O}/sdk/v3/arcade-sdk.js`,   // the major-pinned copies stay foreign too
    `${O}/index.html`,             // the launcher itself
    `${O}/hecknsic/index.html`,    // a sibling game
    "https://example.com/x.js",    // another origin
  ]) {
    ok(!claims(handlers, foreign), `falls through to the network: ${foreign}`);
  }

  console.log("\n[rule 3] the worker waits, and activates only when told");
  {
    const w = loadWorker();
    const installWaits = [];
    await w.handlers.install({ waitUntil: (p) => installWaits.push(p) });
    await Promise.all(installWaits);
    ok(w.calls.skipWaiting === 0,
      "install() does not skipWaiting — the launcher's reload prompt depends on the worker waiting");

    // Checked before it is called: a worker with no message handler is the
    // failure this rule exists to catch, and calling undefined would abort the
    // suite instead of reporting it alongside everything else.
    ok(typeof w.handlers.message === "function",
      "sw.js registers a message handler for the launcher's update control");
    if (typeof w.handlers.message === "function") {
      await w.handlers.message({ data: { type: "arcade:sw.skipWaiting" } });
      ok(w.calls.skipWaiting === 1, "the launcher's message activates the waiting worker");

      const other = loadWorker();
      await other.handlers.message({ data: { type: "something-else" } });
      ok(other.calls.skipWaiting === 0, "unrelated messages do not activate the worker");
    }
  }

  console.log("\n[cache identity] keeps the shape fleet CI rewrites");
  // Deliberately a SHAPE check, not APP_VERSION === package.json version. CI
  // writes both in one commit so they agree on main, but any PR left open
  // across a deploy merges a newer package.json onto an older sw.js —
  // equality would fail on branch staleness, which says nothing about whether
  // the worker is correct. The shape is the real invariant: fleet-ci.yml
  // rewrites via an anchored sed, so if this line stops matching, the rewrite
  // silently stops firing and the cache identity freezes.
  ok(/^const APP_VERSION = '[^']*';$/m.test(SW_SRC),
    "sw.js declares APP_VERSION in the exact form fleet-ci.yml's sed targets");
  ok(/^\d+\.\d+\.\d+$/.test(APP_VERSION),
    `APP_VERSION is a bare semver (got '${APP_VERSION}')`);
  ok(/^const CACHE = `sowduku-shell-v\$\{APP_VERSION\}`;$/m.test(SW_SRC),
    "CACHE interpolates APP_VERSION rather than hardcoding a version");
  ok(OURS_PREFIXES.length > 0, "sw.js declares the OURS cleanup prefixes");
  ok(OURS_PREFIXES.some((p) => CURRENT_CACHE.startsWith(p)),
    "the derived cache name is still matched by the OURS prefixes activate() cleans");

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

run().catch((e) => { console.error(e); process.exit(1); });
