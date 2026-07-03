// B4.5: Trails sheet lists every field of the selected pack (order, name,
// size·band, ✓ tended, best score, effort) and any row is selectable out of
// order. Covers: the list renders for both an ordinary pack and a
// heart-policy pack; selecting a row previews+starts exactly that field;
// solving an out-of-order field marks only that field tended (no run
// credit for the gauntlet); re-tapping a selected row falls back to the
// pack's default flow; selection resets when switching packs.
const { chromium } = require("/Users/paulgibeault/work/paulgibeault.github.io/node_modules/playwright");
const BASE = "http://localhost:8934";

const SOLS = {
  "6m-8z": [[4,5],[3,1],[2,3],[1,0],[0,4],[5,2]],
  "8h-1":  [[0,5],[1,7],[2,2],[3,4],[4,6],[5,0],[6,3],[7,1]],
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

async function run() {
  const browser = await chromium.launch();

  // ---- list renders with the right data for an ordinary pack ----
  {
    console.log("\n[field list] renders for 'first steps' with correct row data");
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await gotoAndDismissIntro(page);
    await page.click("#trailsBtn");
    await page.click('#tPack button[data-pack="intro"]');
    const rowCount = await page.locator(".tfrow").count();
    ok(rowCount === 6, "lists all 6 fields of 'first steps', got " + rowCount);
    const row1 = await page.locator('.tfrow[data-code="6s-1"]').textContent();
    ok(row1.includes("settling in") && row1.includes("6×6") && row1.includes("sunbeam"),
       "row 1 shows name + size·band, got: " + row1.trim());
    const row1Num = await page.locator('.tfrow[data-code="6s-1"] .tfnum').textContent();
    ok(row1Num.trim() === "1", "row 1 is numbered 1, got " + row1Num);
    const row1Tended = await page.locator('.tfrow[data-code="6s-1"] .tftended').textContent();
    ok(row1Tended.trim() === "", "untended row shows no checkmark yet, got " + JSON.stringify(row1Tended));
    await ctx.close();
  }

  // ---- list renders for a heart-policy (gauntlet) pack too ----
  {
    console.log("\n[field list] renders for the gauntlet (heart-policy pack)");
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await gotoAndDismissIntro(page);
    await page.click("#trailsBtn");
    await page.click('#tPack button[data-pack="gauntlet"]');
    const rowCount = await page.locator(".tfrow").count();
    ok(rowCount === 3, "lists all 3 fields of the gauntlet, got " + rowCount);
    const row2 = await page.locator('.tfrow[data-code="8h-1"]').textContent();
    ok(row2.includes("field two") && row2.includes("8×8") && row2.includes("hilltop"),
       "row 2 shows name + size·band, got: " + row2.trim());
    await ctx.close();
  }

  // ---- selecting a row previews + starts exactly that field, standalone ----
  {
    console.log("\n[out-of-order select] tapping row 3 previews and tends field 3");
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await gotoAndDismissIntro(page);
    await page.click("#trailsBtn");
    await page.click('#tPack button[data-pack="intro"]');
    await page.click('.tfrow[data-code="6m-8z"]');
    const selectedClass = await page.locator('.tfrow[data-code="6m-8z"]').getAttribute("class");
    ok(selectedClass.includes(" on"), "selected row gets the 'on' highlight");
    const tendLabel = await page.textContent("#tTend");
    ok(tendLabel.trim() === "tend this field", "tend button reads 'tend this field' for an explicit pick, got " + tendLabel);
    const previewCode = await page.textContent("#tCode");
    ok(previewCode.trim() === "leaving hoofprints", "preview shows field 3's name, got " + previewCode);
    await page.click("#tTend");
    await page.waitForSelector(".board .cell");
    const startedCode = await page.textContent("#codeChip");
    ok(startedCode.trim() === "6m-8z", "tending an out-of-order row starts exactly that field, got " + startedCode);
    const climb = await page.textContent("#climbChip");
    ok(climb.trim() === "field 3/6", "climb chip correctly reads field 3/6 even though fields 1-2 are untended, got " + climb);

    // solving it marks only field 3 tended
    await solve(page, "6m-8z");
    await page.waitForSelector("#veil.show");
    const done = await page.evaluate(() => JSON.parse(localStorage.getItem("arcade.v1.sowduku.campaignDone")));
    ok((done.intro || []).length === 1 && done.intro[0] === "6m-8z",
       "solving out of order marks only that field tended, got " + JSON.stringify(done.intro));
    await ctx.close();
  }

  // ---- out-of-order selection on a run pack does NOT credit a run ----
  {
    console.log("\n[out-of-order select] gauntlet field 2 played alone doesn't touch the run pool/credit");
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await gotoAndDismissIntro(page);
    await page.click("#trailsBtn");
    await page.click('#tPack button[data-pack="gauntlet"]');
    await page.click('.tfrow[data-code="8h-1"]');
    const note = await page.textContent("#tProfile");
    ok(note.includes("doesn't count toward a run"), "preview note explains standalone play, got: " + note.trim());
    await page.click("#tTend");
    await page.waitForSelector(".board .cell");
    const startedCode = await page.textContent("#codeChip");
    ok(startedCode.trim() === "8h-1", "starts field 2 directly, not field 1 (no run begun), got " + startedCode);
    const hearts = await page.locator("#hearts img.heart").count();
    ok(hearts === 5, "standalone gauntlet field gets amble's normal 5 hearts, not the run's 3, got " + hearts);
    await solve(page, "8h-1");
    await page.waitForSelector("#veil.show");
    const stats = await page.evaluate(() => JSON.parse(localStorage.getItem("arcade.v1.sowduku.stats")));
    ok(!stats.packCleared || !stats.packCleared.gauntlet, "standalone field solve does not credit a gauntlet run, got " + JSON.stringify(stats.packCleared));
    await ctx.close();
  }

  // ---- re-tapping the selected row falls back to the pack's default ----
  {
    console.log("\n[deselect] tapping the selected row again restores the default flow");
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await gotoAndDismissIntro(page);
    await page.click("#trailsBtn");
    await page.click('#tPack button[data-pack="intro"]');
    await page.click('.tfrow[data-code="6m-1"]');
    let tendLabel = await page.textContent("#tTend");
    ok(tendLabel.trim() === "tend this field", "row selected, tend button set accordingly");
    await page.click('.tfrow[data-code="6m-1"]'); // tap again
    const selectedClass = await page.locator('.tfrow[data-code="6m-1"]').getAttribute("class");
    ok(!selectedClass.includes(" on"), "row no longer shows selected after a second tap");
    const previewCode = await page.textContent("#tCode");
    ok(previewCode.trim() === "settling in", "preview falls back to the default next-untended field (field 1), got " + previewCode);
    await ctx.close();
  }

  // ---- switching packs resets the selection ----
  {
    console.log("\n[pack switch] selecting a field then switching packs clears the selection");
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await gotoAndDismissIntro(page);
    await page.click("#trailsBtn");
    await page.click('#tPack button[data-pack="intro"]');
    await page.click('.tfrow[data-code="6m-1"]');
    await page.click('#tPack button[data-pack="gauntlet"]');
    const tendLabel = await page.textContent("#tTend");
    ok(tendLabel.trim() === "begin the run", "switching packs resets selection back to the new pack's default, got " + tendLabel);
    await ctx.close();
  }

  await browser.close();
  console.log("\n" + pass + " passed, " + fail + " failed");
  process.exit(fail ? 1 : 0);
}

run().catch(e => { console.error(e); process.exit(1); });
