"use client";

import { createPortal } from "react-dom";

/**
 * The fullscreen "swallow" reveal that hands off from the wallet card's zoom into the
 * WebGL globe/particle stage.
 *
 * Portaled to `document.body` rather than rendered inline inside the cylinder card that
 * triggers it — completely outside any 3D transform hierarchy, so depth-sorting bugs and
 * scale guessing both disappear.
 *
 * All four edges use a shared total duration but move at different rates:
 * - Top edge moves slower (gets there later within the total duration)
 * - Left, right, bottom move faster (get there earlier)
 * This means they START at the same time and END at the same time, but the bottom/sides
 * finish revealing first, then the top catches up.
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

export function HeroZoomReveal({ zoomProgress, particleProgress }: HeroZoomRevealProps) {
  if (typeof document === "undefined") return null;
  if (zoomProgress <= 0 || particleProgress > 0.05) return null;

  // All edges finish revealing by the same zoomProgress value (0.9), but at different
  // rates: the bottom/sides are fully visible before the top catches up.
  // This is achieved by passing different scaled-progress values to smoothstep:
  // - sidesBottomT uses zoomProgress / 0.7 → reaches 1 at zoomProgress = 0.7
  // - topT uses zoomProgress / 0.9 → reaches 1 at zoomProgress = 0.9
  // So the top edge lags behind the others, but they all start at the same moment
  // and the whole rectangle is fully covering by zoomProgress = 0.9.
  const sidesBottomT = smoothstep(clamp01(zoomProgress / 0.7));
  const topT = smoothstep(clamp01(zoomProgress / 0.9));

  // When fully expanded, all insets become 0. The starting insets are measured from
  // the seed rectangle on the wallet card — roughly 35px left/right, 62px top, 20px bottom.
  const sideInset = 35 * (1 - sidesBottomT);
  const bottomInset = 20 * (1 - sidesBottomT);
  const topInset = 62 * (1 - topT);

  return createPortal(
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-140 bg-black"
      style={{
        clipPath: `inset(${topInset}% ${sideInset}% ${bottomInset}% ${sideInset}%)`,
      }}
    />,
    document.body
  );
}

export default HeroZoomReveal;
