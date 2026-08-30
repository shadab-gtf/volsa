"use client";

import { useEffect, useRef, type RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface RevealOptions {
  /** Selector for the elements to reveal, resolved inside `scope`. */
  selector?: string;
  /** Start state. Defaults to a rise-and-fade. */
  from?: gsap.TweenVars;
  /** End state. Defaults to the natural, visible state. */
  to?: gsap.TweenVars;
  duration?: number;
  /** Seconds between items. Zero moves the whole group as one. */
  stagger?: number;
  start?: string;
}

const DEFAULT_FROM: gsap.TweenVars = { y: 34, opacity: 0 };
const DEFAULT_TO: gsap.TweenVars = { y: 0, opacity: 1 };

/**
 * Batched scroll-reveal for a group of elements inside `scope`.
 *
 * Built on `ScrollTrigger.batch`, which shares one trigger across the whole group
 * instead of creating one per element. That distinction is the point: a page with
 * dozens of revealed items would otherwise carry dozens of independent scroll
 * calculations every frame, and batching also groups items that enter together into a
 * single tween.
 *
 * `from`/`to` are open, so the same hook drives a rise-and-fade, an SVG stroke draw-on,
 * or anything else GSAP can tween. Start values are applied with `gsap.set` rather than
 * a CSS class, so an element can never be stranded invisible if its trigger never
 * fires, and reduced-motion opts out entirely — leaving everything at its natural state.
 *
 * Options are read once, on mount, from a ref snapshot rather than from the dependency
 * array. Callers pass fresh object literals on every render, so depending on them
 * directly would tear down and rebuild every ScrollTrigger each time. They are static
 * per call site, so a single read is all that is needed — but that also means changing
 * them at runtime will not re-arm the reveal.
 */
export function useRevealOnScroll(
  scope: RefObject<HTMLElement | null>,
  options: RevealOptions = {}
) {
  // Snapshot only — never reassigned. Writing a ref during render is not allowed, and
  // there is nothing to re-read anyway: these values are fixed per call site.
  const optionsRef = useRef(options);

  useEffect(() => {
    const root = scope.current;
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const {
      selector = ".reveal",
      from = DEFAULT_FROM,
      to = DEFAULT_TO,
      duration = 0.9,
      stagger = 0,
      start = "top 85%",
    } = optionsRef.current;

    const ctx = gsap.context(() => {
      const items = gsap.utils.toArray<HTMLElement>(selector);
      if (!items.length) return;

      gsap.set(items, from);

      ScrollTrigger.batch(items, {
        start,
        once: true,
        onEnter: (batch) =>
          gsap.to(batch, { ...to, duration, stagger, ease: "power3.out", overwrite: true }),
      });
    }, root);

    return () => ctx.revert();
  }, [scope]);
}
