/**
 * audio.js — Sound for sow-duku, via the launcher SDK's managed `Arcade.audio`.
 * This is the game's single audio registration site.
 *
 * A plain script, not an ES module, because the game itself is one inline IIFE
 * in index.html: this runs before it and hands it seven play wrappers on
 * `window.SowdokuAudio`. The <script> order in index.html is what guarantees
 * `Arcade.init()` and the pack registration have both already run by the time
 * this evaluates.
 *
 * Two registration paths live here:
 *
 *   GRAPH PATH (the SDK's /arcade-audio.js companion loaded) — the real sound
 *     design. js/soundpack.js holds the pack; every cue is a WebAudio node
 *     graph built from physical-gesture elements (squelch, breath, grunt,
 *     thump, rustle — the first three of which this game drove into the
 *     shared library), and every cue feeds one shared convolution room so
 *     overlapping sounds fuse into one place — a small farmyard pen after rain
 *     — instead of stacking into a pile. That pack is rendered to an audition
 *     WAV and approved by ear before it ships; do not retune it from here.
 *
 *     NO SYNTHESIS LIVES IN THIS GAME. Every gesture the pack is built from is
 *     an element in the launcher's shared library. What belongs to sow-duku is
 *     the design — which gestures, how loud, how far away, how often — and
 *     that is all js/soundpack.js contains. A gesture this game needs and the
 *     library lacks goes into the library.
 *
 *   FALLBACK PATH (older cached SDK/companion, or standalone without
 *     /arcade-audio.js) — the archived spec-cue profile, copied from
 *     index.html as it stood before this overhaul. Oscillator-plus-envelope
 *     voices: the only thing a pre-3.6.0 `Arcade.audio` can play. It exists
 *     because a player on a stale service-worker cache should get the old
 *     sound rather than silence; that is an expected state, not an error, so
 *     it is not logged. See NEEDED_ELEMENTS below for what decides the path.
 *
 *     Its BODIES are frozen — that profile was tuned as a whole and should be
 *     kept in sync with the archive rather than edited here. Its KEYS are not:
 *     they have to track whatever the wrappers below call, so the two cues
 *     renamed in pack v3 (`chime` → `pen`, `snuffle` → `oink`) are renamed
 *     here too. A stale cache hearing the old sound is the point; a stale
 *     cache hearing silence because a key drifted is a bug.
 *
 * Both paths register the same seven cue names, so every call site in the
 * game works unchanged either way — no wrapper here has to branch on the
 * path.
 *
 * Conventions (fleet Arcade.audio conventions, launcher GAME_INTEGRATION.md §5):
 *   A1 — cues are registered ONCE here at load. Audio is purely local, so no
 *        `await Arcade.ready` is needed.
 *   A2 — every play-site in the game goes through a wrapper below, which is a
 *        pure feature detect. sow-duku has NO in-game sound setting.
 *   A3 — the launcher owns volume + the global mute button; this module adds
 *        no volume slider, no mute and no on/off toggle of its own. `play()`
 *        is free + silent when the user has muted. The game briefly carried
 *        its own off-by-default switch, which meant two controls could
 *        disagree: mute the arcade and one game keeps talking, or switch a
 *        game on and hear nothing. One control, and it is the launcher's.
 *   A4 — cue names are lowercase and event-shaped. `thud`, `slip` and `fail`
 *        are unchanged from the pre-overhaul profile; `chime` and `snuffle`
 *        were renamed to `pen` and `oink` in pack v3 when the sounds they
 *        named stopped being what those cues do; `hoof` and `star` are new in
 *        pack v5 (their call sites had no sound at all before it).
 */

(function (global) {
  "use strict";

  var audio = function () {
    return (global.Arcade && global.Arcade.audio) ? global.Arcade.audio : null;
  };
  var pack = function () {
    return global.ArcadeSoundPack || null;
  };

  // ─── the play wrappers (A2) ───────────────────────────────────────────────
  // Silent no-ops when Arcade.audio is absent, or when the launcher has muted
  // (the SDK short-circuits before touching the AudioContext, so a muted play
  // costs nothing). These must never throw: they are called from the input
  // path.

  function sfx(name, opts) {
    var a = audio();
    if (a) a.play(name, opts);
  }

  // ─── registration ─────────────────────────────────────────────────────────

  function registerPack(a, p) {
    // One room for the whole game: the open yard the pack is set in.
    a.room(p.ROOM);
    Object.keys(p.CUES).forEach(function (name) {
      a.graph(name, p.CUES[name], { send: p.SENDS[name] });
    });
  }

  // ─── fallback: the archived spec-cue profile ──────────────────────────────
  // Copied from index.html as it stood before the graph overhaul, which froze
  // the game's pre-graph sound. Keep the cue BODIES in sync with that archive
  // rather than editing them here — it is what a player on a stale
  // service-worker cache hears, and it was tuned as a whole. The two renamed
  // keys are the one deliberate deviation (see the header): the bodies below
  // are still the pre-overhaul sounds, so the comments describe those and not
  // the piglet the graph path now plays.

  function registerSpecCues(a) {
    // a piggy flopping into mud: a short, dull noise splat for the wet surface,
    // with a low sine body dropping 150→65 Hz a hair behind it for the weight
    // of the animal. The noise leads by 10 ms so you hear contact *then* mass —
    // reversed, or without the noise at all, it reads as a synth kick drum.
    a.cue("thud", [
      { type: "noise", dur: 0.09, gain: 0.14, attack: 0.004, release: 0.07 },
      { type: "sine", freq: 150, toFreq: 65, dur: 0.2, gain: 0.24, attack: 0.008, release: 0.19, delay: 0.01 },
    ]);
    // a pen has found its one piggy: three sines rolled in over 30 ms so they
    // bloom rather than strike. Sine + slow attack keeps it a warm swell, not a
    // bell — the only bright thing in the palette, and it stays soft.
    a.cue("pen", [
      { type: "sine", freq: 660,  dur: 0.55, gain: 0.1, attack: 0.02, release: 0.53 },
      { type: "sine", freq: 880,  dur: 0.55, gain: 0.1, attack: 0.02, release: 0.53, delay: 0.03 },
      { type: "sine", freq: 1100, dur: 0.55, gain: 0.1, attack: 0.02, release: 0.53, delay: 0.03 },
    ]);
    // the whole field settled: three breathy noise puffs. Deliberately uneven —
    // each puff differs in length, level and spacing — because three identical
    // puffs on a fixed pulse read as a machine, and this is meant to read as a
    // creature exhaling. Pure noise, no pitch: it's breath, not a note.
    a.cue("oink", [
      { type: "noise", dur: 0.13, gain: 0.17, attack: 0.03, release: 0.10 },
      { type: "noise", dur: 0.16, gain: 0.19, attack: 0.035, release: 0.13, delay: 0.16 },
      { type: "noise", dur: 0.12, gain: 0.14, attack: 0.04, release: 0.09, delay: 0.19 },
    ]);
    // a slip (illegal or wrong placement): two triangle notes stepping down a
    // minor third. Low, quiet and quickly over — a disappointed grunt, never a
    // buzzer. Triangle gives it just enough edge to be noticed at low level.
    a.cue("slip", [
      { type: "triangle", freq: 220, dur: 0.18, gain: 0.15, attack: 0.012, release: 0.17 },
      { type: "triangle", freq: 175, dur: 0.18, gain: 0.15, attack: 0.012, release: 0.17, delay: 0.09 },
    ]);
    // hearts spent: a tired sigh, not a game-over fanfare. Three low sines with
    // long swelling attacks (no note is ever struck), each sagging a little in
    // pitch as it sounds, stepping down in small tired intervals rather than
    // arpeggiating a triad — then a very quiet noise breath under the last note
    // to land it as an exhale from the same animal as the snuffle.
    a.cue("fail", [
      { type: "sine", freq: 262, toFreq: 247, dur: 0.5, gain: 0.12, attack: 0.09, release: 0.4 },
      { type: "sine", freq: 233, toFreq: 220, dur: 0.5, gain: 0.11, attack: 0.09, release: 0.4, delay: 0.22 },
      { type: "sine", freq: 196, toFreq: 175, dur: 0.7, gain: 0.1, attack: 0.12, release: 0.55, delay: 0.24 },
      { type: "noise", dur: 0.22, gain: 0.07, attack: 0.09, release: 0.13, delay: 0.18 },
    ]);
    // The two v5 cues have no archived body — they postdate the archive — so
    // they get minimal spec voices in the same idiom: a hoofprint is a tiny
    // dry tick of noise, a star two short soft blips. A stale cache hears
    // something plausible instead of silence at these two call sites.
    a.cue("hoof", [
      { type: "noise", dur: 0.05, gain: 0.06, attack: 0.003, release: 0.04 },
    ]);
    a.cue("star", [
      { type: "sine", freq: 740, dur: 0.12, gain: 0.07, attack: 0.012, release: 0.10 },
      { type: "sine", freq: 988, dur: 0.16, gain: 0.07, attack: 0.012, release: 0.14, delay: 0.09 },
    ]);
  }

  // ─── A1 — the single registration site ────────────────────────────────────
  // The gestures and APIs the pack is built out of. A cached older SDK or
  // element library has `graph()` and `el()` but not these, and a missing
  // element would throw inside a cue at play time — a cue that half-plays is
  // worse than the fallback profile, so the whole graph path is gated on the
  // pack's actual dependencies rather than on a version number.
  var NEEDED_ELEMENTS = [
    "squelch", "breath", "grunt", "pluck", "thump", "rustle", "cents", "between",
  ];

  var graphMode = false;

  (function registerCues() {
    var a = audio();
    if (!a) return;

    var p = pack();
    var el = (typeof a.el === "function") ? a.el() : null;
    var graphable =
      !!p &&
      typeof a.graph === "function" &&
      typeof a.room === "function" &&
      el !== null &&
      NEEDED_ELEMENTS.every(function (name) { return typeof el[name] === "function"; });

    if (graphable) {
      registerPack(a, p);
      graphMode = true;
    } else {
      // Stale cached SDK, or standalone without /arcade-audio.js. Expected,
      // not a bug — no console noise.
      registerSpecCues(a);
    }
  })();

  global.SowdokuAudio = {
    // True when the graph pack registered — for diagnostics and tests; the
    // game itself never needs to branch on it.
    isGraphMode: function () { return graphMode; },
    playThud: function () { sfx("thud"); },
    playHoof: function () { sfx("hoof"); },
    playPen:  function () { sfx("pen"); },
    playOink: function () { sfx("oink"); },
    playSlip: function () { sfx("slip"); },
    playFail: function () { sfx("fail"); },
    playStar: function () { sfx("star"); },
  };
})(typeof window !== "undefined" ? window : globalThis);
