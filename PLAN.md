# Sowdoku — UI Overhaul & Difficulty Plan

Living checklist. Check items off as they land; keep notes on decisions made
mid-implementation so the doc stays a true record, not just an aspiration.

---

## Part A — UI polish & layout

### A1. Layout: let the board own the screen — **done**
- [x] Converted `body` to a column app-shell filling `100dvh` (dropped the old
      centered `.frame` card entirely — header/status-strip/board-area/
      below-board/action-bar are now direct flex children)
- [x] Board sizes itself off the tighter viewport axis via `container-type:
      size` on `.board-area` + `width: min(100cqw, 100cqh); aspect-ratio: 1`
      on `.board-wrap` — no JS resize logic needed
- [x] Slim header (wordmark + hearts + ⚙), status strip above board, docked
      action bar below
- [x] Mobile: board goes near-full-bleed (tighter padding under a
      `max-width: 480px` query), action bar docked at the bottom (thumb
      reach is automatic — it's the last flex child, pinned to the viewport
      bottom by the column layout)
- [x] Tagline dropped (rules are already taught by the hint line + create-
      sheet mode notes); the rotating saying **relocated** rather than
      deleted — it now appears on the win veil (`#veilSaying`, freshly picked
      each solve via `pickSaying()`) instead of a persistent footer eating
      board space on every screen
- [x] Board top-aligned, not centered, within `.board-area` — on a narrow-tall
      viewport the board is width-bound and can't fill the height; centering
      it left an unexplained-looking gap above *and* below, top-aligning
      pushes all the leftover space below the board where it reads as
      intentional, not like the board is "floating"

### A2. Controls: group by frequency — **done**
- [x] Header: wordmark · hearts · ⚙ settings (settings button + popover live
      in a `.settings-wrap`, menu now opens *downward* anchored under the
      button instead of upward from a bottom toolbar)
- [x] Status strip: mode · size · difficulty · 🌱 code · "N left" — unchanged
      content, just relocated above the board as its own row
- [x] Action bar: ↶ undo · 👁 peek · ⌫ clear ‖ ＋ new field · 🕘 history,
      docked to the bottom, icon-over-label `.actbtn`s
- [x] Peek graduated from the ⚙ menu to the action bar
- [x] `.actbtn` sized `min-width: 3.4rem; min-height: 2.9rem` (both axes
      clear 44px at the default font scale)
- [x] "＋ create" and "new field" merged into one action-bar button (opens
      the create sheet); the old instant-reroll shortcut moved *into* the
      sheet as a new "🎲 surprise me" button (reroll the seed + tend
      immediately, one tap) — hidden for daily/ladder/gauntlet since their
      seed isn't player-chosen
- [x] Gentle two-tap confirm on "clear": first tap arms it (label flips to
      "sure?", a warm-red outline), a second tap within 2.2s (or clicking
      the confirm state) actually clears; anything else disarms it. No
      native `confirm()` dialog — matches the "gentle failure" brand
- [x] Keyboard shortcuts added: `H` peek, `N` opens the create sheet (⌘Z
      undo, `Esc` already worked and still does, now also disarms a pending
      clear-confirm)

**Bug caught during testing:** the clear-confirm's "click anywhere else
disarms it" listener compared `e.target !== clearBtnEl`, but the button's own
click handler replaced its `innerHTML` (to show "sure?"), which **destroyed
the exact child node the click had targeted** (e.g. the icon `<span>`) mid-
dispatch. By the time the event bubbled to `document`, `e.target` referenced
a now-detached node, so `clearBtnEl.contains(e.target)` came back `false` and
the listener immediately disarmed the very click that had just armed it —
the button silently never worked via a real click (only via a synthetic
`.click()` call, which is why it wasn't caught by casual testing). Fixed by
never touching `innerHTML`: the label lives in a persistent `<span
class="lbl">` that only has its `textContent` swapped, so no node is ever
destroyed and `.contains()` stays valid. Caught by a Playwright test that
asserted the board was *actually* empty after two clicks, not just that the
heart count looked right (which can pass by coincidence even when the
button is silently broken).

Verified end-to-end: full mode/difficulty regression pass, all prior
feature tests (stakes, gesture-cap, starve, crag, accolades, gauntlet,
size-10, persistence) re-run clean after the restructure, plus new checks
for the settings-menu position, clear-confirm arm/disarm/execute cycle,
surprise-me, and both keyboard shortcuts. Screenshots taken at desktop
(1000×800), a wide-tall viewport (900×1400 — confirmed the "empty space"
there is correct largest-square-in-container math, not a bug), and real
mobile portrait (390×844).

### A3. Win / fail results screen
- [ ] Shared results-card component (slots for win vs. fail)
- [ ] Win: stats row (time · slips · peeks · score), new-high-score callout
- [ ] Win: "looks like vs. played like" difficulty verdict surfaced
- [ ] Win: next-field preview (mini board + code + effort bar), one-tap start
- [ ] Fail: progress (placed N/M), slips, time so far; no score-penalty framing
- [ ] Fail: optional "show me where it went wrong" (faded solution overlay,
      clearly forfeits the field)
- [ ] Shared fade/rise animation, `prefers-reduced-motion` honored

### A4. Asset & branding generation (separate image-gen track)
- [ ] Logo / wordmark
- [ ] Favicon / app icon (512/192/180/32/16)
- [ ] Piggy sprite: settled
- [ ] Piggy sprite: unimpressed (illegal placement)
- [ ] Piggy sprite: dozing (idle)
- [ ] Piggy sprite: celebrating (win)
- [ ] Hoofprint marker
- [ ] Hearts (full / empty)
- [ ] Board paper texture (tileable)
- [ ] Background farm-horizon border illustration
- [ ] Win vignette illustration
- [ ] Fail/"crowded field" vignette
- [ ] Empty-state spot illustrations (history / curated / first-run)
- [ ] OG / social share image (1200×630)
- [ ] Misty Morning mode badge
- Prompts for all of the above are recorded in the conversation history that
  produced this plan; re-derive or ask to have them re-listed when the art
  pass starts.

### A5. Other polish backlog
- [ ] Sound: wooden thud / pen-complete chime / solve snuffle (off by default)
- [ ] Real typography: Fraunces (headers) + Inter (UI)
- [ ] Illegal-placement teaching: highlight *why* a slip failed
- [ ] Pen-completion shimmer
- [ ] First-run onboarding (tap / long-press / Wallow Rule, `seenIntro` flag)
- [ ] Colorblind support: optional per-pen letter/pattern overlay
- [ ] Keyboard/board accessibility: arrow-key focus, Enter/Space, aria-labels
- [ ] PWA: manifest.json + icon set + minimal service worker
- [ ] Render diffing instead of full `board.innerHTML` rebuild per paint
- [ ] Share affordance on win screen (code + one-line challenge)
- [ ] Quiet "today's field awaits 🌱" chip when daily untouched
- [ ] Hearts near the board (mobile) so cause/effect (bad tap → heart) is close

---

## Part B — Difficulty & gameplay depth

### B1. Stakes setting (heart strictness) — **done**
Player-facing tiers, persisted like `assist`:
- **gentle** (current behavior) — heart only for a placement that breaks a
  rule against pigs already on the board
- **honest** — + heart for a legal-but-wrong pig (doesn't match the solution)
  · + heart for starving a pen (including via your own hoofprints)
- **stern** — + heart for a hoofprint placed on a cell that is actually the
  solution cell for its row

Implementation notes:
- [x] `STAKES_MODES`, `loadStakes()`/`saveStakes()` mirroring assist
- [x] `game.stakes` / `game.lockedStakes` in `beginGame()` and `restore()`
- [x] Wallow mode forces `stakes: "stern"` (pairs with its existing 1 heart +
      manual assist — finally makes the single heart mean something)
- [x] ⚙ menu: new "stakes" row, segmented gentle/honest/stern, unlockable by
      user tap same as assist
- [x] `placePiggy`: legal-but-wrong-vs-solution docks a heart at honest+
- [x] Hoofprint set: wrong-vs-solution docks a heart at stern (checked at set
      time, not on every render); the mark is rejected outright, not left on
      the board
- [x] Starved-by-fences check (`starvedByFences`): pen with no pig and no
      legal, non-hoofprinted cell remaining docks a heart at honest+; also
      surfaced in `render()` (the `.starved` blush + stuck note) even with
      assist off, so the dock is never a mystery
- [x] **Cap: at most one strict-mode heart dock per pointer gesture** — a
      shared `gestureDocked` flag reset in the `pointerdown` handler and the
      `contextmenu` handler (right-click isn't backed by pointerdown)
- [x] Toast feedback per violation type ("not quite this piggy's patch" ·
      "that patch was the piggy's own" · "that fences a whole pen out")
- [x] Recorded onto history (`buildRecord.stakes`) so past runs remember
      which strictness they were played at
- [x] README updated with a "Stakes" section and the Wallow description
- [x] Verified end-to-end with Playwright (honest wrong-placement dock,
      stern wrong-hoofprint dock, honest fence-starve dock on both a
      1-cell and a 13-cell region with no premature docking, one-dock-
      per-gesture cap under a multi-cell drag, Wallow's auto-lock, and
      persistence across reload)

### B2. Difficulty & engagement mechanics (ranked by effort)
- [x] **A. Unlock the fourth solver band ("crag") — done.** Added a genuine
      L4 technique (`propagateL123`/`level4`: hypothesize a candidate,
      propagate at up to L3, eliminate on contradiction — the one-deeper
      mirror of L3). In practice the region generator rarely produces a
      puzzle that strictly *needs* L4, so `crag` is band-split from `hilltop`
      by grind (`l3 >= 2` separate contradiction chains), with genuine L4-only
      solves also folding into `crag`. `generate()` gives `crag` requests a
      bigger attempt budget (6000 vs 2000) since it's rarer; benchmarked at
      0 failures / <35ms across 15 seeds × 4 sizes. Wired through: `BANDS`,
      `BAND_CHAR`/`CHAR_BAND` (+`c`), board-code regex, `DIFF_MUL`,
      `humanScore` base, the create-sheet difficulty picker, `assistOn()`'s
      gated threshold (off for hilltop *and* crag), the Ladder (now tops out
      at 9×9 crag), and Wallow (now requests crag instead of hilltop).
      Verified end-to-end with Playwright: crag selectable + previews
      correctly, board code round-trips (`8c-...`), Wallow auto-locks to
      crag+stern+manual+1 heart, gated assist confirmed off on a crag field.
- [x] **B. Bigger fields — 10×10 done, 11×11 deliberately not shipped.**
      Benchmarked both before touching UI, per the plan's own caveat. 10×10:
      0-1/15 failures across bands at `maxAttempts=12000` (scaled by size in
      `generate()`), worst case ~900ms (meadow), everything else under
      200ms — acceptable for a "tend this field" click. 11×11: real
      reliability problems even at 8000 attempts (meadow/hilltop failed
      5-6/8 times — i.e. silently handed back the wrong requested
      difficulty) and worst-case over 1.5s even when it succeeded. Shipping
      11×11 as-is would mean the difficulty picker quietly lies about a third
      of the time, so it's cut from this pass — needs generator work (smarter
      region growth or a non-restart search), not just a bigger attempt
      budget. Also fixed a latent bug the size bump exposed: `PALETTE` only
      had 9 colors, so a 10th region would have silently reused region 0's
      color (`id % PALETTE.length` wrapping) — added a 10th pastel. Verified
      end-to-end: 10×10 selectable in the create sheet, 100 cells render,
      10 distinct region ids map to 10 distinct rendered colors (no
      collision), board code round-trips (`10m-...`).
- [ ] **C. Twin litters** ("Two to a Pen") — generalize solution generator,
      uniqueness counter, and solver from exactly-one to exactly-k per
      row/column/pen; own milestone, needs ≥9×9
- [ ] **D. Mud puddles** — pre-blocked cells no pig may occupy; lets the
      generator reach knottier unique layouts; on-brand art opportunity
- [ ] **E. Limited hoofprints** — scratch marks become a capped resource
      (e.g. `2 × size` per field)
- [ ] **F. Settled means settled** — mode where lifting a placed pig costs a
      heart or isn't allowed
- [x] **G. The Gauntlet — done.** New `gauntlet` mode: a fixed 3-stage
      escalation (`GAUNTLET` array, 7×7 meadow → 8×8 hilltop → 9×9 crag),
      `beginGame()` extended with `opts.carryHearts`/`carryMaxHearts` so
      `nextGauntletField()` hands the *remaining* heart count forward
      instead of each field starting fresh. Two interactions needed explicit
      protection once hearts became a cross-field resource: (1) the "clear"
      button previously refilled hearts unconditionally on every mode —
      special-cased to skip that for gauntlet, or a player could clear their
      way back to full hearts mid-run; (2) running out of hearts needed its
      own veil branch ("the gauntlet ends here") distinct from the generic
      per-field "fresh start" failure, since the whole run ends, not just the
      field. `stats.gauntletsCleared` increments only when the *last* stage
      solves, surfaced quietly in the history header. Wired through the
      create sheet (mode button, fixed size/diff, hidden size/diff/seed
      rows), the climb chip ("field N/3"), persist/restore, and buildRecord.
      Verified end-to-end: hearts carry correctly across fields (not reset),
      clear does NOT refill the shared pool, depleting it mid-run shows the
      gauntlet-specific fail veil at the correct field, screenshots confirm
      the UI reads correctly at each state.
- [x] **H. Par & quiet accolades — done.** `accoladesFor(rec)` returns
      **tidy** (0 hoofprints) and **unaided** (0 hints, manual assist);
      "clean" (0 slips) isn't a separate tag since it already shows as
      "0 slips" in the outcome line — added it anyway and it was pure
      redundant noise, so it was dropped. Both accolades nudge `playScore`
      (+40 tidy, +60 unaided, same multiplier chain as the existing
      penalties). `stats.cleanStreak`/`bestCleanStreak` track consecutive
      zero-slip solves in `finalizeGame`; any mistake or an unsolved/
      abandoned field resets the streak to 0. Surfaced in the history
      header only once `cleanStreak >= 2` ("3 clean in a row") — kept
      quiet, no per-solve toast/badge treatment. Verified end-to-end:
      two clean 6×6 solves show `tidy`/`unaided` on both cards and
      "2 clean in a row"; a genuine mistake (forced via manual assist so
      it isn't silently absorbed by gated auto-shading) correctly drops
      the streak line entirely.
- [ ] **I. Daily modifier rotation** — fog Wed / stern Fri / gauntlet Sun, etc.

**Recommended build order:** B1 stakes → A (crag band) → H (par/accolades,
rewards the new difficulty) → G (gauntlet) → B (bigger boards) → D (mud
puddles) → C (twin litters, own milestone).

---

## Status log
- 2026-07-01 — Plan captured from design discussion. Starting implementation
  with B1 (stakes setting).
- 2026-07-01 — B1 (stakes setting) implemented and verified end-to-end in a
  headless browser.
- 2026-07-01 — B2-A (fourth solver band, "crag") implemented and verified.
- 2026-07-01 — B2-H (par & quiet accolades) implemented and verified. Asked
  the user which track to prioritize next (more mechanics vs. the Part A UI
  overhaul); no response, proceeding down the recommended mechanics order.
- 2026-07-01 — B2-G (the Gauntlet) implemented and verified.
- 2026-07-01 — B2-B (bigger fields) implemented for 10×10; 11×11 benchmarked
  and deliberately cut for this pass (see notes above — real reliability
  problems, not just slowness). Five of six B2 mechanics items now done (A,
  B, G, H, plus B1 from Part B1). Remaining: D (mud puddles), C (twin
  litters — own milestone), I (daily modifier rotation), F (settled means
  settled). This is a natural stopping point — the remaining items are
  larger (C is its own milestone) or lower-value (I, F) relative to what's
  shipped. Pausing here to let the user review before continuing further,
  since a large amount of unreviewed work has accumulated.
- 2026-07-01 — User asked "what is next?"; recommended and got confirmation
  to do Part A1/A2 (layout shell + control regrouping) next, since the new
  gameplay depth was sitting behind the exact cramped, scattered UI that
  motivated this whole plan. Implemented and verified — see A1/A2 notes
  above, including a real bug caught by testing (the clear-confirm button's
  outside-click listener silently broke itself via an `innerHTML`/
  `e.target` interaction). Remaining from Part A: A3 (win/fail results
  screen), A4 (asset generation — separate image-gen track), A5 (polish
  backlog). Natural next step is A3, since it directly showcases the
  accolades/streak/Crag work from Part B that has no dedicated results UI
  yet.
