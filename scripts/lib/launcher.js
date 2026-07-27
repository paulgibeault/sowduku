// Where the Paul's Arcade launcher repo lives.
//
// The game is not self-contained: index.html loads /arcade-sdk.js and
// /arcade-audio.js root-relative, and the SDK is what actually persists every
// arcade.v1.sowduku.* key. Serve the game without the launcher behind it and
// the board still renders — but nothing saves, so every suite that reads a
// save fails with a null. That is a staging bug wearing a test failure's
// clothes, so resolve the path in ONE place and say so loudly when it's wrong.
//
// Order: explicit env (CI checks the launcher out beside us), then the sibling
// checkout that a dev machine has.

const fs = require("fs");
const path = require("path");

const CANDIDATES = [
  process.env.ARCADE_LAUNCHER,
  path.resolve(__dirname, "../../../paulgibeault.github.io"),
].filter(Boolean);

function resolveLauncher() {
  for (const dir of CANDIDATES) {
    if (fs.existsSync(path.join(dir, "arcade-sdk.js"))) return path.resolve(dir);
  }
  throw new Error(
    "Cannot find the arcade launcher checkout (looked for arcade-sdk.js in:\n" +
    CANDIDATES.map((c) => "  " + c).join("\n") +
    "\nClone https://github.com/paulgibeault/paulgibeault.github.io beside this\n" +
    "repo, or set ARCADE_LAUNCHER to its path.)"
  );
}

module.exports = { resolveLauncher, LAUNCHER: resolveLauncher() };
