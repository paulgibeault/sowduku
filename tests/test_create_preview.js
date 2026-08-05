// The create sheet's live preview is generated lazily now: a slider says the
// new size and band immediately and the board itself is generated once the
// thumb stops. Sweeping the difficulty slider on a 10×10 used to generate a
// board per step — six hundred milliseconds of frozen sheet, five of the six
// boards never seen.
//
// The failure mode that buys is a preview that never catches up, so that is
// what this pins: after a sweep the sheet must settle on the board the sliders
// actually ask for, and tending it must hand back that same board.
const { chromium } = require("../scripts/lib/playwright");
const { BASE } = require("../scripts/lib/base");

let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; console.log("  ok - " + msg); }
  else { fail++; console.log("  FAIL - " + msg); }
}

async function openCreate(page) {
  await page.goto(BASE + "/index.html");
  await page.waitForSelector(".board .cell");
  if ((await page.getAttribute("#infoBack", "hidden")) === null) await page.click("#infoClose");
  await page.click("#newBtn");
  await page.waitForSelector("#cSizeSlider");
  await page.waitForTimeout(300);
}

// Drive a slider the way a thumb does: every intermediate step, no waiting.
const sweep = (page, id, values) => page.evaluate(([id, values]) => {
  const el = document.getElementById(id);
  for (const v of values) { el.value = String(v); el.dispatchEvent(new Event("input", { bubbles: true })); }
}, [id, values]);

const previewSize = (page) => page.evaluate(() =>
  Math.round(Math.sqrt(document.querySelectorAll("#cPreview div").length)));

async function run() {
  const browser = await chromium.launch();

  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await openCreate(page);

    // the label is the promise the sheet makes immediately
    await sweep(page, "cSizeSlider", [7, 8, 9, 10]);
    ok((await page.textContent("#cSizeOut")) === "10×10",
      "the size label follows the thumb without waiting for a board");

    // ...and the preview must catch up to it
    await page.waitForTimeout(900);
    ok((await previewSize(page)) === 10,
      "the preview settles on the size the slider stopped at, got " + (await previewSize(page)));

    // same for the difficulty slider, at the most expensive size
    await sweep(page, "cDiffSlider", [0, 1, 2, 3]);
    ok((await page.textContent("#cDiffOut")).length > 0, "the band label follows the thumb");
    await page.waitForTimeout(1500);
    const band = await page.textContent("#cBand");
    ok(/crag/.test(band), "the preview settles on the band the slider stopped at, got " + band);
    ok(/effort \d+\/100/.test(band), "the settled preview reports a real effort score, got " + band);

    // and what it settled on is what tending actually hands back
    const shownCode = await page.textContent("#cCode");
    await page.click("#cTend");
    await page.waitForTimeout(600);
    const playing = await page.textContent("#codeChip");
    ok(playing === shownCode,
      "tending starts the field the settled preview showed (" + shownCode + "), got " + playing);
    const cells = await page.locator(".board .cell").count();
    ok(cells === 100, "and it is the 10×10 the slider asked for, got " + cells + " cells");
    await ctx.close();
  }

  await browser.close();
  console.log("\n" + pass + " passed, " + fail + " failed");
  process.exit(fail ? 1 : 0);
}

run().catch(e => { console.error(e); process.exit(1); });
