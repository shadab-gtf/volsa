/**
 * Ordered text beats for the Features particle stage, kept out of
 * CylinderExplosionSphere.tsx so FeaturesSection.tsx (which needs the beat
 * copy for its screen-reader fallback) doesn't have to statically import
 * `three` just to read a list of strings — that import is what forced the
 * whole particle component into the main bundle instead of a lazy chunk.
 *
 * Each beat morphs in from whatever came before (the dunes for the first,
 * the previous headline afterwards) and then holds dead still to be read.
 * Lines are kept short on purpose: the type is fitted to the viewport, so
 * fewer characters per line means larger glyphs and thicker strokes.
 * `linesNarrow` re-breaks the same words for portrait viewports, where
 * width is the binding constraint.
 */
export const TEXT_BEATS: {
  lines: string[];
  linesNarrow?: string[];
  /** How far grains scatter mid-morph, in world units, before re-converging. */
  burst: number;
  morph: { start: number; end: number };
  hold: { start: number; end: number };
}[] = [
  {
    lines: ["IN YOUR", "CONTROL"],
    burst: 14,
    morph: { start: 0.33, end: 0.42 },
    hold: { start: 0.42, end: 0.53 },
  },
  {
    lines: ["ZERO BRIDGE", "VULNERABILITIES"],
    linesNarrow: ["ZERO", "BRIDGE", "VULNERABILITIES"],
    burst: 22,
    morph: { start: 0.53, end: 0.59 },
    hold: { start: 0.59, end: 0.69 },
  },
  {
    lines: ["SOVEREIGN", "WEALTH SHIELD"],
    linesNarrow: ["SOVEREIGN", "WEALTH", "SHIELD"],
    burst: 22,
    morph: { start: 0.69, end: 0.75 },
    hold: { start: 0.75, end: 0.85 },
  },
  {
    // Closing beat. It inherits the old exit warp's drama — a much wider scatter and a
    // camera push — and then holds to the end instead of blowing out to nothing.
    lines: ["ZERO", "CUSTODY RISK"],
    linesNarrow: ["ZERO", "CUSTODY", "RISK"],
    burst: 48,
    morph: { start: 0.85, end: 0.93 },
    hold: { start: 0.93, end: 1.0 },
  },
];
