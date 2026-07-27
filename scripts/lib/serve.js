// The staged server the browser suites run against.
//
// Layout: this repo at /, the launcher repo behind it as a fallback. That is
// what a suite means by http://localhost:8934/index.html — the game's own
// files win, and /arcade-sdk.js + /arcade-audio.js resolve out of the launcher
// checkout, exactly as they do on the deployed origin. Without the fallback
// the SDK never loads and no save is ever written; see lib/launcher.js.
//
// (test_audio_wiring.js stages a DIFFERENT shape on its own port — launcher at
// /, game at /sowduku/ — because it is specifically testing the framed layout
// and the missing-/arcade-audio.js fallback path. It keeps its own server.)

const http = require("http");
const fs = require("fs");
const path = require("path");
const { LAUNCHER } = require("./launcher");

const GAME = path.resolve(__dirname, "../..");

const TYPES = {
  ".html": "text/html", ".js": "text/javascript", ".json": "application/json",
  ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg",
  ".svg": "image/svg+xml", ".woff2": "font/woff2", ".ico": "image/x-icon",
  ".webmanifest": "application/manifest+json", ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
};

function createServer() {
  return http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (p.endsWith("/")) p += "index.html";
    const roots = [GAME, LAUNCHER];

    (function attempt(i) {
      if (i >= roots.length) { res.writeHead(404); res.end(); return; }
      const file = path.join(roots[i], p);
      // Keep a stray ../ from reading outside the two staged roots.
      if (!file.startsWith(roots[i] + path.sep)) { res.writeHead(403); res.end(); return; }
      fs.readFile(file, (err, buf) => {
        if (err) return attempt(i + 1);
        res.writeHead(200, {
          "Content-Type": TYPES[path.extname(file)] || "application/octet-stream",
          "Cache-Control": "no-store",
        });
        res.end(buf);
      });
    })(0);
  });
}

/** Start the staged server on `port`; resolves to a stop() function. */
function serve(port) {
  const server = createServer();
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, () => resolve(
      () => new Promise((done) => server.close(() => done()))
    ));
  });
}

module.exports = { serve, createServer, GAME, LAUNCHER };
