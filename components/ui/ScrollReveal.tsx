"use client";

import React, { useRef, useEffect, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { usePreloaderDone } from "@/hooks/usePreloaderDone";

gsap.registerPlugin(ScrollTrigger);

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  direction?: "up" | "down" | "left" | "right" | "none";
  delay?: number;
  duration?: number;
  distance?: number;
  /** If true, staggers direct children instead of animating the wrapper */
  stagger?: number;
  /** ScrollTrigger start position */
  start?: string;
  once?: boolean;
}

/**
 * Reusable GSAP ScrollTrigger reveal wrapper.
 * Wraps children in a div that animates into view on scroll.
 * Only triggers AFTER preloader finishes!
 *
 * Smoothness notes:
 * - `once` reveals use ScrollTrigger's own `once` flag, which self-destroys the
 *   trigger after firing. Dozens of live triggers all re-evaluating on every
 *   scroll frame is the single biggest cost on a page this long.
 * - `will-change` is added for the tween and cleared on completion; leaving it
 *   on permanently keeps a GPU layer alive per revealed block.
 */
export function ScrollReveal({
  children,
  className = "",
  direction = "up",
  delay = 0,
  duration = 1.0,
  distance = 50,
  stagger,
  start = "top 85%",
  once = true,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isPreloaderDone = usePreloaderDone();

  useEffect(() => {
    const el = ref.current;
    if (!el || !isPreloaderDone) return;

    const prefersReduced = globalThis.matchMedia?.(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    // No motion requested: show the content in its final state, no tween.
    if (prefersReduced) {
      gsap.set(el, { opacity: 1, clearProps: "transform" });
      return;
    }

    const fromVars: gsap.TweenVars = { opacity: 0 };
    const toVars: gsap.TweenVars = {
      opacity: 1,
      duration,
      delay,
      ease: "power3.out",
    };

    switch (direction) {
      case "up":
        fromVars.y = distance;
        toVars.y = 0;
        break;
      case "down":
        fromVars.y = -distance;
        toVars.y = 0;
        break;
      case "left":
        fromVars.x = distance;
        toVars.x = 0;
        break;
      case "right":
        fromVars.x = -distance;
        toVars.x = 0;
        break;
    }

    const targets =
      stagger && el.children.length > 0 ? Array.from(el.children) : el;

    const ctx = gsap.context(() => {
      gsap.set(el, { opacity: 1 });
      gsap.fromTo(
        targets,
        { ...fromVars, willChange: "transform, opacity" },
        {
          ...toVars,
          stagger: stagger ?? 0,
          // Release the compositor layer once the reveal has played, and hand
          // the transform back to CSS: a leftover inline transform outranks
          // hover:-translate-y utilities on the revealed elements.
          clearProps: "willChange,transform",
          scrollTrigger: {
            trigger: el,
            start,
            once,
            toggleActions: once
              ? "play none none none"
              : "play reverse play reverse",
            // Jumping past a trigger (fast flick / anchor jump) still lands the
            // element in its finished state instead of mid-tween.
            fastScrollEnd: true,
          },
        }
      );
    }, el);

    return () => ctx.revert();
  }, [direction, delay, duration, distance, stagger, start, once, isPreloaderDone]);

  return (
    <div
      ref={ref}
      className={className}
      style={{ opacity: isPreloaderDone ? undefined : 0 }}
    >
      {children}
    </div>
  );
}
