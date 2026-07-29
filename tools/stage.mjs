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

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const stageSite = require(path.join(HERE, "..", "scripts", "stage-site.js"));

export const ROOT = stageSite.ROOT;

export function stage(outDir) {
  const out = path.resolve(ROOT, outDir);
  stageSite.stage(out);
  return { outDir: out };
}

if (process.argv[1] && import.meta.url === new URL(`file://${path.resolve(process.argv[1])}`).href) {
  const out = process.argv[2];
  if (!out) { console.error("usage: node tools/stage.mjs <outDir>"); process.exit(1); }
  stage(out);
}
