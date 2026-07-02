const Sowdoku = require("../sowdoku.js");
const BAND_CHAR = { sunbeam: "s", meadow: "m", hilltop: "h", crag: "c" };
const CHAR_BAND = { s: "sunbeam", m: "meadow", h: "hilltop", c: "crag" };
function parseCode(str) {
  const m = /^(10|[6-9])([smhc])-([0-9a-z]+)$/.exec(str.toLowerCase());
  return { size: +m[1], difficulty: CHAR_BAND[m[2]], seed: parseInt(m[3], 36) >>> 0 };
}
function regionSizes(size, regions) {
  const sizes = new Array(size).fill(0);
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) sizes[regions[r][c]]++;
  return sizes;
}

const codes = ["6s-1", "6s-6", "6m-8z", "6m-1", "7m-2", "7m-2ix"];
for (const code of codes) {
  const { size, difficulty, seed } = parseCode(code);
  const p = Sowdoku.generate({ size, difficulty, seed });
  if (!p) { console.log(code + ": FAILED to generate"); continue; }
  if (p.difficulty !== difficulty) { console.log(code + ": band mismatch, got " + p.difficulty); continue; }
  const uniq = Sowdoku.countSolutions(size, p.regions, 2);
  const sizes = regionSizes(size, p.regions);
  const score = Sowdoku.humanScore(size, p.profile, p.difficulty);
  console.log(code + ": band=" + p.difficulty + " uniq=" + uniq + " regionSizes=" + JSON.stringify(sizes) +
    " profile=" + JSON.stringify(p.profile) + " score=" + score);

  // trace the solver's own hint sequence to see whether it plays out the way
  // the lesson expects (does it ever need L2 before the "reading the field"
  // field, does the very first hint on the "good neighbors" field land next
  // to a small pen, etc.)
  const solver = Sowdoku.makeSolver(size, p.regions);
  let piggies = [];
  let steps = [];
  for (let i = 0; i < size; i++) {
    const h = solver.hint(piggies);
    if (!h || h.error) { steps.push("STUCK at step " + i); break; }
    steps.push("r" + h.r + "c" + h.c + "(L" + h.level + ")");
    piggies.push({ r: h.r, c: h.c });
  }
  console.log("  solve trace: " + steps.join(" "));
}
