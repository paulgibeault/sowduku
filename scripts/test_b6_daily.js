// B6.4: daily moved out of the create sheet; the status-strip pill is its
// only door now. Covers the semantics change: the pill shows whenever
// today's field is *unsolved* (not just "never touched"), so a
// touched-but-abandoned attempt doesn't lock a player out for the rest of
// the day. Also spot-checks that the create sheet is genuinely tabless.
const { chromium } = require("/Users/paulgibeault/work/paulgibeault.github.io/node_modules/playwright");
const BASE = "http://localhost:8934";

let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; console.log("  ok - " + msg); }
  else { fail++; console.log("  FAIL - " + msg); }
}

async function run() {
  const browser = await chromium.launch();

  // ---- create sheet has no mode selector of any kind, daily isn't reachable there ----
  {
    console.log("\n[no daily in create sheet] tabless form, no daily control");
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(BASE + "/index.html");
    await page.waitForSelector(".board .cell");
    const infoHidden = await page.getAttribute("#infoBack", "hidden");
    if (infoHidden === null) await page.click("#infoClose");
    await page.click("#newBtn");
    await page.waitForSelector("#createBack:not([hidden])");
    const tabsExist = await page.locator("#cTabs").count();
    ok(tabsExist === 0, "no #cTabs element exists");
    const dailyControl = await page.locator('[data-tab="daily"], [data-mode="daily"]').count();
    ok(dailyControl === 0, "no daily control anywhere in the create sheet");
    const weatherVisible = await page.isVisible("#cFogSeg");
    ok(weatherVisible, "weather toggle is the sheet's first row now");
    await ctx.close();
  }

  // ---- pill semantics: shown while unsolved, hidden once solved ----
  {
    console.log("\n[daily pill] pending vs solved semantics");
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    // simulate a returning player so boot lands on today's daily field directly
    await page.addInitScript(() => {
      localStorage.setItem("arcade.v1.sowduku.stats", JSON.stringify({ played: 1, solved: 1, mistakes: 0, playMs: 100 }));
    });
    await page.goto(BASE + "/index.html");
    await page.waitForSelector(".board .cell");
    const infoHidden = await page.getAttribute("#infoBack", "hidden");
    if (infoHidden === null) await page.click("#infoClose");
    const fieldChip = await page.textContent("#fieldChip");
    ok(fieldChip.includes("today"), "returning player boots onto today's daily field, got " + fieldChip);
    const dailyCode = (await page.textContent("#codeChip")).trim();
    let pillHidden = await page.getAttribute("#dailyChip", "hidden");
    ok(pillHidden !== null, "pill hidden while actually on the daily field");

    // switch to a fresh amble field — the daily hasn't been touched at all
    // yet, so the pill should now show (pending)
    await page.click("#newBtn");
    await page.waitForSelector("#createBack:not([hidden])");
    await page.fill("#cSeed", "6s-1");
    await page.click("#cTend");
    await page.waitForSelector(".board .cell");
    pillHidden = await page.getAttribute("#dailyChip", "hidden");
    ok(pillHidden === null, "pill shows once away from an untouched daily field");

    // simulate an *unsolved* attempt at today's daily already in history —
    // under the new semantics this should NOT hide the pill (was: hidden
    // after any touched attempt at all)
    await page.evaluate((code) => {
      const h = JSON.parse(localStorage.getItem("arcade.v1.sowduku.history") || "[]");
      h.unshift({ code, mode: "daily", solved: false, endedAt: Date.now() });
      localStorage.setItem("arcade.v1.sowduku.history", JSON.stringify(h));
    }, dailyCode);
    await page.reload();
    await page.waitForSelector(".board .cell");
    pillHidden = await page.getAttribute("#dailyChip", "hidden");
    ok(pillHidden === null, "pill STILL shows after an unsolved/abandoned daily attempt (new semantics)");

    // now simulate a *solved* record — the pill should hide
    await page.evaluate((code) => {
      const h = JSON.parse(localStorage.getItem("arcade.v1.sowduku.history") || "[]");
      h.unshift({ code, mode: "daily", solved: true, endedAt: Date.now() });
      localStorage.setItem("arcade.v1.sowduku.history", JSON.stringify(h));
    }, dailyCode);
    await page.reload();
    await page.waitForSelector(".board .cell");
    pillHidden = await page.getAttribute("#dailyChip", "hidden");
    ok(pillHidden !== null, "pill hides once today's field has a solved record");
    await ctx.close();
  }

  // ---- pill still opens the daily field on tap ----
  {
    console.log("\n[daily pill] tapping it opens today's field");
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.addInitScript(() => {
      localStorage.setItem("arcade.v1.sowduku.stats", JSON.stringify({ played: 1, solved: 1, mistakes: 0, playMs: 100 }));
    });
    await page.goto(BASE + "/index.html");
    await page.waitForSelector(".board .cell");
    const infoHidden = await page.getAttribute("#infoBack", "hidden");
    if (infoHidden === null) await page.click("#infoClose");
    const dailyCode = (await page.textContent("#codeChip")).trim();
    await page.click("#newBtn");
    await page.waitForSelector("#createBack:not([hidden])");
    await page.fill("#cSeed", "6s-1");
    await page.click("#cTend");
    await page.waitForSelector(".board .cell");
    await page.click("#dailyChip");
    await page.waitForFunction((c) => document.getElementById("codeChip").textContent.trim() === c, dailyCode);
    const fieldChip = await page.textContent("#fieldChip");
    ok(fieldChip.includes("today"), "tapping the pill lands back on today's field");
    await ctx.close();
  }

  await browser.close();
  console.log("\n" + pass + " passed, " + fail + " failed");
  process.exit(fail ? 1 : 0);
}

run().catch(e => { console.error(e); process.exit(1); });
