// History/export fidelity: a starred (curated) field, a replayed history
// card, and an exported pack JSON should all carry assist+stakes so the
// exact run can be faithfully recreated later — not just which board it is.
const { chromium } = require("./lib/playwright");
const BASE = "http://localhost:8934";
// The field to curate and replay. Hilltop, because stakes ride the difficulty
// band now — a hilltop field IS an honest field, and honest is what this test
// needs in order to prove a wrong-but-legal placement costs a heart.
const FIELD = "6h-1";

// Solve whatever field is on the board, read from the save rather than a
// hardcoded table, so the field above can change without stranding a
// constant that silently no longer matches it.
async function solveCurrent(page) {
  const sol = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("arcade.v1.sowduku.inProgress")).solution);
  for (let r = 0; r < sol.length; r++) {
    await page.click('[data-r="' + r + '"][data-c="' + sol[r] + '"]');
  }
}
// Any column in row 0 other than the solution's: legal against the board so
// far, but not this piggy's patch.
async function wrongColRow0(page) {
  return page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("arcade.v1.sowduku.inProgress"));
    return s.solution[0] === 0 ? 1 : 0;
  });
}

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

  // tend the hilltop field with assist off, solve it, curate the record. The
  // honest stakes come from the band — there is no profile-wide setting left
  // to seed.
  await page.click("#newBtn");
  await page.fill("#cSeed", FIELD);
  await page.click('#cAssist button[data-assist="off"]');
  await page.click("#cTend");
  await page.waitForSelector(".board .cell");
  await solveCurrent(page);
  await page.waitForSelector("#veil.show");
  await page.click('#veilBtns button:has-text("tend another")'); // real state change, clears .show for real
  await page.waitForFunction(() => !document.getElementById("veil").classList.contains("show"));
  await page.click("#historyBtn");
  await page.waitForSelector(".hcard");
  await page.click('.hcard [data-act="curate"]');

  // storage shape (B7.3): an array of packs, each with its own fields array
  const curated = await page.evaluate(() => JSON.parse(localStorage.getItem("arcade.v1.sowduku.curated")));
  const curatedField = curated[0].fields[0];
  ok(curatedField.assist === "off", "curated entry stores assist=off, got " + curatedField.assist);
  ok(curatedField.stakes === "honest", "curated entry stores stakes=honest, got " + curatedField.stakes);

  // export pack JSON should carry both through
  await page.click('#hTabs button[data-tab="curated"]');
  await page.waitForSelector("#campExport:not([disabled])");
  await page.click("#campExport");
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  const parsed = JSON.parse(clip);
  ok(parsed.fields[0].assist === "off", "exported field carries assist=off");
  ok(parsed.fields[0].stakes === "honest", "exported field carries stakes=honest");

  // now flip the LIVE assist default to the opposite of what was curated, then
  // replay the curated field — it should use its own recorded settings, not
  // whatever the player's current defaults happen to be.
  await page.click("#hClose");
  await page.click("#newBtn");
  await page.click('#cAssist button[data-assist="on"]');
  await page.click("#cTend");
  await page.waitForSelector(".board .cell");
  await page.click("#historyBtn");
  await page.click('#hTabs button[data-tab="curated"]');
  await page.waitForSelector(".hcard");
  await page.click('.hcard [data-act="replay"]');
  await page.waitForFunction((code) =>
    document.getElementById("codeChip").textContent.trim() === code, FIELD);

  // stakes has no live UI readout — infer it the same behavioral way the
  // assist check below does: a wrong-but-legal placement only docks under
  // honest+, so this proves the replayed field came back at the stakes it was
  // recorded at rather than at whatever the last-tended field was playing.
  const heartsBefore = await page.locator("#hearts img.heart:not(.lost)").count();
  await page.click(`[data-r="0"][data-c="${await wrongColRow0(page)}"]`);
  await page.waitForTimeout(300);
  const heartsAfter = await page.locator("#hearts img.heart:not(.lost)").count();
  ok(heartsAfter === heartsBefore - 1, "replayed field restores stakes=honest — a wrong-but-legal placement docks a heart, " + heartsBefore + " -> " + heartsAfter);

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
