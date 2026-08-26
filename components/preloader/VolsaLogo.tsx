"use client";

import React, { forwardRef } from "react";

interface VolsaLogoProps {
  className?: string;
  color?: string;
}

/**
 * Production VOLSA Brand Logo.
 * - #volsa-mark: Clean 3D ribbon V icon with brand gradient
 * - #volsa-wordmark: "VOLSA" rendered using the project font for pixel-perfect typography
 */
export const VolsaLogo = forwardRef<SVGSVGElement, VolsaLogoProps>(
  ({ className = "", color = "#22480B" }, ref) => {
    return (
      <svg
        ref={ref}
        viewBox="0 0 280 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`w-full max-w-[280px] sm:max-w-[360px] h-auto ${className}`}
      >
        <defs>
          <linearGradient id="vr-left" x1="0" y1="0" x2="0.5" y2="1">
            <stop offset="0%" stopColor="#4DA012" />
            <stop offset="100%" stopColor="#22480B" />
          </linearGradient>
          <linearGradient id="vr-right" x1="1" y1="0" x2="0.5" y2="1">
            <stop offset="0%" stopColor="#7ACC22" />
            <stop offset="100%" stopColor="#3A7210" />
          </linearGradient>
        </defs>

        {/* V MARK — Two clean ribbon strokes forming a 3D V */}
        <g id="volsa-mark" className="volsa-logo-element">
          {/* Left ribbon stroke */}
          <path
            d="M88 22 C84 22 80 25 82 30 L126 108 C132 118 140 118 140 108 L140 108 C140 108 100 35 96 28 C93 23 91 22 88 22 Z"
            fill="url(#vr-left)"
          />
          {/* Right ribbon stroke */}
          <path
            d="M192 22 C196 22 200 25 198 30 L154 108 C148 118 140 118 140 108 L140 108 C140 108 180 35 184 28 C187 23 189 22 192 22 Z"
            fill="url(#vr-right)"
          />
        </g>

        {/* WORDMARK — Using SVG text for pixel-perfect font rendering */}
        <g id="volsa-wordmark" className="volsa-logo-element">
          <text
            x="140"
            y="170"
            textAnchor="middle"
            fill={color}
            fontSize="52"
            fontWeight="600"
            fontFamily="'Google Sans Flex', 'Poppins', var(--font-sans), system-ui, sans-serif"
            letterSpacing="12"
          >
            VOLSA
          </text>
        </g>
      </svg>
    );
  }
);

VolsaLogo.displayName = "VolsaLogo";
