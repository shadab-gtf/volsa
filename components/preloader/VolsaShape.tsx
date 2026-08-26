"use client";

import React, { forwardRef } from "react";

interface VolsaShapeProps {
  className?: string;
  fillColor?: string;
}

export const VolsaShape = forwardRef<SVGSVGElement, VolsaShapeProps>(
  ({ className = "", fillColor = "#22480B" }, ref) => {
    return (
      <svg
        ref={ref}
        width="64"
        height="36"
        viewBox="0 0 64 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`volsa-organic-shape ${className}`}
      >
        <path
          d="M18 0H46C55.9411 0 64 8.05887 64 18C64 27.9411 55.9411 36 46 36H18C8.05887 36 0 27.9411 0 18C0 8.05887 8.05887 0 18 0Z"
          fill={fillColor}
        />
      </svg>
    );
  }
);

VolsaShape.displayName = "VolsaShape";
