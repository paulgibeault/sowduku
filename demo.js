// Node smoke test + ASCII preview for the Sowdoku engine.
//   node demo.js [size] [difficulty] [seed]
const Sowdoku = require('./sowdoku.js');

const size = +(process.argv[2] || 8);
const difficulty = process.argv[3] || 'meadow';
const seed = process.argv[4] != null ? +process.argv[4] : 20260629;

const GLYPHS = 'ABCDEFGHIJ';
function render(p) {
  const { size: n, regions, solution } = p;
  let out = '';
  for (let r = 0; r < n; r++) {
    let line = '';
    for (let c = 0; c < n; c++) {
      const isPig = solution[r] === c;
      line += (isPig ? '(' : ' ') + GLYPHS[regions[r][c]] + (isPig ? ')' : ' ');
    }
    out += line + '\n';
  }
  return out;
}

console.log(`\nSowdoku — size ${size}, requested "${difficulty}", seed ${seed}\n`);
const puzzle = Sowdoku.generate({ size, difficulty, seed });
if (!puzzle) { console.log('No puzzle found.'); process.exit(1); }

console.log(render(puzzle));
console.log(`difficulty: ${puzzle.difficulty}`);
console.log(`logic profile (steps): L1=${puzzle.profile.l1} L2=${puzzle.profile.l2} L3=${puzzle.profile.l3}`);
console.log(`unique solution: ${Sowdoku.countSolutions(size, puzzle.regions, 2) === 1}`);

// verify the stored solution actually satisfies all four rules
const piggies = puzzle.solution.map((c, r) => ({ r, c }));
console.log(`solution valid: ${Sowdoku.isSolved(size, puzzle.regions, piggies)}`);

// distribution check across many seeds
console.log('\nDifficulty distribution over 60 boards (size 8):');
const tally = {};
for (let s = 0; s < 60; s++) {
  const pz = Sowdoku.generate({ size: 8, difficulty: 'meadow', seed: 1000 + s });
  const band = pz ? pz.difficulty : 'none';
  tally[band] = (tally[band] || 0) + 1;
}
console.log(tally);
