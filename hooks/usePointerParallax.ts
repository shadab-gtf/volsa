"use client";

import { useEffect, type RefObject } from "react";
import gsap from "gsap";

interface PointerParallaxOptions {
  /** Peak offset in pixels at the edges of the viewport. */
  strength?: number;
  /** Gate the effect — useful while a preloader still owns the screen. */
  enabled?: boolean;
}

/**
 * Hardware-accelerated pointer parallax on a single element.
 *
 * Two reused `quickTo` tweens rather than a fresh `gsap.to()` per event, which would
 * allocate roughly sixty tweens a second, and pointer bursts are coalesced down to one
 * write per frame. Opts out entirely on touch and under reduced-motion, where the
 * effect is respectively meaningless and unwanted.
 */
export function usePointerParallax(
  ref: RefObject<HTMLElement | null>,
  { strength = 20, enabled = true }: PointerParallaxOptions = {}
) {
  useEffect(() => {
    const target = ref.current;
    if (!target || !enabled) return;

    const canHover = window.matchMedia(
      "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)"
    ).matches;
    if (!canHover) return;

    const moveX = gsap.quickTo(target, "x", { duration: 1.1, ease: "power3.out" });
    const moveY = gsap.quickTo(target, "y", { duration: 1.1, ease: "power3.out" });

    let queued = false;
    let clientX = 0;
    let clientY = 0;

    const flush = () => {
      queued = false;
      moveX((clientX / window.innerWidth - 0.5) * strength);
      moveY((clientY / window.innerHeight - 0.5) * strength);
    };

    const onPointerMove = (event: PointerEvent) => {
      clientX = event.clientX;
      clientY = event.clientY;
      if (!queued) {
        queued = true;
        requestAnimationFrame(flush);
      }
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      gsap.killTweensOf(target);
    };
  }, [ref, strength, enabled]);
}
