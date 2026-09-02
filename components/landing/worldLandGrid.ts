import {
  LAND_GRID_BASE64,
  LAND_GRID_COLS,
  LAND_GRID_LAT_STEP,
  LAND_GRID_LON_STEP,
  LAND_GRID_ROWS,
} from "./worldLandGrid.data";

/**
 * Land/ocean lookup for the signal globe's dot sphere.
 *
 * The mask is precomputed (see scripts/generate-land-grid.mjs) rather than derived here
 * from the world atlas: `geoContains` over the whole-planet MultiPolygon costs ~0.5ms a
 * call, so building this 2° grid at runtime meant ~7.5 seconds of blocking main-thread
 * work — a multi-second freeze in the middle of the pinned scroll. Decoding 2KB of
 * base64 instead is a sub-millisecond job, and it keeps d3-geo/topojson/world-atlas out
 * of the browser bundle entirely (they're devDependencies of the generator now).
 */
let bits: Uint8Array | null = null;

function decode(): Uint8Array {
  const binary = atob(LAND_GRID_BASE64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

/** True if the given longitude/latitude (degrees) sits over land rather than ocean. */
export function isLand(lon: number, lat: number): boolean {
  if (!bits) bits = decode();

  const c = Math.min(
    LAND_GRID_COLS - 1,
    Math.max(0, Math.floor((lon + 180) / LAND_GRID_LON_STEP))
  );
  const r = Math.min(
    LAND_GRID_ROWS - 1,
    Math.max(0, Math.floor((90 - lat) / LAND_GRID_LAT_STEP))
  );

  const idx = r * LAND_GRID_COLS + c;
  return (bits[idx >> 3] & (1 << (idx & 7))) !== 0;
}
