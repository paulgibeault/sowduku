// History/export fidelity: a starred (curated) field, a replayed history
// card, and an exported pack JSON should all carry assist+stakes so the
// exact run can be faithfully recreated later — not just which board it is.
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
  const ctx = await browser.newContext();
  await ctx.grantPermissions(["clipboard-read", "clipboard-write"]);
  const page = await ctx.newPage();
  await gotoAndDismissIntro(page);

  // set honest stakes + assist off, tend 6s-1, solve it, curate the record
  await page.click("#menuBtn");
  await page.click('#stakesSeg button[data-stakes="honest"]');
  await page.click("#menuBtn");
  await page.click("#newBtn");
  await page.click('#cTabs button[data-tab="amble"]');
  await page.fill("#cSeed", "6s-1");
  await page.click('#cAssist button[data-assist="off"]');
  await page.click("#cTend");
  await page.waitForSelector(".board .cell");
  for (const [r, c] of SOL_6S1) await page.click('[data-r="' + r + '"][data-c="' + c + '"]');
  await page.waitForSelector("#veil.show");
  await page.click('#veilBtns button:has-text("tend another")'); // real state change, clears .show for real
  await page.waitForFunction(() => !document.getElementById("veil").classList.contains("show"));
  await page.click("#historyBtn");
  await page.waitForSelector(".hcard");
  await page.click('.hcard [data-act="curate"]');

  const curated = await page.evaluate(() => JSON.parse(localStorage.getItem("arcade.v1.sowduku.curated")));
  ok(curated[0].assist === "off", "curated entry stores assist=off, got " + curated[0].assist);
  ok(curated[0].stakes === "honest", "curated entry stores stakes=honest, got " + curated[0].stakes);

  // export pack JSON should carry both through
  await page.click('#hTabs button[data-tab="curated"]');
  await page.waitForSelector("#campExport:not([disabled])");
  await page.click("#campExport");
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  const parsed = JSON.parse(clip);
  ok(parsed.fields[0].assist === "off", "exported field carries assist=off");
  ok(parsed.fields[0].stakes === "honest", "exported field carries stakes=honest");

  // now flip the LIVE defaults to the opposite of what was curated, then
  // replay the curated field — it should use its own recorded settings, not
  // whatever the player's current defaults happen to be.
  await page.click("#hClose");
  await page.click("#menuBtn");
  await page.click('#stakesSeg button[data-stakes="gentle"]');
  await page.click("#menuBtn");
  await page.click("#newBtn");
  await page.click('#cTabs button[data-tab="amble"]');
  await page.click('#cAssist button[data-assist="on"]');
  await page.click("#cTend");
  await page.waitForSelector(".board .cell");
  await page.click("#historyBtn");
  await page.click('#hTabs button[data-tab="curated"]');
  await page.waitForSelector(".hcard");
  await page.click('.hcard [data-act="replay"]');
  await page.waitForFunction(() => document.getElementById("codeChip").textContent.trim() === "6s-1");

  await page.click("#menuBtn");
  const stakesOn = await page.locator("#stakesSeg button.on").getAttribute("data-stakes");
  ok(stakesOn === "honest", "replayed field restores stakes=honest (not the live gentle default), got " + stakesOn);
  await page.click("#menuBtn");

  const heartsBefore = await page.locator("#hearts img.heart:not(.lost)").count();
  await page.click('[data-r="0"][data-c="0"]'); // wrong-but-legal for 6s-1 (solution row0 is col4)
  await page.waitForTimeout(300);
  const heartsAfter = await page.locator("#hearts img.heart:not(.lost)").count();
  ok(heartsAfter === heartsBefore - 1, "replayed field docks a heart under its own honest stakes, " + heartsBefore + " -> " + heartsAfter);

  // assist=off should also have been restored (not the live "on" default) —
  // proven indirectly: no dead-cell shading appears after this placement,
  // since assist="on" is what drives .cell.shade.
  const shaded = await page.locator(".cell.shade").count();
  ok(shaded === 0, "replayed field's assist=off means no dead-cell shading appears, got " + shaded + " shaded cells");

  await ctx.close();
  await browser.close();
  console.log("\n" + pass + " passed, " + fail + " failed");
  process.exit(fail ? 1 : 0);
}

run().catch(e => { console.error(e); process.exit(1); });
