/**
 * Precomputes the world land mask that WorldSignalGlobe uses to decide which points of
 * its dot sphere are over land.
 *
 * This exists because doing it at runtime does not work: `geoContains` against the
 * whole-planet MultiPolygon costs ~0.5ms per call, and a 2° grid needs 16,200 of them —
 * roughly 7.5 seconds of synchronous main-thread work, which froze the page mid-scroll.
 * Run once, ship the result as a ~2.7KB base64 bitmask, decode it in microseconds.
 *
 * Usage:  node scripts/generate-land-grid.mjs
 * Rerun only if you want a different resolution (LON_STEP/LAT_STEP) or atlas file.
 */
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { feature } = require("topojson-client");
const { geoContains } = require("d3-geo");
const land110m = require("world-atlas/land-110m.json");

const LON_STEP = 2;
const LAT_STEP = 2;
const COLS = 360 / LON_STEP;
const ROWS = 180 / LAT_STEP;

const landFeature = feature(land110m, "land");

const bits = new Uint8Array(Math.ceil((COLS * ROWS) / 8));
let landCells = 0;

for (let r = 0; r < ROWS; r++) {
  const lat = 90 - (r + 0.5) * LAT_STEP;
  for (let c = 0; c < COLS; c++) {
    const lon = -180 + (c + 0.5) * LON_STEP;
    if (geoContains(landFeature, [lon, lat])) {
      const idx = r * COLS + c;
      bits[idx >> 3] |= 1 << (idx & 7);
      landCells++;
    }
  }
}

const base64 = Buffer.from(bits).toString("base64");

const out = `// GENERATED FILE — do not edit by hand.
// Regenerate with: node scripts/generate-land-grid.mjs
//
// A ${COLS}x${ROWS} (${LON_STEP}° x ${LAT_STEP}°) land/ocean bitmask of the world, packed one cell
// per bit and base64'd — ${landCells} of ${COLS * ROWS} cells are land. Precomputed because the
// \`geoContains\` pass that produces it costs ~7.5s of blocking main-thread work.

export const LAND_GRID_COLS = ${COLS};
export const LAND_GRID_ROWS = ${ROWS};
export const LAND_GRID_LON_STEP = ${LON_STEP};
export const LAND_GRID_LAT_STEP = ${LAT_STEP};

export const LAND_GRID_BASE64 =
  "${base64}";
`;

writeFileSync(new URL("../components/landing/worldLandGrid.data.ts", import.meta.url), out);

console.log(
  `wrote worldLandGrid.data.ts — ${landCells}/${COLS * ROWS} land cells, ${base64.length} base64 chars (${bits.length} bytes)`
);
