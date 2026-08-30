"use client";

import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { setScrollLocked } from "@/components/ui/SmoothScrollProvider";
import { PRELOADER_TIMING, EASINGS } from "./preloader.constants";
import { PreloaderCounter, UNIT_PX } from "./PreloaderCounter";
import "./preloader.css";

interface VolsaPreloaderProps {
  onComplete?: () => void;
}

/**
 * The dial counts 0 to 100 once, then the whole overlay dissolves — no wipe,
 * no wordmark, nothing left to notice on the way out.
 */
export default function VolsaPreloader({ onComplete }: VolsaPreloaderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const numberRef = useRef<HTMLSpanElement>(null);

  // Read synchronously so a returning visitor never renders the dial at all —
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

      // --- PHASE 1: DIAL FADES IN ---
      masterTl.to(widgetRef.current, {
        opacity: 1,
        y: 0,
        duration: PRELOADER_TIMING.entranceDuration,
        ease: EASINGS.entrance,
      });

      // --- PHASE 2: 0 -> 100, one continuous scroll ---
      // A proxy value drives both the ruler's translateY and the readout's
      // text directly — a plain DOM write, not React state, so a ~60fps count
      // over ~2.5s never triggers a render.
      const counter = { v: 0 };
      masterTl.to(counter, {
        v: 100,
        duration: PRELOADER_TIMING.counterDuration,
        ease: EASINGS.counter,
        onUpdate: () => {
          if (trackRef.current) {
            trackRef.current.style.transform = `translateY(${counter.v * UNIT_PX}px)`;
          }
          if (numberRef.current) {
            const shown = Math.min(100, Math.floor(counter.v / 4) * 4);
            numberRef.current.textContent = String(shown);
          }
        },
      });

      // --- PHASE 3: HOLD AT 100 ---
      masterTl.to({}, { duration: PRELOADER_TIMING.holdDuration });

      // --- PHASE 4a: the dial itself goes first, against still-solid black —
      // the page underneath must never be visible at the same moment as the
      // counter, or the two read as one broken, overlapping frame.
      masterTl.to(widgetRef.current, {
        opacity: 0,
        duration: PRELOADER_TIMING.widgetExitDuration,
        ease: "power2.in",
      });

      // --- PHASE 4b: with nothing left on screen but solid black, THAT
      // dissolves — the only thing the page can ever cross-fade with is an
      // empty frame. ---
      masterTl.to(containerRef.current, {
        opacity: 0,
        duration: PRELOADER_TIMING.exitFadeDuration,
        ease: EASINGS.exit,
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
        <PreloaderCounter trackRef={trackRef} numberRef={numberRef} />
      </div>
    </div>
  );
}
