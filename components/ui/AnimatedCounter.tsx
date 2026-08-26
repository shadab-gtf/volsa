"use client";

import React, { useRef, useEffect, useState } from "react";
import gsap from "gsap";

interface AnimatedCounterProps {
  value: number;
  prefix?: string;
  suffix?: string;
  /** Count-up length in seconds. */
  duration?: number;
  className?: string;
}

/**
 * Animated number counter that triggers when the element enters the viewport.
 *
 * Counting runs on the shared GSAP ticker — the same clock that steps Lenis and
 * ScrollTrigger — so the digits advance on the same frames as the scroll instead
 * of on a competing requestAnimationFrame loop.
 */
export function AnimatedCounter({
  value,
  prefix = "",
  suffix = "",
  duration = 2,
  className = "",
}: AnimatedCounterProps) {
  const [display, setDisplay] = useState(() => format(0, value));
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const prefersReduced = globalThis.matchMedia?.(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const counter = { current: 0 };
    let tween: gsap.core.Tween | null = null;

    // No motion requested: jump straight to the final value on the next tick.
    if (prefersReduced) {
      const jump = gsap.delayedCall(0, () => setDisplay(format(value, value)));
      return () => jump.kill();
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();

        tween = gsap.to(counter, {
          current: value,
          duration,
          ease: "power3.out",
          onUpdate: () => setDisplay(format(counter.current, value)),
        });
      },
      { threshold: 0.3 }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
      tween?.kill();
    };
  }, [value, duration]);

  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      {/* Currency symbols render in the sans stack: the heading face is a
          subset with no `$` glyph, so it draws a .notdef box instead. */}
      {prefix && <span className="font-sans">{prefix}</span>}
      {display}
      {suffix}
    </span>
  );
}

/** Formats the live value, matching the decimal precision of the target. */
function format(current: number, target: number): string {
  if (target % 1 !== 0) return current.toFixed(1);
  return formatNumber(Math.round(current));
}

/** Compact number formatting: 1000 → 1K, 1000000 → 1M */
function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}K`;
  return n.toLocaleString();
}
