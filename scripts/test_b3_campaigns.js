// B3 (campaign packs) regression + new-coverage suite. Run against a local
// static server: `python3 -m http.server 8934` from the repo root, then
// `node scripts/test_b3_campaigns.js`. Not wired into any CI — this repo has
// no committed test runner; recreated per B3's plan note that prior sessions'
// Playwright scripts were session-scratch and never landed in the repo.
const { chromium, webkit } = require("/Users/paulgibeault/work/paulgibeault.github.io/node_modules/playwright");

const BASE = "http://localhost:8934";

// solver traces for the six intro-pack fields, captured by
// scripts/verify_intro_seeds.js — each is a full list of the puzzle's
// solution cells (order doesn't matter: solution cells are always mutually
// legal against each other, regardless of placement order).
const SOLUTIONS = {
  "6s-1":   [[0,4],[2,3],[3,1],[1,0],[4,5],[5,2]],
  "6s-6":   [[2,4],[0,5],[5,3],[4,0],[3,2],[1,1]],
  "6m-8z":  [[4,5],[3,1],[2,3],[1,0],[0,4],[5,2]],
  "6m-1":   [[0,2],[1,5],[2,1],[3,3],[4,0],[5,4]],
  "7m-2":   [[5,3],[3,2],[6,1],[0,5],[1,0],[4,6],[2,4]],
  "7m-2ix": [[5,0],[4,6],[3,4],[2,2],[1,5],[6,3],[0,1]],
};

let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; console.log("  ok - " + msg); }
  else { fail++; console.log("  FAIL - " + msg); }
}

async function solveCurrentField(page, code) {
  const cells = SOLUTIONS[code];
  if (!cells) throw new Error("no known solution for " + code);
  for (const [r, c] of cells) {
    await page.click('[data-r="' + r + '"][data-c="' + c + '"]');
  }
}

async function freshPage(browser) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  return { ctx, page };
}

// navigate + wait for the board, then dismiss the first-run how-to-play
// sheet if it auto-opened (every fresh profile hits this) — most tests here
// care about something else and just need it out of the way.
async function gotoAndDismissIntro(page) {
  await page.goto(BASE + "/index.html");
  await page.waitForSelector(".board .cell");
  const infoHidden = await page.getAttribute("#infoBack", "hidden");
  if (infoHidden === null) await page.click("#infoClose");
}

async function run() {
  const browser = await chromium.launch();

  // ---- 1. fresh profile: routed to intro pack field 1, how-to-play auto-opens ----
  {
    console.log("\n[1] fresh profile boot -> intro pack field 1");
    const { ctx, page } = await freshPage(browser);
    await page.goto(BASE + "/index.html");
    await page.waitForSelector(".board .cell");
    const code = await page.textContent("#codeChip");
    ok(code.trim() === "6s-1", "fresh profile starts on 6s-1, got " + code);
    const climb = await page.textContent("#climbChip");
    ok(climb.trim() === "field 1/6", "climb chip reads field 1/6, got " + climb);
    const infoHidden = await page.getAttribute("#infoBack", "hidden");
    ok(infoHidden === null, "how-to-play sheet auto-opened on top");
    const teach = await page.textContent("#teachNote");
    ok(teach.includes("Tap a cell to settle"), "teaching note shows field 1's lesson, got: " + teach);
    await ctx.close();
  }

  // ---- 2. existing player: NOT routed to intro, no auto-open ----
  {
    console.log("\n[2] existing-player profile untouched");
    const { ctx, page } = await freshPage(browser);
    await page.addInitScript(() => {
      localStorage.setItem("arcade.v1.sowduku.stats", JSON.stringify({ played: 3, solved: 2, mistakes: 1, playMs: 1000 }));
    });
    await page.goto(BASE + "/index.html");
    await page.waitForSelector(".board .cell");
    const code = await page.textContent("#codeChip");
    ok(code.trim() !== "6s-1", "existing player does NOT start on 6s-1, got " + code);
    const infoHidden = await page.getAttribute("#infoBack", "hidden");
    ok(infoHidden !== null, "how-to-play sheet did NOT auto-open for a returning player");
    await ctx.close();
  }

  // ---- 3/4. create sheet: campaign mode, pack picker, WYSIWYG preview ----
  {
    console.log("\n[3/4] create sheet campaign mode + pack picker + WYSIWYG preview");
    const { ctx, page } = await freshPage(browser);
    await gotoAndDismissIntro(page);
    await page.click("#newBtn");
    await page.waitForSelector("#createBack:not([hidden])");
    await page.click('#cMode button[data-mode="campaign"]');
    await page.waitForSelector("#cPackRow:not([hidden])");
    const packBtns = await page.$$eval("#cPack button", bs => bs.map(b => b.textContent.trim()));
    ok(packBtns.some(t => t.startsWith("first steps")), "pack picker lists 'first steps', got " + JSON.stringify(packBtns));
    ok(packBtns.some(t => t.startsWith("my trail")), "pack picker lists 'my trail', got " + JSON.stringify(packBtns));
    ok(packBtns.find(t => t.startsWith("first steps")).includes("0/6"), "'first steps' shows 0/6 progress");
    ok(packBtns.find(t => t.startsWith("my trail")).includes("0/0"), "'my trail' shows 0/0 (empty)");
    // size/diff/seed/surprise hidden for campaign mode
    ok(await page.getAttribute("#cSizeRow", "hidden") !== null, "size row hidden for campaign");
    ok(await page.getAttribute("#cSeedRow", "hidden") !== null, "seed row hidden for campaign");
    // preview should show field 1 (6s-1)
    const previewCode = await page.textContent("#cCode");
    ok(previewCode.trim() === "6s-1", "create-sheet preview shows 6s-1, got " + previewCode);
    // tend it, confirm WYSIWYG: the field actually started matches the preview
    await page.click("#cTend");
    await page.waitForSelector(".board .cell");
    const startedCode = await page.textContent("#codeChip");
    ok(startedCode.trim() === "6s-1", "tending campaign mode starts exactly the previewed field, got " + startedCode);
    await ctx.close();
  }

  // ---- 5/6. teaching note survives reload; win veil advances within pack ----
  {
    console.log("\n[5/6] teaching note survives reload + win veil pack advance");
    const { ctx, page } = await freshPage(browser);
    await gotoAndDismissIntro(page); // fresh profile -> lands on 6s-1 already
    await page.reload();
    await page.waitForSelector(".board .cell");
    const teachAfterReload = await page.textContent("#teachNote");
    ok(teachAfterReload.includes("Tap a cell to settle"), "teaching note survives reload");

    await solveCurrentField(page, "6s-1");
    await page.waitForSelector("#veil.show", { timeout: 5000 });
    const veilText = await page.textContent("#veilText");
    ok(veilText.includes("1 of 6"), "win veil shows 1 of 6 tended, got: " + veilText);
    // preview shown for the next field (6s-6)
    const nextPreviewCode = await page.textContent("#vPreviewCode");
    ok(nextPreviewCode.trim() === "6s-6", "veil previews next field 6s-6, got " + nextPreviewCode);
    await page.click('#veilBtns button:has-text("next field")');
    await page.waitForSelector(".board .cell:not(.reveal)");
    await page.waitForFunction(() => document.getElementById("codeChip").textContent.trim() === "6s-6");
    const advancedCode = await page.textContent("#codeChip");
    ok(advancedCode.trim() === "6s-6", "advanced to exactly the previewed field, got " + advancedCode);
    const climb2 = await page.textContent("#climbChip");
    ok(climb2.trim() === "field 2/6", "climb chip now field 2/6, got " + climb2);
    await ctx.close();
  }

  // ---- 7. full pack completion -> "walk it again" ----
  {
    console.log("\n[7] full intro pack completion");
    const { ctx, page } = await freshPage(browser);
    await gotoAndDismissIntro(page);
    const order = ["6s-1", "6s-6", "6m-8z", "6m-1", "7m-2", "7m-2ix"];
    for (let i = 0; i < order.length; i++) {
      await page.waitForFunction((c) => document.getElementById("codeChip").textContent.trim() === c, order[i]);
      await solveCurrentField(page, order[i]);
      await page.waitForSelector("#veil.show", { timeout: 5000 });
      if (i < order.length - 1) {
        await page.click('#veilBtns button:has-text("next field")');
      }
    }
    const veilText = await page.textContent("#veilText");
    ok(veilText.includes("Every first steps field tended"), "final win veil announces the whole pack done, got: " + veilText);
    const hasWalkAgain = await page.locator('#veilBtns button:has-text("walk it again")').count();
    ok(hasWalkAgain === 1, "veil offers 'walk it again' once the pack is fully tended");
    // create sheet should also reflect pack-complete state now
    await page.click('#veilBtns button:has-text("a fresh amble")');
    await page.waitForFunction(() => !document.getElementById("veil").classList.contains("show"));
    await page.click("#newBtn");
    await page.waitForSelector("#createBack:not([hidden])");
    await page.click('#cMode button[data-mode="campaign"]');
    await page.waitForSelector("#cPackRow:not([hidden])");
    await page.click('#cPack button[data-pack="intro"]');
    const tendLabel = await page.textContent("#cTend");
    ok(tendLabel.trim() === "walk it again", "create sheet's tend button reads 'walk it again' for a done pack, got " + tendLabel);
    await ctx.close();
  }

  // ---- 8. campaignDone migration from old flat array ----
  {
    console.log("\n[8] campaignDone flat-array migration");
    const { ctx, page } = await freshPage(browser);
    await page.addInitScript(() => {
      // simulate a pre-B3 save: curated list with one field + old flat campaignDone array
      localStorage.setItem("arcade.v1.sowduku.curated", JSON.stringify([
        { code: "6s-1", name: "old favorite", size: 6, seed: 1, reqDifficulty: "sunbeam", band: "sunbeam", addedAt: 1 }
      ]));
      localStorage.setItem("arcade.v1.sowduku.campaignDone", JSON.stringify(["6s-1"]));
      localStorage.setItem("arcade.v1.sowduku.stats", JSON.stringify({ played: 1, solved: 1, mistakes: 0, playMs: 100 }));
    });
    await page.goto(BASE + "/index.html");
    await page.waitForSelector(".board .cell");
    await page.click("#historyBtn");
    await page.click('#hTabs button[data-tab="curated"]');
    await page.waitForSelector(".hcard");
    const badge = await page.locator(".hcard .tended").count();
    ok(badge === 1, "migrated per-pack progress still marks the old curated field as tended");
    const migrated = await page.evaluate(() => JSON.parse(localStorage.getItem("arcade.v1.sowduku.campaignDone")));
    ok(!Array.isArray(migrated) && Array.isArray(migrated.curated) && migrated.curated.includes("6s-1"),
       "campaignDone migrated flat array -> {curated:[...]}, got " + JSON.stringify(migrated));
    await ctx.close();
  }

  // ---- 9. curated-tab campaign bar ("my trail") still works ----
  {
    console.log("\n[9] curated-tab campaign bar");
    const { ctx, page } = await freshPage(browser);
    await gotoAndDismissIntro(page);
    // play (and record) a field first, then curate it from the recent tab
    await solveCurrentField(page, "6s-1");
    await page.waitForSelector("#veil.show");
    await page.click('#veilBtns button:has-text("pause the trail")');
    await page.waitForFunction(() => !document.getElementById("veil").classList.contains("show"));
    await page.click("#historyBtn");
    await page.waitForSelector(".hcard");
    await page.click('.hcard [data-act="curate"]');
    await page.click('#hTabs button[data-tab="curated"]');
    await page.waitForSelector("#campaignBar:not([hidden])");
    const campText = await page.textContent("#campText");
    ok(campText.includes("0") && campText.includes("1"), "campaign bar shows 0 of 1 tended, got " + campText);
    await ctx.close();
  }

  // ---- 10. export pack copies valid JSON that round-trips ----
  {
    console.log("\n[10] export pack JSON");
    const { ctx, page } = await freshPage(browser);
    await ctx.grantPermissions(["clipboard-read", "clipboard-write"]);
    await gotoAndDismissIntro(page);
    await solveCurrentField(page, "6s-1");
    await page.waitForSelector("#veil.show");
    await page.click('#veilBtns button:has-text("pause the trail")');
    await page.waitForFunction(() => !document.getElementById("veil").classList.contains("show"));
    await page.click("#historyBtn");
    await page.waitForSelector(".hcard");
    await page.click('.hcard [data-act="curate"]');
    await page.click('#hTabs button[data-tab="curated"]');
    await page.waitForSelector("#campExport:not([disabled])");
    await page.click("#campExport");
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    let parsed = null;
    try { parsed = JSON.parse(clip); } catch (e) {}
    ok(parsed && Array.isArray(parsed.fields) && parsed.fields.length === 1, "export pack clipboard is valid JSON with 1 field, got " + clip);
    ok(parsed && parsed.fields[0].code === "6s-1", "exported field carries the right code");
    // round-trips through parseCode in-page
    const roundTrip = await page.evaluate((code) => {
      var m = /^(10|[6-9])([smhc])-([0-9a-z]+)$/.exec(code);
      return !!m;
    }, parsed.fields[0].code);
    ok(roundTrip, "exported code round-trips through the code regex");
    await ctx.close();
  }

  await browser.close();

  // ---- 11. WebKit spot-check for new sheet rows (house policy) ----
  {
    console.log("\n[11] WebKit spot-check");
    const wk = await webkit.launch();
    const ctx = await wk.newContext();
    const page = await ctx.newPage();
    await gotoAndDismissIntro(page);
    await page.click("#newBtn");
    await page.waitForSelector("#createBack:not([hidden])");
    await page.click('#cMode button[data-mode="campaign"]');
    await page.waitForSelector("#cPackRow:not([hidden])");
    const packRowVisible = await page.isVisible("#cPackRow");
    ok(packRowVisible, "WebKit: pack picker row renders visible");
    const packBtnCount = await page.locator("#cPack button").count();
    ok(packBtnCount === 2, "WebKit: pack picker shows 2 packs, got " + packBtnCount);
    await page.click('#cCancel');
    await page.click("#historyBtn");
    await page.click('#hTabs button[data-tab="curated"]');
    const exportVisible = await page.locator("#campExport").count();
    ok(exportVisible === 1, "WebKit: export-pack button present in DOM");
    await ctx.close();
    await wk.close();
  }

  console.log("\n" + pass + " passed, " + fail + " failed");
  process.exit(fail ? 1 : 0);
}

run().catch(e => { console.error(e); process.exit(1); });
