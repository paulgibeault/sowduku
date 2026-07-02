// One-off tool for B3 (campaign packs): scans random seeds per (size, band)
// slot, filters on the intro pack's per-field teaching criteria (PLAN.md
// "Intro pack" section), and prints an ASCII render of the best few
// candidates per slot so a human can eyeball region shape before locking a
// code into campaigns.js. Not wired into any build step — run manually.
const Sowdoku = require("../sowdoku.js");

const LETTERS = "ABCDEFGHIJ";
const BAND_CHAR = { sunbeam: "s", meadow: "m", hilltop: "h", crag: "c" };

function boardCode(size, band, seed) {
  return size + BAND_CHAR[band] + "-" + (seed >>> 0).toString(36);
}

function regionSizes(size, regions) {
  const sizes = new Array(size).fill(0);
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) sizes[regions[r][c]]++;
  return sizes;
}

// does most of some small pen (size <= maxPenSize) sit inside the
// 8-neighborhood of a solution cell belonging to a different pen? That's the
// "settling this piggy visibly carves out that neighboring pen" moment.
function findAdjacencyCarve(size, regions, solution, maxPenSize) {
  const sizes = regionSizes(size, regions);
  for (let pid = 0; pid < size; pid++) {
    if (sizes[pid] > maxPenSize) continue;
    const cells = [];
    for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) if (regions[r][c] === pid) cells.push([r, c]);
    for (let sr = 0; sr < size; sr++) {
      const sc = solution[sr];
      if (regions[sr][sc] === pid) continue;
      const neighborCount = cells.filter(([r, c]) => Math.abs(r - sr) <= 1 && Math.abs(c - sc) <= 1).length;
      if (neighborCount / cells.length >= 0.6) return { pid, penSize: sizes[pid], forcedRow: sr };
    }
  }
  return null;
}

function render(size, regions, solution) {
  let out = "";
  for (let r = 0; r < size; r++) {
    let row = "";
    for (let c = 0; c < size; c++) {
      const ch = LETTERS[regions[r][c]];
      row += solution[r] === c ? ch.toLowerCase() + "*" : ch + " ";
    }
    out += row + "\n";
  }
  return out;
}

function candidates(size, band, count, extraFilter, tries) {
  const found = [];
  for (let seed = 1; seed <= tries && found.length < count; seed++) {
    const p = Sowdoku.generate({ size, difficulty: band, seed });
    if (!p || p.difficulty !== band) continue;
    if (!extraFilter(p)) continue;
    found.push({ seed, p, score: Sowdoku.humanScore(size, p.profile, p.difficulty) });
  }
  return found;
}

function report(label, size, band, count, extraFilter, tries = 20000) {
  console.log("\n=== " + label + " (" + size + "x" + size + " " + band + ") ===");
  const found = candidates(size, band, count, extraFilter, tries);
  if (!found.length) { console.log("  no candidates found in " + tries + " tries"); return; }
  found.forEach(({ seed, p, score }) => {
    const code = boardCode(size, band, seed);
    console.log("  code=" + code + " seed=" + seed + " profile=" + JSON.stringify(p.profile) + " score=" + score);
    console.log(render(size, p.regions, p.solution).split("\n").map(l => "    " + l).join("\n"));
  });
}

// NOTE: `rate()` in sowdoku.js draws the sunbeam/meadow line at l2<=3 vs
// l2>=4 — meadow is *defined* as needing at least 4 confinements, so a
// "gentle" meadow puzzle just means l2 close to 4, not some small l2 count.

// 1. settling in — 6x6 sunbeam, l2===0, has a 1-cell pen (obvious first move)
report("1. settling in", 6, "sunbeam", 2, p =>
  p.profile.l2 === 0 && regionSizes(6, p.regions).some(s => s === 1)
);

// 2. good neighbors — 6x6 sunbeam, an early forced piggy whose 8-neighborhood
// mostly swallows a small (<=3 cell) neighboring pen
report("2. good neighbors", 6, "sunbeam", 2, p =>
  findAdjacencyCarve(6, p.regions, p.solution, 3) != null, 60000
);

// 3. leaving hoofprints — 6x6 meadow, on the grindier/higher-l2 side (stalls
// without marking impossible cells)
report("3. leaving hoofprints", 6, "meadow", 2, p => p.profile.l2 >= 6);

// 4. reading the field — 6x6 meadow, the gentlest possible meadow (l2 right
// at the sunbeam/meadow boundary — one confinement moment, not a grind)
report("4. reading the field", 6, "meadow", 2, p => p.profile.l2 === 4);

// 5. a helping hand — 7x7 meadow, mid-band effort (l2 just past the meadow floor)
report("5. a helping hand", 7, "meadow", 2, p => p.profile.l2 >= 4 && p.profile.l2 <= 5);

// 6. out into the meadow — 7x7 meadow, high-effort end of the band, capstone
report("6. out into the meadow", 7, "meadow", 2, p => {
  const s = Sowdoku.humanScore(7, p.profile, p.difficulty);
  return s >= 55;
});
