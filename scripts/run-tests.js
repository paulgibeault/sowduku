// The whole test tier, in one command: `npm test`.
//
// Discovery, not enumeration — every tests/test_*.js runs here, so a new
// suite is covered by CI the moment it lands, with no workflow edit. Suites
// are plain node scripts that exit non-zero on failure; this builds the
// artifact, stages it the way the arcade serves it, runs the suites one at a
// time, and reports.
//
// If a dev.sh session is already serving the game (GAME_INTEGRATION §12), that
// origin is reused as-is — so the documented workflow needs nothing extra:
//
//   ./dev.sh ../sow-duku     # in the launcher repo
//   npm test
//
// Usage:
//   node scripts/run-tests.js              # everything
//   node scripts/run-tests.js stakes veil  # only suites matching a substring

const { execFileSync, spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const { serve } = require("./lib/serve");
const { BASE, PORT } = require("./lib/base");

const HERE = __dirname;
const ROOT = path.resolve(HERE, "..");
// Suites live in tests/ (the fleet layout); the helpers they share stay in
// scripts/lib beside this runner.
const TESTS = path.join(ROOT, "tests");

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

/** True when something already answers at `url` — a dev.sh session, usually. */
async function reachable(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(1500) });
    return res.ok;
  } catch {
    return false;
  }
}

function suites(filters) {
  return fs.readdirSync(TESTS)
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

  console.log("\n== build ==");
  execFileSync(process.execPath, [path.join(HERE, "stage-site.js"), path.join(ROOT, "dist")],
    { stdio: "inherit" });

  // Reuse whatever is already serving the game — a dev.sh session, typically.
  let stop = async () => {};
  if (await reachable(BASE + "/index.html")) {
    console.log(`\nreusing the origin already serving ${BASE} (dev.sh?)`);
    console.log("  note: dev.sh stages a COPY — re-run it to pick up source edits");
  } else {
    try {
      stop = await serve(PORT);
    } catch (e) {
      if (e.code === "EADDRINUSE") {
        console.error(
          `\nSomething is on port ${PORT} but it is not serving ${BASE}.\n` +
          `Stop it, or point SOWDUKU_BASE at a staged origin of your own.`
        );
        process.exit(1);
      }
      throw e;
    }
    console.log(`\nstaged ${BASE} (launcher at /, built game at /sowduku/)`);
  }

  const failed = [];
  for (const f of files) {
    console.log(`\n===== ${f} `.padEnd(72, "="));
    const started = Date.now();
    const code = await run(path.join(TESTS, f));
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
