"use client";

import React, { useEffect, useRef, type ReactNode } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/** Height of the fixed navbar — anchor scrolls stop just below it. */
const NAV_OFFSET = 88;

let lenisInstance: Lenis | null = null;

/** Access the live Lenis instance (null before mount / when reduced motion is on). */
export function getLenis(): Lenis | null {
  return lenisInstance;
}

/**
 * Locks/unlocks page scrolling through Lenis instead of `body.overflow`,
 * which Lenis ignores (it drives scroll itself via wheel/touch events).
 */
export function setScrollLocked(locked: boolean) {
  // Both paths are applied unconditionally: components can lock before Lenis
  // exists (child effects run before the provider's), and clearing only the
  // half that happens to be active would leave the page stuck.
  document.documentElement.style.overflow = locked ? "hidden" : "";
  if (locked) lenisInstance?.stop();
  else lenisInstance?.start();
}

/**
 * Scrolls to a hash target, unlocking first. Needed for links inside a locked
 * overlay: Lenis ignores its own anchor handling while stopped, so the click
 * would otherwise do nothing at all.
 */
export function scrollToTarget(hash: string, opts?: { duration?: number }) {
  const lenis = getLenis();
  if (lenis) {
    setScrollLocked(false);
    lenis.scrollTo(hash, {
      offset: -NAV_OFFSET,
      duration: opts?.duration ?? 1.1,
      force: true,
    });
    return;
  }

  document.documentElement.style.overflow = "";
  document.querySelector(hash)?.scrollIntoView({ behavior: "smooth" });
}

/**
 * Subscribes to scroll position through Lenis' own callback — same frame as the
 * scroll write, so anything driven by it can't lag a frame behind the page.
 * Falls back to native scroll events when smooth scrolling is off.
 */
export function useScrollPosition(onScroll: (scrollY: number) => void) {
  const callbackRef = useRef(onScroll);
  useEffect(() => {
    callbackRef.current = onScroll;
  }, [onScroll]);

  useEffect(() => {
    let detach: (() => void) | null = null;
    let cancelled = false;

    const lenisHandler = ({ scroll }: { scroll: number }) =>
      callbackRef.current(scroll);
    const nativeHandler = () => callbackRef.current(window.scrollY);

    // Deferred one frame: the provider creating Lenis is a parent component, and
    // parent effects run *after* child effects within the same commit.
    const raf = requestAnimationFrame(() => {
      if (cancelled) return;

      const lenis = getLenis();
      if (lenis) {
        lenis.on("scroll", lenisHandler);
        detach = () => lenis.off("scroll", lenisHandler);
      } else {
        window.addEventListener("scroll", nativeHandler, { passive: true });
        detach = () => window.removeEventListener("scroll", nativeHandler);
      }

      callbackRef.current(window.scrollY);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      detach?.();
    };
  }, []);
}

/**
 * Lenis smooth scroll provider — single source of truth for the scroll loop.
 *
 * Smoothness essentials handled here:
 * - `autoRaf: false` so Lenis is stepped ONLY by the GSAP ticker. Leaving Lenis'
 *   own rAF on would advance the scroll twice per frame (double easing = jitter).
 * - Frame-perfect ScrollTrigger sync: Lenis updates scroll → ScrollTrigger reads
 *   in the same frame, so pinned/scrubbed sections never lag a frame behind.
 * - lerp-based easing (frame-rate independent) instead of duration + custom ease.
 * - Anchor links glide instead of jumping, offset for the fixed navbar.
 */
export function SmoothScrollProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) return;

    // Consistent motion language for every tween that doesn't override it.
    gsap.defaults({ ease: "power3.out", duration: 1 });
    ScrollTrigger.config({
      // Mobile browsers fire resize on URL-bar show/hide — refreshing there
      // causes visible jumps in pinned sections.
      ignoreMobileResize: true,
    });

    const lenis = new Lenis({
      lerp: 0.085,
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.6,
      // Native touch scrolling is smoother than synthesised touch on mobile.
      syncTouch: false,
      gestureOrientation: "vertical",
      overscroll: false,
      autoResize: true,
      autoRaf: false,
      anchors: { offset: -NAV_OFFSET, duration: 1.1 },
    });

    lenisInstance = lenis;

    // Lenis drives ScrollTrigger, same frame.
    lenis.on("scroll", ScrollTrigger.update);

    function tick(time: number) {
      // GSAP ticker time is in seconds, Lenis expects milliseconds.
      lenis.raf(time * 1000);
    }

    gsap.ticker.add(tick);
    // Never "catch up" after a stall — catching up produces a visible lurch.
    gsap.ticker.lagSmoothing(0);

    // Keep Lenis' cached dimensions and ScrollTrigger's measurements in step.
    const onRefresh = () => lenis.resize();
    ScrollTrigger.addEventListener("refresh", onRefresh);

    // Fonts land after first paint and shift layout — remeasure once they do.
    document.fonts?.ready.then(() => ScrollTrigger.refresh());
    ScrollTrigger.refresh();

    return () => {
      ScrollTrigger.removeEventListener("refresh", onRefresh);
      gsap.ticker.remove(tick);
      lenis.destroy();
      lenisInstance = null;
    };
  }, []);

  return <>{children}</>;
}
