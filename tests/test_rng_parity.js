// sowdoku.js keeps its own inline makeRng: the game is a classic-script UMD
// world (index.html's inline IIFE needs window.Sowdoku synchronously), so it
// cannot import the fleet's ESM rng companion (/arcade-rng.js) the way the
// module games vendor it. The trade is pinned here instead: these
// known-answer vectors are the fleet algorithm's published outputs (same
// vectors the module games pin against their vendored copy), so if either
// side ever drifts, daily boards stop matching across the fleet's shared
// derivations — and this fails instead of nobody noticing.
//
// No server needed — pure algorithm check.

const Sowdoku = require("../sowdoku.js");

let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; console.log(`  ✓ ${msg}`); }
  else { fail++; console.error(`  ✗ ${msg}`); }
}

const rng = Sowdoku.makeRng(42);
const got = [rng(), rng(), rng()];
const want = [0.6011037519201636, 0.44829055899754167, 0.8524657934904099];
ok(JSON.stringify(got) === JSON.stringify(want),
  `makeRng(42) matches the fleet known-answer vectors (got ${JSON.stringify(got)})`);

const a = Sowdoku.makeRng(7), b = Sowdoku.makeRng(7);
ok([a(), a(), a()].join() === [b(), b(), b()].join(), "same seed, same stream");

console.log(`\n${pass}/${pass + fail} rng-parity checks passed`);
process.exit(fail ? 1 : 0);
