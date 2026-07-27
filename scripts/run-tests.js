// The whole test tier, in one command: `npm test`.
//
// Discovery, not enumeration — every scripts/test_*.js runs here, so a new
// suite is covered by CI the moment it lands, with no workflow edit. Suites
// are plain node scripts that exit non-zero on failure; this stages the server
// they expect, runs them one at a time, and reports.
//
// Usage:
//   node scripts/run-tests.js              # everything
//   node scripts/run-tests.js stakes veil  # only suites matching a substring

const { execFileSync, spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const { serve } = require("./lib/serve");

const PORT = 8934;               // the BASE every browser suite hard-codes
const HERE = __dirname;
const ROOT = path.resolve(HERE, "..");

// Shipped JS, checked before we spend a browser on it: a syntax error here
// breaks the deployed game, and it's a second to catch.
const SYNTAX = ["sowdoku.js", "campaigns.js", "sw.js", "demo.js", "js/audio.js", "js/soundpack.js"];

/**
 * Run one suite to completion, resolving to its exit code.
 *
 * Must NOT be spawnSync: the staged server lives in THIS process, and a
 * synchronous child blocks the event loop that would answer its requests —
 * every page load then hangs until the suite times out.
 */
function run(file) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [file], { stdio: "inherit" });
    child.on("close", (code) => resolve(code === null ? 1 : code));
  });
}

function suites(filters) {
  return fs.readdirSync(HERE)
    .filter((f) => f.startsWith("test_") && f.endsWith(".js"))
    .filter((f) => !filters.length || filters.some((s) => f.includes(s)))
    .sort();
}

async function main() {
  const filters = process.argv.slice(2);
  const files = suites(filters);
  if (!files.length) {
    console.error(filters.length ? "no suites match: " + filters.join(", ") : "no suites found");
    process.exit(1);
  }

  console.log("== syntax check ==");
  for (const f of SYNTAX) {
    execFileSync(process.execPath, ["--check", path.join(ROOT, f)], { stdio: "inherit" });
    console.log("  ok - " + f);
  }

  let stop;
  try {
    stop = await serve(PORT);
  } catch (e) {
    if (e.code === "EADDRINUSE") {
      console.error(
        `\nPort ${PORT} is already taken, and the suites hard-code it. Stop whatever\n` +
        `is listening there and re-run — a plain static server on ${PORT} is NOT a\n` +
        `substitute, since it won't serve /arcade-sdk.js and nothing will save.`
      );
      process.exit(1);
    }
    throw e;
  }
  console.log(`\nstaged server on http://localhost:${PORT} (game over launcher)`);

  const failed = [];
  for (const f of files) {
    console.log(`\n===== ${f} `.padEnd(72, "="));
    const started = Date.now();
    const code = await run(path.join(HERE, f));
    const secs = ((Date.now() - started) / 1000).toFixed(1);
    if (code !== 0) {
      failed.push(f);
      console.log(`----- ${f}: FAILED (${secs}s)`);
    } else {
      console.log(`----- ${f}: passed (${secs}s)`);
    }
  }

  await stop();

  console.log("\n" + "=".repeat(72));
  console.log(`${files.length - failed.length}/${files.length} suites passed`);
  if (failed.length) {
    console.log("failed:\n" + failed.map((f) => "  " + f).join("\n"));
    process.exit(1);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
