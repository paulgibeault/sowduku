// Drag-paint: the gesture that lays a run of hoofprints in one stroke.
//
// It had no coverage at all, which is uncomfortable for the hottest input path
// in the game — and it was rewritten for performance (arithmetic hit-testing
// instead of elementFromPoint, one coalesced render per frame instead of one
// per cell), so the behaviour it must not lose is worth pinning down: every
// cell the finger crosses is accounted for, the start cell decides whether the
// stroke marks or erases, piggies are never disturbed, and the whole stroke is
// a single undo step.
const { chromium } = require("../scripts/lib/playwright");
const { BASE } = require("../scripts/lib/base");

let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; console.log("  ok - " + msg); }
  else { fail++; console.log("  FAIL - " + msg); }
}

async function gotoAndDismissIntro(page) {
  await page.goto(BASE + "/index.html");
  await page.waitForSelector(".board .cell");
  const infoHidden = await page.getAttribute("#infoBack", "hidden");
  if (infoHidden === null) await page.click("#infoClose");
}

const size = (page) => page.evaluate(() => document.querySelectorAll('.cell[data-r="0"]').length);

async function centre(page, r, c) {
  return page.evaluate(([r, c]) => {
    const b = document.querySelector('.cell[data-r="' + r + '"][data-c="' + c + '"]').getBoundingClientRect();
    return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
  }, [r, c]);
}

// A real mouse stroke across one row, with `perCell` intermediate moves so the
// pointer genuinely passes through every cell rather than teleporting.
async function dragRow(page, row, fromCol, toCol, perCell = 4) {
  const a = await centre(page, row, fromCol);
  const b = await centre(page, row, toCol);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  const steps = Math.abs(toCol - fromCol) * perCell;
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(a.x + ((b.x - a.x) * i) / steps, a.y + ((b.y - a.y) * i) / steps);
  }
  await page.mouse.up();
  await page.waitForTimeout(120);   // let the coalesced render land
}

const hoofed = (page) => page.evaluate(() =>
  [...document.querySelectorAll(".board .cell")]
    .filter((c) => c.querySelector("img.hoofprint"))
    .map((c) => c.dataset.r + "," + c.dataset.c).sort());

async function run() {
  const browser = await chromium.launch();

  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await gotoAndDismissIntro(page);
    const n = await size(page);

    // ---- every crossed cell gets marked ----
    // No piggy is settled yet, so assist shades nothing and every mark shows.
    await dragRow(page, 3, 0, n - 1);
    const marked = await hoofed(page);
    const want = Array.from({ length: n }, (_, c) => "3," + c).sort();
    ok(marked.length === n, "a stroke across a row of " + n + " marks all " + n + " cells, got " + marked.length);
    ok(JSON.stringify(marked) === JSON.stringify(want),
      "the cells marked are exactly the ones crossed, got " + marked.join(" "));

    // ---- the start cell decides mark-vs-erase ----
    await dragRow(page, 3, 0, n - 1);
    ok((await hoofed(page)).length === 0, "a second stroke from an already-marked start erases the run");

    // ---- one stroke is one undo step ----
    await dragRow(page, 2, 0, n - 1);
    ok((await hoofed(page)).length === n, "third stroke marked row 2");
    await page.click("#undoBtn");
    await page.waitForTimeout(120);
    ok((await hoofed(page)).length === 0, "undo takes back the whole stroke, not one cell");

    await ctx.close();
  }

  {
    // ---- a drag never disturbs a settled piggy ----
    // Once a piggy is down, assist rules cells out, and a ruled-out cell draws
    // its shading instead of any hoofprint under it (render(): "ruled-out
    // overrides a manual hoofprint"). So the invariant to assert is that the
    // stroke left no cell untouched — marked, or already spoken for by assist
    // — not that every cell shows a print.
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await gotoAndDismissIntro(page);
    const n = await size(page);
    await page.click('[data-r="1"][data-c="2"]');            // settle a piggy mid-row
    await page.waitForTimeout(120);
    await dragRow(page, 1, 0, n - 1);

    const row = await page.evaluate(() =>
      [...document.querySelectorAll('.cell[data-r="1"]')].map((c) => ({
        c: +c.dataset.c,
        pig: !!c.querySelector("img.pig"),
        hoof: !!c.querySelector("img.hoofprint"),
        ruledOut: c.classList.contains("shade") || c.classList.contains("starved"),
      })));
    const piggyCell = row.find((x) => x.c === 2);
    const others = row.filter((x) => x.c !== 2);
    ok(piggyCell.pig, "the piggy the stroke crossed is still settled");
    ok(!piggyCell.hoof, "the stroke left no hoofprint on the piggy's cell");
    ok(others.every((x) => x.hoof || x.ruledOut),
      "every other cell the stroke crossed is marked or already ruled out by assist, got " +
        others.map((x) => x.c + (x.hoof ? ":hoof" : x.ruledOut ? ":ruled" : ":PLAIN")).join(" "));
    await ctx.close();
  }

  {
    // ---- the drawing is coalesced, the marking is not ----
    // A full-board rebuild per crossed cell is what made this gesture heavy.
    // A real mouse stroke can't show it: Playwright's moves are far enough
    // apart that each lands in its own frame, where one-render-per-frame and
    // one-render-per-cell are the same thing. The case that matters is a fast
    // finger crossing several cells within a single frame, so deliver the
    // moves in one task — same handlers, same code path, no waiting.
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await gotoAndDismissIntro(page);
    const n = await size(page);
    await page.evaluate(() => {
      // Count records, not callbacks: every mutation from one task is
      // delivered in a single callback, so counting callbacks would read 1
      // whether the board was rebuilt once or six times. Each render() starts
      // with board.innerHTML = "", which is exactly one record carrying
      // removedNodes.
      window.__rebuilds = 0;
      new MutationObserver((recs) => {
        for (const r of recs) if (r.removedNodes.length) window.__rebuilds++;
      }).observe(document.getElementById("board"), { childList: true });
    });
    await page.evaluate((n) => {
      const board = document.getElementById("board");
      const b = board.getBoundingClientRect();
      const cw = b.width / n, chh = b.height / n;
      const at = (r, c) => ({ clientX: b.left + (c + 0.5) * cw, clientY: b.top + (r + 0.5) * chh });
      const mk = (t, p) => new PointerEvent(t, {
        pointerId: 1, pointerType: "mouse", isPrimary: true, bubbles: true,
        cancelable: true, buttons: t === "pointerup" ? 0 : 1, ...p });
      board.querySelector('.cell[data-r="4"][data-c="0"]').dispatchEvent(mk("pointerdown", at(4, 0)));
      for (let c = 1; c < n; c++) board.dispatchEvent(mk("pointermove", at(4, c)));
      board.dispatchEvent(mk("pointerup", at(4, n - 1)));
    }, n);
    await page.waitForTimeout(200);
    const rebuilds = await page.evaluate(() => window.__rebuilds);
    const marks = (await hoofed(page)).length;
    ok(marks === n, "the fast stroke still marked every cell, got " + marks);
    ok(rebuilds <= 3, "a stroke crossing " + n + " cells inside one frame redraws the board " +
      rebuilds + " times (was one redraw per cell)");
    await ctx.close();
  }

  await browser.close();
  console.log("\n" + pass + " passed, " + fail + " failed");
  process.exit(fail ? 1 : 0);
}

run().catch(e => { console.error(e); process.exit(1); });
