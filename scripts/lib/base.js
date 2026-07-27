// Where the suites find the game.
//
// The arcade serves every game from the launcher's origin under its gameId
// (`/sowduku/`), so that — not the origin root — is what a suite navigates to.
// Port 4791 is dev.sh's default, which is what makes the documented workflow
// work unchanged:
//
//   ./dev.sh ../sow-duku     # in the launcher repo
//   npm test                 # reuses that staged origin
//
// With nothing already listening, run-tests.js stages its own on the same
// port. SOWDUKU_BASE overrides both.

const PORT = Number(process.env.ARCADE_PORT || 4791);
const ORIGIN = `http://127.0.0.1:${PORT}`;
const BASE = process.env.SOWDUKU_BASE || `${ORIGIN}/sowduku`;

module.exports = { BASE, ORIGIN, PORT };
