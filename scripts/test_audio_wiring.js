// Audio wiring verification for the graph-cue overhaul (docs/audio-overhaul.md
// phase 7). Three things decide whether this shipped correctly, and none of
// them are visible from the rendered audition:
//
//   1. the game takes the GRAPH path in a real browser — not silently falling
//      back to the archived spec cues, which would sound fine in isolation and
//      be a total loss of the work
//   2. every one of the five cues plays from the live game without throwing,
//      through the real call path (window.SowdokuAudio), at the real setting
//   3. the FALLBACK path still works when the audio companion is unavailable
//      — the stale-service-worker-cache case the two-path module exists for
//
// Runs on its own port against the shared staged origin (lib/serve.js:
// launcher at /, this game's built artifact at /sowduku/), because the
// fallback case needs a server that can be told to withhold one file.

const { chromium } = require("./lib/playwright");
const { createServer } = require("./lib/serve");

// The optional element library, at the major-pinned path index.html loads.
const AUDIO_LIB = "/sdk/v3/arcade-audio.js";
const PORT = 8937;

let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; console.log("  ok - " + msg); }
  else { fail++; console.log("  FAIL - " + msg); }
}

// A 404 for the audio library is exactly what a player on a stale cache (or
// standalone, off the launcher origin) sees.
function makeServer(blockAudioLib) {
  return createServer(blockAudioLib ? { block: [AUDIO_LIB] } : {});
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

    // ---- there is no in-game sound control ----
    // The launcher owns volume and mute for the whole arcade. A second switch
    // in here could only disagree with it, so the ⚙ menu must not grow one
    // back: this is the regression guard for that.
    console.log("\n[no second switch] the ⚙ menu offers no sound control");
    const infoHidden = await page.getAttribute("#infoBack", "hidden");
    if (infoHidden === null) await page.click("#infoClose");
    await page.click("#menuBtn");
    await page.waitForSelector("#menu:not([hidden])");
    const soundControls = await page.locator("#soundSeg, [data-sound]").count();
    ok(soundControls === 0, "no sound toggle anywhere in the ⚙ menu");
    ok(
      await page.evaluate(() => !window.SowdokuAudio.setGate),
      "the audio module exposes no setGate hook for one to reattach to"
    );

    // ---- every cue plays, through the real call path ----
    console.log("\n[playback] all five cues fire from the live game without throwing");
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

    // ---- the launcher's mute is the one control, and it reaches in here ----
    // With the in-game switch gone this is the whole story for silencing the
    // game, so it is worth asserting rather than assuming: the SDK reports
    // itself disabled and short-circuits before touching the AudioContext.
    console.log("\n[mute] the launcher's global mute silences the game");
    const enabledBefore = await page.evaluate(() => window.Arcade.audio.enabled());
    ok(enabledBefore === true, "audio reports enabled at the launcher's default volume");

    // Exactly the key the launcher's mute button writes, then a reload so the
    // SDK picks it up the way a freshly-mounted game would.
    await page.evaluate(() => {
      localStorage.setItem("arcade.v1.global.audioVolume", JSON.stringify(0));
    });
    await page.reload();
    await page.waitForSelector(".board .cell");

    const whenMuted = await page.evaluate((cues) => {
      const A = window.Arcade;
      const a = A.audio;
      const seen = [];
      const realPlay = a.play.bind(a);
      a.play = function (n, o) { seen.push(n); return realPlay(n, o); };
      const M = window.SowdokuAudio;
      const threw = [];
      [M.playThud, M.playChime, M.playSnuffle, M.playSlip, M.playFail]
        .forEach((f, i) => { try { f(); } catch (e) { threw.push(cues[i] + ": " + e.message); } });
      a.play = realPlay;
      return { volume: A.settings.audioVolume(), enabled: a.enabled(), seen, threw };
    }, CUES);

    ok(whenMuted.volume === 0, "the launcher's mute reached the game (audioVolume 0)");
    ok(whenMuted.enabled === false, "Arcade.audio reports itself disabled while muted");
    ok(whenMuted.threw.length === 0, "every wrapper is still safe to call while muted");

    // Restore, so the muted state cannot leak into the fallback-path context.
    await page.evaluate(() => localStorage.removeItem("arcade.v1.global.audioVolume"));

    ok(errors.length === 0, "still no page errors after playing every cue");
    await ctx.close();
    await close(server);
  }

  // ---- the fallback path: the audio companion unavailable ----
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
