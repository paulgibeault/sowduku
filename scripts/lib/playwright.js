// One import site for Playwright.
//
// Every suite used to hard-code an absolute path into the launcher repo's
// node_modules, which is true on exactly one machine and nowhere else — CI
// included. Resolve it here instead: this repo's own node_modules first
// (`npm install`, what CI does), then the launcher's, so a dev machine that
// already has the launcher's browsers installed needs no second copy.

const path = require("path");
const { resolveLauncher } = require("./launcher");

function load() {
  try {
    return require("playwright");
  } catch (localErr) {
    if (localErr.code !== "MODULE_NOT_FOUND") throw localErr;
    try {
      return require(path.join(resolveLauncher(), "node_modules", "playwright"));
    } catch {
      throw new Error(
        "Playwright is not installed. Run `npm install && npx playwright " +
        "install chromium webkit` in this repo."
      );
    }
  }
}

module.exports = load();
