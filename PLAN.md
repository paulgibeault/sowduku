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

### A2b. Settings menu redesign — **done** (user-directed, follow-up to A2)
- [x] **"How to play" info sheet.** New `#infoBack` sheet (same pattern as
      create/history), opened from a dedicated `ℹ how to play` button at the
      top of the ⚙ menu. Five sections: The rules, Controls, Difficulty,
      Stakes, Assist — the persistent tap/long-press/drag hint line that used
      to sit permanently under the board is gone, its content expanded and
      moved here instead (freeing more board space, on top of A1's work).
- 2026-07-01 — **Follow-up bug: the grid fix wasn't the whole story.** User
  reported the right-hand column still cut off on their actual machine
  (Safari). All my verification of the earlier `gridTemplateRows` fix ran
  against Playwright's Chromium, which never reproduced it. Installed
  Playwright's WebKit engine (Safari's actual rendering engine) and confirmed:
  `.board-wrap` — `width: min(100cqw, 100cqh); aspect-ratio: 1;` inside a
  `container-type: size` ancestor — rendered as 1364.73×1379.52px in WebKit,
  not square, a ~1% drift invisible at some sizes/viewports but visibly
  clipping the last row/column at others (matches "sometimes fine, sometimes
  cut off" being size/viewport-dependent). This is a genuine WebKit quirk in
  combining `aspect-ratio` with container-query-derived sizing, not something
  the earlier `gridTemplateRows` fix could touch (that fixed a different,
  real bug — rows not matching an already-square container — but the
  container itself wasn't reliably square to begin with in WebKit).
  Replaced the CSS-only approach with a `sizeBoardWrap()` JS function
  (`.board-area.clientWidth/Height` minus its own padding, `Math.floor` of
  the smaller axis, set as explicit `px` width/height on `.board-wrap`) plus
  a `ResizeObserver` on `.board-area` so it stays correct across any layout
  change (viewport resize, launcher font-scale change, etc.) without
  depending on any CSS engine's aspect-ratio/container-query implementation.
  Dropped `container-type: size` and the `aspect-ratio`/`min(cqw,cqh)` width
  from the CSS entirely — verified in WebKit that `.board-wrap` is now
  pixel-identical square (e.g. 1364×1364) with 0px cell-size spread at every
  board size 6–10, confirmed the `ResizeObserver` correctly keeps it square
  across a live viewport resize, and re-ran the full Chromium regression
  suite clean. Lesson: this repo's target is Safari (visible in every
  screenshot the user's sent), so layout-affecting CSS changes should get at
  least a WebKit-engine spot-check going forward, not just Chromium.
- [x] **Slow mode folded into the stakes spectrum.** Was a separate boolean
      (`game.slow`) next to the 3-tier `stakes` control; now `stakes` is one
      4-tier spectrum (`slow → gentle → honest → stern`, `STAKES_RANK`
      0–3). `isSlow()` (= `game.stakes === "slow"`) replaces every prior
      `game.slow` check. Selecting "slow" refills hearts to a clean slate
      (mirroring the old toggle-on behavior); `stakesAtLeast()` needed no
      change since slow's rank (0) is below every real check. One-time
      migration in `restore()`: an old persisted `s.slow: true` maps to
      `stakes: "slow"` (mode-forced stakes, e.g. Wallow's "stern", still
      wins over the migration).
- [x] **Assist simplified from 3 modes to 2.** Dropped "auto" (always-on,
      "not helpful" per the user — it never stepped back for harder bands)
      and kept the smarter "gated" behavior, renamed to "on" (shades through
      Sunbeam/Meadow, off by Hilltop/Crag); "manual" renamed "off". One-time
      migration in `loadAssist()`: old `"manual"` → `"off"`, old `"auto"`/
      `"gated"` → `"on"`. Wallow's forced assist updated from `"manual"` to
      `"off"`; the `accoladesFor()`/`playScore()` "unaided" check updated
      from `rec.assist === "manual"` to `"off"`.
- [x] Fixed a nested-scroll visual bug caught while screenshotting the new
      info sheet: `.info-body` had its own `max-height`+`overflow:auto`
      inside `.sheet`'s existing scroll region, crowding the close button
      against the last line of text. Removed the inner scroll — the outer
      `.sheet` already scrolls long content (same pattern the history list
      already used), so there's no reason for two nested regions.
      Verified visually before and after.

Verified end-to-end: info sheet opens from the menu (and auto-closes the
menu), all 5 sections present, closes via button/backdrop/Escape; persistent
hint line confirmed gone from the main screen; stakes segmented control
shows exactly `[slow, gentle, honest, stern]`; assist shows exactly
`[on, off]`; selecting "slow" hides the hearts row and a real mistake
(forced via assist off so it isn't silently absorbed) neither docks a heart
nor locks the field. Full prior regression suite (stakes, gesture-cap,
starve, crag, accolades, streak, gauntlet, size-10, grid-uniformity,
persistence, keyboard shortcuts, create-sheet) re-run clean after the
merge — this session touched a lot of shared state (`game.slow` had 12+
call sites), so re-running everything wasn't optional.

### A3. Win / fail results screen — **done**
- [x] Shared results-card component: the existing veil `.card` gained a
      `#vStats` row, `#vVerdict` line, and `#vPreview` block, all populated
      by mode-agnostic helpers (`renderWinStats`, `renderFailStats`,
      `showResultPreview`) called from every win/fail branch — not a
      separate component, but genuinely shared logic across all of them.
- [x] Win: stats row — time to settle, slips, peeks (when any), score, and
      a `new high score!` pill when `finalizeGame()` just beat the stored
      best (best score shown either way via the existing `bestScore()`).
- [x] Win: difficulty verdict — compares `rec.eScore` (played) against
      `rec.aScore` (looks-like); only shown when they diverge by ≥14 points,
      matching the "not every solve needs a comment" spirit of the accolades
      work — most solves show no verdict line at all, and that's correct.
- [x] Win: next-field preview — mini board, code, band, and effort bar for
      *exactly* the field the primary button starts next. This was the
      trickiest part: `startAmble`/`startLadder`/`startGauntlet`/
      `nextGauntletField` all previously called `randomSeed()` internally,
      so a naive preview would show one field and tap through to a
      different one. Gave each an optional trailing `seed` param; the veil
      now locks in `randomSeed()` *once* per render, previews that exact
      seed, and passes the same seed to the button's handler. Campaign
      previews needed no locking — curated fields already have a fixed
      seed. Verified as an explicit WYSIWYG assertion in every mode tested
      (amble, ladder): preview code === the code of the field you actually
      land on, not just "a similar one."
- [x] Fail: progress (`placed N/M`), slips, time-so-far — reads live game
      state (`flushTick()` first so playMs is current), no score-penalty
      language, matches the existing "no harm done" copy.
- [x] Fail: "show me where it went wrong" — hides the veil (board becomes
      visible again, still locked at 0 hearts) and marks every empty cell
      that *was* the solution's cell for its row with a faded ghost pig
      (`.cell.reveal`, 42% opacity + desaturated). `game.revealedSolution`
      gates this in both `render()`'s cell loop and `renderVeil()` (so the
      veil doesn't immediately re-cover the board on the next render), and
      resets on "fresh start" or "clear" — clear still refills hearts for
      non-slow/non-gauntlet modes exactly as before, so revealing then
      clearing is a full, honest do-over.
- [x] Shared fade/rise animation (`veilIn`, opacity+translateY, .32s) on the
      card; added to the existing `prefers-reduced-motion` block alongside
      the piggy-thud/bad-flash/starved-pulse rules it already disables.

Verified end-to-end: win stats text includes time/slips/score, new-high-score
badge appears on a fresh code's first solve, next-field preview shown and
its code is byte-for-byte identical to the field actually landed on after
tapping the primary button (checked for both a freeform amble win and a
ladder climb, including the climb chip advancing to the correct rung); fail
veil shows progress/slips/time and both action buttons; reveal correctly
marks 5 cells faded-pig on a 6×6 with one correct placement already down,
hides the veil, and both the reveal marks and full hearts return after a
clear. Screenshots confirm the visual design reads clean and matches the
create-sheet's existing preview language (deliberately reused, not
reinvented). Full prior regression suite (16 test files) re-run clean.

### A4. Asset & branding generation (separate image-gen track)
- [x] **Prompts written — done.** Now living in `ASSET_PROMPTS.md` (moved
      there from a session Artifact so they're durable/version-controlled,
      not tied to a session URL) — a reusable style preamble plus 15
      prompts grouped by category, each tagged with its target file path
      and either its exact call site in `index.html` or a suggested one
      where none exists yet. Palette and type throughout are pulled
      directly from the game's own CSS custom properties and font stacks —
      no new typefaces or colors invented.
- [x] Logo / wordmark — wired into the header title (`.title`), replacing
      the plain-text "Sowdoku 🐖"
- [x] Favicon / app icon (512/192/180/32/16 + `.ico`) — full `<link>` set
      + manifest added to `<head>` (there were none before)
- [x] Piggy sprite: settled — wired into `pigSVG()`
- [x] Piggy sprite: unimpressed — done. A rejected piggy placement
      (illegal square, or a legal-but-wrong-patch mistake under
      Honest+/Stern) shows this pose in the cell for 420ms via a new
      `unimpressedSVG()` + `badCellIsPig` flag on the shared `flashBad()`
      mechanism, alongside the existing red flash. A rejected hoofprint
      still shows only the flash.
- [ ] Piggy sprite: dozing — **on hold**, no call site (deferred, see
      Phase 3 scope note below)
- [ ] Piggy sprite: celebrating — **on hold**, win vignette already covers
      the celebration moment
- [x] Hoofprint marker — wired in via a new `hoofprintHTML(r, c)` helper
      that positions two rotated hoofprint images per cell with a
      deterministic per-cell angle (reads as a little walking trail),
      replacing the old three-dot `<i>` markup
- [x] Hearts (full / empty) — wired into `heartSVG(filled)`
- [ ] Board paper texture — **on hold**, no call site
- [ ] Background farm-horizon border — **on hold**, no call site
- [x] Win vignette — wired into the win veil, between the title and the
      descriptive text
- [x] Fail vignette — wired into the fail veil, same slot
- [x] Empty-state spots — history + curated wired into the `.hempty`
      blocks in the history sheet; first-run generated but unwired (no
      first-run flow exists yet)
- [x] OG / social share image — done. `og:title` / `og:description` /
      `og:image` + matching `twitter:*` tags are live in `<head>`,
      `og:description` pulled from the README's own opening line.
- [x] Misty Morning badge — wired into the `data-mode="fog"` button in the
      create sheet's mode picker

**Phased plan**, since half of these need a new UI decision and half are
pure swaps:

1. **Phase 1 — pure swaps + new-but-obvious. Done.** Favicon/manifest,
   logo, settled piggy, hearts, hoofprint.
2. **Phase 2 — win/fail vignettes + empty states + misty badge. Done**
   (except empty-firstrun, deferred — no UI hook yet).
3. **Phase 3 — the open-ended ones. Trimmed scope, done.** Asked
   the user how much of Phase 3 to pursue given the mixed risk/value (win
   vignette already covers "celebration"; several items have no natural
   UI hook). Chose the trimmed option: **only Unimpressed and OG image.**
   Both now have their code-side hook fully wired — designed and built
   the "unimpressed" transient state myself (a genuinely new mechanic, not
   just an asset swap), added the OG/Twitter meta tags — and both are
   generated and verified live. Dozing, Celebrating, paper
   texture, and horizon border are on hold: no natural call site for any
   of them, and forcing one in risks cluttering the "calm clarity" house
   style just because the asset could exist. Revisit if a concrete use
   surfaces later (e.g. Dozing for a first-run flow).

**How Phase 1/2 actually got built:** generated via Antigravity IDE (used
purely for image generation, at the user's preference — not for wiring
code, which I did directly). Two issues found and fixed during
integration, neither caused by the generation itself:
- **Fake-SVG format.** Every ".svg" the tool produced was actually a
  raster PNG wrapped in an SVG container (`<image
  href="data:image/png;base64,...">`) — no vector benefit, and base64 +
  XML overhead bloated `assets/` to 3.7MB for icon-scale art. Fixed by
  extracting the real PNG data, right-sizing each to its actual on-screen
  use (hearts were sourced at 380px for an 18px display!), and
  palette-quantizing (128 colors, `Pillow`) — 3.7MB → ~250KB with no
  visible quality loss. Saved as real `.png` files; `index.html` and
  `ASSET_PROMPTS.md` updated to match.
- **Pre-existing `[hidden]` CSS bug, caught by this review.** `.preview`
  (used by both the create sheet's field preview and the veil's
  `#vPreview`) sets `display: flex` explicitly. A class selector and the
  browser's default `[hidden] { display: none }` have equal CSS
  specificity, so on a tie the later (author) rule wins — meaning
  `hideResultPreview()` was correctly setting `hidden`, but the fail veil
  kept showing a stray "next field" preview box anyway. This dates back
  to the original A3 work (reusing `.preview` for `#vPreview`), not to
  the asset pass — just never visually caught until this review looked
  closely at the fail veil screenshot. Fixed with `.preview[hidden] {
  display: none; }`, matching the pattern already used correctly
  everywhere else in the file (`.climbchip`, `.stuck`, `.menu`,
  `.sheet-backdrop`, `.orow`, `.campaign` all already had this).
  `.vvignette[hidden]` given the same treatment defensively.

### A5. Other polish backlog — **done, except two deliberately deferred**
- [x] Real typography — self-hosted variable-weight Fraunces (headers) + Inter
      (UI), fetched from Google Fonts and hosted under `assets/fonts/` (no
      CDN dependency at runtime, matching every other asset in this repo).
      One `@font-face` per family with a wide `font-weight` range covers
      every weight the page uses, so a single file serves all of it. Swapped
      into the six Georgia/serif header declarations (`.title`, `.veil h2`,
      `.sheet h2`, `.info-body h3`, `.cbtext .lead`, `.hname`) and the body's
      existing (previously unbacked) `"Inter"` stack. Verified both actually
      load — Fraunces lazily (only once a sheet with a heading first opens,
      confirmed via `document.fonts`), Inter on first paint — in both
      Chromium and WebKit.
- [x] PWA — `sw.js`, a minimal cache-first service worker precaching the 24
      files that make up the app shell (HTML, JS, both fonts, every in-app
      image, the favicon set + manifest). Registered after first paint so a
      slow/failed registration never blocks it. `site.webmanifest` gained a
      `description` and `scope`; `<meta name="theme-color">` added. Verified:
      all 24 shell files cached, and a full offline reload still renders the
      complete board.
- [x] Keyboard/board accessibility — cells are a roving-tabindex grid:
      arrow keys move focus, `Enter` mirrors a tap (settle/lift a piggy),
      `Space` mirrors a long-press (mark a hoofprint). Each cell carries a
      live `aria-label` (row/column/pen + current state — piggy settled,
      ruled out, hoofprint, starved, fog-hidden, hinted). Focus survives
      `render()`'s full board rebuild (the rebuild is a real `innerHTML`
      wipe, so this needed explicit save/restore around it, not just CSS).
      Segmented controls (`segOn`) now carry `aria-pressed`; the history
      tabs carry `aria-selected`; `#menuBtn`/`#cDice` gained explicit
      `aria-label`s. The info sheet's Controls section documents the new
      keys (also fixed a stale leftover noticed in the same paragraph: it
      still said peek lived "in this menu" from before A2b moved it to the
      action bar). Verified: arrow nav, Enter place/lift, Space hoofprint,
      focus-survives-render, and `aria-pressed` all confirmed via Playwright.
- [x] Hearts near the board (mobile) — a second `#heartsNearBoard` row lives
      in the status strip, right above the board; CSS (not JS) decides which
      of the two hearts rows is actually visible — the header copy above
      480px, the near-board copy below it — so a bad tap and the heart it
      costs land in the same glance on a phone. `render()` just populates
      both with identical markup.
- [x] Illegal-placement teaching — new `whyIllegal()` checks row, then
      column, then pen, then the Wallow (adjacency) rule across every
      settled piggy — one consistent reason even when a cell breaks more
      than one rule at once — and a matching toast fires on a gentle-stakes
      slip ("this row's already settled" / "…column's…" / "…pen's…" /
      "piggies won't settle that close together"). Verified all four via
      Playwright by engineering a placement that isolates each rule.
- [x] Pen-completion shimmer — a pen only ever wants one piggy, so it's
      "done" the instant that piggy settles; every cell of that pen gets a
      single soft sheen (a `::before` gradient sweep, .7s, self-clearing)
      the moment it happens. `::before` specifically — `::after` was already
      spoken for by shade/starved/peek, and this needed to compose cleanly
      with a pen's other, now-ruled-out cells. Cleared alongside undo/clear
      so a stray shimmer can never survive a board mutation that erases the
      placement that triggered it. Verified: exactly the pen's cell count
      gets the class, self-clears after 700ms.
- [x] Sound: synthesized thud / chime / snuffle / slip / fail, off by
      default — asked the user how to source audio given there's no
      established pipeline for it (Antigravity was image-only); chose Web
      Audio API synthesis over sourcing real audio files, so there's nothing
      to generate or host. Five cues, all plain oscillators/filtered-noise
      with a gain envelope: a low sine "thud" on a piggy settling, a
      three-note sine "chime" (its own ~90ms internal start offset so it
      reads as *after* the thud, not blended with it — both fire from the
      same event since every pen completes the instant its one piggy lands)
      when a pen's shimmer triggers, three short bandpass-filtered noise
      bursts as a "snuffle" on a full solve, a soft two-note "slip" dip on
      any mistake, and a slower three-note descending "fail" phrase the
      instant hearts hit zero. New `sound` on/off row in the ⚙ menu
      (persisted like stakes) — it's a live, always-effective toggle, unlike
      assist, so it belongs there and not in the create sheet. `AudioContext`
      is created lazily on the first real toggle-on click, so it's always
      inside a genuine user gesture (autoplay policy) and never touched at
      all while sound is off.
      **Follow-up bug, caught by the user testing it live:** shipped with
      only the three positive cues (thud/chime/snuffle) — every mistake and
      every game-over were silent, since I'd never wired sound into any of
      the four heart-docking code paths (`dockStrictHeart()`'s three call
      sites, plus the plain gentle-stakes illegal-placement branch). Added
      `playSlip()` (wired into all four) and `playFail()` (fires once,
      exactly when hearts reach zero, from inside `dockStrictHeart()` and
      the gentle-stakes branch). Also fixed a second, subtler issue found
      while diagnosing: the winning placement always fires thud + chime
      *and* triggers the solve, so `playSnuffle()` was scheduled to start at
      the exact same instant as those two — almost certainly getting
      acoustically buried under them, which likely explains why "no sound
      for completion" was reported even though the calls were technically
      firing. Gave the snuffle a 0.6s internal head-start so it plays as its
      own clear, distinct moment once the placement sounds have decayed
      instead of overlapping them. Verified end-to-end by instrumenting
      `AudioContext`: zero calls while off; thud+chime (4 oscillators)
      together on a placement; a slip (2 oscillators) on an illegal
      placement *and* on a Honest+ wrong-but-legal patch; a slip *and* a
      fail firing together the moment a Wallow round runs out of its one
      heart; 3 buffer sources (now delayed) still firing on a full solve.
- [x] Colorblind support — an optional per-pen letter (⚙ menu, off by
      default, persisted): `A`–`J` covering every board size up to 10×10,
      appended as a small corner `<span>` (not `innerHTML`'d, so it never
      clobbers whatever a cell's piggy/hoofprint markup already set) in a
      fixed dark ink tone chosen to stay legible against every pastel in
      `PALETTE`. Suppressed on still-fogged misty-morning cells — the letter
      would otherwise spoil the fog mechanic ahead of the pen's own color.
      Verified: every cell of a given pen shares exactly one letter, off by
      default, correctly hidden under fog until revealed.
- [x] First-run onboarding — the "how to play" sheet auto-opens exactly once,
      gated on a new `seenIntro` flag, but *only* for a genuinely new player:
      anyone with an existing in-progress field, history, or stats (i.e.
      every current player, the day this ships) gets the flag silently set
      without the interruption, since they already know how to play.
      Verified all three paths: fresh player (opens), same player reloading
      (doesn't reopen), and a simulated pre-existing player who has stats
      but had never had the flag before (doesn't open, flag gets set).
- [x] Quiet "today's field awaits 🌱" chip — shown in the status strip
      whenever the player isn't currently on today's daily field *and*
      hasn't touched it yet (no history record for today's code — "touched"
      survives even an unsolved/abandoned attempt, since `finalizeGame`
      records on any real attempt, not just a win). Tapping it jumps
      straight to the daily field. Verified the full lifecycle: hidden while
      already on daily, shown from an amble field, hidden again immediately
      after tapping through, and stays hidden after actually solving it.
- [ ] Render diffing instead of full `board.innerHTML` rebuild per paint —
      **deliberately deferred.** Asked the user: no reported performance
      problem exists today, and this is the single highest-regression-risk
      item on the list (it touches the core render path every other feature
      here also touches) for no currently-visible user benefit. Revisit if a
      real perf complaint shows up, e.g. at a larger board size than 10×10.
- [ ] Share affordance on win screen (code + one-line challenge) — **out of
      scope for this pass**, per the user (not needed yet).

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
      row/column/pen; own milestone, needs ≥9×9 — **full design in B5 below**
- [ ] **D. Mud puddles** — pre-blocked cells no pig may occupy; lets the
      generator reach knottier unique layouts; on-brand art opportunity —
      **full design in B5 below**
- [ ] **E. Limited hoofprints** — scratch marks become a capped resource
      (e.g. `2 × size` per field) — **full design in B5 below**
- [ ] **F. Settled means settled** — mode where lifting a placed pig costs a
      heart or isn't allowed — **full design in B5 below**
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
- [ ] **I. Daily modifier rotation** — fog Wed / stern Fri / etc. — **full
      design in B5 below**

**Recommended build order** (revised 2026-07-03, play-test polish first):
~~B3 (campaign packs)~~ **done** → **B4.1–B4.4 (play-test polish)** →
**B6 (mode simplification — runs tab dissolves; before B4.5 so the trails
list is run-pack-aware)** → **B4.5 (trails field list)** → B5-D (mud
puddles, brings the variant plumbing) → B5-E (limited hoofprints) → B5-F
(settled means settled) → B5-I (daily modifier rotation — pure composition
once D/E/F exist) → B5-C (twin litters, stays its own milestone,
benchmark-gated).
*(Original order, for the record: B1 stakes → A crag → H accolades → G
gauntlet → B bigger boards → D → C. Everything before D shipped, plus B3
campaign packs landed out of that original order per the 2026-07-02
re-plan.)*

### B3. Campaign packs — **done** (2026-07-02), UI superseded same day — see status log

Curated series of fixed-seed fields. The existing single-list "campaign" mode
(play your curated list in difficulty order) is now the *authoring loop* for
packs; a new intro/first-time pack ships as campaign #1. **Note (same-day
follow-up):** the checklist below describes the *original* shipped shape —
campaign mode as a `#cMode` button inside "tend a new field," with a
progress bar in the history sheet's curated tab. A same-day follow-up
request ("campaigns should be a distinct button... choose a cuter name")
replaced that UI: it's now **🌾 Trails**, a standalone action-bar button and
sheet, no longer reachable from the create sheet at all; the history-sheet
progress bar was removed (superseded by Trails itself). The data
model/internals below (packs, `campaignPack`, `campaignDone` migration,
`beginCampaignField`, etc.) are unchanged and still accurate — only the
entry-point UI moved. Full detail in the status log entry below.

**Data model**
- [x] New `campaigns.js` (script-tagged before the main inline script; added
      to `sw.js` precache + cache version bump to `v2`) holding
      `var CAMPAIGNS = [{ id, name, note, fields: [{ code, name, note?,
      assist? }] }]`. A field is identified by its board code (round-trips
      via the existing `parseCode`/`boardCode`); optional per-field `assist`
      override and teaching `note`. `packFields()` normalizes a field's
      code → size/band/seed via `parseCode` and drops any field whose code
      fails to parse, rather than silently starting a random/mismatched
      field under the wrong name.
- [x] The player's own curated list appears as a virtual pack (`id:
      "curated"`, "my trail"), ordered by the existing `curatedOrdered()`.
      Built-in packs play in authored order — no re-sort.
- [x] Progress: `campaignDone` migrates from a flat code array to
      `{ packId: [codes] }` — one-time migration maps the old array to
      `{ curated: [...] }` (same pattern as the slow→stakes and assist
      migrations). `markCampaignDone`/`isCampaignDone`/`nextCampaign`/
      `campaignDoneCount`/`resetCampaign`/`startCampaign`/`beginCampaignField`
      all gained a leading pack-id parameter.
- [x] `game.campaignPack` alongside the existing `game.campaignCode`,
      threaded through `beginGame` opts, `persist()`/`restore()`, and
      `buildRecord`. A per-field `assist` override applies via a new
      `opts.forcedAssist` in `beginGame()` — distinct from `opts.assist` so
      it never contaminates the player's saved default the way a real
      create-sheet choice does (mirrors how Wallow's forced assist already
      worked). `restore()` also now persists/reads back `game.assist`
      directly instead of re-deriving it from the live default, since a
      forced/suggested assist can now legitimately diverge from it.
- [x] **Arcade-export constraint honored:** every persisted key stayed on
      `sget`/`sset` (the `arcade.v1.sowduku.*` namespace) — nothing new to
      build for cross-device save-file export.

**UI**
- [x] Create sheet: `data-mode="campaign"` button in `#cMode`. When
      selected: size/diff/seed/surprise rows hidden (fixed by the pack); a
      new pack-picker row (`cPackRow`/`cPack`, dynamically rendered) lists
      built-in packs + "my trail", each with progress ("3/6"). Preview shows
      the *next untended field* of the selected pack — WYSIWYG like every
      other mode — with two extra states: `showPackComplete()` (fully
      tended → tend button relabels "walk it again") and `showPackEmpty()`
      (zero fields, e.g. an uncurated "my trail" → tend button disabled,
      explanatory copy instead of a mini-board). The mode note under the
      picker now shows the *selected pack's own* note (fixed post-review —
      it was showing the "curated"-pack-specific note for every pack,
      including "first steps"). Assist row is pre-filled from the pack's
      next field's suggested `assist` but stays editable — an explicit
      create-sheet choice always saves as the new default, same as any
      other mode. `packSuggestedAssist()` falls back to the pack's *first*
      field once the pack is done, since "walk it again" restarts there
      (fixed post-review — it was falling back to the player's generic
      default instead).
- [x] Teaching-note display: `#teachNote`, a quiet line in `.below-board`
      (next to `#stuckNote`), populated from the active pack field's `note`
      during `render()` — derived from `game.campaignPack` + `campaignCode`,
      so it survives reload with zero extra persistence.
- [x] Win veil campaign branch generalized from `curatedOrdered()` to the
      active pack's ordered list; progress copy names the pack.
- [x] History sheet, curated tab: campaign bar stays as the "my trail"
      launcher (now explicit about packId `"curated"`); new **"export
      pack"** button (`#campExport`) beside it copies pretty-printed,
      ready-to-paste pack JSON (placeholder id/name/note + ordered fields
      carrying `code` and the player's edited `name`) via a new shared
      `copyToClipboard()` helper (async Clipboard API with a textarea +
      `execCommand` fallback, confirming toast either way — the existing
      "copy field code" chip was refactored onto the same helper). This is
      the pipeline for building future built-in packs: curate → order →
      export → paste into `campaigns.js`.
- [x] First-run: extended the existing genuinely-new-player gate
      (`seenIntro` — no in-progress field, history, or stats): instead of a
      random amble, a brand-new player starts on intro field 1 (how-to-play
      sheet still auto-opens on top). Existing players untouched.
- [x] **Post-implementation review caught a third bug, since fixed:**
      `replayBoard()` (used by the "play" button on every recent-history
      card, including a campaign field replayed from the recent tab — not
      just the curated tab) never forwarded `campaignPack`/`campaignCode`,
      so replaying a campaign field silently dropped it into
      `campaignPack: null`. The climb chip then showed "field ?/0", the win
      veil fell back to crediting the *curated* pack instead of the one
      actually being replayed, and `onSolved()`'s pack-completion guard
      silently no-opped. Fixed by having `replayBoard()` forward
      `campaignPack` and derive `campaignCode` from the record's own `code`
      (the two are always equal for a campaign-mode record, so no extra
      persisted field was needed).

**Intro pack — six designed fields**
Seed selection was scripted (`scripts/pick_intro_seeds.js`): drives
`sowdoku.js` to generate candidates per (size, band), filters on the
profile/region criteria below, prints an ASCII render of finalists. Each
locked-in code was then re-verified (`scripts/verify_intro_seeds.js`):
confirmed a unique solution, confirmed the requested band, and traced the
solver's own step-by-step `hint()` sequence to confirm it fully solves at
the intended logic level with no stuck state. **Correction found while
tuning the criteria:** `sowdoku.js`'s `rate()` draws the sunbeam/meadow line
at `l2 <= 3` vs. `l2 >= 4` — meadow is *defined* as needing at least 4
confinements, so "a gentle meadow puzzle" means `l2` close to 4, not some
small count as the original criteria below assumed; adjusted the filters
accordingly (documented inline in `pick_intro_seeds.js`).
1. [x] "settling in" — `6s-1`, 6×6 sunbeam, assist on. Lesson: tap to
       settle; one piggy per pen/row/column. Criteria: a 1-cell pen,
       near-pure L1 profile (`l2 === 0`) — met exactly.
2. [x] "good neighbors" — `6s-6`, 6×6 sunbeam, assist on. Lesson: piggies
       never settle adjacent; tap a settled piggy to lift it. Criteria
       loosened from "entirely swallows a ≤2-cell pen" (found nothing in
       20k tries — this generator's region growth is streaky, not
       balanced, per existing project memory) to "≥60% of a ≤3-cell pen's
       cells sit in a forced piggy's 8-neighborhood"; the picked field has
       a genuine 3-cell pen squeezed by an early forced placement.
3. [x] "leaving hoofprints" — `6m-8z`, 6×6 meadow (`l2=6`), assist on.
       Lesson: long-press / Space marks a hoofprint. Re-targeted to the
       grindier end of meadow (`l2 >= 6`) so it actually stalls without
       marking dead cells, now that "meadow" alone no longer implies that.
4. [x] "reading the field" — `6m-1`, 6×6 meadow (`l2=4`, the minimum
       possible for the band). Lesson: confinement — a pen squeezed into
       one row/column claims it. Re-targeted to exactly the meadow floor so
       it reads as one clear confinement moment, not a grind; assist
       reverts to player preference from here on (no `assist` key).
5. [x] "a helping hand" — `7m-2`, 7×7 meadow (`l2=5`). Lesson: peek (H) and
       undo (⌘Z) exist and cost nothing but pride. First size step-up,
       gentle side of meadow at 7×7.
6. [x] "out into the meadow" — `7m-2ix`, 7×7 meadow (`l2=7`, score 56,
       high-effort end of the band). Lesson: none — "No new mechanic here —
       this one's all yours." Capstone, no new mechanics.

**Verification**
- [x] Recreated Playwright coverage from scratch as three scripts (repo had
      none committed — prior sessions' were session-scratch, per the
      caveat recorded below):
      `scripts/test_b3_campaigns.js` (31 checks — campaign mode in create
      sheet; pack picker shows both packs with correct progress; preview
      code === the field actually started; teaching note renders and
      survives reload; win veil advances within the right pack; full pack
      completion → "walk it again"; old `campaignDone` array migrates;
      fresh-profile run lands on intro field 1 with the how-to-play sheet
      open; existing-player profile untouched; export puts valid JSON on
      the clipboard that round-trips through the code regex; curated-tab
      campaign bar still works; WebKit spot-check for the new sheet rows),
      `scripts/test_b3_regression.js` (10 checks — assist save-as-default,
      Wallow's forced assist not contaminating the default, ladder/gauntlet
      start flows, amble persist/restore, daily+keyboard shortcuts, honest-
      stakes heart docking), and `scripts/test_b3_fixes.js` (4 targeted
      checks for the two bugs a post-implementation review caught: replaying
      a campaign field from the recent tab keeps its pack identity and
      credits the pack on a win; "walk it again" from the create sheet uses
      field 1's authored assist, not the player's generic default). All
      45 checks green, Chromium + a WebKit spot-check.
- [x] Independent code review (fresh context, no access to my reasoning)
      run against the full diff before calling this done; it surfaced two
      real bugs beyond what the test-writing pass had caught — both fixed
      and covered by `test_b3_fixes.js` above — plus the dead/misleading
      mode-note copy (also fixed) and confirmed no stale no-arg call sites
      of the newly pack-id'd helpers, no `campaignPack` leakage into
      non-campaign modes, and no duplicate/malformed codes in
      `campaigns.js`.

### B4. Play-test polish — **done 2026-07-03**

Six findings from the user's own play-testing, folded into five work items
(the double-tap-zoom bug belongs to the action-bar item — same component).
Each is small, independently shippable, and ordered so later items land on
surfaces earlier items have already reshaped (the peek heart-cost badge goes
on the *redesigned* action bar; the veil's name field feeds the trails
list's field names).

**House rules for every B4/B5 item** (stated once, apply throughout):
- Append Playwright coverage to the existing suite files (or a new
  `test_b4_polish.js` / `test_b5_variants.js`) — run the *full* suite after
  each item, not just the new checks.
- WebKit spot-check any layout-affecting CSS (this repo's real target is
  Safari — standing lesson from the A2b board-clipping bug).
- Visual changes get a screenshot checkpoint at 390×844 before being called
  done; the action-bar redesign (B4.1) additionally pauses for the user's
  approval on look/feel, since "not a fan of the look" is a taste call only
  they can close out.
- Copy lives in more places than `index.html`: check the info sheet, README,
  `campaigns.js` teaching notes, and this plan's own descriptions whenever a
  mechanic's meaning changes.

#### B4.1 Action bar: raise above the iPhone home indicator, redesign, kill double-tap zoom *(user items 5 + 6)* — **done**
- **Clipping root cause first, not padding guesswork.** `.action-bar`
  (index.html:233) already pads with `env(safe-area-inset-bottom)`, but the
  viewport meta (index.html:5) lacks `viewport-fit=cover`, so that env() is
  0 on iPhone and the padding does nothing. Fix: add `viewport-fit=cover`
  to the meta. Then verify the *framed* case too — the game usually runs
  inside the Arcade launcher's iframe, where safe-area env() can also
  report 0; use `max(env(safe-area-inset-bottom), .8rem)` so there's always
  a real cushion, and confirm against the launcher (`ARCADE_PLATFORM.md`
  symlink in repo root) rather than only standalone.
- **Double-tap zoom (item 6):** add `touch-action: manipulation` to all
  buttons *and* `.cell` (rapid undo-undo is the reported trigger, but board
  cells double-tap too). Do not disable pinch on the page as a whole — only
  tap targets. Verify in WebKit that long-press hoofprinting still works
  (`touch-action: manipulation` allows pan+long-press; it only removes the
  double-tap-zoom delay).
- **Redesign (item 5):** the current icon-over-label `.actbtn`s with emoji
  glyphs (↶ 👁 ⌫ ＋ 🕘 🌾) read as stock UI, not Sowdoku. Replace emoji with
  small inline SVG line icons drawn in the game's own ink
  (`var(--ink-soft)`, stroke style matching the hand-warm brand), sized off
  the existing `.actbtn .icon` slot. The peek icon must NOT be an eye (user
  explicitly dislikes it) — candidates: a lantern (light spilling on the
  field), a magnifying glass over a sprout, a low sun over a row. Soften
  the bar itself (panel background, slightly rounded top corners, one
  subtle top shadow instead of the hard border-top) so it reads like part
  of the farm scene, not a toolbar. Keep min 44px touch targets
  (`.actbtn` sizing rule from A2 still applies) and the existing
  keyboard shortcuts/tooltips/disabled states.
- **Reserve a cost-badge slot on the peek button** — B4.2 will pin a tiny
  heart to it; design the button with that in mind rather than retrofitting.
- Verify: screenshot at 390×844 inside a simulated bottom inset; user
  approval on the look before closing; full regression suite (the bar's DOM
  ids `undoBtn`/`peekBtn`/`clearBtn`/`newBtn`/`trailsBtn`/`historyBtn` are
  load-bearing across every test file — keep them).

#### B4.2 Peek costs a heart *(user item 1)* — **done**
- **Rules** (defaults chosen for the gentle-failure brand; flag at
  implementation if any feel wrong in play):
  - A *successful* peek (a hint actually shown) docks one heart. The "no
    gentle next step" / "field's tangled" outcomes stay free — you paid for
    a hint, not for asking.
  - Guard the cost/disable logic *inside `peek()` itself*, not only via the
    button's disabled attribute — the `H` keyboard shortcut calls the same
    function and must respect the same rules.
  - Free under **slow** stakes (no hearts exist there).
  - A peek must never *end* the game: when `!isSlow() && game.hearts <= 1`,
    the peek button is disabled with tooltip copy like "a peek costs a
    heart you can't spare". This makes peek effectively unavailable in the
    Wallow (1 heart) — consistent with its "no hand-holding" identity — and
    genuinely expensive in the Gauntlet (shared pool).
  - Docking a heart for a peek is **not a mistake**: do not use
    `dockStrictHeart()` (index.html:1442 — it increments
    `metrics.mistakes`, sets the gesture cap, and plays the slip sound).
    Write a tiny dedicated dock in `peek()` (index.html:1563):
    `game.hearts--` + render, no `mistakes++`, no slip sound (a soft thud
    at most). `metrics.hints++` already happens there and stays.
  - Keep the existing score penalty (90/hint at index.html:1292) — the
    heart is the in-run price, the score is the record-book price. Flag as
    tunable if double-charging feels harsh in play.
- **Cost affordance:** small heart badge on the (redesigned) peek button,
  visible whenever peeking would cost (i.e., not slow stakes).
- **Copy sweep — this is most of the diff:** peek's title/tooltip
  (index.html:483), the info sheet's Controls + Stakes sections, README's
  "cost nothing but pride" hint paragraph, and — easy to miss —
  `campaigns.js` intro field 5 ("a helping hand") whose teaching note says
  peek and undo are "free of charge". Rewrite that lesson honestly: undo is
  free; a peek trades a heart for a knot. Undo remains free everywhere.
- Verify: peek docks exactly one heart and no mistake; free under slow;
  button disabled at 1 heart (and in Wallow); a failed hint doesn't charge;
  the `unaided` accolade and hint score penalty still behave; intro field 5
  note shows the new copy.

#### B4.3 Seed code as a discreet watermark *(user item 4)* — **done**
- Remove the `#codeChip` pill from the status strip. Add a small,
  low-opacity, monospace watermark (e.g. `.code-mark`) tucked under the
  board — right-aligned in `.below-board`, after `#stuckNote`/`#teachNote`
  so it never fights the teaching line. Keep it a real `<button>` (focus
  ring, `aria-label="field code — tap to copy"`) that calls the existing
  `copyToClipboard(game.code, ...)` with the same toast.
- Drop the 🌱 icon; the code alone, quiet, ~65% ink-soft opacity.
- `render()` updates it where it used to update `#codeChip`
  (index.html:~1630); check the status strip still balances on mobile with
  one fewer chip (mode chip · daily chip · climb chip · N-left).
- Verify: click copies + toasts; WebKit screenshot; no test references
  `#codeChip` as a *visible pill* (tests read `#codeChip` textContent —
  keep the id on the new element so the suite keeps working, or update all
  suites in the same commit).

#### B4.4 Favorite toggle + naming on the end veil *(user item 2)* — **done**
- Both win and fail veils gain a quiet row above the buttons: a ☆ star
  ("keep this field") and, once starred, a name input (placeholder "name
  this field", commit on blur/Enter — same pattern as `.hname` in the
  curated tab). Pre-filled star+name if the field is already curated.
- Wiring is thin because curation already exists: star toggles
  `toggleCurate(rec)`, name commits via `renameCurated(code, name)`.
  The only real work is *which record*:
  - Win veil: `lastRecord` is already set (finalizeGame ran via
    `onSolved()`).
  - Fail veil: **no record exists yet** — `finalizeGame(false)` only runs
    lazily when the next field begins. Call `buildRecord(false)` to
    synthesize one (it builds and sets `lastRecord` *without* pushing to
    history — safe), and curate from that. This record now carries
    assist/stakes/campaignPack from the fidelity work, so the starred copy
    replays faithfully for free.
- Un-starring from the veil un-curates (symmetric with the history card's
  star).
- Verify: star on win veil → appears in curated tab with the typed name;
  star on fail veil works (record synthesized); un-star removes; name
  survives reload; starring a trail field carries `campaignPack` (covered
  pattern from `test_review_fixes2.js`).

#### B4.5 Trails: full field list, playable out of order *(user item 3)* — **done**
- **Build after B6** (see build order): heart-policy packs (B6.2 — the
  gauntlet) list their fields like any trail and each is selectable, but an
  out-of-order selection plays the field *standalone* (fresh hearts, ✓ on
  solve, no run credit); the pack's header shows both progress reads
  ("2/3 tended · cleared 4 times").
- Under the pack picker in `#trailsBack`, list every field of the selected
  pack — one compact row each: order number, name (fall back to code),
  size·band, ✓ tended, best score (`bestScore()` reads the durable
  hiScores), and effort. Tapping a row selects it: the existing preview
  (`#tPreview`/`#tCode`/`#tBand`/`#tBar`/`#tProfile`) switches to *that*
  field and `#tTend` starts it — out of order is fine by construction,
  since progress is tracked per-code and `beginCampaignField(packId, f)`
  already takes an arbitrary field.
- `tState` gains `fieldCode` (null = default "next untended" behavior;
  reset it when the pack selection changes). `updateTrails()` renders the
  list + highlights the selected row.
- Known, acceptable quirk to note in code: after an out-of-order solve, the
  win veil's "next field →" still advances to the *first untended* field
  (`nextCampaign`), not the next in sequence — that's the trail inviting
  you back to what you skipped, which reads as intended behavior.
- Mini board previews per row are optional — only add them via the existing
  `queueMini`/`drainMinis` budget machinery (never synchronously; a 6-field
  pack is cheap but "my trail" can be 100 fields).
- Names shown here are the same names B4.4 lets players type on the veil —
  the two items compose.
- Verify: list renders for both packs with correct ✓/scores; selecting row
  3 previews and starts field 3; solving it marks only field 3 tended;
  pack progress "1/6" reflects it; WebKit spot-check the new rows.

### B5. Remaining mechanics — cohesive design (D, E, F, I, C) — **planned 2026-07-03**

**Design principles (read first — these are what make the five items
cheap):**

1. **Board code = layout identity; recorded settings = play rules.** The
   existing split is the backbone: anything that changes *what board gets
   generated* (mud puddles, twin litters) must live in the board code so
   sharing/replay/curation/trails keep round-tripping. Anything that
   changes *how you're allowed to play it* (hoofprint cap, settled-means-
   settled — like stakes and assist before them) is a per-field recorded
   setting: chosen at create time, stored on `game`, threaded through
   `persist()`/`restore()`/`buildRecord()`/`toggleCurate()`/pack-field
   overrides, and applied on replay via `forced*` opts (which never
   contaminate saved defaults — mechanism already shipped).
2. **One variant suffix on the code, added once.** Extend
   `boardCode`/`parseCode` (index.html:692-703 region) with an optional
   `+<letters>` suffix: `8m-3k7f2a+p` (p = puddles; t reserved for twins).
   Regex: `/^(10|[6-9])([smhc])-([0-9a-z]+)(?:\+([a-z0-9]+))?$/` — old
   codes parse unchanged, the seed box accepts both. D implements this
   plumbing (`opts.variants` through `makeBoard`→`Sowdoku.generate`,
   `game.variants` persisted); C reuses it untouched.
3. **Generator changes are benchmark-gated** (house rule from the
   10×10/11×11 work): before any UI lands, script success-rate + timing per
   size×band with the variant on. If the generator can't reliably deliver
   requested bands, the variant doesn't ship until it can — the difficulty
   picker must not quietly lie.
4. **Daily rotation is composition, not mechanics.** It ships last of the
   small items and touches almost nothing: a weekday table + the existing
   `forced*`/variant plumbing.

#### B5-D. Mud puddles
- **Generator** (`sowdoku.js`): after `growRegions`, deterministically pick
  K puddle cells from the same rng (never a solution cell; suggest
  K ≈ size/2, tuned by benchmark), then require uniqueness *with puddles
  excluded* — `countSolutions` and every solver level treat puddled cells
  as pre-eliminated candidates. Rate afterwards: that pre-elimination is
  exactly what lets streaky region layouts that were multi-solution become
  unique-and-knotty, which is the point. `generate()` gains
  `opts.variants { puddles: true }`; result carries `puddles: [[r,c],...]`.
- **Code/plumbing**: principle 2 — `+p` suffix, `game.variants`,
  persist/restore. History/curation/trails inherit correctness through the
  code string itself.
- **Play rules**: a puddle cell is the field's own hoofprint — no piggy, no
  player hoofprint, inert to taps (gentle wiggle + toast, reuse the
  `flashBad` affordance), excluded by `assistOn()` shading,
  `starvedByFences`, `whyIllegal`, and `hint()`; pen-completion shimmer and
  colorblind letters skip it (the art covers the cell).
- **Render/art**: a puddle graphic per cell. Interim: inline SVG blob in
  the palette's brown-blue; proper art is an `ASSET_PROMPTS.md` +
  Antigravity item (the user's established image pipeline) — ship with the
  SVG, swap when generated. This also finally gives the on-hold "board
  texture" energy a real call site.
- **UI**: create sheet amble tab gets a second toggle row next to weather —
  "ground: firm / puddled" (`cGroundSeg`, composes with misty; both are
  layout-orthogonal). Fog + puddles together is legal and fun.
- Verify: benchmark first (principle 3); codes round-trip with `+p`; a
  puddled daily/trail/curated field replays identically; all exclusion
  rules above; WebKit render check.

#### B5-E. Limited hoofprints
- A per-field recorded setting `hoofcap` (default off; when on, cap =
  `2 × size` **simultaneous marks on the board** — undo/clear/lift free
  the budget naturally; total-ever-spent was considered and rejected as
  needlessly mean). No layout change → **not** in the board code
  (principle 1).
- Threading: exactly the stakes/assist pattern — `opts.hoofcap` +
  `forcedHoofcap` in `beginGame()`, `game.hoofcap`, persist/restore,
  `buildRecord`, `toggleCurate`, export-pack JSON, `campaigns.js` field
  override, replay forces it.
- UI: quiet "hoofprints: plenty / 2×N" row on the amble tab; when active, a
  small counter chip in the status strip ("6 marks left") so the budget is
  never a mystery. At the cap, a rejected mark gets `flashBad` + toast
  "out of hoofprints — lift one to spare one".
- Verify: cap enforced across tap/drag/right-click paths (the drag-paint
  path must stop mid-drag at the cap, not overshoot); undo restores
  budget; persists across reload; forced on replay; authorable in a pack.

#### B5-F. Settled means settled
- A per-field recorded setting `settled` (off by default): tapping to lift
  a settled piggy docks a heart (toast: "settled means settled — that
  lift cost a heart"). Same threading pattern as E, one flag.
- **Decisions (defaults):** ⌘Z undo stays free — the gentle escape hatch;
  the cost is for changing your mind *later*, not for un-fat-fingering.
  Under slow stakes there are no hearts to pay, so the setting is inert
  (treat as off; note it in the info sheet). Wallow is unchanged for now —
  forcing `settled` there is listed as a possible future tightening, not
  done by default.
- Not a mistake: docks via its own path (like B4.2's peek dock), no
  `mistakes++`, no gesture-cap interaction.
- Verify: lift docks exactly one heart; undo doesn't; inert under slow;
  persists/replays/exports; the lift-at-1-heart case *is* allowed to end
  the game (unlike peek — lifting is a play action, not a help action;
  flag if play-testing disagrees).

#### B5-I. Daily modifier rotation
- A single source of truth `dailyPreset()` returning the day's full recipe
  `{ size, band, variants, forcedStakes?, forcedHoofcap?, settled?, fog? }`,
  consumed by `startDaily()`, `dailyCode()` (codes differ when layout
  differs — puddle days produce `+p` codes), and the daily chip (copy can
  whisper the twist: "today's field awaits · misty").
- Suggested table (user taste — confirm the actual weekdays at
  implementation): Sun plain · Mon misty · Tue puddles · Wed limited
  hoofprints · Thu hilltop band · Fri stern (via `forcedStakes`, never
  contaminating the player's default) · Sat settled-means-settled.
- Nothing else changes: history, fidelity, curation, and the
  daily-untouched chip all key off code + recorded settings that already
  flow. Depends on D/E/F being shipped — that's its whole implementation.
- Verify: each weekday preset produces the right board + rules (fake the
  date in tests); Friday doesn't alter saved stakes default; `dailyCode()`
  and `dailyUntouched()` agree on puddle days.

#### B5-C. Twin litters ("Two to a Pen") — own milestone, last
- Generalize `sowdoku.js` from exactly-1 to exactly-k=2 per row/column/pen,
  with the Wallow (no-touch) rule intact: `generateSolution` (backtracking
  over 2 columns per row), `countSolutions`, all four solver levels
  (forced placements, confinements, contradiction chains at L3/L4),
  `rate`/`humanScore` recalibration (band thresholds will shift — the l2/l3
  counts mean different work at k=2), `hint`, `isLegalPlacement`/`isSolved`.
- **Benchmark gate before any UI** (principle 3) — k=2 with no-touch on
  ≥9×9 may be as unreliable as 11×11 was; if so, this milestone starts
  with generator work (smarter region growth), not UI.
- Code: `+t` suffix via the existing variant plumbing. UI: a "litter"
  toggle on the amble tab, visible only at size ≥9.
- Audit every surface that assumes piggies = size: the "N left" chip,
  win-condition copy, aria-labels, teaching notes, `renderMini` (unchanged
  — it draws pens, not pigs), accolade math, `empiricalScore`'s per-cell
  time. Budget for this audit — it's the long tail of the milestone.
- Verify: benchmark report first; uniqueness holds; full solve path in
  Playwright with a known k=2 field; codes round-trip `+t`; all audited
  surfaces show 2N counts.

### B6. Mode simplification — **done 2026-07-03** (user-directed)

User feedback, two rounds: (1) the difficulty settings and game-mode
settings are confusing side by side — remove ladder, make the gauntlet a
curated thing, fold the wallow into the top of the difficulty scale;
(2) daily doesn't belong in the create sheet either (the status-strip pill
is sufficient), and a gauntlet trail must still honor *the sequence of
boards* — the point of trails is the sequence, so gauntlet-ness is a heart
policy on a normal fixed-seed trail, not a different kind of pack.

Net effect: **the create sheet loses its tabs entirely** — one quiet form
(weather · size · difficulty-up-to-wallow · assist · seed · preview).
"Mode" stops being a concept players pick from — you tend a field, play the
daily (via its pill), or walk a trail.

Sequencing note: B6 lands **after B4.1–B4.4 and before B4.5** — the trails
field-list (B4.5) must be designed heart-policy-aware, so B6 goes first.

#### B6.1 Wallow → fifth notch on the difficulty slider — **done**
- The difficulty slider (`#cDiffSlider`, currently min 0 / max 3 over
  `BAND_ORDER`) gains a fifth position, "the wallow". It is a **preset, not
  a layout band**: selecting it keeps the layout request at crag and
  engages the existing `MODES.wallow` machinery (1 heart, forced stern
  stakes, forced assist off, all already locked/threaded) — only the entry
  point moves. Internally the game still runs as `mode: "wallow"`, so
  history records, `buildRecord`, replay fidelity, and the mode label all
  keep working unchanged.
- Board codes are untouched — a wallow field's code stays `Nc-...` (crag),
  because the code is layout identity (B5 principle 1). `BAND_CHAR`/
  `parseCode`/`rate()` don't change.
- Slider output copy at the top notch: "the wallow" with the mode note
  below explaining the terms (reuse `MODES.wallow.note`). The assist row
  hides at this notch (it's forced), same as the old runs-tab behavior
  (`cAssistRow` hidden for wallow — logic already exists, just re-keyed to
  the slider value).
- Newly possible and deliberately allowed: **misty wallow** (weather toggle
  composes with the wallow notch — previously unreachable because fog and
  wallow were separate modes). The seed row stays available too (paste a
  crag code, play it at wallow terms).
- **Implementation note that makes misty-wallow (and daily-rotation misty
  days) possible:** a game can only have one `mode` string, and today fog
  IS a mode (`MODES.fog.fog: true`). Promote fog to a per-game flag —
  `opts.fog` → `game.fog`, persisted, with `modeCfg(game.mode).fog` as the
  legacy fallback for old saves/records — and have `render()` read
  `game.fog`. The weather toggle then composes with any mode, and
  `dailyPreset()` (B5-I) gets its `fog?` field for free.
- `cState.diff` handling: the slider maps 0–4 where 4 → wallow preset; keep
  `BAND_ORDER` pure (layout bands only) and add the presentation notch in
  the slider glue, not the data model.

#### B6.2 Gauntlet → a heart policy on an ordinary fixed-seed trail — **done**
*(Revised from an earlier "run pack with fresh seeds per attempt" design —
the user's correction: the point of trails is the sequence of boards, and
that holds even for the gauntlet. Gauntlet-ness is a pack-level heart
policy, not a different kind of pack. Strictly less machinery: no stage
specs, no fresh-seed rolling, no special-cased trails list.)*
- The gauntlet becomes an ordinary trail plus one pack-level option:
  `run: { hearts: 3, carry: true }` in `campaigns.js`. **The policy is
  defined over the whole pack, not a field count** — a run spans *every*
  field the trail has, in order, however many that is
  (`packFields(pack).length`, never a hardcoded 3). The built-in gauntlet
  ships with three hand-picked fixed-seed fields (7×7 meadow → 8×8
  hilltop → 9×9 crag, seeds selected and hand-verified with the same
  scripts as the intro pack — `scripts/pick_intro_seeds.js` pattern), but
  that's its authored length, not the mechanism's: a 6- or 10-field
  gauntlet trail is the same code, and the pool size (`hearts: 3`) is the
  author's tuning knob against the trail's length. All run copy derives
  from the pack ("field N of {length}"), never from a constant.
- **Semantics — two honest progress reads, both uniform with trails:**
  - *Walking the trail* (the `#tTend` "begin the run" path from field 1)
    plays the full sequence in order with **one shared heart pool**
    (existing `carryHearts`/`carryMaxHearts` in `beginGame()`); the pool
    dying ends the walk (existing "the gauntlet ends here" fail veil; the
    clear-doesn't-refill guard stays); surviving the *entire* trail
    increments the cleared count (`stats.gauntletsCleared`, generalized
    per-pack).
  - *Individual fields* stay visible and selectable in the B4.5 list like
    any trail — selecting one out of order plays it **standalone** (fresh
    hearts, normal rules, ✓ tended on solve). That's practice; it earns ✓s
    but never the cleared count. ✓s accrued during a run also stick — a ✓
    just means "you've solved this board", run or no run.
  - "Walk it again" restarts the run from field 1 with a fresh pool
    regardless of ✓s.
- Trails sheet shows both reads for a run-policy pack: "2/3 tended ·
  cleared 4 times".
- Engine notes: mid-run state threads through the existing
  campaign fields (`campaignPack`/`campaignCode`) plus the carried pool;
  `gauntletStep` becomes derivable from the field's index in the pack —
  keep it only if the fail-veil copy needs it cheaply. The hardcoded
  `GAUNTLET` array dies; the win veil's campaign branch handles advance
  (it already previews the exact next field — fixed seeds make this
  simpler than the old gauntlet's locked-random-seed dance).
- Memorizability of fixed seeds is accepted as a *feature*: the gauntlet
  becomes a mastery set you can genuinely improve at, and the export-pack
  pipeline makes new gauntlets cheap to author. Natural future extension
  (not now): let "my trail" take a heart policy, so players can walk their
  own curated set gauntlet-style.
- Remove gauntlet from the create sheet (`cRunSeg`); the runs tab dies here
  (B6.3 removes its last occupant).
- Legacy: old `mode: "gauntlet"` history records render unchanged; an
  in-progress old-style gauntlet game restores and finishes (its veil
  branch stays until the new trail-based flow replaces it).

#### B6.3 Ladder → removed (sunset, not amputation) — **done**
- Remove the ladder's entry point (with B6.2 this empties the runs tab —
  delete the tab, `cRunRow`/`cRunSeg`, and `cState.runMode`).
- Sunset semantics for what already exists:
  - Old history records with `mode: "ladder"` still render (keep
    `MODES.ladder` for its label) and still replay (the record's exact
    field, via the normal replay path).
  - A restored in-progress ladder game plays out and finishes normally,
    but its win veil offers **"a fresh amble" instead of "climb higher"** —
    no new ladder fields can begin, so the mode truly drains. Delete
    `startLadder`; keep `LADDER`/`ladderRung()` only if the legacy veil
    branch still needs the rung label, else delete.
  - `stats.bestLadder` and the "best climb · rung N" history-header line
    stay as historical record (harmless, meaningful to players who earned
    it).
- The progression experience ladder provided is covered by trails (intro
  pack today, more packs later). **Optional, deliberately not built now:**
  if the auto-escalating climb is missed in play, it returns for free as
  another fixed-seed trail ("the climb", 8 fields mirroring the old
  `LADDER` rungs — no heart policy needed, a plain trail already plays one
  field at a time with fresh hearts).
- Copy sweep: README modes list (ladder bullet removed, gauntlet bullet
  moves under Trails), info sheet if it mentions modes, `MODES` notes.

#### B6.4 Daily → out of the create sheet; the pill is the door — **done**
- Delete the daily tab. With runs (B6.2/B6.3) and daily both gone, **the
  create sheet has one context and the tabs disappear entirely** — remove
  `#cTabs` and `tabForMode()`; `cState.mode` reduces to what the weather
  toggle and the wallow notch produce. The sheet reads: weather · size ·
  difficulty · assist · seed · preview · tend.
- The daily's entry points are the status-strip pill and the boot flow —
  both already exist. **Pill semantics change (flagged default):** show the
  pill whenever today's field is **unsolved** (hidden while on it, gone
  once solved), instead of the current "hidden after any touched attempt"
  (`dailyUntouched()` at index.html:~1024). With the tab gone the pill is
  the only obvious door, and a touched-but-abandoned daily shouldn't lock
  you out for the day (replay-from-history technically works but is three
  non-obvious taps). Still one quiet pill, no streaks — revert to
  touch-based if it reads as nagging in play.
- The size-variant daily oddity dies with the tab (the create sheet's daily
  used to expose the size slider; `startDaily(size)` existed but
  `dailyCode()` was always canonical 8×8) — the canonical daily is *the*
  daily. Simplify `startDaily()` accordingly.
- `MODES.daily` stays (labels, records, the mode's identity is untouched —
  only its create-sheet surface is removed). B5-I's `dailyPreset()` slots
  in here unchanged.
- Verify (whole of B6): create sheet is a single tabless form; slider top
  notch starts a 1-heart/stern/assist-off crag field whose code round-trips
  as crag; misty wallow playable; the gauntlet trail walks in order with
  one shared pool, ends the walk at 0 hearts, increments cleared-count
  after its *last* field (length read from the pack, not a constant — test
  with a longer scratch pack too), and its fields play standalone (fresh
  hearts, ✓ on solve,
  no cleared credit) from the trails list; daily reachable via pill when
  unsolved, pill gone once solved, daily still boots for returning players;
  old ladder/gauntlet history records render and replay; a restored ladder
  game finishes with no "climb higher" offered; full suite + WebKit
  spot-check.

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
- 2026-07-01 — User reported the board looking cut off (screenshot: last row
  and last column of a 10×10 field visibly narrower than the rest) and asked
  to simplify the board's border. Root cause: `render()` only ever set
  `board.style.gridTemplateColumns`, never `gridTemplateRows` — rows fell
  back to `grid-auto-rows: auto`, sized off each `.cell`'s `aspect-ratio:1`
  (itself derived from the resolved *column* width). That auto-derived row
  height doesn't necessarily equal `.board`'s actual height, which A1's
  layout now forces to be an exact square via `.board-wrap`'s
  `aspect-ratio:1` + `min(100cqw,100cqh)` — before A1 the board's height was
  unconstrained and simply grew to match, so the mismatch was invisible.
  The error compounds with more rows, which is why it only became visible
  at 10×10 (new this session) and not at the smaller sizes shipped earlier.
  Fixed by setting `gridTemplateRows` explicitly alongside
  `gridTemplateColumns` — mirrors what `renderMini()` (the create-sheet
  preview) already did correctly. Verified with a Playwright check that
  measures every cell's actual bounding box: 0px width/height spread across
  all cells at every size 6–10 (previously would have shown a spread at 10).
  Also simplified `.board-wrap`'s frame per the request: padding
  1.1rem → .4rem, border-radius 1.4rem → .9rem, dropped the dual inset+drop
  box-shadow for one subtle shadow — the grid now reads as the whole board
  instead of a puzzle sitting inside a padded panel. Full regression suite
  re-run clean.
- 2026-07-01 — User asked for three changes to the settings menu at once: (1)
  move the persistent tap/long-press/drag hint text into a fuller "how to
  play" info screen reachable from the ⚙ menu, (2) fold "slow mode" into the
  stakes spectrum instead of a separate toggle, (3) simplify assist from
  3 modes to a plain on/off, dropping "auto" specifically as not helpful.
  All three implemented together as A2b (see above) since they're all
  reshaping the same settings menu. README updated to match (Assist section
  rewritten for the binary, Stakes section gained the "slow" tier and
  absorbed the old standalone "Slow Mode" bullet from the Modes list, peek's
  location corrected from "⚙ menu" to "docked action bar" — a stale leftover
  from A1/A2's move that hadn't been caught until reading the file closely
  for this edit).
- 2026-07-02 — A3 (win/fail results screen) implemented and verified — see
  notes above. This closes out everything from the original UI-overhaul ask
  except A4 (asset generation — a separate, user-driven image-gen track) and
  A5 (the polish backlog). Remaining across the whole plan: A4, A5, and from
  Part B2 — twin litters (its own milestone), mud puddles, limited
  hoofprints, "settled means settled", daily modifier rotation.
- 2026-07-02 — User reported assist "doesn't work anymore when turned on."
  Root cause: the on/off redesign (last session) kept the *old* "gated"
  behavior baked into "on" — shading was silently forced off past Meadow
  regardless of the toggle, so "on" looked broken on Hilltop/Crag. Confirmed
  live (0 shaded cells on Crag with assist "on"). Asked the user to confirm
  which difficulty, since the fix differs (design change vs. bug). Their
  answer reframed the whole feature: since assist genuinely can't be changed
  mid-game in any way that matters (the difficulty-gating meant toggling it
  live often did nothing), it shouldn't live in the always-visible ⚙ menu
  implying it always works — it belongs in the create sheet instead, decided
  once per field like size/difficulty. Implemented: (1) dropped the
  difficulty-gating from `assistOn()` entirely — "on" is now unconditional,
  any band; (2) moved the assist control from the ⚙ menu into the create
  sheet as a new `cAssistRow`, hidden for Wallow (forced off) same as the
  size/difficulty rows already hide for modes that don't use them; (3)
  `beginGame()` now takes an explicit `opts.assist` and auto-saves it as the
  new default preference *unless* it came from a mode-forced override — so
  Wallow's forced "off" doesn't quietly contaminate what the next amble
  field defaults to; (4) `openCreate()` simplified to just read
  `loadAssist()` directly, since `beginGame()` now keeps that preference
  current on its own. `buildRecord()` simplified too (`assist: game.assist`
  — no more "locked vs. live preference" branching, since there's no live
  toggle left to diverge from). Verified end-to-end: the exact repro from
  the bug report (Crag + assist on) now shades correctly; the settings menu
  no longer has an assist row; the create sheet's assist row is hidden for
  Wallow and shows for amble/misty; a Wallow round doesn't contaminate the
  next amble create's default. This broke assist-dependent preconditions in
  five other scratch tests (they toggled assist live, mid-game, which no
  longer does anything) — fixed by setting the precondition via localStorage
  *before* the field that needs it is created, and retired two tests
  (`test-crag-gated.js`, `test-crag.js`) that asserted the old, now-
  intentionally-removed gating behavior. Full 16-file regression suite green.
- 2026-07-02 — User: the win/fail veil was too transparent to read easily,
  and asked for a click-outside-to-dismiss / click-anywhere-to-restore
  interaction. Fixed both: (1) `.veil .card` now has its own opaque
  `var(--panel)` background, border, padding, and shadow — previously the
  card was just text floating directly on the translucent backdrop, so
  legibility depended entirely on the backdrop's opacity. Darkened the
  backdrop itself too (light cream → dark warm gray at low opacity), since a
  light backdrop behind a light opaque card gave almost no visual
  separation — the card needed to visibly read as a *frame*, not blend in.
  (2) Added a peek/restore interaction: a bubble-phase listener on `#veil`
  checks whether a click landed outside `.card` and, if so, hides the veil
  (a `.peeking` class with higher specificity than `.show`, so it wins even
  if `renderVeil()` re-adds "show" later) — then a capture-phase listener on
  `document` intercepts the *next* click anywhere, restores the veil, and
  stops that click from also doing whatever it would normally do (safe here
  since the game is always `locked()` while the veil is showing anyway, so
  nothing real is lost by swallowing the click). `renderVeil()` resets the
  peeking flag on every fresh call, so a new result never inherits a stale
  dismissed state. Verified: card has a solid background, clicking the
  backdrop dismisses (verified via computed `display`, not just class
  presence), clicking anywhere afterward restores it without placing a
  stray piggy, clicking inside the card never dismisses, and the veil's own
  buttons still work normally throughout. Full regression suite green (one
  spurious timeout on a background batch run turned out to be Chromium
  resource contention, not a real failure — confirmed by re-running that
  file alone).
- 2026-07-02 — A4 (asset/branding prompts) delivered as an Artifact — see
  notes above. Every code-driven item from the original UI-overhaul ask is
  now done (A1–A3, A2b). Remaining: A5 (polish backlog), the actual asset
  generation + integration pass once images come back, and Part B2's
  remaining mechanics (twin litters, mud puddles, limited hoofprints,
  "settled means settled", daily modifier rotation).
- 2026-07-02 — User doesn't have an image-gen API available to me here;
  decided to run the A4 asset pass through Antigravity IDE (Google's
  agentic coding tool) instead, driven manually since it doesn't expose a
  scriptable interface I could call directly (checked: its CLI,
  `antigravity-ide`, is a VS-Code-style file/window opener only, no
  image-gen flag). Moved the 15 prompts from the session Artifact into
  `ASSET_PROMPTS.md` for durability, and expanded A4's checklist above with
  the exact `index.html` call site (or lack of one) for every asset, plus a
  3-phase integration order (pure swaps → contained new UI decisions →
  open-ended/needs-a-design-call). Gave the user a ready-to-paste kickoff
  prompt for Antigravity pointing at both docs.
- 2026-07-02 — Antigravity generated Phase 1 + Phase 2 assets and wired
  Phase 1 into `index.html` on its own (auto-committed as "plan
  checkpoint" and "added assets" — a different workflow than mine, flagged
  to the user rather than assumed OK). I verified the result live before
  taking the user's "assets are in place" at face value: full regression
  suite passed after fixing a couple of my own tests' stale `.hearts svg`
  selectors (hearts are `<img>` now, not inline `<svg>` — not a real
  regression). Found and reported two real issues: every ".svg" was
  actually a raster PNG in disguise (3.7MB bloat), and Phase 2's assets
  were generated but never wired in. User confirmed: use Antigravity only
  for image generation going forward, asked me to fix the SVGs and wire in
  Phase 2 directly. Did both — see the A4 section above for the technical
  detail, including a pre-existing `[hidden]` CSS specificity bug caught
  along the way (fail veil was showing a stray next-field preview). Full
  regression suite + new Phase-2-specific tests all pass. Phase 3 remains:
  the piggy pose variants, texture, horizon border, and OG image, all of
  which need either new code (a transient "unimpressed" state) or a
  deliberate design gut-check before adding ambient art.
- 2026-07-02 — Merged the win veil's fixed "Every piggy has its patch..."
  line into the `SAYINGS` rotation pool, and removed the separate
  `#veilSaying` element that used to show a second, independently-rotating
  quote under the buttons. One rotating line now, in the slot the fixed
  text used to occupy (between the vignette and the stats), not two texts
  competing for the same "flavor" job. `pickSaying()` no longer wraps its
  pick in curly quotes, since it now feeds a plain descriptive sentence
  slot rather than an italic aside. Only the plain-win branch uses it —
  ladder/campaign/gauntlet keep their own progress-specific text, since
  that's functional information, not flavor. Full regression suite clean.
- 2026-07-02 — Asked the user to scope Phase 3 (6 remaining items, very
  mixed risk/value) rather than guess; they chose the trimmed option —
  Unimpressed + OG image only. Built both code-side hooks myself (per the
  user's Antigravity-for-images-only preference): the "unimpressed"
  transient state (new `badCellIsPig` flag threaded through `flashBad()`,
  shown for 420ms on a rejected piggy placement, verified via Playwright
  that a rejected hoofprint correctly shows no piggy since none was
  attempted there) and the OG/Twitter meta tag set in `<head>`. Both
  reference asset paths that don't exist yet — intentional, they'll start
  working the moment Antigravity generates the files. Updated
  `ASSET_PROMPTS.md`'s two active prompts to reference the real generated
  `settled.png`/`wordmark.png` for style consistency, and marked
  Dozing/Celebrating/texture/horizon-border clearly on-hold so they aren't
  generated without a call site decided first. Full regression suite
  clean.
- 2026-07-02 — User generated `unimpressed.png` and `og-image.png` via
  Antigravity and pushed. Verified rather than assumed: both are genuine
  PNGs this time (no repeat of the fake-SVG issue — Antigravity's export
  was clean), viewed both directly (unimpressed nails "a shrug, not a
  scold"; the OG image reuses the wordmark exactly as instructed with a
  clean, uncluttered layout), then confirmed live — `og:image` resolves
  with a 200, and the unimpressed pose actually renders on a rejected
  placement (verified a legal placement still shows the settled pose right
  next to it, no cross-contamination). Full regression suite clean. A4 is
  now fully closed out at its decided scope: Phase 1, Phase 2, and trimmed
  Phase 3 all done; Dozing/Celebrating/texture/horizon-border remain
  deliberately on hold pending a real call site.
- 2026-07-02 — User asked to close out the plan; A4 (asset generation) was
  the only thing left from the original UI-overhaul ask, and it just
  finished, so the remainder of Part A was A5 (the polish backlog) plus
  Part B2's remaining mechanics. Asked to tackle A5 next, explicitly
  dropping the share affordance for now. Before starting, resolved two real
  forks with the user rather than guessing: sound would be synthesized via
  Web Audio API (no established audio-gen pipeline the way Antigravity
  covered images) rather than deferred, and the render-diffing item would
  be deferred (no reported perf problem, highest regression-risk item on
  the list for no current benefit) rather than bundled in. Implemented and
  verified, one item at a time, the other ten: typography (self-hosted
  Fraunces + Inter), a PWA shell (manifest + service worker), keyboard/board
  accessibility (roving-tabindex cells, arrow nav, Enter/Space, aria-labels,
  aria-pressed on every segmented control), hearts relocated near the board
  on mobile, illegal-placement teaching (a `whyIllegal()` toast naming the
  actual rule broken), a pen-completion shimmer, the three synthesized
  sounds, an optional per-pen colorblind letter, first-run onboarding (gated
  so it never interrupts an existing player), and the daily-untouched chip.
  See the A5 section above for full technical detail on each. Verified with
  a consolidated Playwright pass covering both the new work and load-bearing
  existing mechanics it touches (stakes docking, crag, size-10, gauntlet,
  persistence, all four keyboard shortcuts together) — 15/15 clean in
  Chromium, plus a WebKit spot-check (this repo's real target, per the
  lesson from the A2b board-clipping bug) confirming the new CSS (fonts,
  the hearts media query, the shimmer, pen labels) renders correctly there
  too, not just Chromium. A5 is now done at its decided scope (10 of 12
  items; render diffing and sharing both deliberately deferred). Remaining
  across the whole plan: Part B2's mud puddles, twin litters (its own
  milestone), limited hoofprints, "settled means settled", and daily
  modifier rotation.
- 2026-07-02 — User reported hearing sound only on correct placements, none
  for slips/fails/completion. Real gap: I'd shipped only the three positive
  cues from the original scope and never wired sound to any mistake path, so
  every slip and every game-over was genuinely silent — not a perception
  issue. Also found, while diagnosing, that the solve "snuffle" was
  scheduled at the same instant as the winning placement's thud+chime, so it
  was likely getting acoustically buried even when it did fire. Added
  `playSlip()` and `playFail()`, wired into every heart-docking path, and
  gave the snuffle a 0.6s head start so it plays as its own moment. See the
  Sound bullet above for full detail. Verified via instrumented
  `AudioContext` calls across all five cues.
- 2026-07-02 — **Part A close-out review + Part B re-plan (planning only, no
  code).** Walked the whole of Part A against the working tree: A1–A3 and A2b
  done and verified as they landed; A4 closed at its decided scope (dozing/
  celebrating sprites, paper texture, horizon border deliberately on hold —
  no call site); A5 done at 10 of 12 (render diffing and the share affordance
  deliberately deferred). Nothing in Part A remains actionable. One caveat
  recorded: the Playwright regression scripts cited throughout were
  session-scratch files and are not in the repo, so future milestones should
  recreate coverage as they go. Part B re-planned around a new direction from
  the user: **campaign packs** — curated series of fixed-seed fields
  selectable in the create sheet, with the existing curated-list campaign
  becoming the authoring loop, a designed 6-field intro pack as campaign #1
  (auto-started for genuinely new players), and a clipboard-JSON "export
  pack" pipeline for promoting curated lists into built-in packs. Storage
  already rides `arcade.v1.sowduku.*` via `sget`/`sset`, so campaign state is
  covered by the Arcade launcher's save-file export with no extra work. Full
  design captured as B3 above; build order revised to put B3 first, ahead of
  mud puddles / limited hoofprints / settled-means-settled / daily rotation /
  twin litters.
- 2026-07-02 — **B3 (campaign packs) implemented and verified.** Built the
  full data model (`campaigns.js`, per-pack progress with a one-time flat-
  array migration, `game.campaignPack` threading, a `forcedAssist` path so a
  pack field's authored assist never contaminates the player's saved
  default), the create-sheet UI (campaign mode, dynamic pack picker,
  pack-complete/pack-empty preview states), the teaching-note line, the
  generalized win veil, and the history sheet's "export pack" clipboard
  pipeline. Selected and hand-verified the six intro-pack fields via two new
  scripts (`scripts/pick_intro_seeds.js`, `scripts/verify_intro_seeds.js`) —
  along the way, corrected a wrong assumption in the original per-field
  criteria (meadow is *defined* as `l2 >= 4`, not some small confinement
  count, per `sowdoku.js`'s own `rate()`). Wrote three from-scratch Playwright
  suites (45 checks total, Chromium + a WebKit spot-check) since the repo had
  no committed coverage. Then ran an independent code review (fresh context)
  against the full diff before calling this done — it caught two real bugs
  the test-writing pass had missed (`replayBoard()` silently dropping a
  replayed campaign field's pack identity; the create sheet's "walk it
  again" using the player's generic assist default instead of the done
  pack's own field-1 assist) plus a dead/misleading mode-note string; all
  three fixed, with new targeted regression checks
  (`scripts/test_b3_fixes.js`) confirming the fixes. Full 45-check suite
  green after the fixes. B3 is the only item recommended ahead of mud
  puddles / limited hoofprints / settled-means-settled / daily rotation /
  twin litters, and it's now done — see the top of Part B2 for what's left.
- 2026-07-02 — **Same-day follow-up: veil clipping fix + history/export
  fidelity + Trails rename/declutter.** User reported four things at once:
  1. **Veil popup clipped by the board's bounds** (screenshot: title and
     buttons cut off on mobile). Root cause: `.veil` was `position: absolute;
     inset: 0` relative to `.board-wrap`, so its box was capped at the
     board's own (often small) square size regardless of how tall the win/
     fail card's content actually was. Fixed by switching `.veil` to
     `position: fixed; inset: 0; z-index: 50` — the same pattern every other
     modal in the app (`.sheet-backdrop`) already used — plus `max-height:
     90vh; overflow: auto` on `.veil .card`. Confirmed fixed via a real
     screenshot at 390×844 (previously-clipped title and both buttons now
     fully visible). Side effect, verified as *correct* rather than a
     regression: the veil now blocks the whole screen (header/action-bar
     included) while showing, not just the board — realigning behavior with
     an existing code comment on the peek/restore listener that already
     assumed nothing behind the veil was reachable ("nothing real is lost by
     swallowing the click").
  2. **History/export fidelity.** Curated fields, replayed history cards, and
     exported pack JSON only carried *which board* (code), not *how it was
     played* (assist, stakes) — replaying or exporting a starred field
     silently used the player's current defaults instead of recreating the
     actual run. Fixed: `beginGame()` gained `opts.forcedStakes` (mirrors the
     existing `opts.forcedAssist` — applies without becoming the new saved
     default); `persist()`/`restore()` now round-trip `game.stakes`/
     `lockedStakes` explicitly (previously `restore()` always re-derived
     stakes from the live default, silently losing a forced value on
     reload — the same class of bug the assist path had already been fixed
     for); `toggleCurate()` now stores `assist`/`stakes`/`ladderRung`/
     `gauntletStep`; `replayBoard()` forwards them as forced (not a fresh
     choice); the export-pack JSON includes `assist`/`stakes` per field when
     present. Verified end-to-end (`scripts/test_history_fidelity.js`, 7
     checks): curate under honest+assist-off while the live defaults are
     gentle+assist-on, flip the live defaults to the opposite, replay the
     curated field, confirm it still docks a heart under honest stakes and
     shows no assist shading — i.e., its *own* settings won, not the current
     defaults.
  3. **"Trails," a distinct button with a cuter name.** User: too many modes
     crammed into one create-sheet row, and campaign packs specifically
     should be reachable from their own button, not nested inside "tend a
     new field." Asked the user two quick questions (name, button placement)
     rather than guessing on either — both resolved to the recommended
     option: **🌾 Trails**, a new action-bar button (between "new field" and
     "history") opening its own `#trailsBack` sheet with a pack picker,
     WYSIWYG next-field preview, and tend/walk-it-again — no editable assist
     row (unlike the old create-sheet campaign branch), since Trails always
     applies a field's authored assist/stakes via `forcedAssist`/
     `forcedStakes`, same as the veil's auto-advance already did. The old
     create-sheet campaign branch (`cPackRow`, `showPackComplete`/
     `showPackEmpty`, `packSuggestedAssist`) and the old in-history-sheet
     "campaign bar" launcher (progress + play/continue button) were removed
     entirely — Trails is now the single entry point, including for "my
     trail" (the curated list). The history sheet's curated tab keeps only
     the pre-existing "export pack" button (renamed "export as trail pack").
     User-facing copy renamed campaign → trail throughout (mode label,
     history badge tooltip); the internal `mode: "campaign"` string,
     `campaignDone` storage key, and `campaign*`-prefixed function names were
     deliberately left unchanged to avoid a data migration — only display
     text moved.
  4. **Create-sheet declutter: tabs + sliders.** The remaining 6 modes
     (amble/daily/ladder/fog/wallow/gauntlet) were a flat button row. Grouped
     into 3 tabs (`amble` / `daily` / `runs`): "misty morning" folded into
     the amble tab as a weather toggle (clear/misty) instead of being its own
     top-level mode; ladder/gauntlet/wallow moved under a "runs" tab with
     their own 3-button sub-picker. `cState` gained `fog` (bool) and
     `runMode` (string) so switching tabs away and back remembers each tab's
     own sub-choice. Size (6–10) and difficulty (sunbeam→crag) pill-rows
     replaced with `<input type="range">` sliders + live `<output>` labels —
     both are genuinely ordinal scales, which a slider reads more directly
     than a row of pills. `resolveCreate`/`updateCreate`/`tendCreateForm`
     simplified back toward their pre-campaign shape now that pack-specific
     branching lives entirely in Trails.
  Rewrote all four Playwright suites' create-sheet interactions for the new
  tabs/sliders/Trails-sheet DOM (56 checks, all green) plus a WebKit spot
  check. Ran a second independent code review (fresh context, no access to
  the first review's findings) against this whole round before calling it
  done — it caught three more real bugs: `#trailsBack` was missing from both
  the click-outside-to-close and Escape-key dismissal wiring every other
  sheet already had, and — more significant — `toggleCurate()` never copied
  a record's `campaignPack` onto the curated entry at all, so *any* freshly-
  curated campaign-mode field (not just hypothetical legacy data) would
  replay into no pack and silently fail to credit progress; fixed by having
  `toggleCurate()` carry `campaignPack` and giving `replayBoard()` the same
  "campaignCode-without-campaignPack falls back to curated" defensive
  fallback `restore()` already had. All three fixed and covered by 5 new
  targeted checks (`scripts/test_review_fixes2.js`); full 61-check suite
  green after the fixes. README's Modes section and curation section updated
  to match (Trails as its own bullet, curation's assist/stakes fidelity
  noted).
- 2026-07-03 — **B4/B5 planning pass (planning only, no code).** Enriched
  the remaining Part B work into implementation-ready designs, one item at
  a time, for a later session to build sequentially. Two new sections:
  **B4 (play-test polish)** — five items from the user's own play-testing:
  action-bar raise/redesign + iOS double-tap-zoom fix (root cause
  identified: viewport meta lacks `viewport-fit=cover`, so the existing
  safe-area padding evaluates to 0), peek-costs-a-heart (with
  never-ends-the-game and not-a-mistake semantics, plus the copy sweep it
  forces across the info sheet / README / `campaigns.js` field 5), seed
  code as a click-to-copy watermark, favorite+name on the end veil (fail
  veil needs a `buildRecord(false)` synthesis since no record exists at
  hearts-0), and a Trails field list playable out of order. **B5 (remaining
  mechanics)** — D/E/F/I/C redesigned around four cohesion principles:
  board code = layout identity vs. recorded settings = play rules (puddles
  and twins go in the code via a new `+<letters>` suffix added once;
  hoofcap and settled-means-settled follow the shipped stakes/assist
  `forced*` pattern); generator changes are benchmark-gated before UI;
  daily rotation is pure composition of the other pieces via a single
  `dailyPreset()`. Build order revised: B4 first (small, immediate wins),
  then D → E → F → I → C.
- 2026-07-03 — **B6 (mode simplification) planned (planning only, no
  code).** User: difficulty settings and mode settings are confusing side
  by side — remove ladder, make gauntlet a curated thing, fold wallow into
  the top of the difficulty scale, without removing realistic gameplay
  options. Confirmed the direction works, with two design wrinkles captured
  in B6: (1) wallow becomes a fifth *preset* notch on the difficulty
  slider, not a fifth layout band — board codes stay crag, the existing
  `MODES.wallow` machinery just gets a new entry point, and misty+wallow
  becomes newly (and deliberately) possible; (2) the gauntlet becomes a
  **run pack** in Trails — a new pack flavor defined by stages rather than
  fixed-seed fields, rolling fresh seeds per attempt so runs stay
  unmemorizable, reusing the existing gauntlet engine (carryHearts /
  gauntletStep / run-fail veil / cleared-count stat) with the hardcoded
  `GAUNTLET` array replaced by pack data. Ladder is sunset rather than
  amputated: entry point removed, legacy records still render/replay, a
  restored in-progress climb finishes but offers "a fresh amble" instead of
  "climb higher", and the auto-escalating-climb experience can return
  later as a second run pack for ~pure data if play-testing misses it. Net:
  the create sheet's runs tab is deleted entirely (amble/daily only) and
  "mode" stops being a player-facing concept. Build order re-sequenced: B6
  lands after B4.1–B4.4 and *before* B4.5, so the trails field list is
  designed run-pack-aware from the start.
- 2026-07-03 — **B6 revised same day, two more user corrections (planning
  only, no code).** (1) Daily doesn't belong in the create sheet either —
  the status-strip pill is sufficient. Added B6.4: the daily tab dies, and
  with runs already gone **the create sheet loses tabs entirely** — one
  quiet form. One flagged semantics change: the pill now shows whenever
  today's field is *unsolved* (was: hidden after any touched attempt),
  since with the tab gone the pill is the only obvious door and a
  touched-but-abandoned daily shouldn't lock you out for the day. The
  size-variant daily oddity dies with the tab. (2) The gauntlet must honor
  the *sequence of boards* — that's the point of trails. B6.2 rewritten:
  gauntlet-ness is a **pack-level heart policy on an ordinary fixed-seed
  trail** (`run: { hearts: 3, carry: true }`), not the previously-designed
  "run pack" flavor with fresh-seed stages — strictly less machinery (no
  stage specs, no per-attempt seed rolling, no special-cased trails list).
  Walking the trail = the sequence in order with one shared pool; the
  fields stay individually listed and playable standalone (fresh hearts,
  ✓ on solve, practice — no cleared credit); two honest progress reads
  ("2/3 tended · cleared 4 times"). Fixed-seed memorizability is accepted
  as a feature (a mastery set; new gauntlets are cheap to author via
  export-pack). The optional "the climb" resurrection also simplifies: with
  run packs gone it's just a plain 8-field trail, no mechanism at all.
  B6.1 gained the implementation note that fog must be promoted from a
  mode to a per-game flag (`game.fog`) — that's what makes misty-wallow
  and daily-rotation misty days composable. B4.5's cross-reference updated
  to match. Third same-day clarification: **the run policy spans the whole
  trail it's attached to**, not a fixed 3 — length always read from
  `packFields(pack).length`, cleared = surviving the entire sequence, run
  copy derived from the pack, pool size is the author's tuning knob
  against trail length; B6.2 and the verify list reworded to be
  length-agnostic (and the verify list now demands testing with a longer
  scratch pack so a hardcoded 3 can't sneak through).
- 2026-07-03 — **B4.1–B4.4 and all of B6 implemented and verified, one item
  at a time, per the plan's build order.** 125 Playwright checks green
  across 8 files (5 new: `test_b4_polish.js`, `test_b6_gauntlet.js`,
  `test_b6_daily.js`, plus targeted additions to the existing suites),
  Chromium + WebKit spot-checks, screenshots at each visual milestone.
  - **B4.1** — root-caused the action-bar clipping to a missing
    `viewport-fit=cover` on the viewport meta (the existing safe-area
    padding was evaluating to 0 without it); added `touch-action:
    manipulation` to buttons and cells to kill the double-tap-zoom bug;
    redesigned all six action-bar icons as inline SVG line art in the
    game's own ink (peek is a lantern, not an eye); softened the bar to
    rounded-top + soft shadow instead of a hard border. Paused for and
    received the user's visual sign-off before marking done, per the
    plan's own house rule.
  - **B4.2** — peek now costs a heart on a successful hint (free under
    slow stakes, never offered once only one heart remains, not counted
    as a mistake); copy swept across the tooltip, info sheet, README, and
    the intro pack's "a helping hand" field note.
  - **B4.3** — the seed code moved from a status-strip pill to a quiet
    watermark under the board, same id (`#codeChip`) so existing tests
    and the click-to-copy handler needed zero changes.
  - **B4.4** — a ☆ star + name field on both win and fail veils, wired to
    the existing `toggleCurate`/`renameCurated`; the fail veil's record is
    synthesized via `buildRecord(false)` since none exists yet at that
    point. Guarded against a re-render clobbering a mid-edit name input
    (checks `document.activeElement`).
  - **B6.1** — wallow is now the difficulty slider's 5th notch (a preset,
    board code stays crag); fog was promoted from a mode string to a
    `game.fog` flag (with a legacy `cfg.fog` fallback for old `mode:"fog"`
    saves/records) so misty composes with wallow and, later, with daily
    rotation. Threaded through persist/restore/buildRecord/toggleCurate/
    replayBoard/pack-field overrides for full fidelity, same pattern as
    assist/stakes.
  - **B6.2** — the gauntlet is now an ordinary fixed-seed trail
    (`campaigns.js`, seeds hand-picked and verified the same way as the
    intro pack: `7m-1`/`8h-1`/`9c-1`) with a `run:{hearts,carry}` policy.
    New `game.inRun` flag (persisted) distinguishes a real run from
    standalone practice on the pack's own fields, so cleared-count credit
    (`stats.packCleared[packId]`) can't be gamed by solving fields solo.
    Caught and fixed a real bug during manual verification: the "clear"
    button's gauntlet-hearts guard only checked the legacy `mode ===
    "gauntlet"` string, not the new `game.inRun` flag — would have let
    clearing mid-run silently refill the shared pool. Also fixed two
    grammar bugs surfaced by testing real copy ("The the gauntlet ends
    here." from double-prepending an article the pack name already
    carries; "2 of 3 the gauntlet fields tended" from treating an
    article-bearing name as a bare adjective — rephrased to "tended in
    {packName}").
  - **B6.3** — ladder sunset: no entry point anywhere, but `MODES.ladder`,
    `LADDER`, `stats.bestLadder`, and the climb-chip/history-header
    displays all stay; the win veil now always offers "a fresh amble"
    instead of "climb higher" for a restored legacy game. `startLadder()`
    deleted.
  - **B6.4** — daily's create-sheet surface removed entirely; with runs
    (B6.2/B6.3) and daily both gone, the create sheet lost its tabs
    completely — one quiet form (weather · size · difficulty · assist ·
    seed). Pill semantics changed as flagged: shows whenever today's field
    is *unsolved* rather than *untouched*, so an abandoned attempt doesn't
    lock a player out for the day; renamed `dailyUntouched()` →
    `dailyPending()` to match. `startDaily(size)` simplified to
    `startDaily()` (always 8×8, the only daily there is now).
  - Every stage's Playwright suite update was itself a small debugging
    exercise worth noting: reused `#cRunSeg`/`#cTabs` selectors across
    five files needed systematic updates as each tab disappeared, one
    ad-hoc gauntlet-fail repro needed a deterministic (not
    random-seed-dependent) heart-drain via direct `localStorage`
    manipulation of `inProgress.hearts`, and a `.hname` class shared
    between the veil's name input and the curated tab's own required
    scoping the selector (`#hList .hname`) to avoid reading the wrong
    element. Remaining from the whole plan: B4.5 (Trails field list,
    next per the build order — designed run-pack-aware from B6.2), then
    B5 (mud puddles → hoofcap → settled → daily rotation → twin litters).
- 2026-07-03 — **B4.5 implemented and verified: every field of the selected
  Trails pack now lists (order, name, size·band, ✓ tended, best score,
  effort), any row selectable out of order.** `tState.fieldCode` (null =
  default) drives it; selecting a row overrides both a run pack's "begin
  the run" default and a finished pack's "walk it again" default with a
  plain "tend this field", and always starts that field standalone via
  `beginCampaignField` — even for the gauntlet, an out-of-order pick never
  starts or credits a run (fresh amble hearts, ✓ on solve only). Re-tapping
  a selected row clears it back to the default; switching packs also
  clears it. Effort is read straight off `f.aScore` for curated fields
  (computed once, at curate time) rather than re-running the solver per
  row, so the list stays cheap even for a 100-field "my trail" — built-in
  packs are always small enough to compute fresh. Rows are plain text, no
  per-row mini-boards (the plan flagged those as optional/budget-gated;
  the single selected-field preview already covers WYSIWYG). 20 new
  Playwright checks (`test_b4_trails_list.js`), 145 total green across 9
  files, WebKit spot-check. **This closes out all of B4 and B6** — every
  item from the original 6 play-test findings and the ladder/gauntlet/
  wallow simplification is now implemented. Remaining: B5 (mud puddles →
  hoofcap → settled → daily rotation → twin litters), not yet started.
