/**
 * Ordered text beats for the Features particle stage, kept out of
 * CylinderExplosionSphere.tsx so HeroSection.tsx (which needs the beat
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
 *
 * Every beat explodes identically. `burst` is the same on all four, the morph
 * and hold windows are the same length on all four, and the camera push that
 * used to belong to the closing beat alone now fires on every one — so the
 * change into SOVEREIGN WEALTH SHIELD hits exactly as hard as the change out
 * of it. The 0.33 -> 1.00 slice divides four ways at 0.1675 each: 0.075 of
 * morph, 0.0925 of hold. Keep it that way if a beat is ever added or dropped —
 * re-divide the whole slice rather than stealing from a neighbour.
 */

/** Scatter distance every beat explodes to, in world units. This was the closing
 *  beat's alone; it is now what every change costs. */
const BURST = 48;

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
    burst: BURST,
    morph: { start: 0.33, end: 0.405 },
    hold: { start: 0.405, end: 0.4975 },
  },
  {
    lines: ["ZERO BRIDGE", "VULNERABILITIES"],
    linesNarrow: ["ZERO", "BRIDGE", "VULNERABILITIES"],
    burst: BURST,
    morph: { start: 0.4975, end: 0.5725 },
    hold: { start: 0.5725, end: 0.665 },
  },
  {
    lines: ["SOVEREIGN", "WEALTH SHIELD"],
    linesNarrow: ["SOVEREIGN", "WEALTH", "SHIELD"],
    burst: BURST,
    morph: { start: 0.665, end: 0.74 },
    hold: { start: 0.74, end: 0.8325 },
  },
  {
    // Closing beat, and no longer the only dramatic one — it holds to the end instead
    // of blowing out to nothing, which is still what makes it the last.
    lines: ["ZERO", "CUSTODY RISK"],
    linesNarrow: ["ZERO", "CUSTODY", "RISK"],
    burst: BURST,
    morph: { start: 0.8325, end: 0.9075 },
    hold: { start: 0.9075, end: 1.0 },
  },
];
