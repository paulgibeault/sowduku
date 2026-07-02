// Targeted checks for the two real bugs found in code review after the
// initial B3 implementation: replayBoard() dropping campaign identity, and
// "walk it again" (create sheet) ignoring a done pack's authored assist.
const { chromium } = require("/Users/paulgibeault/work/paulgibeault.github.io/node_modules/playwright");
const BASE = "http://localhost:8934";

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

const SOLUTIONS = {
  "6s-1":   [[0,4],[2,3],[3,1],[1,0],[4,5],[5,2]],
  "6s-6":   [[2,4],[0,5],[5,3],[4,0],[3,2],[1,1]],
  "6m-8z":  [[4,5],[3,1],[2,3],[1,0],[0,4],[5,2]],
  "6m-1":   [[0,2],[1,5],[2,1],[3,3],[4,0],[5,4]],
  "7m-2":   [[5,3],[3,2],[6,1],[0,5],[1,0],[4,6],[2,4]],
  "7m-2ix": [[5,0],[4,6],[3,4],[2,2],[1,5],[6,3],[0,1]],
};
async function solveField(page, code) {
  for (const [r, c] of SOLUTIONS[code]) await page.click('[data-r="' + r + '"][data-c="' + c + '"]');
}

async function run() {
  const browser = await chromium.launch();

  // ---- fix 1: replaying a campaign field from the recent tab keeps its pack identity ----
  {
    console.log("\n[fix1] replayBoard() forwards campaignPack/campaignCode");
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await gotoAndDismissIntro(page); // fresh profile -> lands on intro field 1 (6s-1)
    await solveField(page, "6s-1");
    await page.waitForSelector("#veil.show");
    await page.click('#veilBtns button:has-text("pause the trail")'); // don't advance the pack, just record the win
    await page.waitForFunction(() => !document.getElementById("veil").classList.contains("show"));
    // now replay 6s-1 from the recent history tab
    await page.click("#historyBtn");
    await page.waitForSelector(".hcard");
    await page.click('.hcard [data-act="replay"]');
    await page.waitForFunction(() => document.getElementById("codeChip").textContent.trim() === "6s-1");
    const climb = await page.textContent("#climbChip");
    ok(climb.trim() === "field 1/6", "replayed campaign field shows correct climb chip, got " + climb);
    // solving it again via replay should credit the pack (not silently drop it)
    await solveField(page, "6s-1");
    await page.waitForSelector("#veil.show");
    const veilText = await page.textContent("#veilText");
    ok(veilText.includes("first steps"), "veil after replaying+solving credits the 'first steps' pack, got: " + veilText);
    await ctx.close();
  }

  // ---- fix 2: "walk it again" via the create sheet honors the pack's authored assist ----
  {
    console.log("\n[fix2] create-sheet walk-it-again uses field 1's authored assist");
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await gotoAndDismissIntro(page);
    // set the player's generic default assist to "off" explicitly, distinct from field 1's authored "on"
    await page.click("#newBtn");
    await page.waitForSelector("#createBack:not([hidden])");
    await page.click('#cMode button[data-mode="amble"]');
    await page.click('#cAssist button[data-assist="off"]');
    await page.click("#cCancel"); // don't actually tend it, just wanted the default saved... but assist only saves on tend
    await page.click("#newBtn");
    await page.click('#cMode button[data-mode="amble"]');
    await page.click('#cAssist button[data-assist="off"]');
    await page.click("#cTend");
    await page.waitForSelector(".board .cell");
    // now blitz through the whole intro pack to reach "done"
    await page.click("#newBtn");
    await page.click('#cMode button[data-mode="campaign"]');
    await page.click('#cPack button[data-pack="intro"]');
    await page.click("#cTend");
    const order = ["6s-1", "6s-6", "6m-8z", "6m-1", "7m-2", "7m-2ix"];
    for (let i = 0; i < order.length; i++) {
      await page.waitForFunction((c) => document.getElementById("codeChip").textContent.trim() === c, order[i]);
      await solveField(page, order[i]);
      await page.waitForSelector("#veil.show", { timeout: 5000 });
      if (i < order.length - 1) await page.click('#veilBtns button:has-text("next field")');
    }
    await page.click('#veilBtns button:has-text("a fresh amble")');
    await page.waitForFunction(() => !document.getElementById("veil").classList.contains("show"));
    // pack is now done; open create sheet, select intro pack, "walk it again"
    await page.click("#newBtn");
    await page.waitForSelector("#createBack:not([hidden])");
    await page.click('#cMode button[data-mode="campaign"]');
    await page.click('#cPack button[data-pack="intro"]');
    const assistShown = await page.locator('#cAssist button[data-assist="on"].on').count();
    ok(assistShown === 1, "assist row pre-fills 'on' (field 1's authored value) for a done pack, not the player's 'off' default");
    await page.click("#cTend"); // "walk it again"
    await page.waitForFunction(() => document.getElementById("codeChip").textContent.trim() === "6s-1");
    const savedAssist = await page.evaluate(() => JSON.parse(localStorage.getItem("arcade.v1.sowduku.assist")));
    // this is a forced/suggested value applied via create-sheet's explicit opts.assist path,
    // so per existing semantics it DOES become the new saved default (same as any create-sheet choice)
    ok(savedAssist === "on", "walking the pack again starts field 1 with assist=on (its authored value), got " + savedAssist);
    await ctx.close();
  }

  await browser.close();
  console.log("\n" + pass + " passed, " + fail + " failed");
  process.exit(fail ? 1 : 0);
}

run().catch(e => { console.error(e); process.exit(1); });
