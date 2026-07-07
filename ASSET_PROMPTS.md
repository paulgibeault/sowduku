# Sowdoku — Asset Generation Prompts

Reference doc for the design/branding pass (Part A4 of `PLAN.md`). Each
prompt below is meant to be used **with the style preamble prepended** —
paste it once as a system/style instruction if your tool supports one, or
prepend it to each prompt individually.

**Status:** Phase 1, Phase 2, and the trimmed Phase 3 (Unimpressed + OG
image) are all generated and wired into `index.html`. Every active item
below is done. All files are real `.png` — the image tool's first batch
output ".svg" files that were actually raster PNGs wrapped in an SVG
container (`<image href="data:image/png;base64,...">`), which inflated
size (base64 + XML overhead) without any vector benefit; those were
unwrapped, right-sized, and palette-quantized (3.7MB → ~250KB). The
Phase-3 batch came back as proper PNGs directly — no fix needed that time.

**Remaining, on hold:** Dozing, Celebrating, Board paper texture, and
Background farm-horizon border — none has a natural place to live in the
current UI, and forcing one in risks cluttering `STYLE.md`'s "calm
clarity" over showing genuine restraint. Their prompts are left below for
whenever a concrete use surfaces (e.g. a first-run flow for Dozing) —
don't generate them without a call site decided first.

**New, planned but not generated (B7.4):** four Info sheet illustrations
(Rules/Controls/Difficulty/Assist) — unlike the "on hold" set above, these
already have a concrete, wired call site (`index.html`'s `.info-body`,
graceful `onerror` fallback in the meantime) — just waiting on generation.

## Style preamble (prepend to every prompt)

```
Cozy minimalist children's-book style for a gentle logic puzzle game called
Sowdoku. Clean, confident line art (warm charcoal #514b42 lines, ~2.5px
weight, rounded caps) with soft watercolor pastel fills — sage green, warm
clay, dusty rose, sky grey, cream, pale lavender. Warm off-white parchment
world (#f4eee1). Generous negative space, zero clutter, no heavy gradients,
no neon, no drop shadows unless noted. Mood: a quiet sunlit farm afternoon;
calm clarity. No text in the image unless specified.
```

---

## Identity

### Logo / wordmark — done
`assets/logo/wordmark.png` (wired into the header title) +
`assets/logo/mark-square.png` (generated, not yet wired anywhere)

> A horizontal wordmark: the word "Sowdoku" in a warm, rounded serif with
> hand-drawn character, the "o" in "Sow" replaced by a curled-up sleeping
> piglet seen from above forming a perfect circle. Charcoal ink line art on
> transparent background, one soft dusty-rose watercolor blush on the
> piglet's cheek. Also produce a stacked square variant (wordmark below a
> larger version of the piglet mark) for small placements.

### Favicon / app icon — done
`assets/favicon/` — export the same source at 512, 192, 180 (apple-touch),
32, and 16 px, plus a `.ico` bundling 16/32/48.

> A single square app icon: minimalist line-art piglet face seen from the
> front, eyes closed and content, on a rounded-square soft sage-green
> watercolor wash background. Must read clearly at 16×16 as well as
> 512×512 — thick, simplified lines, no fine detail, no gradient banding.
> Flat, centered, generous padding around the piglet so nothing touches the
> edge.

---

## The piggy

Four poses of the same character, sharing proportions, line weight, and
camera angle so they can swap in place. Generate **settled** first, then
reference it (image-to-image, or describe its proportions) for the other
three so the set actually matches.

### Settled — done
`assets/piggy/settled.png` — wired into `pigSVG()` in `index.html`

> One small round piglet, top-down/three-quarter view, flopped happily in
> place, eyes closed, tiny ears, subtle blush snout. Proportions and
> framing sized to read clearly at 32px inside a square grid cell.
> Transparent background, flat pastel fill with charcoal line, no cast
> shadow.

### Unimpressed — done
`assets/piggy/unimpressed.png` — wired: a rejected piggy placement
(illegal square, or a legal-but-wrong-patch mistake under Honest+/Stern
stakes) briefly shows this pose in the cell for 420ms via
`unimpressedSVG()`, alongside the existing red flash. A rejected
*hoofprint* still shows only the flash — no piggy was ever attempted
there.

> Reference `assets/piggy/settled.png` for exact proportions, line weight,
> and camera angle. The same piglet, cracking one skeptical half-open eye,
> one ear tilted back — a shrug, not a scold. Same framing and canvas size
> so it swaps in-place with the settled pose. Transparent background.

### Dozing — on hold, no call site
`assets/piggy/dozing.png`

> Reference `assets/piggy/settled.png` for proportions and line weight.
> The same piglet, fast asleep, two tiny "z z" marks drifting up, a
> slow-breath posture (chest very slightly raised). Same framing and
> canvas size as the set. Transparent background.

### Celebrating — on hold, no call site
`assets/piggy/celebrating.png` — the win vignette (below) already covers
the "celebration" moment; revisit only if a specific new spot for this
comes up.

> Reference `assets/piggy/settled.png` for proportions and line weight.
> The same piglet, on its back, trotters up, utterly content, eyes closed
> in a happy squint, a small warm sun-glow patch under it. Slightly larger
> canvas is fine. Transparent background.

---

## Board elements

### Hoofprint marker — done
`assets/board/hoofprint.png` — wired into `index.html`. Note: the
integration went beyond a simple swap — a new `hoofprintHTML(r, c)`
function positions two rotated copies per cell with a deterministic
per-cell angle, reading as a little walking trail rather than a static
mark.

> A tiny two-toed pig hoofprint, like a mark pressed into dried mud, single
> warm charcoal-brown tone at roughly 50% opacity, slightly irregular and
> hand-stamped rather than geometric. Must read clearly at 16px.
> Transparent background.

### Hearts — full & empty — done
`assets/board/heart-full.png`, `assets/board/heart-empty.png` — wired into `heartSVG()`

> A matched pair of small hearts, hand-drawn with a slightly asymmetric,
> wobbly outline (not a perfect geometric heart). Left: full, soft
> dusty-rose watercolor fill (#c98b86) with a fine charcoal outline. Right:
> the identical outline, fill faded to a pale warm parchment tone, reading
> as "spent" rather than "broken" — no crack, no X. Transparent background,
> both on the same canvas side by side (split into two files after
> generating).

---

## Environment & texture

### Board paper texture — on hold, no call site
`assets/texture/paper-tile.png`

> A very subtle watercolor-paper texture tile: warm off-white with the
> faintest visible fiber grain and occasional soft pastel bloom at 3–4%
> opacity. Must tile seamlessly edge to edge. Nearly invisible at normal
> viewing size — texture only, no imagery, no vignette.

### Background farm-horizon border — on hold, no call site
`assets/illustration/horizon-border.png`

> A whisper-quiet farm horizon as a bottom-edge border illustration: a
> simple fence line, two distant trees, tall grass tufts, drawn in
> single-weight charcoal line with two or three soft watercolor accents
> (sage, dusty rose). Composition is 80% empty space, sits along the bottom
> edge only, must read as calm background — never compete with foreground
> UI. Transparent background above the horizon line.

---

## Illustrations

### Win vignette — done
`assets/illustration/win-vignette.png` — wired into the win veil, between
the title and the descriptive text (`#vVignette` in `renderVeil()`)

> A small vignette, wide and short composition (3:1): five piglets each
> settled comfortably in their own patch of a gently colored field, spaced
> generously apart, warm dusk light. Line art with soft pastel fills,
> matching the board's own watercolor pens.

### Fail / "crowded field" vignette — done
`assets/illustration/fail-vignette.png` — wired into the fail veil, same
slot as the win vignette. Shared across all fail paths, gauntlet included.

> A small vignette: two piglets accidentally settled back-to-back, both
> mildly affronted, one eyebrow raised each — comedy through restraint, no
> distress, no tears, no dramatic lighting. Same line-art and pastel-fill
> style as the rest of the set.

### Info sheet illustrations — **planned, prompts only (B7.4)**
`assets/illustration/info-rules.png`, `info-controls.png`,
`info-difficulty.png`, `info-assist.png` — one per remaining section of the
"how to play" sheet (Rules, Controls, Difficulty, Assist; Stakes was folded
into Rules' own paragraph in B7.2 and no longer has a section of its own).
Same slot pattern as the win/fail vignette (`.vvignette`, wide-and-short,
between the `<h3>` heading and its paragraph) — code is already wired
(`index.html`'s `.info-body`) with a graceful `onerror` fallback, so the
sheet reads perfectly well as text-only until these are actually generated
and dropped in with these exact filenames. Not generated yet — this is the
prompt-writing pass only, per explicit request; do not generate without a
further go-ahead.

**(a) Rules**
> A small vignette, wide and short composition (3:1): four piglets each
> settled in their own patch of a pastel field, spaced generously apart —
> not one of them touching a neighbor, not even corner to corner,
> demonstrating the Wallow Rule the paragraph describes. Same line-art and
> pastel-fill style as the win/fail vignettes.

**(b) Controls**
> A small vignette: one piglet mid-tap, a trotter reaching down toward a
> cell about to settle, and beside it in the next pen over, a small
> two-toed hoofprint mark already stamped down — tap and hoofprint shown
> together in one calm frame, no motion lines or speed effects, just the
> two gestures side by side.

**(c) Difficulty**
> A small vignette showing four fenced grids in a horizontal row on a warm parchment
> background under a soft watercolor sun. The grids increase in size and division complexity
> from left to right: a simple 4x4 green grid, a 6x6 orange/clay grid, an 8x8 grid with
> four quadrant regions, and a 10x10 grid with complex multi-colored pen regions. This
> illustrates the escalating scale and complexity of the different difficulty tiers.

**(d) Assist**
> A small vignette: a simple 4x4 grid of cells drawn with clean charcoal line art. A
> single cute piglet sits in the third row, third column. Light blue highlight lines
> run horizontally and vertically through the piglet's cell to show row and column
> exclusions, and a rounded light blue square outlines the 3x3 area of cells immediately
> surrounding the piglet (to show the diagonal and orthogonal Wallow rule exclusion zone).
> Soft watercolor pastel fills shade the pens, with a warm off-white parchment background.
> The title at the top of the image reads "FOCUS ON A SINGLE PIG: ROW, COLUMN, & REGION", so the
> illustration teaches by matching exactly what a player will actually see
> in play.

### Empty-state spots
`assets/illustration/empty-history.png`, `empty-curated.png` — **done**,
wired into the `.hempty` blocks in the history sheet's recent/curated
tabs. `assets/illustration/empty-firstrun.png` — generated but **not
wired**, since no first-run onboarding flow exists yet (A5 backlog item);
revisit when that flow gets built.

**(a) History — empty**
> A tiny spot illustration: an open farm gate on its own, nobody through it
> yet, one curious bird perched on the top rail. Standalone on transparent
> background, square format, generous negative space.

**(b) Curated — empty**
> A tiny spot illustration: a single fence post with a hand-tied ribbon bow
> on it, waiting for something to be marked. Standalone on transparent
> background, square format, generous negative space.

**(c) First run**
> A tiny spot illustration: a coffee cup steaming gently beside a rolled-up
> field map tied with string. Standalone on transparent background, square
> format, generous negative space.

### Misty Morning badge — done
`assets/illustration/misty-badge.png` — wired into the `data-mode="fog"`
button in the create sheet's mode picker

> A small square emblem: the settled piglet's silhouette half-veiled in
> soft horizontal fog bands, pale grey-blue watercolor wash, charcoal line
> only where it shows through the fog. Reads clearly at badge size
> (roughly 40px). Transparent background.

---

## Marketing

### OG / social share image — done
`assets/social/og-image.png`, 1200×630 px — wired: `og:image` and
`twitter:image` meta tags in `<head>` point at this file, alongside
`og:title`/`og:description` pulled from the README's own opening line.

> Reference `assets/logo/wordmark.png` for the exact wordmark treatment —
> reuse it directly rather than redrawing it. A 1200×630 banner: the
> wordmark placed left-of-center, a 6×6 pastel pen-grid with three settled
> piglets to the right (reference `assets/piggy/settled.png` for the
> piglet), empty space below the wordmark reserved for a tagline (leave
> text out of the image). Parchment background (#f4eee1), calm and
> uncluttered composition, matching the game's own watercolor-pastel pen
> colors.
