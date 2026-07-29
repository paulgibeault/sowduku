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
 * ONE registration path lives here:
 *
 *   GRAPH PATH (the SDK's /arcade-audio.js companion loaded) — the sound,
 *     full stop. js/soundpack.js holds the pack; every cue is a WebAudio node
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
 * There is NO fallback path. The fleet retired chiptune-as-fallback
 * (2026-07-28): chiptune is now an AESTHETIC a game adopts as its whole sound
 * identity — pi-game just did — never a degraded mode a graph-pack game drops
 * into automatically. When the capability gate below fails (stale
 * service-worker cache, or standalone without /arcade-audio.js), this module
 * registers NOTHING and the game plays silence. That is expected and
 * deliberate, not an error, so it is not logged — the pack is the sound, and
 * a half-right imitation of it is worse than none. The pre-overhaul spec-cue
 * profile this module used to carry lives on in audio/chiptune-archive.mjs as
 * provenance only; nothing loads it.
 *
 * The play wrappers below are safe either way: with nothing registered,
 * `Arcade.audio.play(name)` resolves the unknown cue to null and returns —
 * no call site in the game has to know which state it is in.
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

  // ─── A1 — the single registration site ────────────────────────────────────
  // The gestures and APIs the pack is built out of. A cached older SDK or
  // element library has `graph()` and `el()` but not these, and a missing
  // element would throw inside a cue at play time — a cue that half-plays is
  // worse than silence, so the whole graph path is gated on the pack's actual
  // dependencies rather than on a version number.
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
    }
    // else: register nothing. Stale cached SDK, or standalone without
    // /arcade-audio.js — the game plays silence, by design (see the header).
    // Expected, not a bug — no console noise. The wrappers below stay safe:
    // play() on an unregistered name resolves to null and returns.
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
