// Build the Pages deploy artifact: runtime files only, nothing else.
//
// This exists so the published file set is code (checked by
// test_deploy_staging.js) instead of a `cp` line in a YAML file that nobody
// reads. The bug it retires: js/soundpack.js and js/audio.js shipped in
// index.html and in the service worker's precache list for a month while the
// deploy step never copied them — so the live site had no sound and, because
// cache.addAll() is all-or-nothing, no working offline install either. Nothing
// said a word.
//
// Usage: node scripts/stage-site.js _site

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

// Everything the deployed game needs, and nothing a player never fetches.
// Whole directories are copied wholesale — a new asset or module lands on the
// site by existing, not by being remembered here.
const FILES = ["index.html", "sowdoku.js", "campaigns.js", "sw.js", "icon.png"];
const DIRS = ["assets", "js"];

function stage(outDir) {
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
  for (const f of FILES) fs.copyFileSync(path.join(ROOT, f), path.join(outDir, f));
  for (const d of DIRS) {
    fs.cpSync(path.join(ROOT, d), path.join(outDir, d), { recursive: true });
  }
  return outDir;
}

module.exports = { stage, FILES, DIRS, ROOT };

if (require.main === module) {
  const out = path.resolve(process.argv[2] || "_site");
  stage(out);
  console.log("staged -> " + out);
}
