// Stakes ride the difficulty slider — one notch decides both how knotty the
// field is and what a mistake costs.
//
// This is the regression guard for that mapping, and it exists because the
// failure it prevents is silent: B7.2 removed the ⚙ menu's stakes row and left
// every fresh profile pinned to "gentle", whose only cost is an outright
// illegal patch — which the default assist already prevents. The result was a
// game that docked a heart for nothing, at any difficulty, and nothing failed
// to say so. Only a test that plays a wrong move and counts hearts can tell.
//
// Each tier is checked by the rule that DISTINGUISHES it from the one below,
// not merely by reading the stored value back — a stakes string in storage
// proves nothing about whether a heart actually moves.

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

/** Tend a specific field, optionally forcing the assist choice. */
async function tend(page, code, assist) {
  await page.click("#newBtn");
  await page.waitForSelector("#createBack:not([hidden])");
  await page.fill("#cSeed", code);
  if (assist) await page.click(`#cAssist button[data-assist="${assist}"]`);
  await page.click("#cTend");
  await page.waitForSelector(".board .cell");
}

const save = (page) => page.evaluate(() =>
  JSON.parse(localStorage.getItem("arcade.v1.sowduku.inProgress")));
const hearts = (page) => page.locator("#hearts img.heart:not(.lost)").count();

// row 0's solution column, and any other column in that row
async function cols(page) {
  const s = await save(page);
  const right = s.solution[0];
  return { right, wrong: right === 0 ? 1 : 0 };
}

// band char -> the tier that band is played at
const BANDS = [
  { code: "6s-1", band: "sunbeam", stakes: "slow" },
  { code: "6m-1", band: "meadow",  stakes: "gentle" },
  { code: "6h-1", band: "hilltop", stakes: "honest" },
  { code: "6c-1", band: "crag",    stakes: "stern" },
];

async function run() {
  const browser = await chromium.launch();

  // ---- the mapping itself ----
  {
    console.log("\n[mapping] each difficulty band is played at its own tier");
    for (const b of BANDS) {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await gotoAndDismissIntro(page);
      await tend(page, b.code);
      const s = await save(page);
      ok(s.stakes === b.stakes, `${b.band} plays at ${b.stakes}, got ${s.stakes}`);
      await ctx.close();
    }
  }

  // ---- the honest threshold: where a wrong guess starts costing ----
  // The single most important line in the mapping. Below it a wrong-but-legal
  // patch is free; at and above it, it costs — assist or no assist, because
  // assist cannot tell you which legal patch is the right one.
  {
    console.log("\n[honest threshold] a wrong-but-legal patch costs a heart from hilltop up");
    for (const b of BANDS) {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await gotoAndDismissIntro(page);
      await tend(page, b.code);
      const { wrong } = await cols(page);
      const before = await hearts(page);
      await page.click(`[data-r="0"][data-c="${wrong}"]`);
      await page.waitForTimeout(300);
      const after = await hearts(page);
      const shouldDock = b.stakes === "honest" || b.stakes === "stern";
      ok(after === before - (shouldDock ? 1 : 0),
         `${b.band}: wrong-but-legal patch ${shouldDock ? "docks" : "is free"}, ${before} -> ${after}`);
      await ctx.close();
    }
  }

  // ---- slow really means no failure state at all ----
  {
    console.log("\n[sunbeam] nothing is at stake — not even an illegal patch");
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await gotoAndDismissIntro(page);
    await tend(page, "6s-1", "off");   // assist off, so illegal patches reach the docking path
    const { right } = await cols(page);
    await page.click(`[data-r="0"][data-c="${right}"]`);
    await page.waitForTimeout(250);
    const before = await hearts(page);
    await page.click(`[data-r="1"][data-c="${right}"]`); // same column — illegal
    await page.waitForTimeout(300);
    ok((await hearts(page)) === before, `an illegal patch is still free on sunbeam, stayed at ${before}`);
    await ctx.close();
  }

  // ---- gentle docks for an illegal patch, once assist isn't shielding it ----
  {
    console.log("\n[meadow] an illegal patch costs a heart when assist is off");
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await gotoAndDismissIntro(page);
    await tend(page, "6m-1", "off");
    const { right } = await cols(page);
    await page.click(`[data-r="0"][data-c="${right}"]`);
    await page.waitForTimeout(250);
    const before = await hearts(page);
    await page.click(`[data-r="1"][data-c="${right}"]`);
    await page.waitForTimeout(300);
    ok((await hearts(page)) === before - 1, `illegal patch docks on meadow, ${before} -> ${await hearts(page)}`);
    await ctx.close();
  }
  {
    // …and with assist ON the same move is prevented rather than punished.
    // Deliberate, not an oversight: assist hatches cells a pen can no longer
    // use, so the move it blocks is one you were already shown you couldn't make.
    console.log("\n[meadow] assist shields that same patch instead of charging for it");
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await gotoAndDismissIntro(page);
    await tend(page, "6m-1", "on");
    const { right } = await cols(page);
    await page.click(`[data-r="0"][data-c="${right}"]`);
    await page.waitForTimeout(250);
    const before = await hearts(page);
    await page.click(`[data-r="1"][data-c="${right}"]`);
    await page.waitForTimeout(300);
    ok((await hearts(page)) === before, `assist shields the illegal patch, stayed at ${before}`);
    await ctx.close();
  }

  // ---- stern's own rule: a fence over a patch a piggy wanted ----
  //
  // The board size matters here and the pair is chosen deliberately. Honest
  // already docks for a fence that STARVES a pen, and on a small board fencing
  // one cell often does exactly that — on 6h-1 and 9h-1 it does, so those would
  // "prove" a stern rule that was really the honest one firing. 7h-1 is a board
  // where this particular fence starves nothing, so a dock there could only
  // come from stern. If this ever fails, check whether the fence started
  // starving a pen before concluding the mapping broke.
  {
    console.log("\n[crag] fencing a right patch costs a heart; hilltop lets it go");
    for (const b of [{ code: "7h-1", band: "hilltop", stakes: "honest" },
                     { code: "7c-1", band: "crag",    stakes: "stern" }]) {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await gotoAndDismissIntro(page);
      await tend(page, b.code);
      const { right } = await cols(page);
      const before = await hearts(page);
      await page.click(`[data-r="0"][data-c="${right}"]`, { button: "right" });
      await page.waitForTimeout(350);
      const after = await hearts(page);
      const shouldDock = b.stakes === "stern";
      ok(after === before - (shouldDock ? 1 : 0),
         `${b.band}: fence over a right patch ${shouldDock ? "docks" : "is free"}, ${before} -> ${after}`);
      await ctx.close();
    }
  }

  // ---- one slip never costs more than one heart ----
  {
    console.log("\n[gesture cap] a painted run of wrong marks still costs at most one");
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await gotoAndDismissIntro(page);
    await tend(page, "6c-1");
    const before = await hearts(page);
    const { wrong } = await cols(page);
    await page.click(`[data-r="0"][data-c="${wrong}"]`);
    await page.waitForTimeout(300);
    ok((await hearts(page)) === before - 1, `a single wrong patch costs exactly one heart on crag`);
    await ctx.close();
  }

  // ---- the create sheet says what the notch costs ----
  {
    console.log("\n[create sheet] the slider shows the cost, not just the layout");
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await gotoAndDismissIntro(page);
    await page.click("#newBtn");
    await page.waitForSelector("#createBack:not([hidden])");
    for (const b of BANDS) {
      await page.fill("#cSeed", b.code);
      await page.waitForTimeout(150);
      const note = (await page.textContent("#cStakes")).trim();
      ok(note.length > "hearts:".length, `${b.band} shows a stakes note: ${note}`);
    }
    await ctx.close();
  }

  // ---- a run's floor: the gauntlet must be losable from field one ----
  {
    console.log("\n[gauntlet floor] the opening meadow is lifted to honest");
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await gotoAndDismissIntro(page);
    await page.click("#trailsBtn");
    await page.click('#tPack button[data-pack="gauntlet"]');
    await page.click("#tTend");
    await page.waitForSelector(".board .cell");
    const s = await save(page);
    ok(s.reqDifficulty === "meadow", "the run opens on a meadow field, got " + s.reqDifficulty);
    ok(s.stakes === "honest", "…played at honest, not the meadow band's gentle, got " + s.stakes);
    const { wrong } = await cols(page);
    const before = await hearts(page);
    await page.click(`[data-r="0"][data-c="${wrong}"]`);
    await page.waitForTimeout(300);
    ok((await hearts(page)) === before - 1,
       `a wrong patch costs one of the run's shared hearts, ${before} -> ${await hearts(page)}`);
    await ctx.close();
  }
  {
    // the same field tended on its own is NOT under the run policy
    console.log("\n[gauntlet floor] the same field tended standalone keeps its band's tier");
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await gotoAndDismissIntro(page);
    await tend(page, "7m-1");
    const s = await save(page);
    ok(s.stakes === "gentle", "standalone 7m-1 plays at its meadow band's gentle, got " + s.stakes);
    await ctx.close();
  }

  await browser.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

run();
