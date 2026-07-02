# Sowdoku — Asset Generation Prompts

Reference doc for the design/branding pass (Part A4 of `PLAN.md`). Each
prompt below is meant to be used **with the style preamble prepended** —
paste it once as a system/style instruction if your tool supports one, or
prepend it to each prompt individually.

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

### Logo / wordmark
`assets/logo/wordmark.svg` + `assets/logo/mark-square.svg`

> A horizontal wordmark: the word "Sowdoku" in a warm, rounded serif with
> hand-drawn character, the "o" in "Sow" replaced by a curled-up sleeping
> piglet seen from above forming a perfect circle. Charcoal ink line art on
> transparent background, one soft dusty-rose watercolor blush on the
> piglet's cheek. Also produce a stacked square variant (wordmark below a
> larger version of the piglet mark) for small placements.

### Favicon / app icon
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

### Settled
`assets/piggy/settled.svg` — replaces `pigSVG()` in `index.html`

> One small round piglet, top-down/three-quarter view, flopped happily in
> place, eyes closed, tiny ears, subtle blush snout. Proportions and
> framing sized to read clearly at 32px inside a square grid cell.
> Transparent background, flat pastel fill with charcoal line, no cast
> shadow.

### Unimpressed
`assets/piggy/unimpressed.svg` — **no existing call site**, see integration notes

> The same piglet as reference, identical proportions and line weight,
> cracking one skeptical half-open eye, one ear tilted back. Same framing
> and canvas size so it can swap in-place with the settled pose.
> Transparent background.

### Dozing
`assets/piggy/dozing.svg` — **no existing call site**, see integration notes

> The same piglet as reference, fast asleep, two tiny "z z" marks drifting
> up, a slow-breath posture (chest very slightly raised). Same framing and
> canvas size as the set. Transparent background.

### Celebrating
`assets/piggy/celebrating.svg` — **no existing call site**, see integration notes

> The same piglet as reference, on its back, trotters up, utterly content,
> eyes closed in a happy squint, a small warm sun-glow patch under it.
> Slightly larger canvas is fine — this is the win-screen hero, not a board
> piece. Transparent background.

---

## Board elements

### Hoofprint marker
`assets/board/hoofprint.svg` — replaces the inline `.hoofprint` divs in `index.html`

> A tiny two-toed pig hoofprint, like a mark pressed into dried mud, single
> warm charcoal-brown tone at roughly 50% opacity, slightly irregular and
> hand-stamped rather than geometric. Must read clearly at 16px.
> Transparent background.

### Hearts — full & empty
`assets/board/heart-full.svg`, `assets/board/heart-empty.svg` — replaces `heartSVG()`

> A matched pair of small hearts, hand-drawn with a slightly asymmetric,
> wobbly outline (not a perfect geometric heart). Left: full, soft
> dusty-rose watercolor fill (#c98b86) with a fine charcoal outline. Right:
> the identical outline, fill faded to a pale warm parchment tone, reading
> as "spent" rather than "broken" — no crack, no X. Transparent background,
> both on the same canvas side by side (split into two files after
> generating).

---

## Environment & texture

### Board paper texture
`assets/texture/paper-tile.png` — **no existing call site**, see integration notes

> A very subtle watercolor-paper texture tile: warm off-white with the
> faintest visible fiber grain and occasional soft pastel bloom at 3–4%
> opacity. Must tile seamlessly edge to edge. Nearly invisible at normal
> viewing size — texture only, no imagery, no vignette.

### Background farm-horizon border
`assets/illustration/horizon-border.svg` — **no existing call site**, see integration notes

> A whisper-quiet farm horizon as a bottom-edge border illustration: a
> simple fence line, two distant trees, tall grass tufts, drawn in
> single-weight charcoal line with two or three soft watercolor accents
> (sage, dusty rose). Composition is 80% empty space, sits along the bottom
> edge only, must read as calm background — never compete with foreground
> UI. Transparent background above the horizon line.

---

## Illustrations

### Win vignette
`assets/illustration/win-vignette.svg` — suggested slot: win veil, above the stats row

> A small vignette, wide and short composition (3:1): five piglets each
> settled comfortably in their own patch of a gently colored field, spaced
> generously apart, warm dusk light. Line art with soft pastel fills,
> matching the board's own watercolor pens.

### Fail / "crowded field" vignette
`assets/illustration/fail-vignette.svg` — suggested slot: fail veil, above the stats row

> A small vignette: two piglets accidentally settled back-to-back, both
> mildly affronted, one eyebrow raised each — comedy through restraint, no
> distress, no tears, no dramatic lighting. Same line-art and pastel-fill
> style as the rest of the set.

### Empty-state spots
`assets/illustration/empty-history.svg`, `empty-curated.svg`, `empty-firstrun.svg`
— suggested slots: the `.hempty` text in the history sheet's recent/curated
tabs, and a future first-run flow

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

### Misty Morning badge
`assets/illustration/misty-badge.svg` — suggested slot: the `data-mode="fog"`
button in the create sheet's mode picker

> A small square emblem: the settled piglet's silhouette half-veiled in
> soft horizontal fog bands, pale grey-blue watercolor wash, charcoal line
> only where it shows through the fog. Reads clearly at badge size
> (roughly 40px). Transparent background.

---

## Marketing

### OG / social share image
`assets/social/og-image.png`, 1200×630 px — **no existing call site**, see integration notes

> A 1200×630 banner: the Sowdoku wordmark placed left-of-center, a 6×6
> pastel pen-grid with three settled piglets to the right, empty space
> below the wordmark reserved for a tagline (leave text out of the image).
> Parchment background, calm and uncluttered composition, matching the
> game's own watercolor-pastel pen colors.
