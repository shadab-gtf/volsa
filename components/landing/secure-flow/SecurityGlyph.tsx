"use client";

import React from "react";
import type { SecurityPillar } from "@/services/landing.service";

/**
 * The three security marks, built as stacked SVG plates rather than flat icons.
 *
 * Depth is real, not painted: each `.glyph-plate` sits at its own translateZ
 * inside a `preserve-3d` stage, so the slow rotation the flow timeline applies
 * makes the layers separate and re-converge the way a solid object would. That
 * parallax is what sells "3D" — a single rotated flat shape just reads as a
 * spinning card.
 */
export function SecurityGlyph({ glyph }: { glyph: SecurityPillar["glyph"] }) {
  return (
    <span
      className="glyph-stage relative block h-[92px] w-[92px] [perspective:520px]"
      aria-hidden="true"
    >
      <span className="glyph-tilt relative block h-full w-full [transform-style:preserve-3d]">
        {/* Back plate — the shadow the solid casts on itself. */}
        <Plate depth={-16} opacity={0.28} blur>
          <Shape glyph={glyph} variant="back" />
        </Plate>
        {/* Body. */}
        <Plate depth={0} opacity={1}>
          <Shape glyph={glyph} variant="body" />
        </Plate>
        {/* Front highlight — catches the light a beat after the body turns. */}
        <Plate depth={14} opacity={0.9}>
          <Shape glyph={glyph} variant="face" />
        </Plate>
      </span>
    </span>
  );
}

function Plate({
  depth,
  opacity,
  blur = false,
  children,
}: {
  depth: number;
  opacity: number;
  blur?: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      className="glyph-plate absolute inset-0 block"
      style={{
        transform: `translateZ(${depth}px)`,
        opacity,
        filter: blur ? "blur(3px)" : undefined,
      }}
    >
      {children}
    </span>
  );
}

/** Scoped per glyph so the three pillars never collide on element ids. */
function Gradients({ glyph }: { glyph: SecurityPillar["glyph"] }) {
  return (
    <defs>
      <linearGradient id={`sec-body-${glyph}`} x1="0" y1="0" x2="0.35" y2="1">
        <stop offset="0%" stopColor="var(--brand-rim)" />
        <stop offset="55%" stopColor="var(--brand-leaf)" />
        <stop offset="100%" stopColor="var(--glyph-gradient-dark-3)" />
      </linearGradient>
      <linearGradient id={`sec-face-${glyph}`} x1="0" y1="0" x2="0.5" y2="1">
        <stop offset="0%" stopColor="var(--white)" stopOpacity="0.55" />
        <stop offset="60%" stopColor="var(--white)" stopOpacity="0.06" />
        <stop offset="100%" stopColor="var(--white)" stopOpacity="0" />
      </linearGradient>
      <linearGradient id={`sec-back-${glyph}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="var(--glyph-gradient-dark-2)" />
        <stop offset="100%" stopColor="var(--glyph-gradient-dark-1)" />
      </linearGradient>
    </defs>
  );
}

type Variant = "back" | "body" | "face";

function fill(variant: Variant, glyph: SecurityPillar["glyph"]) {
  return `url(#sec-${variant}-${glyph})`;
}

function Shape({ glyph, variant }: { glyph: SecurityPillar["glyph"]; variant: Variant }) {
  const paint = fill(variant, glyph);
  const rim = variant === "body" ? "var(--brand-glow)" : "transparent";

  return (
    <svg viewBox="0 0 96 96" className="h-full w-full">
      <Gradients glyph={glyph} />

      {glyph === "key" && (
        <g>
          <circle cx="36" cy="38" r="20" fill={paint} stroke={rim} strokeOpacity="0.35" strokeWidth="1.2" />
          <circle cx="36" cy="38" r="8" fill="var(--surface-device-alt)" opacity={variant === "body" ? 0.85 : 0.25} />
          <path
            d="M49 50 L74 75 L74 84 L65 84 L65 77 L58 77 L58 70 L51 70 L44 63 Z"
            fill={paint}
            stroke={rim}
            strokeOpacity="0.3"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
        </g>
      )}

      {glyph === "shield" && (
        <g>
          <path
            d="M48 8 L80 20 L80 46 C80 66 66 80 48 88 C30 80 16 66 16 46 L16 20 Z"
            fill={paint}
            stroke={rim}
            strokeOpacity="0.35"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          {variant === "body" && (
            <path
              d="M34 47 L44 57 L63 37"
              fill="none"
              stroke="var(--surface-device-alt)"
              strokeOpacity="0.8"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </g>
      )}

      {glyph === "vault" && (
        <g>
          <rect
            x="12"
            y="20"
            width="72"
            height="60"
            rx="10"
            fill={paint}
            stroke={rim}
            strokeOpacity="0.35"
            strokeWidth="1.2"
          />
          <circle
            cx="48"
            cy="50"
            r="18"
            fill="none"
            stroke={variant === "body" ? "var(--surface-device-alt)" : rim}
            strokeOpacity={variant === "body" ? 0.75 : 0.2}
            strokeWidth="4"
          />
          {variant === "body" && (
            <g stroke="var(--surface-device-alt)" strokeOpacity="0.75" strokeWidth="4" strokeLinecap="round">
              <path d="M48 32 L48 24" />
              <path d="M48 68 L48 76" />
              <path d="M66 50 L74 50" />
              <path d="M30 50 L22 50" />
            </g>
          )}
        </g>
      )}
    </svg>
  );
}
