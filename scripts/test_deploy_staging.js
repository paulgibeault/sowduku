// The deploy artifact contains everything the game asks for at runtime.
//
// Three lists have to agree and none of them check each other: index.html's
// script/link tags, the service worker's SHELL precache list, and what the
// Pages job actually publishes. When they drifted apart the symptom was a live
// site with no sound and a service worker whose install() rejected outright —
// invisible from every other suite here, because they all run against local
// files that are obviously present.
//
// No browser needed: stage into a temp dir and read what came out.

const fs = require("fs");
const os = require("os");
const path = require("path");
const { stage, ROOT } = require("./stage-site");

let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; console.log("  ok - " + msg); }
  else { fail++; console.log("  FAIL - " + msg); }
}

/** The SHELL array out of sw.js, without executing service-worker globals. */
function shellList() {
  const src = fs.readFileSync(path.join(ROOT, "sw.js"), "utf8");
  const m = src.match(/const SHELL = \[([\s\S]*?)\];/);
  if (!m) throw new Error("could not find the SHELL array in sw.js");
  return [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
}

/**
 * Local (non-absolute, non-remote) src/href targets in index.html.
 *
 * Literal paths only: index.html also builds img sources by concatenation
 * inside its inline script, and half an expression is not a filename. Those
 * all live under assets/, which is published wholesale.
 */
function indexRefs() {
  const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  return [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
    .map((x) => x[1])
    .filter((u) => !/^(https?:|data:|#|\/)/.test(u))
    .filter((u) => /^[\w./-]+$/.test(u));
}

function run() {
  const out = stage(fs.mkdtempSync(path.join(os.tmpdir(), "sowduku-stage-")));
  const has = (rel) => fs.existsSync(path.join(out, rel));

  console.log("\n[shell] every precached file is published");
  for (const entry of shellList()) {
    // "./" is the directory itself, served as index.html.
    const rel = entry === "./" ? "index.html" : entry;
    ok(has(rel), `sw.js precaches ${entry} and the deploy publishes it`);
  }

  console.log("\n[index] every file index.html loads is published");
  for (const ref of indexRefs()) {
    ok(has(ref), `index.html loads ${ref} and the deploy publishes it`);
  }

  // Root-relative loads (/arcade-sdk.js, /arcade-audio.js) come from the
  // launcher origin by design; they are not ours to publish, and the sw
  // deliberately leaves them uncached. Assert that intent so a well-meaning
  // "fix" that precaches them fails here instead of on a stale install.
  console.log("\n[boundary] launcher-root files stay out of our shell");
  const shell = shellList();
  for (const foreign of ["/arcade-sdk.js", "/arcade-audio.js", "arcade-sdk.js", "arcade-audio.js"]) {
    ok(!shell.includes(foreign), `sw.js does not precache ${foreign}`);
  }

  console.log("\n[hygiene] dev-only files stay out of the artifact");
  for (const devOnly of ["PLAN.md", "README.md", "scripts", "package.json", "mockup.html"]) {
    ok(!has(devOnly), `${devOnly} is not published`);
  }

  fs.rmSync(out, { recursive: true, force: true });
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

run();
