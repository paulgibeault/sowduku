// Targeted checks for the three bugs a second code-review round caught after
// the trails/declutter/history-fidelity rework: the Trails sheet was missing
// from the click-outside-to-close and Escape-key dismissal wiring every other
// sheet gets, and toggleCurate()/replayBoard() didn't carry a curated campaign
// field's own campaignPack, so replaying (or exporting-then-replaying) a
// curated campaign-mode field silently dropped it into no pack at all.
const { chromium } = require("/Users/paulgibeault/work/paulgibeault.github.io/node_modules/playwright");
const BASE = "http://localhost:8934";
const SOL_6S1 = [[0,4],[2,3],[3,1],[1,0],[4,5],[5,2]];

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

async function run() {
  const browser = await chromium.launch();

  // ---- trails sheet: click-outside and Escape both dismiss it ----
  {
    console.log("\n[trails dismiss] click-outside and Escape both close #trailsBack");
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await gotoAndDismissIntro(page);

    await page.click("#trailsBtn");
    await page.waitForSelector("#trailsBack:not([hidden])");
    await page.click("#trailsBack", { position: { x: 5, y: 5 } }); // the backdrop, not the card
    const hiddenAfterClick = await page.getAttribute("#trailsBack", "hidden");
    ok(hiddenAfterClick !== null, "clicking the trails backdrop closes it");

    await page.click("#trailsBtn");
    await page.waitForSelector("#trailsBack:not([hidden])");
    await page.keyboard.press("Escape");
    const hiddenAfterEsc = await page.getAttribute("#trailsBack", "hidden");
    ok(hiddenAfterEsc !== null, "Escape closes the trails sheet");
    await ctx.close();
  }

  // ---- curating a campaign-mode field carries its pack; replaying it credits that pack ----
  {
    console.log("\n[curate+replay campaign field] pack identity survives curate -> replay");
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await gotoAndDismissIntro(page); // fresh profile -> lands on intro pack field 1 (6s-1)
    for (const [r, c] of SOL_6S1) await page.click('[data-r="' + r + '"][data-c="' + c + '"]');
    await page.waitForSelector("#veil.show");
    await page.click('#veilBtns button:has-text("pause the trail")'); // records the win, doesn't advance the pack
    await page.waitForFunction(() => !document.getElementById("veil").classList.contains("show"));

    await page.click("#historyBtn");
    await page.waitForSelector(".hcard");
    await page.click('.hcard [data-act="curate"]');
    const curated = await page.evaluate(() => JSON.parse(localStorage.getItem("arcade.v1.sowduku.curated")));
    ok(curated[0].campaignPack === "intro", "curated campaign-mode entry stores campaignPack=intro, got " + curated[0].campaignPack);

    // replay it from the curated tab and confirm the pack gets credited on a solve
    await page.click('#hTabs button[data-tab="curated"]');
    await page.waitForSelector(".hcard");
    await page.click('.hcard [data-act="replay"]');
    await page.waitForFunction(() => document.getElementById("codeChip").textContent.trim() === "6s-1");
    const climb = await page.textContent("#climbChip");
    ok(climb.trim() === "field 1/6", "replayed curated campaign field shows correct climb chip, got " + climb);
    for (const [r, c] of SOL_6S1) await page.click('[data-r="' + r + '"][data-c="' + c + '"]');
    await page.waitForSelector("#veil.show");
    const veilText = await page.textContent("#veilText");
    ok(veilText.includes("first steps"), "solving the replayed field credits the 'first steps' pack, got: " + veilText);
    await ctx.close();
  }

  await browser.close();
  console.log("\n" + pass + " passed, " + fail + " failed");
  process.exit(fail ? 1 : 0);
}

run().catch(e => { console.error(e); process.exit(1); });
