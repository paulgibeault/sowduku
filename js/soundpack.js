// sow-duku sound pack — the game's own sound design.
//
// Loaded as a plain script after /arcade-audio.js. js/audio.js (phase 5
// of docs/audio-overhaul.md) registers everything here with Arcade.audio; the
// launcher's tools/soundpack renderer loads this same file to produce audition
// WAVs, so what gets approved by ear is what plays.
//
// ── v5 — cozy, cute, fun ─────────────────────────────────────────────────
// The brief, in Paul's words. Mid-game there is NO MUSIC — nothing pitched
// or melodic during play; the moment-to-moment sounds are all animal and
// mud. The two GAME-ENDING verdicts are the amendment (v5.1, again in
// Paul's words): the win carries a chime and the fail a sad trombone,
// because an ending is allowed to be an instrument where a move is not.
// Two materials split the moment-to-moment work:
//
//   THE PIGLET CARRIES THE VERDICT. Every event with an outcome in it is a
//   pig sound, and the CONTOUR of the call is the outcome:
//     correct   "uh-huh!" — two quick smooth calls, the second stepped UP
//     win       the same yes, celebrated: chime and calls climbing
//               together, trotters scampering underneath
//     wrong     one rough wheek, sliding up and cut off
//     fail      wah-wah-wah-waaah, and the body flops into the straw
//     starred   a pleased double-sniff and a little happy hum
//   Correct/win are discrete steps, smooth voice. Wrong/fail are continuous
//   slides, rough voice. Steps say settled; slides say unsettled. That is
//   the entire grammar, and it needs no notes.
//
//   THE YARD CARRIES THE TOUCH. Mud answers the finger: a soft squelch for
//   a piggy set down, a tinier scratch for a hoofprint. Quietest layer,
//   always — the verdict belongs to the animal.
//
// Seven cues. `hoof` (hoofprint marked) and `star` (field kept) are new in
// v5; the game had no sound at all for either.
//
//   thud   piggy set down       mud, soft
//   hoof   hoofprint marked     mud, tiny — thud's little sibling
//   pen    placement correct    "uh-huh!" — two calls stepping up
//   oink   board solved         a rising chime under the piggy-zoomies
//   slip   wrong                mud out + one rough rising wheek
//   fail   hearts gone          the sad trombone → the flop → a last breath
//   star   field starred        double-sniff + a pleased hum
//
// Register plan, so simultaneous cues occupy different bands instead of
// masking each other:
//   thud/hoof mud 60–900 · trotters 250–950 · voice steps 280–1100
//   trombone 180–1300 · wheek 500–2400 · breath/sniff 400–1900
//   chime 390–2400
//
// Every cue takes an `r` (seeded random stream) and varies pitch and timing
// per play — but never LEVEL. That lesson is paid for twice over: v3 varied
// the step's grain density and long runs kept landing on loud outliers; v4
// made a garnish layer a coin flip and a quarter of placements sat in a 6 dB
// hole. Pitch, timing and content may wander; loudness holds still.
//
// Earlier history (v2 room shrink, v3 piglet voicing, v4 balance/level fixes)
// lives in git and PLAN.md; the constants below are their surviving output.

(function (global) {
  'use strict';
  const S = global.ArcadeAudioElements;

  // Every cue here is built from the element library's gestures, so with the
  // library absent — a stale service-worker cache, or running standalone off
  // the launcher origin — there is nothing registrable and the game
  // plays silence — by design; fallbacks are retired fleet-wide. Bail before
  // dereferencing S: this file is a plain script, and a throw here would
  // surface as a page error even though the silence itself is intended. Also covers an OLDER library that predates
  // registerPack, which is the same stale-cache scenario one version on.
  if (!S || typeof S.registerPack !== 'function') return;

  // Outdoors, close to soft ground. Mud and straw absorb; what little
  // reflects arrives fast, dark, and is gone in a fifth of a second. The
  // reverb's whole job is "outside", never a tail you could point to.
  const ROOM = {
    dur: 0.50,
    decay: 0.13,
    preDelay: 0.008,
    wet: 0.26,
    shelfHz: 2600,
    shelfDb: -7,
    seed: 6203,
  };

  // How much of the yard each cue sits in. Touch sounds are all but dry —
  // the board is right under your hands. The verdict moments get a breath of
  // air, and the two endings the most.
  const SENDS = {
    'thud': 0.06,
    'hoof': 0.05,
    'pen': 0.10,
    'oink': 0.15,
    'slip': 0.08,
    'fail': 0.16,
    'star': 0.12,
  };

  // The piglet's tract: formants nearly an octave above the grunt element's
  // adult-hog default, no chest to speak of. This one override is what makes
  // every voiced sound a small animal rather than a quiet big one.
  const PIGLET = [
    { f: 780, Q: 4.5, gain: 1.0 },
    { f: 1950, Q: 6.0, gain: 0.45 },
  ];
  const CHEST = 240;

  // Levels, by layer: the voice above the mud (it carries the meaning), the
  // mud under everything (it carries the touch). Balanced as a set — retune
  // here, not per element.
  const TOUCH = 0.115;     // a piggy into mud
  const SCRATCH = 0.055;   // a hoofprint — half a step, and feels it
  const YES = 0.22;        // the uh-huh, on every correct placement
  const CHEER = 0.30;      // the win — the one moment allowed to be an event
  const DING = 0.095;      // one note of the win's chime
  const PATTER = 0.05;     // one trotter of the win's scamper
  const ENDING = 0.30;     // the fail — present, unmistakable, still gentle
  const SPARK = 0.20;      // the star's pleased hum

  // Pre-roll on the two cues that answer a move rather than being one; both
  // fire from inside the same handler as the thud/slip that caused them and
  // would otherwise start underneath it.
  const WAIT_WIN = 0.42;
  const WAIT_FAIL = 0.38;

  const CUES = {
    // A piggy set down in wet mud. Soft contact, a hint of weight swelling
    // in behind it, straw half the time. The quietest full-size thing in the
    // game — the verdict belongs to the voice, not the landing.
    // Grain/duration ranges deliberately narrow: level must not wander on a
    // cue this frequent (the v3/v4 lesson).
    'thud': function (ctx, o, t, params, r) {
      const pitch = S.cents(r, 90);
      S.squelch(ctx, o, t, {
        dur: S.between(r, 0.090, 0.105), grains: Math.round(S.between(r, 12, 14)),
        f0: 300 * pitch, lp: 880, gain: TOUCH,
        seed: (r() * 1e6) | 0,
      });
      S.thump(ctx, o, t + S.between(r, 0.008, 0.014), {
        f0: S.between(r, 92, 104), f1: S.between(r, 66, 74),
        dur: S.between(r, 0.062, 0.080), attack: 0.014,
        gain: TOUCH * 0.30, seed: (r() * 1e6) | 0,
      });
      if (r() < 0.5) {
        S.rustle(ctx, o, t + S.between(r, 0.04, 0.07), {
          f0: S.between(r, 1200, 1500), f1: S.between(r, 650, 850), Q: 1.4,
          lp: 1900, dur: S.between(r, 0.06, 0.09), gain: TOUCH * 0.09,
          attack: 0.02, seed: (r() * 1e6) | 0,
        });
      }
      return 0.3;
    },

    // A hoofprint scratched into the mud: the thud's little sibling — same
    // material, half the size, half the level, no weight and no straw. It has
    // to survive being painted in runs of five without ever becoming a drum
    // roll, which is why it is a single tiny gesture and nothing else.
    'hoof': function (ctx, o, t, params, r) {
      S.squelch(ctx, o, t, {
        dur: S.between(r, 0.045, 0.058), grains: Math.round(S.between(r, 6, 8)),
        f0: 360 * S.cents(r, 70), lp: 950, gain: SCRATCH,
        seed: (r() * 1e6) | 0,
      });
      return 0.15;
    },

    // CORRECT. "Uh-huh!" — two quick calls, smooth-voiced, the second
    // stepped clearly UP (about a fourth). Two discrete steps, not a slide:
    // steps are what separate this from the wheek, and the upward direction
    // is what makes it a yes. The earlier murmur failed exactly here — level
    // and low, it had no direction, and a yes with no direction reads as a
    // shrug at best.
    //
    // Fires on every correct placement, simultaneously with the thud, so it
    // is short (about a quarter second), smooth, and never varies in level.
    'pen': function (ctx, o, t, params, r) {
      const f0 = S.between(r, 300, 328);
      S.grunt(ctx, o, t + 0.02, {
        f0: f0, f1: f0 * S.between(r, 1.00, 1.04),     // flat little "uh"
        dur: S.between(r, 0.060, 0.072), rough: 0.35, breathy: 0.30,
        formants: PIGLET, chest: CHEST, attack: 0.008,
        gain: YES, seed: (r() * 1e6) | 0,
      });
      S.grunt(ctx, o, t + S.between(r, 0.115, 0.135), {
        f0: f0 * 1.33, f1: f0 * 1.33 * S.between(r, 1.02, 1.06),  // "huh!" — up
        dur: S.between(r, 0.075, 0.090), rough: 0.32, breathy: 0.34,
        formants: PIGLET, chest: CHEST, attack: 0.008,
        gain: YES * 0.95, seed: (r() * 1e6) | 0,
      });
      return 0.35;
    },

    // THE WIN — piggy zoomies. A proper celebration in three acts, still not
    // one note of music in it:
    //
    //   1. THE CHEER — three quick excited calls climbing a staircase, packed
    //      tighter than before, topped with a big HAPPY WHEEK: a long smooth
    //      squeal that keeps rising and ends open. (The mistake-wheek is
    //      rough, short and cut off; this one is its opposite in all three —
    //      same word, entirely different sentence.)
    //   2. THE HOP — the piglet leaps and lands back in the mud with a real
    //      splash, straw flying.
    //   3. THE LAP — a burst of scampering trotters running off and back,
    //      and one happy breath as it all settles.
    //
    // Everything still rises or runs; nothing falls except the landing, and
    // a landing is supposed to. Waits WAIT_WIN so the whole show starts in
    // clear air after the final placement.
    'oink': function (ctx, o, t, params, r) {
      const t0 = t + WAIT_WIN;
      const scamper = function (from, n) {
        let at = from;
        for (let i = 0; i < n; i++) {
          S.squelch(ctx, o, t0 + at, {
            dur: S.between(r, 0.035, 0.045), grains: Math.round(S.between(r, 5, 7)),
            f0: S.between(r, 350, 430), lp: 950, gain: PATTER,
            seed: (r() * 1e6) | 0,
          });
          at += S.between(r, 0.050, 0.075);
        }
        return at;
      };
      // act 1 — the cheer: three calls climbing, quick and giddy, and the
      // chime climbing WITH them — one warm plucked note under each call
      // (root, fifth, octave), so every oink lands with its own ding and the
      // pair fuse into a single rising figure. The wood is pitched a little
      // long and bright so it rings on under the wheek; that ring is the
      // "chime" reading, without ever becoming a separate jingle.
      const base = S.between(r, 345, 375);
      const step = [1.0, 1.17, 1.36];
      const call = [0.02, S.between(r, 0.18, 0.21), S.between(r, 0.34, 0.38)];
      const croot = 392 * S.cents(r, 15);              // ~G4, above the calls
      const cnote = [1.0, 1.5, 2.0];
      for (let i = 0; i < 3; i++) {
        S.pluck(ctx, o, t0 + call[i] - 0.01, {
          freq: croot * cnote[i] * S.cents(r, 6), dur: 0.9 + i * 0.15,
          damping: 0.9942, tone: 2200,
          gain: DING * (1.0 - i * 0.12), seed: (r() * 1e6) | 0,
        });
        const f0 = base * step[i] * S.cents(r, 20);
        S.grunt(ctx, o, t0 + call[i], {
          f0: f0, f1: f0 * S.between(r, 0.62, 0.68),   // the pig's own break
          dur: S.between(r, 0.08, 0.10), rough: 0.85, breathy: 0.38,
          formants: PIGLET, chest: CHEST, attack: 0.010,
          gain: CHEER * (0.50 + i * 0.07), seed: (r() * 1e6) | 0,
        });
      }
      // the happy wheek on top — long, smooth, rising, left open
      const wf = S.between(r, 560, 620);
      S.grunt(ctx, o, t0 + S.between(r, 0.50, 0.54), {
        f0: wf, f1: wf * S.between(r, 1.35, 1.50),
        dur: S.between(r, 0.20, 0.25), rough: 0.45, breathy: 0.45,
        formants: PIGLET, chest: CHEST, attack: 0.015,
        gain: CHEER * 0.62, seed: (r() * 1e6) | 0,
      });
      // act 2 — the hop: up (a beat of air), then the landing splash
      S.squelch(ctx, o, t0 + S.between(r, 0.88, 0.94), {
        dur: S.between(r, 0.11, 0.13), grains: Math.round(S.between(r, 15, 18)),
        f0: S.between(r, 270, 310), lp: 1000, gain: TOUCH * 1.35,
        seed: (r() * 1e6) | 0,
      });
      S.thump(ctx, o, t0 + S.between(r, 0.90, 0.96), {
        f0: S.between(r, 95, 108), f1: S.between(r, 64, 72),
        dur: S.between(r, 0.08, 0.10), attack: 0.012,
        gain: TOUCH * 0.5, seed: (r() * 1e6) | 0,
      });
      S.rustle(ctx, o, t0 + S.between(r, 0.94, 1.00), {
        f0: S.between(r, 1300, 1600), f1: S.between(r, 700, 900), Q: 1.4,
        lp: 2000, dur: S.between(r, 0.10, 0.14), gain: TOUCH * 0.22,
        attack: 0.02, seed: (r() * 1e6) | 0,
      });
      // act 3 — the lap: trotters off and back, one giddy call in passing,
      // and a happy breath while everything settles
      const lapEnd = scamper(S.between(r, 1.06, 1.12), 9);
      const pf = base * S.between(r, 1.20, 1.32);
      S.grunt(ctx, o, t0 + S.between(r, 1.30, 1.38), {
        f0: pf, f1: pf * S.between(r, 0.64, 0.70),
        dur: S.between(r, 0.07, 0.09), rough: 0.85, breathy: 0.40,
        formants: PIGLET, chest: CHEST, attack: 0.010,
        gain: CHEER * 0.42, seed: (r() * 1e6) | 0,
      });
      S.breath(ctx, o, t0 + lapEnd + S.between(r, 0.10, 0.16), {
        dur: S.between(r, 0.30, 0.36), f: S.between(r, 520, 590), rise: 1.5,
        lp: 1500, gain: CHEER * 0.26, flutter: 0.5, attack: 0.15,
        seed: (r() * 1e6) | 0,
      });
      return WAIT_WIN + 2.1;
    },

    // WRONG. The mud lets go as the piglet backs out, and one rough wheek —
    // a continuous slide up, cut off. A slide, where the yes is steps; rough,
    // where the yes is smooth. Stays short and modest: four in a row must
    // remain disappointment rather than punishment.
    'slip': function (ctx, o, t, params, r) {
      S.squelch(ctx, o, t, {
        dur: S.between(r, 0.085, 0.11), grains: Math.round(S.between(r, 9, 13)),
        f0: 260 * S.cents(r, 80), skew: 0.6, lp: 900, gain: TOUCH * 0.70,
        seed: (r() * 1e6) | 0,
      });
      const f0 = S.between(r, 470, 540);
      S.grunt(ctx, o, t + S.between(r, 0.04, 0.07), {
        f0: f0, f1: f0 * S.between(r, 1.42, 1.60),
        dur: S.between(r, 0.125, 0.150), rough: 1.15, breathy: 0.42,
        formants: PIGLET, chest: CHEST, attack: 0.008,
        gain: 0.13, seed: (r() * 1e6) | 0,
      });
      return 0.4;
    },

    // THE FAIL — the sad trombone, as performed by the piglet. The classic
    // figure is three repeated notes stepping down by semitones and a fourth
    // that slumps and keeps slumping: wah, wah, wah, waaah. There is no brass
    // in the element library and none is needed — a harmon-muted trombone is
    // acoustically a buzz through a vowel-ish resonance, which is exactly
    // what the grunt element builds. Voiced smooth (rough well down), almost
    // no breath, and with a MUTED-BRASS formant pair in place of the piglet's
    // own snout: each note is its own little "wah". The last note's f1 drags
    // it down most of a fifth and a real sigh opens up around it — the joke
    // lands, and then the animal is back.
    //
    // After the punchline: the flop into the straw and one last small breath.
    // Unmissable now, still cozy — a comedy loss, not a punishment.
    //
    // Waits WAIT_FAIL so it lands after the slip that spent the last heart.
    'fail': function (ctx, o, t, params, r) {
      const t0 = t + WAIT_FAIL;
      const BRASS = [
        { f: 500, Q: 2.8, gain: 1.0 },
        { f: 1180, Q: 4.5, gain: 0.45 },
      ];
      // wah · wah · wah — three notes, semitone steps down, tight rhythm
      const root = 233 * S.cents(r, 15);               // ~B♭3
      const semi = [1.0, 0.944, 0.891];
      for (let i = 0; i < 3; i++) {
        const f = root * semi[i];
        S.grunt(ctx, o, t0 + i * S.between(r, 0.235, 0.255), {
          f0: f, f1: f * 0.985,                        // near-level: a held note
          dur: S.between(r, 0.16, 0.18), rough: 0.22, breathy: 0.10,
          formants: BRASS, chest: 340, attack: 0.030,
          gain: ENDING * 0.60, seed: (r() * 1e6) | 0,
        });
      }
      // waaah — the long slump, sagging and staying sagged
      const last = root * 0.841;
      S.grunt(ctx, o, t0 + S.between(r, 0.72, 0.76), {
        f0: last, f1: last * S.between(r, 0.66, 0.72),
        dur: S.between(r, 0.55, 0.65), rough: 0.30, breathy: 0.18,
        formants: BRASS, chest: 340, attack: 0.040,
        gain: ENDING * 0.68, seed: (r() * 1e6) | 0,
      });
      // the piglet's sigh around the slump — the animal agreeing with the horn
      S.breath(ctx, o, t0 + S.between(r, 0.78, 0.84), {
        dur: S.between(r, 0.45, 0.55), f: S.between(r, 420, 470), rise: 1.35,
        lp: 1200, gain: ENDING * 0.30, flutter: 0.4, attack: 0.18,
        seed: (r() * 1e6) | 0,
      });
      // the flop: weight into straw, unmissable but soft-edged
      S.thump(ctx, o, t0 + S.between(r, 1.38, 1.46), {
        f0: S.between(r, 82, 94), f1: S.between(r, 48, 56),
        dur: 0.24, attack: 0.04, gain: ENDING * 0.55,
        seed: (r() * 1e6) | 0,
      });
      S.rustle(ctx, o, t0 + S.between(r, 1.40, 1.48), {
        f0: S.between(r, 1300, 1700), f1: S.between(r, 650, 850), Q: 1.3,
        lp: 2200, dur: S.between(r, 0.18, 0.24), gain: ENDING * 0.20,
        attack: 0.04, seed: (r() * 1e6) | 0,
      });
      // one last small breath, already half asleep
      S.breath(ctx, o, t0 + S.between(r, 1.62, 1.70), {
        dur: S.between(r, 0.18, 0.22), f: S.between(r, 380, 440), rise: 1.4,
        lp: 1000, gain: ENDING * 0.26, flutter: 0.4, seed: (r() * 1e6) | 0,
      });
      return WAIT_FAIL + 2.1;
    },

    // STARRED — this field is a keeper. A quick interested double-sniff and
    // then a pleased little hum: a small smooth call that lifts and settles,
    // higher and lighter than the uh-huh. The one sound about the FIELD
    // rather than a move, so it can afford to be a touch more personal — the
    // piglet approving of your taste.
    'star': function (ctx, o, t, params, r) {
      S.breath(ctx, o, t, {
        dur: S.between(r, 0.055, 0.070), f: S.between(r, 620, 700), dir: 'in',
        rise: 1.5, lp: 1800, gain: SPARK * 0.55, flutter: 0.5,
        seed: (r() * 1e6) | 0,
      });
      S.breath(ctx, o, t + S.between(r, 0.09, 0.11), {
        dur: S.between(r, 0.060, 0.075), f: S.between(r, 660, 740), dir: 'in',
        rise: 1.5, lp: 1800, gain: SPARK * 0.60, flutter: 0.5,
        seed: (r() * 1e6) | 0,
      });
      const f0 = S.between(r, 390, 430);
      S.grunt(ctx, o, t + S.between(r, 0.20, 0.24), {
        f0: f0, f1: f0 * S.between(r, 1.08, 1.14),     // a light happy lift
        dur: S.between(r, 0.10, 0.13), rough: 0.35, breathy: 0.40,
        formants: PIGLET, chest: CHEST, attack: 0.012,
        gain: SPARK, seed: (r() * 1e6) | 0,
      });
      return 0.6;
    },
  };

  // Published under the framework's well-known handle (arcade-audio.js
  // registerPack) so js/audio.js and the launcher's soundpack toolchain both
  // reach it without either side knowing this game's name.
  S.registerPack({ name: 'sow-duku', ROOM, SENDS, CUES });
})(typeof window !== 'undefined' ? window : globalThis);
