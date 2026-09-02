"use client";

import { createPortal } from "react-dom";

/**
 * The fullscreen "swallow" reveal that hands off from the wallet card's zoom into the
 * WebGL globe/particle stage.
 *
 * Portaled to `document.body` rather than rendered inline inside the cylinder card that
 * triggers it — that was the first version, and it broke: the card lives inside a
 * `transform-style: preserve-3d` hierarchy (the cylinder's own rotateY, each card's own
 * rotateY/translateZ), and a plain 2D element scaled up ~260x to cover the viewport is
 * still, as far as 3D compositing is concerned, sitting at the *same 3D depth* as the
 * small card it grew from. Sibling cards at their own points in that 3D space rendered
 * on top of parts of the oversized plane despite a higher z-index — preserve-3d
 * ancestors depth-sort descendants by actual 3D position, not accumulated stacking
 * order. A `position: fixed` element portaled past that hierarchy entirely sidesteps
 * the whole bug, and as a real bonus: once it's genuinely viewport-fixed, revealing it
 * is just `clip-path`, no scale transform or size-guessing needed at all.
 */

interface HeroZoomRevealProps {
  /** 0 -> 1 across the wallet card's own zoom window. */
  zoomProgress: number;
  /** Once the particle stage's own backdrop has gone opaque, this reveal has done its
   *  job and unmounts — no reason to keep painting a fixed fullscreen layer under it. */
  particleProgress: number;
}

const smoothstep = (t: number) => t * t * (3 - 2 * t);
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Inline SVG radial gradient, not a raster image — this clips open across the entire
 *  viewport, and a bitmap at that size reads as visibly soft. A gradient is vector: the
 *  browser regenerates it at whatever size is asked for, so it's crisp regardless. */
const ZOOM_REVEAL_FILL =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cdefs%3E%3CradialGradient id='g' cx='40%25' cy='34%25' r='75%25'%3E%3Cstop offset='0%25' stop-color='%23c0fc01' stop-opacity='0.45'/%3E%3Cstop offset='45%25' stop-color='%23234d0c' stop-opacity='0.9'/%3E%3Cstop offset='100%25' stop-color='%23050903'/%3E%3C/radialGradient%3E%3C/defs%3E%3Crect width='400' height='400' fill='url(%23g)'/%3E%3C/svg%3E\")";

export function HeroZoomReveal({ zoomProgress, particleProgress }: HeroZoomRevealProps) {
  if (typeof document === "undefined") return null;
  if (zoomProgress <= 0 || particleProgress > 0.05) return null;

  // Left/right/bottom reveal on the shared curve. Top gets its own, delayed one: the
  // seed rectangle sits low on screen (roughly where the card's empty lower area is),
  // so its top edge starts much farther from the viewport's top edge than the other
  // three edges are from theirs — under one shared pace that read as the top "whipping"
  // past everything else while the sides and bottom had already settled.
  const sideT = smoothstep(clamp01(zoomProgress / 0.85));
  const topT = smoothstep(clamp01((zoomProgress - 0.08) / 0.8));

  const sideInset = 35 * (1 - sideT);
  const bottomInset = 20 * (1 - sideT);
  const topInset = 62 * (1 - topT);

  return createPortal(
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[140]"
      style={{
        clipPath: `inset(${topInset}% ${sideInset}% ${bottomInset}% ${sideInset}% round 14px)`,
        backgroundImage: ZOOM_REVEAL_FILL,
        backgroundSize: "cover",
        backgroundPosition: "center",
        filter: `blur(${(1 - clamp01(zoomProgress / 0.35)) * 2.5}px)`,
      }}
    />,
    document.body
  );
}

export default HeroZoomReveal;
