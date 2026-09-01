"use client";

import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { setScrollLocked } from "@/components/ui/SmoothScrollProvider";
import { PRELOADER_TIMING, EASINGS } from "./preloader.constants";
import { PreloaderCounter } from "./PreloaderCounter";
import "./preloader.css";

interface VolsaPreloaderProps {
  onComplete?: () => void;
}

const PETAL_COUNT = 4;
const PETAL_SPAN = 100 / PETAL_COUNT; // each petal owns a 25-point slice of the count

/**
 * The mark counts 0 to 100 once, filling one petal per 25-point slice. At
 * 100 the whole overlay wipes away bottom-to-top, revealing the page
 * beneath directly — no separate cross-fade needed, since a clip-path wipe
 * exposes the real page as it goes rather than an invisible black-on-black
 * transform.
 */
export default function VolsaPreloader({ onComplete }: VolsaPreloaderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<HTMLDivElement>(null);
  const numberRef = useRef<HTMLSpanElement>(null);
  const petalFillRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Read synchronously so a returning visitor never renders the mark at all —
  // setting this from inside the effect below would flash one frame of it first.
  const [isCompleted, setIsCompleted] = useState(() => {
    if (typeof window !== "undefined" && process.env.NODE_ENV === "production") {
      return sessionStorage.getItem("volsa-preloader-seen") === "true";
    }
    return false;
  });

  useEffect(() => {
    if (isCompleted) {
      if (onComplete) onComplete();
      return;
    }

    // 2. Prefers Reduced Motion Check
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      const timer = setTimeout(() => {
        setIsCompleted(true);
        sessionStorage.setItem("volsa-preloader-seen", "true");
        if (onComplete) onComplete();
      }, 500);
      return () => clearTimeout(timer);
    }

    // Prevent scrolling during the intro. Goes through Lenis — it drives scroll
    // from wheel/touch events, so `body { overflow: hidden }` alone won't hold it.
    setScrollLocked(true);

    const ctx = gsap.context(() => {
      const masterTl = gsap.timeline({
        onComplete: () => {
          setScrollLocked(false);
          sessionStorage.setItem("volsa-preloader-seen", "true");
          window.dispatchEvent(new CustomEvent("volsa-preloader-done"));
          // Everything was measured behind a locked, overlaid page — remeasure
          // now that the real layout is visible and scrollable.
          ScrollTrigger.refresh();
          setIsCompleted(true);
          if (onComplete) onComplete();
        },
      });

      masterTl.set(widgetRef.current, { opacity: 0, y: 16 });
      masterTl.set(containerRef.current, { clipPath: "inset(0% 0% 0% 0%)" });

      // --- PHASE 1: MARK FADES IN ---
      masterTl.to(widgetRef.current, {
        opacity: 1,
        y: 0,
        duration: PRELOADER_TIMING.entranceDuration,
        ease: EASINGS.entrance,
      });

      // --- PHASE 2: 0 -> 100, one continuous count ---
      // A proxy value drives the readout's text and each petal's fill —
      // direct DOM writes, not React state, so a ~60fps count never
      // triggers a render. Each petal owns one 25-point slice: fully filled
      // once the count has passed it, fully empty before it's reached.
      const counter = { v: 0 };
      masterTl.to(counter, {
        v: 100,
        duration: PRELOADER_TIMING.counterDuration,
        ease: EASINGS.counter,
        onUpdate: () => {
          if (numberRef.current) {
            numberRef.current.textContent = String(Math.floor(counter.v));
          }
          petalFillRefs.current.forEach((el, i) => {
            if (!el) return;
            const progress = Math.min(
              1,
              Math.max(0, (counter.v - i * PETAL_SPAN) / PETAL_SPAN)
            );
            el.style.clipPath = `inset(${(1 - progress) * 100}% 0 0 0)`;
          });
        },
      });

      // --- PHASE 3: HOLD AT 100 ---
      masterTl.to({}, { duration: PRELOADER_TIMING.holdDuration });

      // --- PHASE 4: the whole overlay wipes away bottom-to-top, revealing
      // the page beneath as it goes — mark, readout and background all
      // travel together since they're all inside the clipped container. ---
      masterTl.to(containerRef.current, {
        clipPath: "inset(0% 0% 100% 0%)",
        duration: PRELOADER_TIMING.exitWipeDuration,
        ease: EASINGS.exitWipe,
      });
    }, containerRef);

    return () => {
      setScrollLocked(false);
      ctx.revert();
    };
    // `isCompleted` is read only for its mount-time value (the lazy initializer
    // above); it also flips true from inside this same effect's own callbacks,
    // so tracking it as a dependency would re-run this effect on completion.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onComplete]);

  if (isCompleted) return null;

  return (
    <div ref={containerRef} className="volsa-preloader-overlay bg-black">
      <div ref={widgetRef} className="flex h-full w-full items-center justify-center">
        <PreloaderCounter numberRef={numberRef} petalFillRefs={petalFillRefs} />
      </div>
    </div>
  );
}
