// The service worker obeys the two arcade rules.
//
// Every game and the launcher share ONE origin, which makes both rules
// (GAME_INTEGRATION §10, tools/templates/game-sw.js) load-bearing:
//
//   1. own nothing outside /sowduku/ — a controlled page routes EVERY request
//      through this worker, the SDK included, so the scope guard is what keeps
//      /sdk/v3/arcade-sdk.js coming from the network
//   2. never clean up origin-wide — caches.keys() returns the launcher's caches
//      and every sibling game's, so an unfiltered sweep in activate() wipes the
//      whole arcade's offline support. This repo shipped that sweep, filtered
//      only to "not the current one", until it was caught here.
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

/** Load sw.js with stub globals; returns its registered handlers. */
function loadWorker() {
  const handlers = {};
  const deleted = [];
  const sandbox = {
    console,
    URL,
    caches: {
      keys: async () => [
        "sowduku-shell-v8",   // ours, current
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
  sandbox.self = {
    addEventListener: (type, fn) => { handlers[type] = fn; },
    skipWaiting: () => {},
    clients: { claim: () => {} },
    location: sandbox.location,
  };
  vm.createContext(sandbox);
  vm.runInContext(
    fs.readFileSync(path.resolve(__dirname, "..", "sw.js"), "utf8"),
    sandbox,
    { filename: "sw.js" }
  );
  return { handlers, deleted, sandbox };
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
  ok(!deleted.includes("sowduku-shell-v8"), "the current cache survives");
  for (const foreign of ["paul-arcade-v63", "hecknsic-v3", "moon-lit-shell-v2"]) {
    ok(!deleted.includes(foreign), `${foreign} is left alone (not ours)`);
  }

  console.log("\n[rule 1] the fetch handler owns /sowduku/ and nothing else");
  const O = "https://paulgibeault.github.io";
  ok(claims(handlers, `${O}/sowduku/index.html`), "serves our own page");
  ok(claims(handlers, `${O}/sowduku/js/audio.js`), "serves our own module");
  for (const foreign of [
    `${O}/sdk/v3/arcade-sdk.js`,   // the SDK — the one that must never be ours
    `${O}/sdk/v3/arcade-audio.js`,
    `${O}/arcade-sdk.js`,          // the evergreen alias
    `${O}/index.html`,             // the launcher itself
    `${O}/hecknsic/index.html`,    // a sibling game
    "https://example.com/x.js",    // another origin
  ]) {
    ok(!claims(handlers, foreign), `falls through to the network: ${foreign}`);
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

run().catch((e) => { console.error(e); process.exit(1); });
