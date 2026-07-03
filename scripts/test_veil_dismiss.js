// Bug fix: dismissing the end-game veil (tap outside the card) used to be a
// one-shot "peek" — the very next click anywhere, including a genuine tap on
// an action-bar button, was swallowed just to bring the veil back, so the
// board was never actually usable post-solve except via the veil's own
// buttons. Now the outside-tap is a real, permanent dismiss (same as every
// other sheet): the board and its whole action bar (undo/peek/clear/new
// field/trails/history) become fully live, and the veil doesn't pop back
// just because game.solved/hearts-empty is still true. It DOES reappear
// normally for the next game's own win/fail.
const { chromium } = require("/Users/paulgibeault/work/paulgibeault.github.io/node_modules/playwright");
const BASE = "http://localhost:8934";
const SOL_6S1 = [[0,4],[2,3],[3,1],[1,0],[4,5],[5,2]];
const SOL_6S6 = [[2,4],[0,5],[5,3],[4,0],[3,2],[1,1]];

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
async function solve(page, cells) {
  for (const [r, c] of cells) await page.click('[data-r="' + r + '"][data-c="' + c + '"]');
}
function dismissVeil(page) { return page.click("#veil", { position: { x: 5, y: 5 } }); }

async function run() {
  const browser = await chromium.launch();

  // ---- win veil: dismiss reveals a fully live action bar ----
  {
    console.log("\n[win veil] dismiss -> action bar genuinely works, not swallowed");
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await gotoAndDismissIntro(page);
    await solve(page, SOL_6S1);
    await page.waitForSelector("#veil.show");
    await dismissVeil(page);
    const veilHidden = await page.locator("#veil.show").count();
    ok(veilHidden === 0, "veil actually hidden after dismiss");

    // a click on the backdrop area used to just be swallowed and pop the
    // veil back — confirm a real action-bar click now goes through
    await page.click("#trailsBtn");
    const trailsOpen = await page.locator("#trailsBack:not([hidden])").count();
    ok(trailsOpen === 1, "trails sheet genuinely opens on first tap post-dismiss");
    await page.click("#tCancel");
    const veilStillHidden1 = await page.locator("#veil.show").count();
    ok(veilStillHidden1 === 0, "veil did not pop back after using trails");

    await page.click("#historyBtn");
    const histOpen = await page.locator("#histBack:not([hidden])").count();
    ok(histOpen === 1, "history sheet genuinely opens post-dismiss");
    await page.click("#hClose");
    const veilStillHidden2 = await page.locator("#veil.show").count();
    ok(veilStillHidden2 === 0, "veil did not pop back after using history");
    await ctx.close();
  }

  // ---- fail veil: same fix applies ----
  {
    console.log("\n[fail veil] dismiss -> action bar genuinely works");
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await gotoAndDismissIntro(page);
    await page.evaluate(() => {
      // stakes has no live control anymore (B7.2) — seed the saved default
      // directly; restore() re-derives an unlocked game's stakes from it
      localStorage.setItem("arcade.v1.sowduku.stakes", JSON.stringify("honest"));
      const s = JSON.parse(localStorage.getItem("arcade.v1.sowduku.inProgress"));
      s.hearts = 1;
      localStorage.setItem("arcade.v1.sowduku.inProgress", JSON.stringify(s));
    });
    await page.reload();
    await page.waitForSelector(".board .cell");
    await page.click('[data-r="0"][data-c="0"]'); // wrong vs 6s-1's row-0 solution (col4) -> docks the last heart
    await page.waitForSelector("#veil.show", { timeout: 5000 });
    await dismissVeil(page);
    const veilHidden = await page.locator("#veil.show").count();
    ok(veilHidden === 0, "fail veil actually hidden after dismiss");
    await page.click("#newBtn");
    const createOpen = await page.locator("#createBack:not([hidden])").count();
    ok(createOpen === 1, "create sheet genuinely opens post-dismiss on a failed field");
    await ctx.close();
  }

  // ---- dismissed veil doesn't leak into the next game; reappears normally ----
  {
    console.log("\n[reset] veilDismissed clears for the next game's own win");
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await gotoAndDismissIntro(page);
    await solve(page, SOL_6S1);
    await page.waitForSelector("#veil.show");
    await dismissVeil(page);
    await page.click("#newBtn");
    await page.fill("#cSeed", "6s-6");
    await page.click("#cTend");
    await page.waitForSelector(".board .cell");
    const veilHiddenFresh = await page.locator("#veil.show").count();
    ok(veilHiddenFresh === 0, "veil stays hidden on a fresh, unsolved field");
    await solve(page, SOL_6S6);
    await page.waitForSelector("#veil.show", { timeout: 5000 });
    const veilShowsAgain = await page.locator("#veil.show").count();
    ok(veilShowsAgain === 1, "veil shows again normally for the new field's own solve");
    await ctx.close();
  }

  await browser.close();
  console.log("\n" + pass + " passed, " + fail + " failed");
  process.exit(fail ? 1 : 0);
}

run().catch(e => { console.error(e); process.exit(1); });
