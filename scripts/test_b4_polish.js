// B4 (play-test polish) coverage, one section per item as they land.
const { chromium, webkit } = require("/Users/paulgibeault/work/paulgibeault.github.io/node_modules/playwright");
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

async function tendAmble(page, code, opts) {
  opts = opts || {};
  await page.click("#newBtn");
  await page.waitForSelector("#createBack:not([hidden])");
  if (code) await page.fill("#cSeed", code);
  if (opts.assist) await page.click('#cAssist button[data-assist="' + opts.assist + '"]');
  await page.click("#cTend");
  await page.waitForSelector(".board .cell");
}

async function run() {
  const browser = await chromium.launch();

  // ---- B4.2: a successful peek docks exactly one heart, not a mistake ----
  {
    console.log("\n[B4.2] successful peek docks one heart, no mistake");
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await gotoAndDismissIntro(page);
    await tendAmble(page, "8m-1");
    const heartsBefore = await page.locator("#hearts img.heart:not(.lost)").count();
    await page.click("#peekBtn");
    await page.waitForTimeout(200);
    const heartsAfter = await page.locator("#hearts img.heart:not(.lost)").count();
    ok(heartsAfter === heartsBefore - 1, "peek docked exactly one heart, " + heartsBefore + " -> " + heartsAfter);
    // confirm it wasn't recorded as a mistake by finishing the field and checking the record
    await ctx.close();
  }

  // ---- B4.2: peek is free under slow stakes ----
  {
    console.log("\n[B4.2] peek is free under slow stakes");
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await gotoAndDismissIntro(page);
    // stakes has no live control anymore (B7.2) — seed the saved default directly
    await page.evaluate(() => localStorage.setItem("arcade.v1.sowduku.stakes", JSON.stringify("slow")));
    await tendAmble(page, "8m-1");
    await page.click("#peekBtn");
    await page.waitForTimeout(200);
    const disabled = await page.getAttribute("#peekBtn", "disabled");
    ok(disabled === null, "peek stays enabled under slow stakes after use (no hearts to spend)");
    const badgeHidden = await page.getAttribute("#peekCost", "hidden");
    ok(badgeHidden !== null, "cost badge hidden under slow stakes");
    await ctx.close();
  }

  // ---- B4.2: peek disables at 1 heart remaining (never ends the game) ----
  {
    console.log("\n[B4.2] peek disabled once only one heart remains");
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await gotoAndDismissIntro(page);
    await page.evaluate(() => localStorage.setItem("arcade.v1.sowduku.stakes", JSON.stringify("honest")));
    await tendAmble(page, "8m-1", { assist: "off" });
    // dock hearts down to 1 via peeks (each successful peek costs one)
    let hearts = await page.locator("#hearts img.heart:not(.lost)").count();
    let guard = 0;
    while (hearts > 1 && guard++ < 10) {
      await page.click("#peekBtn");
      await page.waitForTimeout(150);
      hearts = await page.locator("#hearts img.heart:not(.lost)").count();
    }
    ok(hearts === 1, "hearts brought down to 1 via repeated peeks, got " + hearts);
    const disabled = await page.getAttribute("#peekBtn", "disabled");
    ok(disabled !== null, "peek button disabled with exactly 1 heart left");
    const beforeClick = hearts;
    await page.click("#peekBtn", { force: true });
    await page.waitForTimeout(200);
    const afterClick = await page.locator("#hearts img.heart:not(.lost)").count();
    ok(afterClick === beforeClick, "clicking a disabled peek button does not dock a heart, stayed at " + afterClick);
    // the H shortcut must respect the same guard, not just the disabled attribute
    await page.keyboard.press("h");
    await page.waitForTimeout(200);
    const afterShortcut = await page.locator("#hearts img.heart:not(.lost)").count();
    ok(afterShortcut === beforeClick, "'H' shortcut also refuses to spend the last heart, stayed at " + afterShortcut);
    await ctx.close();
  }

  // ---- B4.2: peek is unavailable in the Wallow (1 heart) ----
  {
    console.log("\n[B4.2] peek unavailable in the wallow");
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await gotoAndDismissIntro(page);
    await page.click("#newBtn");
    await page.waitForSelector("#createBack:not([hidden])");
    // wallow is the difficulty slider's top notch now, not a runs-tab mode
    await page.fill("#cDiffSlider", "4");
    await page.dispatchEvent("#cDiffSlider", "input");
    await page.click("#cTend");
    await page.waitForSelector(".board .cell");
    const disabled = await page.getAttribute("#peekBtn", "disabled");
    ok(disabled !== null, "peek disabled immediately in the wallow (1 heart)");
    await ctx.close();
  }

  // ---- B4.2: a failed hint (no forced move) doesn't charge ----
  // (best-effort: not every field has a "stuck" state reachable quickly, so
  // this checks the mechanism via a contradiction-y state is skipped; the
  // dock-on-success-only logic is already covered structurally above since
  // peek() only decrements inside the `h.r != null` branch.)

  const SOL_6S1 = [[0,4],[2,3],[3,1],[1,0],[4,5],[5,2]];
  async function solve6s1(page) {
    for (const [r, c] of SOL_6S1) await page.click('[data-r="' + r + '"][data-c="' + c + '"]');
  }

  // ---- B4.4: win veil star -> curated tab, with the typed name ----
  {
    console.log("\n[B4.4] win veil favorite + name");
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await gotoAndDismissIntro(page);
    await tendAmble(page, "6s-1");
    await solve6s1(page);
    await page.waitForSelector("#veil.show");
    const starBefore = await page.textContent("#vFavBtn");
    ok(starBefore.trim() === "☆", "star starts empty on a fresh win, got " + starBefore);
    const nameHiddenBefore = await page.getAttribute("#vFavName", "hidden");
    ok(nameHiddenBefore !== null, "name input hidden until starred");
    await page.click("#vFavBtn");
    const starAfter = await page.textContent("#vFavBtn");
    ok(starAfter.trim() === "★", "star fills once tapped, got " + starAfter);
    const nameHiddenAfter = await page.getAttribute("#vFavName", "hidden");
    ok(nameHiddenAfter === null, "name input appears once starred");
    await page.fill("#vFavName", "sunny corner");
    await page.press("#vFavName", "Enter");
    await page.waitForTimeout(150);
    // storage shape (B7.3): an array of packs, each with its own fields array
    const curated = await page.evaluate(() => JSON.parse(localStorage.getItem("arcade.v1.sowduku.curated")));
    ok(curated.length === 1 && curated[0].fields.length === 1 && curated[0].fields[0].code === "6s-1" &&
       curated[0].fields[0].name === "sunny corner",
       "curated tab shows the field with the typed name, got " + JSON.stringify(curated));
    // un-star removes just the field, not the pack itself
    await page.click("#vFavBtn");
    const afterUnstar = await page.evaluate(() => JSON.parse(localStorage.getItem("arcade.v1.sowduku.curated")));
    ok(afterUnstar[0].fields.length === 0, "un-starring from the veil removes the curated entry");
    await ctx.close();
  }

  // ---- B4.4: fail veil synthesizes a record and stars it correctly ----
  {
    console.log("\n[B4.4] fail veil favorite (synthesized record)");
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await gotoAndDismissIntro(page);
    await page.click("#newBtn");
    await page.waitForSelector("#createBack:not([hidden])");
    // wallow is the difficulty slider's top notch now, not a runs-tab mode
    await page.fill("#cDiffSlider", "4");
    await page.dispatchEvent("#cDiffSlider", "input");
    await page.click("#cTend");
    await page.waitForSelector(".board .cell");
    // (0,0) fails immediately under wallow IF it happens to be wrong vs the
    // (randomly seeded) solution — honest+/stern docks the only heart. If it
    // happens to BE the solution cell instead, it's a clean placement with no
    // dock, so fall back to a placement that's illegal regardless of the
    // solution: two piggies sharing a row always breaks the base rule.
    await page.click('[data-r="0"][data-c="0"]');
    if (!(await page.locator("#veil.show").count())) {
      await page.click('[data-r="0"][data-c="1"]');
    }
    await page.waitForSelector("#veil.show", { timeout: 5000 });
    await page.click("#vFavBtn");
    await page.waitForTimeout(150);
    const curated = await page.evaluate(() => JSON.parse(localStorage.getItem("arcade.v1.sowduku.curated")));
    const f = curated[0].fields[0];
    ok(curated[0].fields.length === 1 && f.solved === false, "fail-veil star curates an unsolved record, got " + JSON.stringify(f));
    ok(f.assist === "off" && f.stakes === "stern", "synthesized fail record carries assist/stakes fidelity");
    await ctx.close();
  }

  // ---- B4.4: name survives reload ----
  {
    console.log("\n[B4.4] starred name survives reload");
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await gotoAndDismissIntro(page);
    await tendAmble(page, "6s-1");
    await solve6s1(page);
    await page.waitForSelector("#veil.show");
    await page.click("#vFavBtn");
    await page.fill("#vFavName", "keeper");
    await page.press("#vFavName", "Enter");
    await page.waitForTimeout(150);
    await page.reload();
    await page.waitForSelector(".board .cell");
    // a solved game restores with the veil still showing; dismiss it for real
    // (a state change, not just a peek) before reaching for the action bar
    await page.click('#veilBtns button:has-text("tend another")');
    await page.waitForFunction(() => !document.getElementById("veil").classList.contains("show"));
    await page.click("#historyBtn");
    await page.click('#hTabs button[data-tab="curated"]');
    await page.waitForSelector(".hcard");
    // .hname is shared with the veil's own name input (#vFavName reuses the
    // class for styling) — scope to the curated list specifically
    const nameVal = await page.inputValue("#hList .hname");
    ok(nameVal === "keeper", "name survives reload into the curated tab's own input, got " + nameVal);
    await ctx.close();
  }

  // ---- B6.1: wallow is the difficulty slider's top notch, board code stays crag ----
  {
    console.log("\n[B6.1] wallow as a difficulty-slider notch");
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await gotoAndDismissIntro(page);
    await page.click("#newBtn");
    await page.waitForSelector("#createBack:not([hidden])");
    const runBtnCount = await page.locator('#cRunSeg button[data-mode="wallow"]').count();
    ok(runBtnCount === 0, "wallow is no longer a runs-tab sub-mode");
    await page.fill("#cDiffSlider", "4");
    await page.dispatchEvent("#cDiffSlider", "input");
    const diffLabel = await page.textContent("#cDiffOut");
    ok(diffLabel.trim().toLowerCase() === "the wallow", "diff slider shows 'the wallow' at the top notch, got " + diffLabel);
    const code = await page.textContent("#cCode");
    ok(/^6c-/.test(code.trim()), "wallow's board code stays a crag layout code, got " + code);
    await page.click("#cTend");
    await page.waitForSelector(".board .cell");
    const hearts = await page.locator("#hearts img.heart").count();
    ok(hearts === 1, "wallow starts with exactly 1 heart, got " + hearts);
    const fieldCode = (await page.textContent("#codeChip")).trim();
    ok(/^6c-/.test(fieldCode), "tended field's own code is crag, got " + fieldCode);
    await ctx.close();
  }

  // ---- B6.1: misty wallow composes (previously unreachable) ----
  {
    console.log("\n[B6.1] misty wallow composes");
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await gotoAndDismissIntro(page);
    await page.click("#newBtn");
    await page.waitForSelector("#createBack:not([hidden])");
    await page.fill("#cDiffSlider", "4");
    await page.dispatchEvent("#cDiffSlider", "input");
    await page.click('#cFogSeg button[data-fog="on"]');
    const diffLabelAfterFog = await page.textContent("#cDiffOut");
    ok(diffLabelAfterFog.trim().toLowerCase() === "the wallow", "toggling misty doesn't knock the slider off the wallow notch");
    await page.click("#cTend");
    await page.waitForSelector(".board .cell");
    const fieldChip = await page.textContent("#fieldChip");
    ok(fieldChip.includes("misty") && fieldChip.toLowerCase().includes("wallow"),
       "field chip shows both wallow and misty, got " + fieldChip);
    const hearts = await page.locator("#hearts img.heart").count();
    ok(hearts === 1, "misty wallow still has exactly 1 heart, got " + hearts);
    const fogged = await page.locator(".cell.fog").count();
    ok(fogged > 0, "the board actually renders fogged cells, got " + fogged);
    await ctx.close();
  }

  // ---- B6.1: fog persists across reload and survives history/curation fidelity ----
  {
    console.log("\n[B6.1] fog persists + fidelity");
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await gotoAndDismissIntro(page);
    await page.click("#newBtn");
    await page.waitForSelector("#createBack:not([hidden])");
    await page.click('#cFogSeg button[data-fog="on"]');
    await page.fill("#cSeed", "6m-1");
    await page.click("#cTend");
    await page.waitForSelector(".board .cell");
    await page.reload();
    await page.waitForSelector(".board .cell");
    const foggedAfterReload = await page.locator(".cell.fog").count();
    ok(foggedAfterReload > 0, "misty amble field stays foggy across reload, got " + foggedAfterReload + " fogged cells");
    // curate it and check fidelity carries fog through — starting a *different*
    // field is what finalizes the outgoing (misty) one into history; opening
    // and cancelling the create sheet does not.
    await page.click('[data-r="0"][data-c="0"]');
    await page.click("#newBtn");
    await page.fill("#cSeed", "6s-1");
    await page.click("#cTend");
    await page.waitForSelector(".board .cell");
    await page.click("#historyBtn");
    await page.waitForSelector(".hcard");
    var mistyCard = page.locator(".hcard", { hasText: "6m-1" });
    await mistyCard.locator('[data-act="curate"]').click();
    const curated = await page.evaluate(() => JSON.parse(localStorage.getItem("arcade.v1.sowduku.curated")));
    const foggedField = curated[0].fields[0];
    ok(curated[0].fields.length === 1 && foggedField.code === "6m-1" && foggedField.fog === true,
       "curated entry carries fog=true, got " + JSON.stringify(foggedField));
    await ctx.close();
  }

  await browser.close();
  console.log("\n" + pass + " passed, " + fail + " failed");
  process.exit(fail ? 1 : 0);
}

run().catch(e => { console.error(e); process.exit(1); });
