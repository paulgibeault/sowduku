// B6.2: the gauntlet as a heart-policy trail (not a create-sheet mode, not a
// "run pack" with fresh seeds — an ordinary fixed-seed trail with a
// run:{hearts,carry} policy on top). Covers: begin-the-run flow, the shared
// pool carrying across fields, clear-doesn't-refill mid-run, running dry
// ends the whole run (not just the field), clearing the run increments the
// cleared count (length read from the pack, never hardcoded), and standalone
// practice on an individual field staying separate from run credit.
const { chromium } = require("/Users/paulgibeault/work/paulgibeault.github.io/node_modules/playwright");
const BASE = "http://localhost:8934";

const SOLS = {
  "7m-1": [[0,6],[1,4],[2,1],[3,3],[4,0],[5,2],[6,5]],
  "8h-1": [[0,5],[1,7],[2,2],[3,4],[4,6],[5,0],[6,3],[7,1]],
  "9c-1": [[0,3],[1,1],[2,7],[3,0],[4,8],[5,6],[6,4],[7,2],[8,5]],
};

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
async function solve(page, code) {
  for (const [r, c] of SOLS[code]) await page.click('[data-r="' + r + '"][data-c="' + c + '"]');
}
async function keepGoing(page) {
  await page.click('#veilBtns button:has-text("keep going")');
  await page.waitForFunction(() => !document.getElementById("veil").classList.contains("show"));
}

async function run() {
  const browser = await chromium.launch();

  // ---- gauntlet not reachable from the create sheet ----
  {
    console.log("\n[not in create sheet] gauntlet only lives in Trails");
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await gotoAndDismissIntro(page);
    await page.click("#newBtn");
    await page.waitForSelector("#createBack:not([hidden])");
    const count = await page.locator('[data-mode="gauntlet"]').count();
    ok(count === 0, "no gauntlet control anywhere in the create sheet");
    await ctx.close();
  }

  // ---- Trails sheet: pack shows "begin the run" + both progress reads ----
  {
    console.log("\n[trails sheet] pack picker + preview for a run-policy pack");
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await gotoAndDismissIntro(page);
    await page.click("#trailsBtn");
    await page.waitForSelector("#trailsBack:not([hidden])");
    const packBtns = await page.$$eval("#tPack button", bs => bs.map(b => b.textContent.trim()));
    const gauntletBtn = packBtns.find(t => t.startsWith("the gauntlet"));
    ok(!!gauntletBtn, "pack picker lists 'the gauntlet', got " + JSON.stringify(packBtns));
    ok(gauntletBtn.includes("0/3") && gauntletBtn.includes("cleared 0×"),
       "gauntlet entry shows 0/3 tended and cleared 0×, got " + gauntletBtn);
    await page.click('#tPack button[data-pack="gauntlet"]');
    const tendLabel = await page.textContent("#tTend");
    ok(tendLabel.trim() === "begin the run", "tend button reads 'begin the run', got " + tendLabel);
    const previewName = await page.textContent("#tCode");
    ok(previewName.trim() === "field one", "preview shows field 1 (the run always starts there), got " + previewName);
    await ctx.close();
  }

  // ---- full run: hearts carry, correct fields in order, cleared-count increments ----
  {
    console.log("\n[full run] hearts carry across fields; cleared count increments on completion");
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await gotoAndDismissIntro(page);
    await page.click("#trailsBtn");
    await page.click('#tPack button[data-pack="gauntlet"]');
    await page.click("#tTend");
    await page.waitForSelector(".board .cell");
    let code = (await page.textContent("#codeChip")).trim();
    ok(code === "7m-1", "run starts on field 1 (7m-1), got " + code);
    let hearts = await page.locator("#hearts img.heart").count();
    ok(hearts === 3, "gauntlet's pool is 3 hearts, got " + hearts);

    await solve(page, "7m-1");
    await page.waitForSelector("#veil.show");
    let climb = await page.textContent("#climbChip");
    // climb chip reflects the field just finished until advance
    await keepGoing(page);
    code = (await page.textContent("#codeChip")).trim();
    ok(code === "8h-1", "advances to field 2 (8h-1), got " + code);
    climb = await page.textContent("#climbChip");
    ok(climb.trim() === "field 2/3", "climb chip reads field 2/3, got " + climb);
    const heartsAfterField1 = await page.locator("#hearts img.heart:not(.lost)").count();
    ok(heartsAfterField1 === 3, "hearts still full after a clean field 1, got " + heartsAfterField1);

    await solve(page, "8h-1");
    await page.waitForSelector("#veil.show");
    await keepGoing(page);
    code = (await page.textContent("#codeChip")).trim();
    ok(code === "9c-1", "advances to field 3 (9c-1), got " + code);

    await solve(page, "9c-1");
    await page.waitForSelector("#veil.show");
    const veilText = await page.textContent("#veilText");
    ok(veilText.includes("The gauntlet, cleared"), "veil announces the gauntlet cleared, got: " + veilText.trim());
    const runAgain = await page.locator('#veilBtns button:has-text("run it again")').count();
    ok(runAgain === 1, "veil offers 'run it again' once cleared");

    const stats = await page.evaluate(() => JSON.parse(localStorage.getItem("arcade.v1.sowduku.stats")));
    ok(stats.packCleared && stats.packCleared.gauntlet === 1, "stats.packCleared.gauntlet incremented to 1, got " + JSON.stringify(stats.packCleared));

    const curated = await page.evaluate(() => JSON.parse(localStorage.getItem("arcade.v1.sowduku.campaignDone")));
    ok(curated.gauntlet && curated.gauntlet.length === 3, "all 3 fields individually marked tended too, got " + JSON.stringify(curated.gauntlet));
    await ctx.close();
  }

  // ---- clear doesn't refill mid-run ----
  {
    console.log("\n[clear mid-run] doesn't hand back spent hearts");
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await gotoAndDismissIntro(page);
    await page.click("#trailsBtn");
    await page.click('#tPack button[data-pack="gauntlet"]');
    await page.click("#tTend");
    await page.waitForSelector(".board .cell");
    await page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem("arcade.v1.sowduku.inProgress"));
      s.hearts = 1;
      localStorage.setItem("arcade.v1.sowduku.inProgress", JSON.stringify(s));
    });
    await page.reload();
    await page.waitForSelector(".board .cell");
    await page.click('[data-r="6"][data-c="5"]'); // 7m-1's actual row-6 solution — a clean, non-docking placement
    await page.click("#clearBtn"); await page.click("#clearBtn");
    await page.waitForTimeout(200);
    const heartsAfterClear = await page.locator("#hearts img.heart:not(.lost)").count();
    ok(heartsAfterClear === 1, "clear mid-run does not refill hearts, stayed at " + heartsAfterClear);
    await ctx.close();
  }

  // ---- running dry ends the whole run, not just the field ----
  {
    console.log("\n[run dry] ends the whole run with the right copy + button");
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await gotoAndDismissIntro(page);
    await page.click("#menuBtn");
    await page.click('#stakesSeg button[data-stakes="honest"]');
    await page.click("#menuBtn");
    await page.click("#trailsBtn");
    await page.click('#tPack button[data-pack="gauntlet"]');
    await page.click("#tTend");
    await page.waitForSelector(".board .cell");
    await page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem("arcade.v1.sowduku.inProgress"));
      s.hearts = 1;
      localStorage.setItem("arcade.v1.sowduku.inProgress", JSON.stringify(s));
    });
    await page.reload();
    await page.waitForSelector(".board .cell");
    await page.click('[data-r="0"][data-c="0"]'); // wrong vs 7m-1's row-0 solution (col6) under honest stakes -> docks the last heart
    await page.waitForSelector("#veil.show", { timeout: 5000 });
    const veilTitle = await page.textContent("#veilTitle");
    ok(veilTitle.trim() === "The gauntlet ends here.", "fail veil title reads correctly (no double 'the'), got " + veilTitle.trim());
    const veilText = await page.textContent("#veilText");
    ok(veilText.includes("Field 1 of 3"), "fail veil names the field the run ended on, got: " + veilText.trim());
    const runAgain = await page.locator('#veilBtns button:has-text("run it again")').count();
    ok(runAgain === 1, "fail veil offers 'run it again'");
    const freshStart = await page.locator('#veilBtns button:has-text("fresh start")').count();
    ok(freshStart === 0, "fail veil does NOT offer the generic 'fresh start' (that would just retry the same field)");
    await ctx.close();
  }

  // ---- standalone practice on one field: fresh hearts, ✓ on solve, no run credit ----
  {
    console.log("\n[standalone practice] one gauntlet field played alone doesn't count as a run");
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await gotoAndDismissIntro(page);
    await page.click("#trailsBtn");
    await page.click('#tPack button[data-pack="gauntlet"]');
    // solve the run once for real first so field 3 (9c-1) already has a ✓,
    // then replay it standalone via history and confirm no double-count
    await page.click("#tTend");
    await page.waitForSelector(".board .cell");
    await solve(page, "7m-1");
    await page.waitForSelector("#veil.show");
    await keepGoing(page);
    await solve(page, "8h-1");
    await page.waitForSelector("#veil.show");
    await keepGoing(page);
    await solve(page, "9c-1");
    await page.waitForSelector("#veil.show");
    await page.click('#veilBtns button:has-text("a fresh amble")');
    await page.waitForFunction(() => !document.getElementById("veil").classList.contains("show"));

    // now open trails again and select field 1 individually would need
    // B4.5's field list (not built yet) — approximate standalone practice
    // via a direct replay of a gauntlet-pack history record instead, which
    // exercises the same beginCampaignField() path (no forcedInRun/carry).
    await page.click("#historyBtn");
    await page.waitForSelector(".hcard");
    const firstCard = page.locator(".hcard", { hasText: "7m-1" }).first();
    await firstCard.locator('[data-act="replay"]').click();
    await page.waitForFunction(() => document.getElementById("codeChip").textContent.trim() === "7m-1");
    const heartsStandalone = await page.locator("#hearts img.heart").count();
    ok(heartsStandalone === 5, "standalone replay of a gauntlet field gets amble's normal 5 hearts, not the run's 3, got " + heartsStandalone);
    await solve(page, "7m-1");
    await page.waitForSelector("#veil.show");
    const veilText = await page.textContent("#veilText");
    ok(!veilText.includes("cleared") && !veilText.includes("hearts steady"),
       "standalone solve shows ordinary trail copy, not run-in-progress copy, got: " + veilText.trim());
    const stats = await page.evaluate(() => JSON.parse(localStorage.getItem("arcade.v1.sowduku.stats")));
    ok(stats.packCleared && stats.packCleared.gauntlet === 1, "standalone practice did NOT bump cleared count past the real run's 1, got " + JSON.stringify(stats.packCleared));
    await ctx.close();
  }

  await browser.close();
  console.log("\n" + pass + " passed, " + fail + " failed");
  process.exit(fail ? 1 : 0);
}

run().catch(e => { console.error(e); process.exit(1); });
