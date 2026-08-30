"use client";

import { useEffect, type RefObject } from "react";

/**
 * Publishes the pointer's position inside an element as two CSS custom properties,
 * `--px` and `--py`, each normalised to -1..1 from the element's centre.
 *
 * The point is that JavaScript then does nothing else. One listener, coalesced to a
 * single write per frame, sets two numbers on one node; any number of descendants can
 * read them in a `calc()` transform and animate on the compositor. Driving each element
 * from JS instead would mean a style write per element per frame.
 *
 * Opts out on touch and under reduced-motion, where the vars simply stay at their
 * declared defaults and everything renders in its neutral position.
 */
export function usePointerField(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const canHover = window.matchMedia(
      "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)"
    ).matches;
    if (!canHover) return;

    let queued = false;
    let clientX = 0;
    let clientY = 0;

    const flush = () => {
      queued = false;
      // One layout read per frame, and nothing is written before it — reads and writes
      // stay in separate phases, so this never thrashes.
      const rect = el.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      el.style.setProperty("--px", (((clientX - rect.left) / rect.width - 0.5) * 2).toFixed(3));
      el.style.setProperty("--py", (((clientY - rect.top) / rect.height - 0.5) * 2).toFixed(3));
    };

    const onPointerMove = (event: PointerEvent) => {
      clientX = event.clientX;
      clientY = event.clientY;
      if (!queued) {
        queued = true;
        requestAnimationFrame(flush);
      }
    };

    const onPointerLeave = () => {
      el.style.setProperty("--px", "0");
      el.style.setProperty("--py", "0");
    };

    el.addEventListener("pointermove", onPointerMove, { passive: true });
    el.addEventListener("pointerleave", onPointerLeave);

    return () => {
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerleave", onPointerLeave);
    };
  }, [ref]);
}
