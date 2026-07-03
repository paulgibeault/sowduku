// B7.3: multiple player-created trail packs. Storage moved from a single
// flat "curated" field array to an array of packs (same "curated" key,
// in-place migrated), each with its own name + fields — a field can belong
// to more than one pack. Covers: pre-B7.3 flat-array migration doesn't
// nest/corrupt on repeated reads, create/rename/delete a pack, per-pack
// field membership + progress tracking stay independent, starring still
// defaults to the last-used pack in exactly one tap, and the Trails sheet
// picks up every player pack automatically.
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
async function starCurrentField(page) {
  await solve(page, SOL_6S1);
  await page.waitForSelector("#veil.show");
  await page.click("#vFavBtn");
  await page.click('#veilBtns button:has-text("pause the trail")');
  await page.waitForFunction(() => !document.getElementById("veil").classList.contains("show"));
}

async function run() {
  const browser = await chromium.launch();

  // ---- pre-B7.3 flat array migrates cleanly and doesn't nest on repeated reads ----
  {
    console.log("\n[migration] flat curated array -> one pack, stable across repeated loads");
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.addInitScript(() => {
      localStorage.setItem("arcade.v1.sowduku.curated", JSON.stringify([
        { code: "6s-1", name: "old favorite", size: 6, seed: 1, reqDifficulty: "sunbeam", band: "sunbeam", addedAt: 1 },
      ]));
    });
    await gotoAndDismissIntro(page);
    // force loadPacks() to run several times over (each nav/star/etc. calls
    // it) — the bug this guards against re-wrapped the array on every call
    for (let i = 0; i < 3; i++) {
      await page.click("#historyBtn");
      await page.click('#hTabs button[data-tab="curated"]');
      await page.click("#hClose");
    }
    const curated = await page.evaluate(() => JSON.parse(localStorage.getItem("arcade.v1.sowduku.curated")));
    ok(Array.isArray(curated) && curated.length === 1, "migrated storage is exactly one pack, got " + JSON.stringify(curated).slice(0, 200));
    ok(curated[0].id === "curated" && curated[0].name === "my trail", "migrated pack keeps id=curated/name='my trail' for backward compat");
    ok(curated[0].fields.length === 1 && curated[0].fields[0].code === "6s-1", "migrated pack's fields carry the old flat entry through, got " + JSON.stringify(curated[0].fields));
    await ctx.close();
  }

  // ---- first star ever auto-creates "my trail" in exactly one tap ----
  {
    console.log("\n[first star] auto-creates 'my trail', one tap, no picker interruption");
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await gotoAndDismissIntro(page);
    await solve(page, SOL_6S1);
    await page.waitForSelector("#veil.show");
    await page.click("#vFavBtn");
    await page.waitForTimeout(150);
    const starAfter = await page.textContent("#vFavBtn");
    ok(starAfter.trim() === "★", "star fills on the very first tap, no pack picker shown first, got " + starAfter.trim());
    const curated = await page.evaluate(() => JSON.parse(localStorage.getItem("arcade.v1.sowduku.curated")));
    ok(curated.length === 1 && curated[0].id === "curated" && curated[0].fields.length === 1,
       "auto-created pack is 'my trail' with the starred field in it, got " + JSON.stringify(curated));
    await ctx.close();
  }

  // ---- create, rename, and the pack shows up in the picker ----
  {
    console.log("\n[create + rename] a new pack appears in both History and Trails pickers");
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await gotoAndDismissIntro(page);
    await starCurrentField(page);
    await page.click("#historyBtn");
    await page.click('#hTabs button[data-tab="curated"]');
    await page.waitForSelector(".hcard");
    await page.click("#hPack button[data-newpack]");
    await page.waitForTimeout(100);
    let packBtns = await page.$$eval("#hPack button", bs => bs.map(b => b.textContent.trim()));
    ok(packBtns.some(t => t.startsWith("untitled trail")), "new pack appears with a default name, got " + JSON.stringify(packBtns));
    await page.fill("#hPackName", "evening puzzles");
    await page.press("#hPackName", "Enter");
    await page.waitForTimeout(100);
    packBtns = await page.$$eval("#hPack button", bs => bs.map(b => b.textContent.trim()));
    ok(packBtns.some(t => t.startsWith("evening puzzles")), "renamed pack shows the new name, got " + JSON.stringify(packBtns));
    ok(!packBtns.some(t => t.startsWith("untitled trail")), "old default name is gone");

    await page.click("#hClose");
    await page.click("#trailsBtn");
    const trailPackBtns = await page.$$eval("#tPack button", bs => bs.map(b => b.textContent.trim()));
    ok(trailPackBtns.some(t => t.startsWith("evening puzzles")), "the new pack also appears in the Trails sheet's picker, got " + JSON.stringify(trailPackBtns));
    ok(trailPackBtns.some(t => t.startsWith("my trail")), "'my trail' still there too, got " + JSON.stringify(trailPackBtns));
    await ctx.close();
  }

  // ---- packs track membership and progress independently ----
  {
    console.log("\n[independence] two packs, same field, independent progress");
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await gotoAndDismissIntro(page);
    await starCurrentField(page); // stars 6s-1 into "my trail" (auto-created)

    await page.click("#historyBtn");
    await page.click('#hTabs button[data-tab="curated"]');
    await page.waitForSelector(".hcard");
    await page.click("#hPack button[data-newpack]");
    await page.waitForTimeout(100);
    const secondPackId = await page.locator("#hPack button.on").getAttribute("data-pack");

    // switch back to recent, star the SAME field into this new (now-default) pack
    await page.click('#hTabs button[data-tab="recent"]');
    await page.waitForSelector(".hcard");
    const recentCard = page.locator(".hcard", { hasText: "6s-1" }).first();
    const favBefore = await recentCard.locator('[data-act="curate"]').textContent();
    ok(favBefore.trim() === "☆", "recent-tab star reflects the *new default* pack, not 'my trail' (not yet in this one), got " + favBefore.trim());
    await recentCard.locator('[data-act="curate"]').click();
    await page.waitForTimeout(100);

    const curated = await page.evaluate(() => JSON.parse(localStorage.getItem("arcade.v1.sowduku.curated")));
    const myTrail = curated.filter(p => p.id === "curated")[0];
    const secondPack = curated.filter(p => p.id !== "curated")[0];
    ok(myTrail.fields.some(f => f.code === "6s-1"), "'my trail' still has 6s-1");
    ok(secondPack.fields.some(f => f.code === "6s-1"), "the second pack now ALSO has 6s-1 — a field can be in more than one pack");

    // "tended" progress per pack is independent (campaignDone is keyed by packId already)
    await page.click("#hClose");
    await page.click("#trailsBtn");
    await page.click('#tPack button[data-pack="curated"]');
    await page.click("#tTend");
    await page.waitForSelector(".board .cell");
    await solve(page, SOL_6S1);
    await page.waitForSelector("#veil.show");
    await page.click('#veilBtns button:has-text("a fresh amble")');
    await page.waitForFunction(() => !document.getElementById("veil").classList.contains("show"));
    const done = await page.evaluate(() => JSON.parse(localStorage.getItem("arcade.v1.sowduku.campaignDone")));
    ok((done.curated || []).includes("6s-1"), "'my trail' shows 6s-1 tended, got " + JSON.stringify(done.curated));
    ok(!((done[secondPackId] || []).includes("6s-1")), "the second pack does NOT show 6s-1 tended — solving it under one pack doesn't cross-credit the other, got " + JSON.stringify(done[secondPackId]));
    await ctx.close();
  }

  // ---- delete a pack: only that pack's entry goes, shared field survives elsewhere ----
  {
    console.log("\n[delete] removes only that pack's entry, field survives in any other pack");
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await gotoAndDismissIntro(page);
    await starCurrentField(page);
    await page.click("#historyBtn");
    await page.click('#hTabs button[data-tab="curated"]');
    await page.waitForSelector(".hcard");
    await page.click("#hPack button[data-newpack]");
    await page.waitForTimeout(100);
    // star 6s-1 into this second pack too, from the recent tab
    await page.click('#hTabs button[data-tab="recent"]');
    await page.waitForSelector(".hcard");
    await page.locator(".hcard", { hasText: "6s-1" }).first().locator('[data-act="curate"]').click();
    await page.click('#hTabs button[data-tab="curated"]');
    await page.waitForTimeout(100);

    let packBtns = await page.$$eval("#hPack button", bs => bs.map(b => b.textContent.trim()));
    const packCountBefore = packBtns.length - 1; // minus "+ new"
    ok(packCountBefore === 2, "two packs exist before delete, got " + JSON.stringify(packBtns));

    const delBtn = page.locator("#hPackDelete");
    await delBtn.click();
    const armedLabel = await delBtn.textContent();
    ok(armedLabel.includes("sure"), "delete requires a confirm tap, got " + armedLabel.trim());
    await delBtn.click();
    await page.waitForTimeout(100);
    packBtns = await page.$$eval("#hPack button", bs => bs.map(b => b.textContent.trim()));
    ok(packBtns.length - 1 === 1, "one pack remains after deleting the other, got " + JSON.stringify(packBtns));
    ok(packBtns.some(t => t.startsWith("my trail")), "the surviving pack is 'my trail', got " + JSON.stringify(packBtns));

    const curated = await page.evaluate(() => JSON.parse(localStorage.getItem("arcade.v1.sowduku.curated")));
    ok(curated.length === 1 && curated[0].fields.some(f => f.code === "6s-1"),
       "6s-1 still present in 'my trail' after the other pack (which also had it) was deleted, got " + JSON.stringify(curated));
    await ctx.close();
  }

  // ---- export targets whichever pack is currently selected ----
  {
    console.log("\n[export] targets the currently selected pack, not always 'my trail'");
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await ctx.grantPermissions(["clipboard-read", "clipboard-write"]);
    await gotoAndDismissIntro(page);
    await starCurrentField(page);
    await page.click("#historyBtn");
    await page.click('#hTabs button[data-tab="curated"]');
    await page.waitForSelector(".hcard");
    await page.click("#hPack button[data-newpack]");
    await page.fill("#hPackName", "second trail");
    await page.press("#hPackName", "Enter");
    await page.click('#hTabs button[data-tab="recent"]');
    await page.waitForSelector(".hcard");
    await page.locator(".hcard", { hasText: "6s-1" }).first().locator('[data-act="curate"]').click();
    await page.click('#hTabs button[data-tab="curated"]');
    await page.waitForSelector("#campExport:not([disabled])");
    await page.click("#campExport");
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    const parsed = JSON.parse(clip);
    ok(parsed.name === "second trail", "exported pack JSON carries the currently-selected pack's name, got " + parsed.name);
    ok(parsed.fields.length === 1 && parsed.fields[0].code === "6s-1", "exported pack carries its own field, got " + JSON.stringify(parsed.fields));
    await ctx.close();
  }

  await browser.close();
  console.log("\n" + pass + " passed, " + fail + " failed");
  process.exit(fail ? 1 : 0);
}

run().catch(e => { console.error(e); process.exit(1); });
