"use client";

import React, { type RefObject } from "react";

/**
 * The mark: four rounded petals arranged in a 2x2 grid around a shared
 * centre, each one filling bottom-to-top in turn as the count passes through
 * its 25-point slice — paired with a small readout to its right.
 *
 * Each petal is a single overflow-hidden box whose own border-radius already
 * pinches it toward the centre and rounds its outward corner into a quarter
 * circle; the fill is just an inset child clipped to that same shape, so
 * there's no separate mask or SVG to keep in sync.
 */

const PETAL_SIZE = 34; // px
const GAP = 3; // the cross-shaped gap left between the four petals
const OUTER_RADIUS = PETAL_SIZE; // the corner facing away from centre
const INNER_RADIUS = 8; // the corner touching the shared centre — pinched, not sharp
const SIDE_RADIUS = 14; // the two corners in between

// border-radius shorthand is `top-left top-right bottom-right bottom-left`;
// each petal's OWN corner nearest the centre gets INNER_RADIUS, its own
// corner farthest from centre gets OUTER_RADIUS.
const PETAL_RADII: Record<"tl" | "tr" | "bl" | "br", string> = {
  tl: `${OUTER_RADIUS}px ${SIDE_RADIUS}px ${INNER_RADIUS}px ${SIDE_RADIUS}px`,
  tr: `${SIDE_RADIUS}px ${OUTER_RADIUS}px ${SIDE_RADIUS}px ${INNER_RADIUS}px`,
  bl: `${SIDE_RADIUS}px ${INNER_RADIUS}px ${SIDE_RADIUS}px ${OUTER_RADIUS}px`,
  br: `${INNER_RADIUS}px ${SIDE_RADIUS}px ${OUTER_RADIUS}px ${SIDE_RADIUS}px`,
};

const PETAL_ORDER: Array<keyof typeof PETAL_RADII> = ["tl", "tr", "bl", "br"];

interface PreloaderCounterProps {
  numberRef: RefObject<HTMLSpanElement | null>;
  petalFillRefs: RefObject<(HTMLDivElement | null)[]>;
}

export function PreloaderCounter({ numberRef, petalFillRefs }: PreloaderCounterProps) {
  return (
    <div className="preloader-counter flex items-center gap-6">
      <div
        className="grid shrink-0"
        style={{
          gridTemplateColumns: `repeat(2, ${PETAL_SIZE}px)`,
          gridTemplateRows: `repeat(2, ${PETAL_SIZE}px)`,
          gap: GAP,
        }}
      >
        {PETAL_ORDER.map((corner, i) => (
          <div
            key={corner}
            className="relative overflow-hidden bg-white/90"
            style={{ borderRadius: PETAL_RADII[corner] }}
          >
            <div
              ref={(el) => {
                petalFillRefs.current[i] = el;
              }}
              className="absolute inset-0 bg-brand-leaf"
              style={{ clipPath: "inset(100% 0 0 0)" }}
            />
          </div>
        ))}
      </div>

      {/* Readout — a direct text-node write from the GSAP tween, not React
          state, so a ~60fps count never triggers a render. */}
      <span
        ref={numberRef}
        className="font-sans text-2xl text-white/55 tabular-nums sm:text-3xl"
      >
        0
      </span>
    </div>
  );
}
