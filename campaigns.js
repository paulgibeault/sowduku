/*
 * Sowdoku — built-in campaign packs: curated series of fixed-seed fields,
 * hand-picked and hand-played so each teaches exactly one new thing. A pack
 * is fully determined by its fields' board codes (size · band · seed — see
 * `boardCode`/`parseCode` in index.html), plus optional per-field teaching
 * copy and an assist override.
 *
 * The player's own curated list is a second, virtual pack (id "curated",
 * assembled at runtime from `curatedOrdered()`) — this file only holds the
 * built-in ones.
 *
 * Usage:
 *   const CAMPAIGNS = require('./campaigns.js');            // Node
 *   <script src="campaigns.js"></script> -> window.CAMPAIGNS // browser
 */
(function (root) {
  'use strict';

  var CAMPAIGNS = [
    {
      id: "intro",
      name: "first steps",
      note: "A short walk through every rule, one lesson at a time.",
      fields: [
        { code: "6s-1", name: "settling in", assist: "on",
          note: "Tap a cell to settle a piggy. Exactly one piggy per pen, per row, per column — start with the pen that only has room for one." },
        { code: "6s-6", name: "good neighbors", assist: "on",
          note: "Piggies never settle next to each other, not even corner to corner. Tap a settled piggy again to lift it." },
        { code: "6m-8z", name: "leaving hoofprints", assist: "on",
          note: "Long-press a cell (or Space on a keyboard) to leave a hoofprint — a mark for \"definitely not here.\" It costs nothing." },
        { code: "6m-1", name: "reading the field",
          note: "Watch for a pen squeezed into a single row or column — once it can only go there, that row or column is claimed." },
        { code: "7m-2", name: "a helping hand",
          note: "👁 peek (in the action bar) and ⌘Z undo are always there when a field gets knotty — free of charge." },
        { code: "7m-2ix", name: "out into the meadow",
          note: "No new mechanic here — this one's all yours." }
      ]
    }
  ];

  if (typeof module !== 'undefined' && module.exports) module.exports = CAMPAIGNS;
  else root.CAMPAIGNS = CAMPAIGNS;
})(typeof self !== 'undefined' ? self : this);
