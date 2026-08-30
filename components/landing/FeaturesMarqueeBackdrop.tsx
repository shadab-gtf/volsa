"use client";

import React, { useRef, useEffect } from "react";
import gsap from "gsap";

export interface FeaturesMarqueeBackdropProps {
  activeTitle?: string;
  dark?: boolean;
  className?: string;
}

const MARQUEE_TEXT =
  "AUTONOMOUS INTENT SWARM • INSTITUTIONAL ZK SHIELD • CROSS-CHAIN LIQUIDITY ROUTER • NEURAL STRATEGY MATRIX • REAL-TIME VOLATILITY ORACLE • NON-CUSTODIAL KEY VAULT • ";

/**
 * Monumental background marquee text matching the user's reference design.
 * Scrolls continuously and smoothly behind the 3D cylinder carousel.
 */
export function FeaturesMarqueeBackdrop({
  activeTitle,
  dark = true,
  className = "",
}: FeaturesMarqueeBackdropProps) {
  const marqueeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = marqueeRef.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const tween = gsap.to(el, {
      xPercent: -50,
      repeat: -1,
      duration: 40,
      ease: "none",
    });

    // Paused off-screen: FeaturesSection never unmounts, it's just scrolled
    // past, so without this the marquee ticks forever behind the fold.
    const observer = new IntersectionObserver(
      ([entry]) => (entry.isIntersecting ? tween.play() : tween.pause()),
      { threshold: 0 }
    );
    observer.observe(el);

    return () => {
      observer.disconnect();
      tween.kill();
    };
  }, []);

  return (
    <div
      className={`absolute inset-0 z-0 flex items-center overflow-hidden pointer-events-none select-none ${className}`}
      aria-hidden="true"
    >
      <div
        ref={marqueeRef}
        className={`w-[300vw] sm:w-[250vw] flex whitespace-nowrap text-[13vw] sm:text-[15vw] font-black tracking-tighter uppercase leading-none will-change-transform ${
          dark ? "text-white/[0.05]" : "text-brand-forest/[0.07]"
        }`}
      >
        <span>{MARQUEE_TEXT}</span>
        <span>{MARQUEE_TEXT}</span>
      </div>
    </div>
  );
}

export default FeaturesMarqueeBackdrop;
