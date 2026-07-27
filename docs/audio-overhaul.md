# sow-duku audio overhaul — design + implementation plan

Modelled on hecknsic's audio overhaul (`../hecknsic/docs/audio-overhaul.md`),
which was itself modelled on moon-lit's: physical-gesture synthesis via the
launcher's shared element library (`arcade-audio.js`), a game-owned sound
pack, an offline-rendered audition WAV approved by ear BEFORE wiring, and a
two-path registration module so stale caches degrade to the current spec cues
rather than silence.

## Why

The five shipped cues (thud, chime, snuffle, slip, fail) are `Arcade.audio`
spec cues — one raw oscillator per voice into a gain envelope. The comments in
`index.html` describe mud, straw and a breathing animal; the synthesis is a
chiptune synthesizer by construction and cannot make those sounds, only
gesture at them. Two rounds of fleet-wide cue re-tuning established that no
choice of numbers escapes this (see launcher `plans/soundpack-2026-07.md`).
Graph cues are the escape hatch the SDK grew for exactly this (3.6.0+).

## Status

Shipped and ear-passed. `js/soundpack.js` was written against audition v1
(`tools/soundpack/render.mjs sow-duku` in the launcher repo, 1:29.6, peaks
≤ 0.56) and approved by ear at that version — no retune was needed. Any future
change is auditioned the same way: re-render, listen, quote a timestamp. Do
not retune against the wired game.

| phase | state |
|---|---|
| 1. Framework elements (`squelch`, `breath`, `grunt`) in `../paulgibeault.github.io/arcade-audio.js` | done — SDK 3.9.0 |
| 2. `js/soundpack.js` — room, sends, five cues | done |
| 3. Audition timeline + rendered WAV | done |
| 4. Ear pass / tuning loop | done — v1 approved as rendered, no retune needed |
| 5. `js/audio.js` two-path rewrite (graph cues + spec-cue fallback) | done |
| 6. Call-site wiring in `index.html`, `sw.js` cache list | done |
| 7. Verification | done — see below |

## The design

The place: **a small farmyard pen after rain**. Soft mud, straw bedding, low
wooden rails, open sky. STYLE.md's brief — calm clarity, tactile and grounded,
low stakes — translated into sound rules:

- **Nothing is struck, metallic or bright.** Every cue is either a surface
  yielding (mud, straw, wood) or the creature itself (breath, voice). The one
  pitched cue (`chime`) is plucked warm wood — a thumb piano made of fence
  rail, never a bell.
- **Silence is the ambience.** No sustained bed of any kind. The game's whole
  philosophy is zero interruptions; between placements the yard stands quiet.
  (This is the same call moon-lit made, for the same reason, and the opposite
  of hecknsic's breathing floor.)
- **The room is the outdoors.** Short, dark, almost-not-there reverb (soft
  ground absorbs everything); sends stay low because the board is right under
  your hands.
- **Failure is a nap, not a game over.** The `fail` cue is a long exhale with
  a sagging voiced grunt inside it, a body settling into straw, one last small
  breath. It should make you want to try again, softly.

The five cues keep their names and their call sites — this swaps what the
names *sound like*, nothing about when they fire:

| cue | fires on | gesture |
|---|---|---|
| `thud` | every placement | squelch (mud receives) + thump (the weight) + occasional straw rustle |
| `chime` | pen solved | two warm wood plucks a sixth apart + a breath of straw |
| `snuffle` | board solved | three uneven breaths, the middle one voiced — a contented snort |
| `slip` | wrong/illegal placement | reversed squelch (the piggy backs out) + short unimpressed grunt |
| `fail` | hearts spent | sigh (breath + sagging grunt) → body settles (soft thump) → last breath |

## New framework sound types (phase 1 — shipped)

Three genuinely new physical gestures added to the shared element library, so
every future pack benefits (the bar `tools/soundpack/README.md` sets for
adding elements):

- **`squelch`** — wet granular collapse. A population of tiny cavity pops,
  each sweeping *upward* (droplet physics, miniaturised), dense at contact
  and thinning as the surface settles, under a dark downward smear. `skew < 1`
  reverses it into a suck — a lift-out instead of a landing. Buffer-synthesised
  per call (`squelchBuffer`), same reasoning as `shatter`: it fires on every
  placement.
- **`breath`** — respiration. Noise through a band that rises and falls in
  one arc (the passage opens, then relaxes) with irregular few-Hz turbulence
  flutter modulating the gain. `dir: 'in'` mirrors the envelope for a sniff.
  The flutter is what separates a creature from cloth — the audition includes
  a flutter-0 control so this is checkable by ear.
- **`grunt`** — voiced animal call. A glottal pulse train with per-cycle
  pitch jitter and amplitude shimmer (`gruntBuffer`), through a pair of fixed
  formant resonances (the species) while the pitch moves underneath, plus a
  dark direct "chest" path and optional breathiness. Formants are a parameter,
  so the same element can voice a different animal in another game.

Register plan, so simultaneous cues occupy different bands instead of masking
each other:

    thud weight 50–170 · fail sigh 80–900 · squelch smear 140–520
    grunt voice 85–1100 · squelch pops 200–1300 · breath 350–1600
    wood plucks 390–2200

Deliberately dark and narrow compared to hecknsic (3.6× centroid spread vs
their glass registers): everything in this yard is soft. `analyze.mjs`
confirms 0% of every cue's energy sits above 4 kHz.

## How it is wired

`index.html` loads three scripts in `<head>`, right after `Arcade.init()`:
`/arcade-audio.js` (the shared element library — launcher-root, optional),
`js/soundpack.js` (the pack), `js/audio.js` (registration). All are plain
scripts, not ES modules, because the game itself is one inline IIFE at the end
of `<body>`.

`js/audio.js` picks its path at load: graph cues when the element library is
present with every gesture the pack needs, else the pre-overhaul spec cues
copied verbatim. Both paths register the same five cue names, so no call site
in the game branches on the path — the game just calls the five `play*()`
wrappers exactly as before.

The one thing that stayed in `index.html` is the **setting**: the
off-by-default `sound` row in the ⚙ menu is still the single source of truth,
and it is handed to the module via `SowdokuAudio.setGate(soundOn)`. Volume and
global mute remain launcher-owned.

`sw.js` precaches `js/soundpack.js` and `js/audio.js` (cache bumped to v7).
It deliberately does **not** cache `/arcade-audio.js` — that is launcher-root
and outside this worker's scope, the same rule `/arcade-sdk.js` already
followed. If it is unavailable, the fallback path covers it.

## Verified

- **The graph path is live in a real browser**, not silently falling back:
  `scripts/test_audio_wiring.js` stages the launcher root at `/` with the game
  at `/sowduku/` (matching production, since the script tags are root-relative)
  and asserts the shared room bus exists — only `room()` creates it.
- **All five cues play from the live game** through the real call path, after
  turning sound on the way a player does (the ⚙ menu, which is also the
  gesture that unlocks the AudioContext). No wrapper throws; no page errors.
- **The gate still holds:** with sound off, zero `play()` calls are made.
- **The fallback path works** with `/arcade-audio.js` served as a 404 — the
  stale-cache case the two-path module exists for. All five spec cues still
  play, nothing throws. 20 assertions total, all passing.
- **moon-lit and hecknsic are untouched by the shared-library change.**
  Baseline auditions of both packs were rendered before the element patch and
  re-rendered after; `wavdiff.mjs` puts the delta at 1 LSB peak (−90 dBFS,
  ~110 dB under the signal) — inside the renderer's own run-to-run noise
  floor. hecknsic's own 74 tests still pass.
- **Launcher gates:** `audio-graph-acceptance.mjs` passes, and all 20 unit
  suites pass including `sdk-version-unit.mjs` (see the release note below).
- **`analyze.mjs` on the audition:** no automatic findings. One advisory left
  as designed rather than tuned away — the room contribution to `chime` is
  small (−1.8 dB tail vs dry), which is what open air over soft ground should
  measure like.

### SDK release

The new elements ship as **SDK 3.9.0**, following the release procedure in
`sdk/CHANGELOG.md` and the precedent 3.8.0 set for hecknsic's three elements:
additive companion-library gestures, no `Arcade.audio` surface change, but the
pinned copy `sdk/v3/arcade-audio.js` and the changelog move on the same
version line. `sw.js` `CACHE_NAME` bumped to `paul-arcade-v63`.

### Unrelated pre-existing test failures

Four of the game's older suites fail both with these changes and at pristine
`HEAD` (34c9cdd), verified by running each against a clean worktree — they are
not caused by the audio work and are not addressed here:
`test_b3_regression.js` (3 assertions about a retired ladder mode),
`test_b4_trails_list.js` and `test_b6_gauntlet.js` (both throw on a null
`packCleared`), and `test_veil_dismiss.js` (timeout).

Worth knowing for anyone running these: they need the launcher root staged
alongside the game, or `/arcade-sdk.js` 404s, `window.Arcade` is undefined and
most of them fail for that reason alone rather than on anything they test.
