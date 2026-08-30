"use client";

import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface MaskedHeadingProps {
  /** One entry per rendered row. Each row gets its own mask and its own reveal. */
  lines: string[];
  as?: "h1" | "h2" | "h3";
  className?: string;
  dark?: boolean;
  /**
   * Overrides the tone outright, for grounds neither default suits. Passing a colour
   * through `className` instead would leave two text utilities on the element and let
   * stylesheet order decide the winner — which is not a thing a caller can control.
   */
  tone?: string;
}

/**
 * Section heading whose lines rise out of a clipping mask when scrolled into view.
 *
 * Lines are authored, not wrapped: each entry renders as exactly one row (`nowrap`),
 * because a row that wraps would put two lines inside one mask and break the effect.
 * Size the type so the longest line fits.
 *
 * The start value lives in the tween, never in a CSS transform — GSAP resolves computed
 * transforms to a pixel matrix, so a CSS `translateY(110%)` reads back as yPercent 0 and
 * animating it to 0 becomes a no-op that strands the line under its mask.
 */
export function MaskedHeading({
  lines,
  as: Tag = "h2",
  className = "",
  dark = false,
  tone,
}: MaskedHeadingProps) {
  const ref = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".mask-line",
        { yPercent: 110 },
        {
          yPercent: 0,
          duration: 1.05,
          stagger: 0.09,
          ease: "power4.out",
          scrollTrigger: { trigger: root, start: "top 88%", once: true },
        }
      );
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <Tag
      ref={ref}
      className={`font-heading font-normal leading-[1.08] tracking-tight ${
        tone ?? (dark ? "text-white" : "text-foreground")
      } ${className}`}
    >
      {lines.map((line) => (
        <span key={line} className="block overflow-hidden pb-[0.08em]">
          <span className="mask-line block whitespace-nowrap">{line}</span>
        </span>
      ))}
    </Tag>
  );
}
