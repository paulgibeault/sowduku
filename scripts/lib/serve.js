// The staged origin the browser suites run against — production's layout,
// not an approximation of it.
//
// In production the launcher and every game share ONE origin: the launcher at
// `/`, this game at `/sowduku/`, the major-pinned SDK at `/sdk/v3/`. That
// shape is not cosmetic — the service worker's scope guard, the manifest's
// scope, and every root-relative script tag are all defined against it, and a
// game served at the origin root exercises none of them.
//
// So: the launcher checkout is served in place at `/`, and the game's BUILT
// artifact (npm run build → dist/) at `/sowduku/`. Serving dist/ rather than
// the repo means the suites drive exactly the file set Pages publishes — the
// month the deploy silently omitted js/, every suite here would have said so.
//
// Headers mirror dev.sh and GitHub Pages: no-store so a stale response can't
// mask an edit, and ACAO:* because launcher frames are sandboxed opaque-origin
// and their subresource loads arrive as CORS requests with `Origin: null`.
//
// Why not the framework's own servers: dev.sh (GAME_INTEGRATION §12) is the
// interactive harness and run-tests.js will happily reuse a session you
// already have open — but it stages a point-in-time copy, and its pinned-SDK
// glob currently misses /sdk/v3/arcade-audio.js. The launcher's hermetic
// serveRepo() refuses to serve any path outside the launcher repo, so it
// cannot host a game that lives in its own checkout.

const http = require("http");
const fs = require("fs");
const path = require("path");
const { LAUNCHER } = require("./launcher");

const ROOT = path.resolve(__dirname, "../..");
const DIST = path.join(ROOT, "dist");
const GAME_ID = "sowduku";
const MOUNT = `/${GAME_ID}/`;

const TYPES = {
  ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript",
  ".json": "application/json", ".css": "text/css", ".svg": "image/svg+xml",
  ".png": "image/png", ".jpg": "image/jpeg", ".woff2": "font/woff2",
  ".ico": "image/x-icon", ".webmanifest": "application/manifest+json",
  ".mp3": "audio/mpeg", ".wav": "audio/wav",
};

/**
 * Map a request path to a file, or null when it escapes its root.
 * `/sowduku/*` comes from the built game; everything else is the launcher.
 */
function resolveFile(p) {
  const [root, rel] = p.startsWith(MOUNT)
    ? [DIST, p.slice(MOUNT.length) || "index.html"]
    : [LAUNCHER, p.replace(/^\//, "")];
  const file = path.resolve(root, rel);
  return file === root || file.startsWith(root + path.sep) ? file : null;
}

/**
 * @param {{block?: string[]}} opts  `block` 404s those exact paths — how
 *   test_audio_wiring.js reproduces a player whose stale cache leaves the
 *   optional audio companion unreachable.
 */
function createServer({ block = [] } = {}) {
  return http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (p === `/${GAME_ID}`) p = MOUNT;          // /sowduku → /sowduku/
    if (p.endsWith("/")) p += "index.html";
    if (block.includes(p)) { res.writeHead(404); res.end(); return; }

    const file = resolveFile(p);
    if (!file) { res.writeHead(403); res.end(); return; }
    fs.readFile(file, (err, buf) => {
      if (err) { res.writeHead(404); res.end("not found"); return; }
      res.writeHead(200, {
        "Content-Type": TYPES[path.extname(file)] || "application/octet-stream",
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*",
      });
      res.end(buf);
    });
  });
}

/** Start the staged origin on `port`; resolves to a stop() function. */
function serve(port, opts) {
  if (!fs.existsSync(path.join(DIST, "index.html"))) {
    throw new Error("dist/ is missing or empty — run `npm run build` first.");
  }
  const server = createServer(opts);
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => resolve(
      () => new Promise((done) => server.close(() => done()))
    ));
  });
}

module.exports = { serve, createServer, GAME_ID, ROOT, DIST, LAUNCHER };
