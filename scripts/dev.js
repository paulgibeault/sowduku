// Play the game locally, on the origin shape production actually uses.
//
//   node scripts/dev.js [port]        → http://127.0.0.1:8642/sowduku/
//
// This is the interactive sibling of run-tests.js: same staged origin from
// lib/serve.js, so what you play is the built artifact behind the real
// launcher — the launcher (and its root-relative SDK + audio companion)
// at `/`, the game at `/sowduku/`.
//
// That layout is the whole reason this exists rather than `python -m
// http.server`. Serving dist/ at the origin root would leave the SDK and the
// audio companion 404ing, and js/audio.js would quietly fall back to the
// archived pre-overhaul spec cues — by design, since a player on a stale
// cache should get the old sound rather than silence. You would hear sound,
// it would be the wrong sound, and nothing would tell you. Confirm the graph
// path in the console with:
//
//   SowdokuAudio.isGraphMode()      // must be true
//
// The framework's own dev.sh is not used here for the same reason: it stages
// a point-in-time copy rather than serving the launcher checkout in place
// (see lib/serve.js's header for the full rationale).
//
// dist/ is rebuilt on start, so edits to js/soundpack.js are picked up by
// restarting. Nothing is watched — the pack is not something you tweak by
// reload, it is something you render, audition and then play.

const { execFileSync } = require("child_process");
const path = require("path");
const { serve, LAUNCHER, ROOT } = require("./lib/serve");

const PORT = parseInt(process.argv[2], 10) || 8642;

execFileSync(process.execPath, [path.join(__dirname, "stage-site.js"), "dist"], {
  cwd: ROOT,
  stdio: "inherit",
});

serve(PORT).then(() => {
  const url = `http://127.0.0.1:${PORT}/sowduku/`;
  console.log(`\n  launcher   ${LAUNCHER}`);
  console.log(`  game       ${url}`);
  console.log(`\n  Sound is the launcher's to control — the game has no toggle of its own.`);
  console.log(`  Check the pack actually loaded:  SowdokuAudio.isGraphMode() === true`);
  console.log(`\n  ctrl-c to stop.\n`);
}).catch((e) => {
  console.error(`\n  ${e.message}\n`);
  process.exit(1);
});
