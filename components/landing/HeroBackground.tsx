"use client";

import React from "react";

/**
 * Hero background: coloured light behind frosted glass.
 *
 * Three drifting radial gradients supply the colour, and a translucent veil sits over
 * them to diffuse it. The veil deliberately does *not* use `backdrop-filter`: blurring a
 * full viewport of continuously animating gradients forces a re-blur every frame, which
 * is the single most expensive thing a hero can do. Radial gradients are already soft,
 * so a tinted veil plus grain reads as frosted glass at a fraction of the cost — and the
 * card on top, which covers a small area, still uses a real backdrop blur.
 *
 * Gradients are painted rather than blur-filtered for the same reason: no filter means
 * no repaint per frame, just composited transforms.
 */
export function HeroBackground() {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden>
      <style>{`
        @keyframes floatBlob1 {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          33% { transform: translate3d(80px, -50px, 0) scale(1.12); }
          66% { transform: translate3d(-60px, 65px, 0) scale(0.94); }
        }
        @keyframes floatBlob2 {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          33% { transform: translate3d(-90px, 60px, 0) scale(1.1); }
          66% { transform: translate3d(65px, -75px, 0) scale(0.95); }
        }
        @keyframes floatBlob3 {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          33% { transform: translate3d(70px, 75px, 0) scale(0.92); }
          66% { transform: translate3d(-75px, -55px, 0) scale(1.14); }
        }
        .hero-blob {
          animation-timing-function: cubic-bezier(0.45, 0, 0.55, 1);
          animation-iteration-count: infinite;
          will-change: transform;
        }
        @media (prefers-reduced-motion: reduce) {
          .hero-blob { animation: none !important; }
        }
      `}</style>

      {/* Base mesh */}
      <div
        className="absolute inset-0"
        style={{ background: "var(--hero-mesh)" }}
      />

      {/* Colour. Saturated enough to survive the veil — the pale mint blobs that were
          here before disappeared into the background entirely. */}
      <div
        className="hero-blob absolute -left-40 -top-40 h-180 w-180"
        style={{
          background: "var(--hero-blob-1)",
          animationName: "floatBlob1",
          animationDuration: "22s",
        }}
      />
      <div
        className="hero-blob absolute -right-32 top-[12%] h-190 w-190"
        style={{
          background: "var(--hero-blob-2)",
          animationName: "floatBlob2",
          animationDuration: "27s",
        }}
      />
      <div
        className="hero-blob absolute -bottom-48 left-[28%] h-170 w-170"
        style={{
          background: "var(--hero-blob-3)",
          animationName: "floatBlob3",
          animationDuration: "31s",
        }}
      />

      {/* The glass. Tint, a soft vertical fall-off, and grain — the three things that
          separate frosted glass from a flat wash. */}
      <div
        className="absolute inset-0"
        style={{ background: "var(--hero-veil)" }}
      />
      <div
        className="absolute inset-0 opacity-[0.16] mix-blend-soft-light"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
    </div>
  );
}
