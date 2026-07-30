// Stage the deploy artifact — the per-app half of the fleet contract
// (GAME_INTEGRATION §13a). tools/verify-artifact.mjs is identical fleet-wide
// and calls into this; only the way an artifact gets produced differs.
//
// This app publishes a curated file set rather than "tracked files minus the
// dev set": scripts/stage-site.js holds it, and it already exports exactly
// the contract the fleet verifier wants. Keep the list there — it is what
// the deploy runs, and a second copy here would go stale in silence.
//
// Usage: node tools/stage.mjs <outDir>
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { injectPrecache } from "./inject-precache.mjs";

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const stageSite = require(path.join(HERE, "..", "scripts", "stage-site.js"));

export const ROOT = stageSite.ROOT;

// Published, deliberately not precached. This is the only knob on the
// generated list (tools/inject-precache.mjs), and it is reviewed rather than
// silent: tools/verify-artifact.mjs fails the build on any published file that
// is neither cached nor named here.
//
// The frozen chiptune archive, kept as provenance.
export const PRECACHE_EXCLUDE = [
  "audio/chiptune-archive.mjs",
];


export function stage(outDir) {
  const out = path.resolve(ROOT, outDir);
  stageSite.stage(out);
  // Last, so it sees the finished artifact — the precache list is written from
  // what is actually about to deploy, not from what anyone believes is.
  injectPrecache(out, { exclude: PRECACHE_EXCLUDE });
  return { outDir: out };
}

if (process.argv[1] && import.meta.url === new URL(`file://${path.resolve(process.argv[1])}`).href) {
  const out = process.argv[2];
  if (!out) { console.error("usage: node tools/stage.mjs <outDir>"); process.exit(1); }
  stage(out);
}
