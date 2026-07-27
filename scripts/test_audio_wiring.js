// Audio wiring verification for the graph-cue overhaul (docs/audio-overhaul.md
// phase 7). Three things decide whether this shipped correctly, and none of
// them are visible from the rendered audition:
//
//   1. the game takes the GRAPH path in a real browser — not silently falling
//      back to the archived spec cues, which would sound fine in isolation and
//      be a total loss of the work
//   2. every one of the five cues plays from the live game without throwing,
//      through the real call path (window.SowdokuAudio), at the real setting
//   3. the FALLBACK path still works when /arcade-audio.js is unavailable —
//      the stale-service-worker-cache case the two-path module exists for
//
// Staged like production: launcher root files at /, the game at /sowduku/,
// because index.html loads /arcade-sdk.js and /arcade-audio.js root-relative.

const { chromium } = require("/Users/paulgibeault/work/paulgibeault.github.io/node_modules/playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");

const LAUNCHER = "/Users/paulgibeault/work/paulgibeault.github.io";
const GAME = path.join(__dirname, "..");
const PORT = 8937;

let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; console.log("  ok - " + msg); }
  else { fail++; console.log("  FAIL - " + msg); }
}

const TYPES = {
  ".html": "text/html", ".js": "text/javascript", ".json": "application/json",
  ".png": "image/png", ".woff2": "font/woff2", ".ico": "image/x-icon",
};

// `blockAudioLib` serves a 404 for /arcade-audio.js, which is exactly what a
// player on a stale cache (or standalone off the launcher origin) sees.
function makeServer(blockAudioLib) {
  return http.createServer((req, res) => {
    const url = new URL(req.url, "http://x");
    let p = decodeURIComponent(url.pathname);
    if (blockAudioLib && p === "/arcade-audio.js") { res.writeHead(404); res.end(); return; }
    let file;
    if (p.startsWith("/sowduku/")) {
      file = path.join(GAME, p.slice("/sowduku/".length) || "index.html");
    } else {
      file = path.join(LAUNCHER, p === "/" ? "index.html" : p.slice(1));
    }
    if (file.endsWith("/")) file += "index.html";
    fs.readFile(file, (err, buf) => {
      if (err) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
      res.end(buf);
    });
  });
}

function listen(server) {
  return new Promise((resolve) => server.listen(PORT, () => resolve()));
}
function close(server) {
  return new Promise((resolve) => server.close(() => resolve()));
}

const CUES = ["thud", "chime", "snuffle", "slip", "fail"];

async function run() {
  const browser = await chromium.launch();

  // ---- the graph path, live in a real browser ----
  {
    console.log("\n[graph path] the game registers the sound pack, not the fallback");
    const server = makeServer(false);
    await listen(server);
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`http://localhost:${PORT}/sowduku/index.html`);
    await page.waitForSelector(".board .cell");

    ok(errors.length === 0, "no page errors on load" + (errors.length ? ": " + errors[0] : ""));

    const state = await page.evaluate(() => ({
      hasModule: !!window.SowdokuAudio,
      hasPack: !!window.SowDukuPack,
      hasElements: !!(window.ArcadeAudioElements),
      graphMode: window.SowdokuAudio ? window.SowdokuAudio.isGraphMode() : null,
      packCues: window.SowDukuPack ? Object.keys(window.SowDukuPack.CUES) : [],
      // the elements this pack is actually built from
      newElements: window.ArcadeAudioElements
        ? ["squelch", "breath", "grunt"].filter((n) => typeof window.ArcadeAudioElements[n] === "function")
        : [],
    }));

    ok(state.hasModule, "window.SowdokuAudio is present");
    ok(state.hasPack, "window.SowDukuPack is present");
    ok(state.hasElements, "the shared element library loaded");
    ok(state.newElements.length === 3, "squelch, breath and grunt are all in the library");
    ok(state.graphMode === true, "GRAPH path taken (not the spec-cue fallback)");
    ok(
      CUES.every((c) => state.packCues.includes(c)) && state.packCues.length === CUES.length,
      "the pack defines exactly the five cues the game calls"
    );

    // The shared room only exists if room() was called, which only the graph
    // path does — this is the check that the pack really registered rather
    // than graph() being present but unused.
    const roomLive = await page.evaluate(() => {
      const a = window.Arcade && window.Arcade.audio;
      return !!(a && typeof a.bus === "function" && a.bus() !== null);
    });
    ok(roomLive, "the shared room bus exists (room() ran)");

    // ---- every cue plays, through the real call path, at the real setting ----
    // A user gesture first: the launcher unlocks the AudioContext on one, and
    // sound is off by default, so it has to be turned on the way a player
    // would — through the ⚙ menu.
    console.log("\n[playback] all five cues fire from the live game without throwing");
    const infoHidden = await page.getAttribute("#infoBack", "hidden");
    if (infoHidden === null) await page.click("#infoClose");
    await page.click("#menuBtn");
    await page.waitForSelector("#menu:not([hidden])");
    const soundOnBtn = page.locator('#soundSeg button[data-sound="on"]');
    if (await soundOnBtn.count()) await soundOnBtn.click();

    const gateOpen = await page.evaluate(() => {
      // the ⚙ toggle wrote the setting; the module reads it through setGate
      const A = window.Arcade;
      return !!(A && A.state && A.state.get("sound") === "on");
    });
    ok(gateOpen, "the ⚙ sound toggle turned sound on");

    const played = await page.evaluate((cues) => {
      const a = window.Arcade.audio;
      const seen = [];
      const realPlay = a.play.bind(a);
      a.play = function (n, o) { seen.push(n); return realPlay(n, o); };
      const M = window.SowdokuAudio;
      const calls = {
        thud: M.playThud, chime: M.playChime, snuffle: M.playSnuffle,
        slip: M.playSlip, fail: M.playFail,
      };
      const threw = [];
      for (const c of cues) {
        try { calls[c](); } catch (e) { threw.push(c + ": " + e.message); }
      }
      a.play = realPlay;
      return { seen, threw };
    }, CUES);

    ok(played.threw.length === 0, "no wrapper threw" + (played.threw.length ? ": " + played.threw[0] : ""));
    ok(
      CUES.every((c) => played.seen.includes(c)),
      `all five cues reached Arcade.audio.play (${played.seen.join(", ")})`
    );

    // ---- the gate: sound off means nothing plays at all ----
    console.log("\n[gate] the off-by-default setting still silences every cue");
    const soundOffBtn = page.locator('#soundSeg button[data-sound="off"]');
    if (await soundOffBtn.count()) await soundOffBtn.click();
    const whenOff = await page.evaluate((cues) => {
      const a = window.Arcade.audio;
      const seen = [];
      const realPlay = a.play.bind(a);
      a.play = function (n, o) { seen.push(n); return realPlay(n, o); };
      const M = window.SowdokuAudio;
      [M.playThud, M.playChime, M.playSnuffle, M.playSlip, M.playFail].forEach((f) => f());
      a.play = realPlay;
      return seen;
    }, CUES);
    ok(whenOff.length === 0, "zero play() calls while sound is off");

    ok(errors.length === 0, "still no page errors after playing every cue");
    await ctx.close();
    await close(server);
  }

  // ---- the fallback path: /arcade-audio.js unavailable ----
  {
    console.log("\n[fallback path] stale cache — no element library, spec cues instead of silence");
    const server = makeServer(true);
    await listen(server);
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`http://localhost:${PORT}/sowduku/index.html`);
    await page.waitForSelector(".board .cell");

    ok(errors.length === 0, "no page errors with the library missing" + (errors.length ? ": " + errors[0] : ""));

    const state = await page.evaluate(() => ({
      hasModule: !!window.SowdokuAudio,
      hasElements: !!window.ArcadeAudioElements,
      graphMode: window.SowdokuAudio ? window.SowdokuAudio.isGraphMode() : null,
    }));
    ok(!state.hasElements, "the element library really is absent");
    ok(state.hasModule, "the audio module still loaded");
    ok(state.graphMode === false, "FALLBACK path taken");

    const infoHidden2 = await page.getAttribute("#infoBack", "hidden");
    if (infoHidden2 === null) await page.click("#infoClose");
    await page.click("#menuBtn");
    await page.waitForSelector("#menu:not([hidden])");
    const onBtn = page.locator('#soundSeg button[data-sound="on"]');
    if (await onBtn.count()) await onBtn.click();

    const played = await page.evaluate((cues) => {
      const a = window.Arcade.audio;
      const seen = [];
      const realPlay = a.play.bind(a);
      a.play = function (n, o) { seen.push(n); return realPlay(n, o); };
      const M = window.SowdokuAudio;
      const threw = [];
      const calls = [M.playThud, M.playChime, M.playSnuffle, M.playSlip, M.playFail];
      calls.forEach((f, i) => { try { f(); } catch (e) { threw.push(cues[i] + ": " + e.message); } });
      a.play = realPlay;
      return { seen, threw };
    }, CUES);

    ok(played.threw.length === 0, "no wrapper threw on the fallback path");
    ok(CUES.every((c) => played.seen.includes(c)), "all five spec cues still play");
    ok(errors.length === 0, "no page errors after playing on the fallback path");

    await ctx.close();
    await close(server);
  }

  await browser.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

run();
