"use client";

import React, { type RefObject } from "react";

/**
 * The dial: a vertical ruler scrolling past a fixed centre, paired with the
 * big readout it drives.
 *
 * Ticks are generated from the two numbers that actually describe them —
 * `MINOR_STEP` (the counting increment) and `MAJOR_STEP` (which of those get
 * a label) — rather than 26 hand-placed elements. The glow spine's pinch is
 * drawn once, statically: the knob never moves, only the ruler scrolls past
 * it, so the bulge's screen position never changes and needs no per-frame
 * redraw.
 */

const MINOR_STEP = 4;
const MAJOR_STEP = 20;
const MAX_VALUE = 100;
const TICK_GAP = 34; // px between two consecutive minor ticks
export const UNIT_PX = TICK_GAP / MINOR_STEP;

const RULER_HEIGHT = 380;
const RULER_WIDTH = 80;
const CENTER_Y = RULER_HEIGHT / 2;
const SPINE_X = 63; // the glow spine's resting x, close to the ruler's right edge
const BULGE_REACH = 26; // how far left the pinch bows at its widest
const BULGE_HALF_SPAN = 92; // vertical reach of the pinch, above and below centre

const TICKS = Array.from(
  { length: MAX_VALUE / MINOR_STEP + 1 },
  (_, i) => i * MINOR_STEP
);

const EDGE_FADE =
  "linear-gradient(to bottom, transparent 0%, black 30%, black 70%, transparent 100%)";

/**
 * A tapered wave, not an arc: two cubic Béziers whose control points sit at
 * the SAME x as their tangent point, so the line stays vertical at both ends
 * of the pinch and only bows out gradually toward the centre — an ellipse or
 * a quadratic through one control point reads as a half-circle, this doesn't.
 */
const GLOW_PATH = `
  M ${SPINE_X} 0
  L ${SPINE_X} ${CENTER_Y - BULGE_HALF_SPAN}
  C ${SPINE_X} ${CENTER_Y - BULGE_HALF_SPAN * 0.42},
    ${SPINE_X - BULGE_REACH} ${CENTER_Y - BULGE_HALF_SPAN * 0.42},
    ${SPINE_X - BULGE_REACH} ${CENTER_Y}
  C ${SPINE_X - BULGE_REACH} ${CENTER_Y + BULGE_HALF_SPAN * 0.42},
    ${SPINE_X} ${CENTER_Y + BULGE_HALF_SPAN * 0.42},
    ${SPINE_X} ${CENTER_Y + BULGE_HALF_SPAN}
  L ${SPINE_X} ${RULER_HEIGHT}
`;

interface PreloaderCounterProps {
  trackRef: RefObject<HTMLDivElement | null>;
  numberRef: RefObject<HTMLSpanElement | null>;
}

export function PreloaderCounter({ trackRef, numberRef }: PreloaderCounterProps) {
  return (
    <div className="preloader-counter flex items-center">
      {/* Ruler viewport — only a handful of ticks are ever in frame; the rest
          of the 0-100 run sits above and below, waiting to scroll through. */}
      <div
        className="relative overflow-hidden"
        style={{
          height: RULER_HEIGHT,
          width: RULER_WIDTH,
          WebkitMaskImage: EDGE_FADE,
          maskImage: EDGE_FADE,
        }}
      >
        <div
          ref={trackRef}
          className="absolute left-0 top-1/2 w-full"
          style={{ transform: "translateY(0px)" }}
        >
          {TICKS.map((v) => {
            const isMajor = v % MAJOR_STEP === 0;
            return (
              <div
                key={v}
                className="absolute right-0 flex items-center justify-end gap-3"
                style={{ top: -(v / MINOR_STEP) * TICK_GAP }}
              >
                {isMajor && (
                  <span className="font-sans text-sm text-white/40 tabular-nums">
                    {v}
                  </span>
                )}
                <span
                  className={`block h-px bg-white/25 ${isMajor ? "w-5" : "w-3"}`}
                />
              </div>
            );
          })}
        </div>

        {/* The glow spine — one static path, the pinch fixed exactly at the
            knob's centre. */}
        <svg
          viewBox={`0 0 ${RULER_WIDTH} ${RULER_HEIGHT}`}
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          <path
            d={GLOW_PATH}
            fill="none"
            stroke="var(--brand-leaf)"
            strokeWidth="3"
            strokeLinecap="round"
            className="drop-shadow-[0_0_14px_var(--brand-leaf)]"
          />
        </svg>
      </div>

      {/* Knob — fixed in place; the ruler moves, not this. */}
      <span className="relative z-10 -ml-10 flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-full border border-white/15 bg-black/50 shadow-[0_0_36px_rgba(var(--brand-leaf-rgb),0.4)] backdrop-blur-sm">
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-white/45" fill="currentColor" aria-hidden="true">
          <path d="M12 5.5 17 11H7z" />
          <path d="M12 18.5 7 13h10z" />
        </svg>
      </span>

      {/* Readout — updated by direct text-node writes in the GSAP tween, not
          React state, so a ~60fps count never triggers a render. */}
      <span
        ref={numberRef}
        className="relative z-10 ml-8 font-heading text-[7rem] leading-none text-brand-leaf tabular-nums sm:ml-10 sm:text-[9rem]"
      >
        0
      </span>
    </div>
  );
}
