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

A square board — start at **6×6**, scale up to **9×9** — is divided into
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

**Assist** (a player setting, cycled from the toolbar) decides how much the
board helps with the bookkeeping:

- **auto** — placing a piggy softly hatches every now-impossible cell (its row,
  column, pen, and the eight it touches), distinct from your own hoof-print
  fences. The board's facts vs. your hypotheses.
- **manual** — you fence everything yourself; most aligned with rigorous play.
- **gated** — auto on Sunbeam and Meadow, off by Hilltop. The game teaches the
  technique, then takes the training wheels off.

### Gentle failure

A small row of **hearts** sits at the top of the field. Place a piggy that
breaks a rule — too close to another, or doubling up a row, column, or pen — and
a heart softly fades. No klaxon, no screen-shake; just a quiet acknowledgment
that this piggy wouldn't actually be comfortable there. Run out of hearts and
the field simply offers a fresh start. Losing is soft here. The reward was never
a high score; it's the *pure puzzle-solving satisfaction* of the last piggy
settling in.

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

- **The Amble** — an endless supply of hand-warm, unique puzzles. Pick a board
  size, pick a difficulty (*Sunbeam → Meadow → Hilltop*), and wander.
- **One Field a Day** — a single shared daily layout for everyone, seeded by the
  date. No streak-shaming, no push notifications begging you back. It's there if
  you want it; the field doesn't mind if you skip a day.
- **Slow Mode** — no hearts, no failure, infinite markers. For when you want the
  ritual without the stakes.

Difficulty is shaped by *pen geometry and deduction depth*, never by hidden
timers or trick layouts. A hard puzzle rewards patience; it doesn't punish you.

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
| `arcade.v1.sowduku.inProgress`  | The current puzzle + your placements/markers (resume anytime) |
| `arcade.v1.sowduku.stats`       | Puzzles solved, best times, gentle personal bests             |
| `arcade.v1.sowduku.daily`       | Which "One Field a Day" layouts you've finished               |
| `arcade.v1.sowduku.prefs`       | Sound on/off, marker style, default board size                |

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
