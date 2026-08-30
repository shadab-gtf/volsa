"use client";

import React from "react";

interface Blob {
  /** Any CSS colour — used as the centre of a radial gradient that fades to nothing. */
  color: string;
  size: string;
  position: string;
  /** Seconds for one full cycle. */
  duration: number;
  path: 1 | 2 | 3 | 4;
  opacity?: number;
}

const DEFAULT_BLOBS: Blob[] = [
  { color: "var(--ambient-blob-1-rgb)", size: "46vw", position: "-top-[18%] -left-[10%]", duration: 26, path: 1 },
  { color: "var(--ambient-blob-2-rgb)", size: "52vw", position: "top-[8%] -right-[14%]", duration: 33, path: 2 },
  { color: "var(--ambient-blob-3-rgb)", size: "42vw", position: "-bottom-[20%] left-[22%]", duration: 29, path: 3, opacity: 0.5 },
  { color: "var(--ambient-blob-4-rgb)", size: "38vw", position: "top-[38%] left-[34%]", duration: 37, path: 4, opacity: 0.7 },
];

/**
 * Drifting colour field.
 *
 * Four radial gradients on independent paths, with cycle lengths that share no common
 * factor — 26, 33, 29 and 37 seconds. That matters more than it sounds: give two blobs
 * 20s and 40s and they re-align every forty seconds, and the eye picks the repeat out
 * immediately. Mutually awkward periods take hours to come back into phase, so the
 * movement never reads as a loop.
 *
 * Nothing here is filtered or blurred. Radial gradients are already soft, and a blur
 * filter over a moving element forces a repaint every frame; these are composited
 * transforms and cost effectively nothing. Grain on top does the rest of the work that
 * a blur would otherwise be asked to do.
 */
export function AmbientField({ className = "" }: { className?: string }) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden>
      <style>{`
        @keyframes ambientDrift1 {
          0%, 100% { transform: translate3d(0,0,0) scale(1) rotate(0deg); }
          33%      { transform: translate3d(8vw,4vh,0) scale(1.15) rotate(24deg); }
          66%      { transform: translate3d(-5vw,7vh,0) scale(0.92) rotate(-14deg); }
        }
        @keyframes ambientDrift2 {
          0%, 100% { transform: translate3d(0,0,0) scale(1) rotate(0deg); }
          33%      { transform: translate3d(-9vw,6vh,0) scale(0.9) rotate(-20deg); }
          66%      { transform: translate3d(4vw,-6vh,0) scale(1.18) rotate(16deg); }
        }
        @keyframes ambientDrift3 {
          0%, 100% { transform: translate3d(0,0,0) scale(1) rotate(0deg); }
          33%      { transform: translate3d(7vw,-5vh,0) scale(1.12) rotate(18deg); }
          66%      { transform: translate3d(-8vw,-2vh,0) scale(0.94) rotate(-22deg); }
        }
        @keyframes ambientDrift4 {
          0%, 100% { transform: translate3d(0,0,0) scale(1) rotate(0deg); }
          33%      { transform: translate3d(-6vw,-7vh,0) scale(1.2) rotate(-12deg); }
          66%      { transform: translate3d(9vw,3vh,0) scale(0.88) rotate(26deg); }
        }
        .ambient-blob {
          animation-timing-function: cubic-bezier(0.45, 0, 0.55, 1);
          animation-iteration-count: infinite;
          will-change: transform;
        }
        @media (prefers-reduced-motion: reduce) {
          .ambient-blob { animation: none !important; }
        }
      `}</style>

      {DEFAULT_BLOBS.map((blob, i) => (
        <div
          key={i}
          className={`ambient-blob absolute ${blob.position}`}
          style={{
            width: blob.size,
            height: blob.size,
            opacity: blob.opacity ?? 0.85,
            background: `radial-gradient(circle, rgba(${blob.color},0.62) 0%, rgba(${blob.color},0.24) 42%, rgba(${blob.color},0) 70%)`,
            animationName: `ambientDrift${blob.path}`,
            animationDuration: `${blob.duration}s`,
          }}
        />
      ))}

      {/* Glass: tint, a vertical fall-off, then grain. */}
      <div
        className="absolute inset-0"
        style={{ background: "var(--ambient-veil)" }}
      />
      <div
        className="absolute inset-0 opacity-[0.15] mix-blend-soft-light"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
    </div>
  );
}
