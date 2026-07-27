// The arcade's own integration gate, run against this game: `npm run acceptance`.
//
// GAME_INTEGRATION §13 ships tools/acceptance.mjs in the launcher repo — a
// Playwright runner for the whole integration checklist (framed handshake,
// namespaced storage, save/load round-trip, font-scale propagation,
// suspend/resume, caps negotiation, graceful degradation under an older
// launcher). None of that is this repo's to reimplement, and the suites here
// deliberately don't try: they test the game, this tests the integration.
//
// The doc's flow is `./dev.sh ../sow-duku` in one shell and the runner in
// another. This does both in one process against the same staged origin
// lib/serve.js gives the suites — which also sidesteps dev.sh's pinned-SDK
// glob, which stages /sdk/v3/arcade-sdk.js but not the arcade-audio.js beside
// it, so a game loading the documented audio path fails check 1 there.

const { execFileSync, spawn } = require("child_process");
const path = require("path");
const { serve, LAUNCHER } = require("./lib/serve");
const { BASE, PORT } = require("./lib/base");

async function main() {
  execFileSync(process.execPath, [path.join(__dirname, "stage-site.js"),
    path.join(__dirname, "..", "dist")], { stdio: "inherit" });

  const stop = await serve(PORT);
  // spawn, never spawnSync: the staged origin runs in THIS process, and a
  // synchronous child would block the event loop that answers the runner's
  // own page loads.
  const code = await new Promise((resolve) => {
    const child = spawn(process.execPath,
      [path.join(LAUNCHER, "tools", "acceptance.mjs"), BASE + "/"],
      { stdio: "inherit", cwd: LAUNCHER });
    child.on("close", (c) => resolve(c === null ? 1 : c));
  });
  await stop();
  process.exit(code);
}

main().catch((e) => { console.error(e); process.exit(1); });
