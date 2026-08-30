import React from "react";

interface SparklineProps {
  /** Normalised 0-1 samples. Any length; the path scales to fit. */
  points: number[];
  /** Stable id for the fill gradient — must be unique per mounted instance. */
  gradientId: string;
  /** 0 = straight segments, 1 = full Catmull-Rom. Values above ~1 start overshooting. */
  smoothing?: number;
  className?: string;
  lineClassName?: string;
  areaClassName?: string;
}

const clamp = (v: number, min: number, max: number) => (v < min ? min : v > max ? max : v);

/**
 * Builds a rounded path through every sample using Catmull-Rom splines converted to
 * cubic Béziers.
 *
 * Each segment's control points are derived from the *neighbouring* samples, which is
 * what turns a jagged polyline into a continuous curve while still passing exactly
 * through every data point — unlike a simple quadratic smoothing, which drifts off the
 * real values. Endpoints reuse themselves as their missing neighbour, and control
 * points are clamped to the viewBox so an overshoot can never clip against the edge.
 */
function smoothPath(points: number[], smoothing: number): string {
  const n = points.length;
  const step = 100 / (n - 1);
  const at = (i: number) => {
    const c = clamp(i, 0, n - 1);
    return { x: c * step, y: 100 - points[c] * 100 };
  };

  const start = at(0);
  let d = `M${start.x.toFixed(2)},${start.y.toFixed(2)}`;

  for (let i = 0; i < n - 1; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    const k = smoothing / 6;

    const c1x = p1.x + (p2.x - p0.x) * k;
    const c1y = clamp(p1.y + (p2.y - p0.y) * k, 0, 100);
    const c2x = p2.x - (p3.x - p1.x) * k;
    const c2y = clamp(p2.y - (p3.y - p1.y) * k, 0, 100);

    d += ` C${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`;
  }

  return d;
}

/**
 * Dependency-free sparkline.
 *
 * Drawn in a unit viewBox with `preserveAspectRatio="none"`, so it stretches to any
 * container without recomputing on resize — no observer, no layout reads. The line
 * carries `pathLength={1}`, which normalises its geometry so a dash-offset draw-on
 * animation is exact for any dataset. The line and area expose stable class hooks
 * (`spark-line` / `spark-area`) so a parent timeline can animate them without refs.
 */
export function Sparkline({
  points,
  gradientId,
  smoothing = 0.9,
  className = "",
  lineClassName = "",
  areaClassName = "",
}: SparklineProps) {
  if (points.length < 2) return null;

  const line = smoothPath(points, smoothing);

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className={className}
      aria-hidden
      focusable="false"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.26" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>

      <path
        className={`spark-area ${areaClassName}`}
        d={`${line} L100,100 L0,100 Z`}
        fill={`url(#${gradientId})`}
      />
      <path
        className={`spark-line ${lineClassName}`}
        d={line}
        pathLength={1}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
