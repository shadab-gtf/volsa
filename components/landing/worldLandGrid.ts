import { feature } from "topojson-client";
import { geoContains } from "d3-geo";
import land110m from "world-atlas/land-110m.json";

/**
 * Coarse lon/lat land mask, built once from the 110m-resolution world atlas (55KB —
 * this is the whole reason `world-atlas` is a dependency instead of a hand-guessed
 * continent shape or a downloaded bitmap: real coastlines, no asset to keep in sync).
 *
 * 2° cells keep the one-time `geoContains` pass to 16,200 point-in-polygon tests,
 * which resolves in well under a frame — cheap enough to do lazily on first use rather
 * than needing a build step, and memoized so every globe mount after the first is free.
 */
const LON_STEP = 2;
const LAT_STEP = 2;
const COLS = 360 / LON_STEP;
const ROWS = 180 / LAT_STEP;

let cachedGrid: Uint8Array | null = null;

function buildGrid(): Uint8Array {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const landFeature = feature(land110m as any, "land");
  const grid = new Uint8Array(COLS * ROWS);

  for (let r = 0; r < ROWS; r++) {
    const lat = 90 - (r + 0.5) * LAT_STEP;
    for (let c = 0; c < COLS; c++) {
      const lon = -180 + (c + 0.5) * LON_STEP;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      grid[r * COLS + c] = geoContains(landFeature as any, [lon, lat]) ? 1 : 0;
    }
  }

  return grid;
}

/** True if the given longitude/latitude (degrees) sits over land rather than ocean. */
export function isLand(lon: number, lat: number): boolean {
  if (!cachedGrid) cachedGrid = buildGrid();
  const c = Math.min(COLS - 1, Math.max(0, Math.floor((lon + 180) / LON_STEP)));
  const r = Math.min(ROWS - 1, Math.max(0, Math.floor((90 - lat) / LAT_STEP)));
  return cachedGrid[r * COLS + c] === 1;
}
