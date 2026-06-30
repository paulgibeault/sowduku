/*
 * Sowdoku — generator, uniqueness checker, and human-style logical solver.
 *
 * Puzzle rules (a Queens / Star-Battle variant):
 *   1. exactly one piggy per color region
 *   2. exactly one piggy per row
 *   3. exactly one piggy per column
 *   4. no two piggies touch (orthogonally OR diagonally)
 *
 * A board of size N has N color regions and N piggies in the solution.
 *
 * Usage:
 *   const Sowdoku = require('./sowdoku.js');            // Node
 *   <script src="sowdoku.js"></script> -> window.Sowdoku // browser
 */
(function (root) {
  'use strict';

  // ---- seedable RNG (mulberry32) so daily puzzles are reproducible ----
  function makeRng(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffle(arr, rng) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  const inBounds = (n, r, c) => r >= 0 && r < n && c >= 0 && c < n;

  // ---- 1. solution: a permutation cols[r] with |cols[r]-cols[r+1]| >= 2 ----
  // (one per row + one per column via permutation; the gap >=2 keeps piggies in
  //  consecutive rows from touching — non-consecutive rows can never touch.)
  function generateSolution(n, rng) {
    const cols = new Array(n).fill(-1);
    const used = new Array(n).fill(false);
    function bt(r) {
      if (r === n) return true;
      const order = shuffle([...Array(n).keys()], rng);
      for (const c of order) {
        if (used[c]) continue;
        if (r > 0 && Math.abs(c - cols[r - 1]) < 2) continue;
        used[c] = true; cols[r] = c;
        if (bt(r + 1)) return true;
        used[c] = false; cols[r] = -1;
      }
      return false;
    }
    return bt(0) ? cols : null;
  }

  // ---- 2. color regions: streaky multi-source flood from each piggy ----
  // Region id r is seeded on the solution piggy of row r, so every region
  // contains exactly one solution piggy and is contiguous. Growth is "streaky"
  // (it keeps extending one region with probability `streak`) which produces
  // irregular, snaking regions — far likelier to pin a UNIQUE solution than the
  // balanced compact blobs that uniform multi-source flooding yields.
  const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  function growRegions(n, solution, rng, streak = 0.9, capMul = 2.5) {
    const cap = Math.ceil(n * capMul); // soft ceiling so no region eats the board
    const region = Array.from({ length: n }, () => new Array(n).fill(-1));
    const front = Array.from({ length: n }, () => []);
    const size = new Array(n).fill(1);
    function seed(r, c, id) {
      region[r][c] = id;
      for (const [dr, dc] of N4) {
        const nr = r + dr, nc = c + dc;
        if (inBounds(n, nr, nc)) front[id].push([nr, nc]);
      }
    }
    for (let r = 0; r < n; r++) seed(r, solution[r], r);

    let remaining = n * n - n;
    let active = Math.floor(rng() * n);
    while (remaining > 0) {
      if (front[active].length === 0 || size[active] >= cap || rng() > streak) {
        let avail = [];
        for (let id = 0; id < n; id++) if (front[id].length && size[id] < cap) avail.push(id);
        if (avail.length === 0) for (let id = 0; id < n; id++) if (front[id].length) avail.push(id);
        if (avail.length === 0) break;
        active = avail[Math.floor(rng() * avail.length)];
      }
      const f = front[active];
      const i = Math.floor(rng() * f.length);
      const [r, c] = f[i]; f[i] = f[f.length - 1]; f.pop();
      if (region[r][c] !== -1) continue;
      region[r][c] = active; size[active]++; remaining--;
      for (const [dr, dc] of N4) {
        const nr = r + dr, nc = c + dc;
        if (inBounds(n, nr, nc) && region[nr][nc] === -1) front[active].push([nr, nc]);
      }
    }
    // assign any cell the streaks stranded to its SMALLEST adjacent region
    // (keeps regions contiguous without ballooning one of them)
    let stranded = true;
    while (stranded) {
      stranded = false;
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
        if (region[r][c] !== -1) continue;
        let best = -1;
        for (const [dr, dc] of N4) {
          const nr = r + dr, nc = c + dc;
          if (inBounds(n, nr, nc) && region[nr][nc] !== -1 && (best === -1 || size[region[nr][nc]] < size[best])) best = region[nr][nc];
        }
        if (best === -1) { stranded = true; continue; } // neighbour not assigned yet
        region[r][c] = best; size[best]++;
      }
    }
    return region;
  }

  // ---- 3. exact solver: count solutions (stop at `limit`) for uniqueness ----
  function countSolutions(n, region, limit = 2) {
    const colUsed = new Array(n).fill(false);
    const regUsed = new Array(n).fill(false);
    const place = new Array(n).fill(-1);
    let count = 0;
    function bt(r) {
      if (count >= limit) return;
      if (r === n) { count++; return; }
      for (let c = 0; c < n; c++) {
        if (colUsed[c]) continue;
        const id = region[r][c];
        if (regUsed[id]) continue;
        if (r > 0 && Math.abs(place[r - 1] - c) <= 1) continue; // touches prev row
        colUsed[c] = true; regUsed[id] = true; place[r] = c;
        bt(r + 1);
        colUsed[c] = false; regUsed[id] = false; place[r] = -1;
        if (count >= limit) return;
      }
    }
    bt(0);
    return count;
  }

  // ---- 4. human-style logical solver (for difficulty rating) ----
  // Levels of technique:
  //   L1  forced single: a row/col/region with exactly one candidate cell.
  //   L2  confinement:   a region whose candidates share one row/col (or a
  //                      row/col whose candidates share one region) -> eliminate.
  //   L3  contradiction: hypothesize a candidate, propagate at <=L2; if it dead-
  //                      ends, that candidate is impossible -> eliminate.
  function regionCellsOf(n, region) {
    const rc = Array.from({ length: n }, () => []);
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) rc[region[r][c]].push([r, c]);
    return rc;
  }

  function freshState(n) {
    return {
      cand: Array.from({ length: n }, () => new Array(n).fill(true)),
      placed: Array.from({ length: n }, () => new Array(n).fill(false)),
      placedCount: 0,
    };
  }
  function cloneState(n, s) {
    return {
      cand: s.cand.map((row) => row.slice()),
      placed: s.placed.map((row) => row.slice()),
      placedCount: s.placedCount,
    };
  }

  function makeSolver(n, region) {
    const regionCells = regionCellsOf(n, region);

    function place(s, r, c) {
      s.placed[r][c] = true; s.placedCount++;
      const id = region[r][c];
      for (let k = 0; k < n; k++) { s.cand[r][k] = false; s.cand[k][c] = false; }
      for (const [rr, cc] of regionCells[id]) s.cand[rr][cc] = false;
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        const nr = r + dr, nc = c + dc;
        if (inBounds(n, nr, nc)) s.cand[nr][nc] = false;
      }
    }

    const rowCands = (s, r) => { const a = []; for (let c = 0; c < n; c++) if (s.cand[r][c]) a.push([r, c]); return a; };
    const colCands = (s, c) => { const a = []; for (let r = 0; r < n; r++) if (s.cand[r][c]) a.push([r, c]); return a; };
    const regCands = (s, id) => regionCells[id].filter(([r, c]) => s.cand[r][c]);
    const rowPlaced = (s, r) => { for (let c = 0; c < n; c++) if (s.placed[r][c]) return true; return false; };
    const colPlaced = (s, c) => { for (let r = 0; r < n; r++) if (s.placed[r][c]) return true; return false; };
    const regPlaced = (s, id) => regionCells[id].some(([r, c]) => s.placed[r][c]);

    // contradiction = an unfilled row/col/region with no candidates left
    function contradiction(s) {
      for (let r = 0; r < n; r++) if (!rowPlaced(s, r) && rowCands(s, r).length === 0) return true;
      for (let c = 0; c < n; c++) if (!colPlaced(s, c) && colCands(s, c).length === 0) return true;
      for (let id = 0; id < n; id++) if (!regPlaced(s, id) && regCands(s, id).length === 0) return true;
      return false;
    }

    function level1(s) { // place one forced single
      for (let r = 0; r < n; r++) if (!rowPlaced(s, r)) { const cs = rowCands(s, r); if (cs.length === 1) { place(s, cs[0][0], cs[0][1]); return true; } }
      for (let c = 0; c < n; c++) if (!colPlaced(s, c)) { const cs = colCands(s, c); if (cs.length === 1) { place(s, cs[0][0], cs[0][1]); return true; } }
      for (let id = 0; id < n; id++) if (!regPlaced(s, id)) { const cs = regCands(s, id); if (cs.length === 1) { place(s, cs[0][0], cs[0][1]); return true; } }
      return false;
    }

    function level2(s) { // one confinement elimination
      // region confined to a single row or column
      for (let id = 0; id < n; id++) {
        if (regPlaced(s, id)) continue;
        const cs = regCands(s, id); if (cs.length < 2) continue;
        const rows = new Set(cs.map((x) => x[0])), cols = new Set(cs.map((x) => x[1]));
        if (rows.size === 1) { const rr = cs[0][0]; let hit = false; for (let c = 0; c < n; c++) if (s.cand[rr][c] && region[rr][c] !== id) { s.cand[rr][c] = false; hit = true; } if (hit) return true; }
        if (cols.size === 1) { const cc = cs[0][1]; let hit = false; for (let r = 0; r < n; r++) if (s.cand[r][cc] && region[r][cc] !== id) { s.cand[r][cc] = false; hit = true; } if (hit) return true; }
      }
      // row/col confined to a single region
      for (let r = 0; r < n; r++) {
        if (rowPlaced(s, r)) continue;
        const cs = rowCands(s, r); if (cs.length < 2) continue;
        const regs = new Set(cs.map((x) => region[x[0]][x[1]]));
        if (regs.size === 1) { const id = region[cs[0][0]][cs[0][1]]; let hit = false; for (const [rr, cc] of regionCells[id]) if (s.cand[rr][cc] && rr !== r) { s.cand[rr][cc] = false; hit = true; } if (hit) return true; }
      }
      for (let c = 0; c < n; c++) {
        if (colPlaced(s, c)) continue;
        const cs = colCands(s, c); if (cs.length < 2) continue;
        const regs = new Set(cs.map((x) => region[x[0]][x[1]]));
        if (regs.size === 1) { const id = region[cs[0][0]][cs[0][1]]; let hit = false; for (const [rr, cc] of regionCells[id]) if (s.cand[rr][cc] && cc !== c) { s.cand[rr][cc] = false; hit = true; } if (hit) return true; }
      }
      return false;
    }

    // run L1+L2 to a fixpoint; report contradiction
    function propagateL12(s) {
      for (;;) {
        if (contradiction(s)) return 'contradiction';
        if (level1(s)) continue;
        if (level2(s)) continue;
        return s.placedCount === n ? 'solved' : 'stuck';
      }
    }

    function level3(s) { // eliminate one candidate that leads to a contradiction
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
        if (!s.cand[r][c]) continue;
        const t = cloneState(n, s);
        place(t, r, c);
        if (propagateL12(t) === 'contradiction') { s.cand[r][c] = false; return true; }
      }
      return false;
    }

    // Solve with techniques up to maxLevel; report which levels were needed.
    function solve(maxLevel) {
      const s = freshState(n);
      const counts = { l1: 0, l2: 0, l3: 0 };
      let usedMax = 0;
      for (;;) {
        if (contradiction(s)) break;
        if (level1(s)) { counts.l1++; usedMax = Math.max(usedMax, 1); continue; }
        if (maxLevel >= 2 && level2(s)) { counts.l2++; usedMax = Math.max(usedMax, 2); continue; }
        if (maxLevel >= 3 && level3(s)) { counts.l3++; usedMax = Math.max(usedMax, 3); continue; }
        break;
      }
      return { solved: s.placedCount === n, counts, usedMax };
    }

    return { solve };
  }

  // map a logic profile to a cozy difficulty band
  function rate(n, region) {
    const solver = makeSolver(n, region);
    const r2 = solver.solve(2);
    if (r2.solved) {
      return { band: r2.counts.l2 <= 3 ? 'sunbeam' : 'meadow', minLevel: r2.usedMax, counts: r2.counts };
    }
    const r3 = solver.solve(3);
    if (r3.solved) return { band: 'hilltop', minLevel: 3, counts: r3.counts };
    return { band: 'unfair', minLevel: 4, counts: r3.counts }; // needs deeper search
  }

  // ---- top-level generation ----
  // generate({ size, difficulty, seed }) -> { size, regions, solution, difficulty, seed }
  const BANDS = ['sunbeam', 'meadow', 'hilltop'];
  function generate(opts = {}) {
    const size = opts.size || 8;
    const want = BANDS.includes(opts.difficulty) ? opts.difficulty : 'meadow';
    const baseSeed = (opts.seed != null ? opts.seed : 0x5e7) >>> 0;
    const maxAttempts = opts.maxAttempts || 2000;

    let fallback = null;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const rng = makeRng((baseSeed + attempt * 0x9e3779b1) >>> 0);
      const solution = generateSolution(size, rng);
      if (!solution) continue;
      const regions = growRegions(size, solution, rng);
      if (countSolutions(size, regions, 2) !== 1) continue; // must be unique
      const r = rate(size, regions);
      const result = { size, regions, solution, difficulty: r.band, profile: r.counts, seed: baseSeed, attempt };
      if (r.band === want) return result;
      if (r.band !== 'unfair' && !fallback) fallback = result; // keep first fair puzzle
    }
    return fallback; // closest fair puzzle we could find (may be null in pathological cases)
  }

  // ---- helpers the UI needs ----
  // Is placing a piggy at (r,c) currently legal given existing placements?
  // `piggies` is a Set/array of "r,c" strings or {r,c} objects.
  function isLegalPlacement(n, region, piggies, r, c) {
    const list = normalizePiggies(piggies);
    for (const p of list) {
      if (p.r === r && p.c === c) return false;
      if (p.r === r) return false;                                   // same row
      if (p.c === c) return false;                                   // same column
      if (region[p.r][p.c] === region[r][c]) return false;           // same region
      if (Math.abs(p.r - r) <= 1 && Math.abs(p.c - c) <= 1) return false; // touching
    }
    return true;
  }
  function normalizePiggies(piggies) {
    const arr = Array.isArray(piggies) ? piggies : [...piggies];
    return arr.map((p) => (typeof p === 'string' ? { r: +p.split(',')[0], c: +p.split(',')[1] } : p));
  }
  function isSolved(n, region, piggies) {
    const list = normalizePiggies(piggies);
    if (list.length !== n) return false;
    for (let i = 0; i < list.length; i++)
      for (let j = i + 1; j < list.length; j++)
        if (!pairOk(region, list[i], list[j])) return false;
    return true;
  }
  function pairOk(region, a, b) {
    if (a.r === b.r || a.c === b.c) return false;
    if (region[a.r][a.c] === region[b.r][b.c]) return false;
    if (Math.abs(a.r - b.r) <= 1 && Math.abs(a.c - b.c) <= 1) return false;
    return true;
  }

  const Sowdoku = {
    makeRng, generateSolution, growRegions, countSolutions,
    makeSolver, rate, generate, isLegalPlacement, isSolved,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = Sowdoku;
  else root.Sowdoku = Sowdoku;
})(typeof self !== 'undefined' ? self : this);
