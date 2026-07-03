/*
 * Sowdoku — built-in trail packs: curated series of fixed-seed fields,
 * hand-picked and hand-played so each teaches exactly one new thing. A pack
 * is fully determined by its fields' board codes (size · band · seed — see
 * `boardCode`/`parseCode` in index.html), plus optional per-field teaching
 * copy and assist/stakes/fog overrides (any can be omitted to leave that
 * setting at the player's own preference).
 *
 * A pack may also carry a `run` policy: `{ hearts, carry }`. When present,
 * the pack's fields aren't just a curated sequence — "begin the run" plays
 * every field in order with one shared, dwindling heart pool spanning the
 * *whole* pack (however many fields that is; never a hardcoded count).
 * Fields still stay individually visible/selectable as standalone practice
 * (fresh hearts, ✓ on solve) — that's separate from, and doesn't count
 * toward, "cleared" (surviving a real run start-to-finish).
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
          note: "⌘Z undo is always free. Peek (in the action bar) is there too when a field gets knotty — it trades a heart for the hint." },
        { code: "7m-2ix", name: "out into the meadow",
          note: "No new mechanic here — this one's all yours." }
      ]
    },
    {
      id: "gauntlet",
      name: "the gauntlet",
      note: "Three fields, back to back, escalating from Meadow to Hilltop to Crag — one shared line of hearts. Run dry and the whole gauntlet ends; clear it and every heart you kept is a small triumph.",
      run: { hearts: 3, carry: true },
      fields: [
        { code: "7m-1", name: "field one" },
        { code: "8h-1", name: "field two" },
        { code: "9c-1", name: "field three" }
      ]
    }
  ];

  if (typeof module !== 'undefined' && module.exports) module.exports = CAMPAIGNS;
  else root.CAMPAIGNS = CAMPAIGNS;
})(typeof self !== 'undefined' ? self : this);
