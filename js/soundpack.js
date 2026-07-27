// sow-duku sound pack — the game's own sound design.
//
// Loaded as a plain script after /sdk/v3/arcade-audio.js. js/audio.js (phase 5
// of docs/audio-overhaul.md) registers everything here with Arcade.audio; the
// launcher's tools/soundpack renderer loads this same file to produce audition
// WAVs, so what gets approved by ear is what plays.
//
// The place: a small farmyard pen after rain. Soft mud, straw bedding, low
// wooden rails, open sky — and small warm animals who are only mildly
// interested in your puzzle. Nothing here is struck, metallic or bright;
// every cue is either a surface yielding (mud, straw) or the creature itself
// (breath, grunt). The one pitched, "musical" cue in the game — the pen
// chime — is plucked warm wood, not a bell.
//
// Where hecknsic is discrete glass over a floor that breathes, sow-duku is
// discrete mud and breath over SILENCE. There is no sustained layer: the
// game's whole philosophy is calm clarity, and between placements the yard
// simply stands quiet. That silence is the ambience.
//
// Register plan, so simultaneous cues occupy different bands instead of
// masking each other:
//   thud weight 50–170 · fail sigh 80–900 · squelch smear 140–520
//   grunt voice 85–1100 · squelch pops 200–1300 · breath 350–1600
//   wood plucks 390–2200
//
// Every cue takes an `r` (seeded random stream) and varies pitch, timing and
// layer balance per play. The thud matters most: it fires on every placement,
// and a splat that lands identically twice stops being mud and starts being
// a sample.

(function (global) {
  'use strict';
  const S = global.ArcadeAudioElements;

  // Outdoors, but close to soft ground: the few reflections come off the mud,
  // the straw and the low rails, so they arrive quickly, arrive very dark and
  // die almost at once. A longer or brighter tail would put the pen indoors —
  // or worse, in hecknsic's glass room.
  const ROOM = {
    dur: 1.35,
    decay: 0.30,
    preDelay: 0.018,
    wet: 0.5,
    shelfHz: 3000,
    shelfDb: -8,
    seed: 6203,
  };

  // How much of the yard each cue sits in. The board is right under your
  // hands, so placement sounds stay nearly dry; the landmark moments are
  // allowed to hang in the air a little longer.
  const SENDS = {
    'thud': 0.16,
    'chime': 0.30,
    'snuffle': 0.24,
    'slip': 0.18,
    'fail': 0.36,
  };

  // The thud and the slip answer individual inputs, so they sit at the level
  // of furniture; the three landmark cues (pen solved, board solved, hearts
  // gone) are each a clear, separate moment and get more voice. Balanced as a
  // set — retune here, not per element.
  const TOUCH = 0.20;      // per-placement gestures
  const LANDMARK = 0.30;   // pen / board solved
  const MOMENT = 0.26;     // hearts gone — clear but never loud

  const CUES = {
    // A piggy flopping into wet mud: the squelch is the surface, the thump a
    // hair behind it is the animal's weight — contact first, then mass, same
    // ordering the old spec cue got right. A pinch of straw settles after.
    'thud': function (ctx, o, t, params, r) {
      const pitch = S.cents(r, 90);
      S.squelch(ctx, o, t, {
        dur: S.between(r, 0.11, 0.15), grains: Math.round(S.between(r, 13, 19)),
        f0: 250 * pitch, lp: 1250, gain: TOUCH,
        seed: (r() * 1e6) | 0,
      });
      S.thump(ctx, o, t + S.between(r, 0.010, 0.016), {
        f0: S.between(r, 115, 135), f1: S.between(r, 48, 58),
        dur: S.between(r, 0.18, 0.23), attack: 0.006,
        gain: TOUCH * 1.15, seed: (r() * 1e6) | 0,
      });
      // straw shifting under the landing — quiet, late, and not every time
      if (r() < 0.6) {
        S.rustle(ctx, o, t + S.between(r, 0.05, 0.09), {
          f0: S.between(r, 1500, 1900), f1: S.between(r, 700, 950), Q: 1.4,
          lp: 2400, dur: S.between(r, 0.08, 0.13), gain: TOUCH * 0.16,
          attack: 0.02, seed: (r() * 1e6) | 0,
        });
      }
      return 0.4;
    },

    // A pen has found its one piggy: two warm wooden plucks — a thumb piano
    // made of fence rail, not a bell. The interval is a sixth, the second
    // note blooms in behind the first, and a breath of straw underneath
    // keeps it sitting IN the yard rather than on top of it.
    'chime': function (ctx, o, t, params, r) {
      const root = 392 * S.cents(r, 40);               // around G4
      S.pluck(ctx, o, t, {
        freq: root, dur: 0.8, damping: 0.9935, tone: 2100,
        gain: LANDMARK * 0.55, seed: (r() * 1e6) | 0,
      });
      S.pluck(ctx, o, t + S.between(r, 0.07, 0.10), {
        freq: root * 1.667 * S.cents(r, 12), dur: 0.9, damping: 0.9935,
        tone: 2100, gain: LANDMARK * 0.45, seed: (r() * 1e6) | 0,
      });
      S.rustle(ctx, o, t + 0.02, {
        f0: 900, f1: 1600, Q: 1.2, lp: 2000,
        dur: 0.3, gain: LANDMARK * 0.10, attack: 0.09,
        seed: (r() * 1e6) | 0,
      });
      return 1.05;
    },

    // The whole field settled: the piggy's verdict. Three uneven breaths, and
    // the middle one is voiced — a contented snort from the same snout. The
    // unevenness is the point: three identical puffs on a pulse read as a
    // machine, and this is a creature exhaling.
    'snuffle': function (ctx, o, t, params, r) {
      S.breath(ctx, o, t, {
        dur: S.between(r, 0.12, 0.16), f: S.between(r, 450, 550), rise: 1.8,
        lp: 1300, gain: LANDMARK * 0.5, flutter: 0.5, seed: (r() * 1e6) | 0,
      });
      const at2 = t + S.between(r, 0.15, 0.20);
      S.grunt(ctx, o, at2, {
        f0: S.between(r, 105, 120), dur: S.between(r, 0.14, 0.18),
        rough: 1.1, breathy: 0.45, gain: LANDMARK * 0.55,
        seed: (r() * 1e6) | 0,
      });
      S.breath(ctx, o, t + S.between(r, 0.40, 0.48), {
        dur: S.between(r, 0.20, 0.26), f: S.between(r, 380, 460), rise: 1.5,
        lp: 1100, gain: LANDMARK * 0.42, flutter: 0.4, seed: (r() * 1e6) | 0,
      });
      return 0.95;
    },

    // A slip (illegal or wrong placement): the piggy backs OUT of the wrong
    // spot — a reversed squelch (mud releasing, skew < 1) with a short,
    // unimpressed grunt on top. Disappointment, never a buzzer.
    'slip': function (ctx, o, t, params, r) {
      S.squelch(ctx, o, t, {
        dur: S.between(r, 0.10, 0.13), grains: Math.round(S.between(r, 10, 14)),
        f0: 220 * S.cents(r, 80), skew: 0.6, lp: 1100, gain: TOUCH * 0.8,
        seed: (r() * 1e6) | 0,
      });
      S.grunt(ctx, o, t + S.between(r, 0.05, 0.08), {
        f0: S.between(r, 125, 140), f1: S.between(r, 88, 100),
        dur: S.between(r, 0.15, 0.19), rough: 1.3, breathy: 0.3,
        gain: TOUCH * 1.05, seed: (r() * 1e6) | 0,
      });
      return 0.4;
    },

    // Hearts spent: a tired sigh and a body lying down in the straw. The sigh
    // is one long falling exhale with a sagging voiced grunt swelling inside
    // it; then the weight settles, soft-onset, and one last small breath.
    // Deliberately gentle — losing here is a nap, not a game over sting.
    'fail': function (ctx, o, t, params, r) {
      S.breath(ctx, o, t, {
        dur: S.between(r, 0.60, 0.72), f: S.between(r, 400, 470), rise: 1.35,
        lp: 1000, gain: MOMENT * 0.5, flutter: 0.35, attack: 0.22,
        seed: (r() * 1e6) | 0,
      });
      S.grunt(ctx, o, t + 0.06, {
        f0: S.between(r, 115, 128), f1: S.between(r, 72, 82),
        dur: S.between(r, 0.42, 0.52), rough: 0.8, breathy: 0.5,
        attack: 0.1, gain: MOMENT * 0.6, seed: (r() * 1e6) | 0,
      });
      S.thump(ctx, o, t + S.between(r, 0.52, 0.60), {
        f0: S.between(r, 75, 88), f1: S.between(r, 38, 44),
        dur: 0.3, attack: 0.03, gain: MOMENT * 0.55,
        seed: (r() * 1e6) | 0,
      });
      S.breath(ctx, o, t + S.between(r, 0.78, 0.86), {
        dur: S.between(r, 0.16, 0.20), f: S.between(r, 340, 400), rise: 1.4,
        lp: 900, gain: MOMENT * 0.3, flutter: 0.4, seed: (r() * 1e6) | 0,
      });
      return 1.35;
    },
  };

  global.SowDukuPack = { name: 'sow-duku', ROOM, SENDS, CUES };
})(typeof window !== 'undefined' ? window : globalThis);
