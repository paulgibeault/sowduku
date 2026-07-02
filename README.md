# Sowdoku 🐖

*A field of contented little piggies, and the quiet logic of giving each one its
own patch of mud.*

Sowdoku is a cozy logic puzzle for Paul's Arcade. Part Sudoku, part lazy
afternoon on the farm: you tend a grid of softly-colored pens, and one by one
you settle a single piggy into each. The catch — every piggy insists on its own
space. Solve the whole field and it all sinks into one satisfied, snuffly sigh.

It soothes the soul but keeps your brain spinning. No timers squealing at you,
no daily-grind treadmill, no confetti cannons — just the gentle *thud* of a
piggy flopping down in exactly the spot it was always meant to occupy. It fills
the puzzle-shaped hole in your commute and asks for nothing more than your
attention.

---

## The rules

A square board — start at **6×6**, scale up to **10×10** — is divided into
irregular, watercolor-tinted **pens**, each one a single soft, earthy color.
Settle exactly one piggy onto the field so that:

1. **One piggy per color.** Every pen gets exactly one.
2. **One piggy per row.**
3. **One piggy per column.**
4. **No piggy may touch another** — not side by side, not even corner to corner.

That fourth rule is the one with the soul. Call it **The Wallow Rule**: a piggy
that's just found the perfect cool patch of mud does *not* want a neighbor
flopping down against it. That single "absolute personal space" constraint turns
a familiar grid into genuinely fresh *spatial* deduction — you're not filling the
board, you're negotiating the polite distances between creatures who would each
prefer to believe they have the whole farm to themselves.

Every puzzle has exactly one solution, reachable by pure logic — never a guess.
If you find yourself guessing, the field has more to teach you; back up and look
again.

### How a turn feels

Two gestures, cleanly separated so ruling-out never risks a heart:

- **Tap** — a piggy flops into that square (a soft haptic click, a wooden
  *thud*); tap it again to lift it.
- **Long-press** (or **right-click** on desktop) — fences off a patch with a
  little hoof-print, your "definitely-not-here" note.
- **Drag** — paints fences across a whole run at once, for when a region is
  solved and the rest of its row is obviously out.

Fences are first-class. Half the pleasure of a cozy puzzle is the slow
*narrowing down*, and Sowdoku treats your scratch work as lovingly as your
answers.

**Assist** (a player setting, in the ⚙ menu) is a simple **on/off**: on
softly hatches every now-impossible cell once a piggy is placed (its row,
column, pen, and the eight it touches), distinct from your own hoof-print
fences — the board's facts vs. your hypotheses. It's active through Sunbeam
and Meadow and steps back by Hilltop and Crag, so the field teaches the
technique before taking the training wheels off. Off leaves all the
bookkeeping to you.

### Gentle failure

A small row of **hearts** sits at the top of the field. Place a piggy that
breaks a rule — too close to another, or doubling up a row, column, or pen — and
a heart softly fades. No klaxon, no screen-shake; just a quiet acknowledgment
that this piggy wouldn't actually be comfortable there. Run out of hearts and
the field simply offers a fresh start. Losing is soft here. The reward was never
a high score; it's the *pure puzzle-solving satisfaction* of the last piggy
settling in.

### Stakes — one spectrum, from ritual to rigorous

**Stakes** (a player setting, in the ⚙ menu) decides which mistakes actually
cost a heart — one dial, from most to least forgiving, rather than a stakes
setting and a separate slow-mode toggle bolted on beside it:

- **slow** — no hearts, no failure, just the ritual. Hearts disappear from the
  field entirely; nothing you do here can end a field early. For when you
  want the puzzle without the pressure.
- **gentle** — the default. Only a placement that breaks a rule against pigs
  already on the field costs a heart.
- **honest** — also costs a heart for a piggy that's *legal right now* but
  isn't where it truly belongs, and for fencing a whole pen out of room with
  your own hoofprints (blocking off a color so no piggy can ever land there).
- **stern** — also costs a heart for a hoofprint dropped on the one cell a
  piggy actually belongs in. Scratch work stops being free; every mark is a
  claim you stand behind.

At most one heart is docked per gesture — a whole drawn-out drag or a single
long-press never costs more than one, however many cells it touches. **The
Wallow** pairs its single heart with stern stakes by default, so that one
heart finally means what it says.

---

## Visual & sensory design

Drawn straight from the house style — **calm clarity**.

- **Palette.** A base of warm off-white and soft charcoal to keep eye strain low
  through long, lost-in-it sessions. Pens are delineated in muted, organic
  watercolor pastels — sage, clay, dusty rose, sky-grey — never neon, never
  jarring.
- **Negative space.** The board breathes. Generous margins mirror the very rule
  the piggies insist on: everyone needs absolute personal space.
- **Illustration.** Clean, minimalist line-art piggies and a few deliberate
  brushwork accents. They doze, twitch an ear, snuffle; no flashy particles, no
  chaotic UI. A piggy placed wrong doesn't explode — it just cracks one
  unimpressed eye.
- **Typography.** A modern, highly-legible sans for UI (logic and clarity),
  paired with a warm rounded serif for headers (the human, cozy touch).
- **Sound.** Optional, quiet by default: a wooden *thud* on placement, a faint
  chime when a pen completes, and one long, contented snuffle at solve.

---

## Modes

Every mode is reachable from the **＋ create** sheet — pick a mode, size, and
mood, watch the live preview, and settle in. Each slants the same gentle
deduction a different way:

- **The Amble** — an endless supply of hand-warm, unique puzzles. Pick a board
  size, pick a difficulty (*Sunbeam → Meadow → Hilltop → Crag*), and wander.
- **One Field a Day** — a single shared daily layout for everyone, seeded by the
  date. No streak-shaming, no push notifications begging you back. It's there if
  you want it; the field doesn't mind if you skip a day.
- **The Ladder** — a gentle climb. Begin on a small Sunbeam field; each field you
  tend nudges the next a notch harder, up through a 9×9 Crag at the very top.
  Your best rung is quietly remembered. Stop whenever; the ladder waits.
- **Misty Morning** — the pens hide in fog, drawn only in outline. A pen's colour
  settles in the moment its piggy does. Same fair puzzle, read entirely from the
  fences — a slower, more spatial kind of seeing.
- **The Wallow** — one heart, no assist, stern stakes, the knottiest Crag
  fields. For a focused, deliberate sit where every placement — and every
  mark — is yours to stand behind.
- **The Gauntlet** — three fields, back to back, escalating from Meadow to
  Hilltop to Crag — but only **three hearts total**, shared across all
  three. A slip on field one is a slip you're playing field three without.
  Clearing the whole gauntlet with any hearts left is worth noticing;
  running dry ends the whole run, not just the field you're on.

Want the ritual without the stakes? Set **stakes** to *slow* (in the ⚙ menu)
over any field — no hearts, no failure, infinite markers.

A **gentle hint** ("peek", in the docked action bar) glows the next
logically-forced piggy — never a guess, just the field pointing at the
deduction you already had the pieces for.

Difficulty is shaped by *pen geometry and deduction depth*, never by hidden
timers or trick layouts. A hard puzzle rewards patience; it doesn't punish you.
Four bands, each asking a little more of the same four gentle rules:

- **Sunbeam** — forced singles only; the field mostly fills itself.
- **Meadow** — the odd confinement (a pen or a row/column narrowed to one
  possibility) alongside the singles.
- **Hilltop** — at least one contradiction chain: a "if this piggy went here,
  a pen would run dry — so it can't" leap.
- **Crag** — several contradiction chains stacked, sometimes one nested inside
  another. Still pure logic, never a guess — just a longer walk to get there.

### Every field has a code

A field is fully determined by its **size · difficulty · seed**, printed as a
compact code like `8m-3k7f2a` (🌱 chip, top of the board — tap to copy). Paste a
code back into the create sheet's *seed* box to conjure the exact same field,
piggy for piggy. Codes are the unit of sharing, replay, and curation.

### History & difficulty curation

Every field you touch is logged to a quiet **🕘 history** — outcome, play time,
slips, and hoofprints, with *no visible timer* to rush you. Each record carries
two difficulty reads:

- **"looks like"** — the solver's *a-priori* effort score, from the deduction
  depth the field demands (singles → confinements → contradictions).
- **"played like"** — the *empirical* score, derived from how the field actually
  played for you (time-per-pen and slip rate).

When the two disagree, the card says so — *"played tougher than it looks"* or
*"gentler than it looks"* — which is exactly the signal for **curation**: star
(☆) the fields worth keeping, and the curated list becomes a hand-picked set of
layouts whose real-world difficulty you've verified, not just guessed.

### Quiet accolades

No fireworks, just a plain read of what a run actually was. A solved field
can quietly earn:

- **tidy** — solved without a single hoofprint.
- **unaided** — solved with assist off and no peeks — nothing but you and
  the field.

("Clean" — zero slips — isn't a separate accolade; it's already right there
as "0 slips" in the outcome line.) Tidy and unaided nudge a run's score up a
touch, the positive mirror of the slip and peek penalties. And once you've
strung together a couple of clean solves in a row, the history header says
so quietly — *"3 clean in a row"* — a number worth protecting, with no shame
when a slip resets it to zero.

---

## Paul's Arcade integration

Sowdoku drops into the launcher with one script tag and lights up extras when
framed — while playing perfectly well standalone.

```html
<script src="/arcade-sdk.js"></script>
<script>Arcade.init({ gameId: 'sowduku' });</script>
```

### Storage — progress that follows you

All persistent state lives under the `arcade.v1.sowduku.*` namespace, so it rides
along in the launcher's cross-device save file for free:

| Key                             | Holds                                                         |
| ------------------------------- | ------------------------------------------------------------- |
| `arcade.v1.sowduku.inProgress`  | The current field + placements/markers/metrics (resume anytime) |
| `arcade.v1.sowduku.history`     | Rolling log of tended fields (up to 300) with per-game metrics  |
| `arcade.v1.sowduku.stats`       | Lifetime tallies: fields played/solved, slips, best ladder rung |
| `arcade.v1.sowduku.curated`     | Hand-picked fields (by board code) worth keeping and replaying  |
| `arcade.v1.sowduku.assist`      | Assist preference (on / off), persists across fields |
| `arcade.v1.sowduku.stakes`      | Stakes preference (slow / gentle / honest / stern), persists across fields |

```js
Arcade.state.set('inProgress', JSON.stringify(board));   // autosave each move
Arcade.onStateReplaced(() => loadBoard());               // re-read after an import
```

Because every move autosaves, the iframe pool's eviction is harmless: a cold
relaunch restores the exact field you left, piggy for piggy.

### Settings auto-apply

The SDK injects the launcher's font scale into `:root`, so every rem-sized number
and label grows or shrinks with the launcher's accessibility setting — no extra
code. We keep the board sized in rem so the puzzle scales gracefully for
low-vision play.

Sowdoku **opts out of the dark theme** on purpose: the warm, sunlit palette is
the game (the same stance `cozy-solitaire` takes). The launcher's `data-theme`
still lands on `<html>`, we just don't key any CSS off it. Reduced-motion is
honored — the wooden-thud animation is the only motion, and it's already gentle.

### Multiplayer — quiet by design

Multiplayer is optional and *deliberately unintrusive* — it must never become a
"tedious social mechanic." When framed, `Arcade.peer` unlocks two calm modes:

- **Shared Field (async).** Today's "One Field a Day" layout is the same for
  everyone connected. When you finish, a soft note appears that a friend tended
  it too — solve time shown only if you opt in. No live pressure; you're
  comparing fields over the fence, not racing.
- **Two Piggies, One Sty (co-op).** A live shared board two players tend
  together. Placements and markers sync over `Arcade.peer.send`; conflicting
  piggies just blink at each other until someone yields. Turn-free,
  conversational, slow.

```js
if (Arcade.peer.status() === 'connected') {
  Arcade.peer.send({ kind: 'place', r, c });
  Arcade.peer.onMessage(({ kind, r, c }) => applyRemote(kind, r, c));
}
Arcade.peer.onStatus(s => setCompanionBadge(s));  // a dozing/awake piggy icon
```

Standalone, `peer.status()` stays `'unavailable'`, both modes simply don't
appear, and nothing about solo play changes.

### Save / load

Nothing special required: all state is `arcade.v1.sowduku.*`, so the launcher's
fault-tolerant export bundles it and its checksummed import restores it. Carry a
half-solved field from laptop to phone and pick up at the exact piggy.

---

## Why this one fits the arcade

- **Standalone-honest.** Plays completely on its own; the platform only adds
  reach (cross-device saves) and warmth (the optional shared field).
- **On-brand.** The style guide made playable: piggies with personal space,
  colored pens, hearts, tactile thuds, and a rule named for absolute calm.
- **Respectful of the player.** No grind, no nags, no manufactured urgency —
  engagement earned through the quality of the deduction, not dark patterns.
- **Tiny footprint.** Pure logic puzzle, line-art only; safe for the iframe pool,
  instant to relaunch, kind to the WebGL-less.

---

## Build order (suggested)

1. **Generator + solver.** Unique-solution generation with the four rules and
   irregular pens; difficulty rated by deduction depth.
2. **Board UI.** Tap-cycle placement, hoof-print markers, hearts, watercolor
   pens, the dozing-piggy art set, haptics + sound.
3. **Persistence.** `Arcade.init`, autosave to `arcade.v1.sowduku.*`,
   resume-on-launch, `onStateReplaced`.
4. **Daily + stats.** Date-seeded layouts, gentle personal bests.
5. **Multiplayer (framed-only).** Shared Field first (async, low-risk), then Two
   Piggies co-op over `Arcade.peer`.

> *A quiet, sunlit afternoon; a warm patch of mud; a cup of coffee going cold
> because you're one piggy away from a perfect field.*
