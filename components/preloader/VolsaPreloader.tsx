"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { setScrollLocked } from "@/components/ui/SmoothScrollProvider";
import {
  NUM_COLUMNS,
  PRELOADER_TIMING,
  EASINGS,
} from "./preloader.constants";
import {
  initPreloaderSounds,
  playLogoSound,
  playBlindsSound,
} from "./sound";
import "./preloader.css";

interface VolsaPreloaderProps {
  onComplete?: () => void;
}

export default function VolsaPreloader({ onComplete }: VolsaPreloaderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLImageElement>(null);
  const blindsRef = useRef<HTMLDivElement>(null);

  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    // 1. Session Storage First-Visit Check (Only skip in production)
    if (typeof window !== "undefined" && process.env.NODE_ENV === "production") {
      const hasSeen = sessionStorage.getItem("volsa-preloader-seen");
      if (hasSeen === "true") {
        setIsCompleted(true);
        if (onComplete) onComplete();
        return;
      }
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

    // Initialize Howler sounds
    initPreloaderSounds();

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

      // Initial positions
      masterTl.set(".volsa-column-bar", {
        yPercent: 0,
      });

      masterTl.set(logoRef.current, {
        opacity: 0,
        scale: 0.9,
        y: 20,
      });

      // --- PHASE 1: BRAND LOGO REVEAL ---
      masterTl.to(logoRef.current, {
        opacity: 1,
        scale: 1,
        y: 0,
        duration: 0.7,
        ease: "power3.out",
        onStart: () => {
          playLogoSound();
        },
      });

      // --- PHASE 2: LOCKUP HOLD ---
      masterTl.to({}, { duration: PRELOADER_TIMING.holdDuration });

      // --- PHASE 3: VERTICAL VENETIAN BLINDS WIPE EXIT ---
      masterTl.to(logoRef.current, {
        opacity: 0,
        scale: 1.05,
        duration: 0.4,
        ease: "power2.in",
        onStart: () => {
          playBlindsSound();
        },
      });

      // Staggered vertical column bars wipe out of view
      masterTl.to(
        ".volsa-column-bar",
        {
          yPercent: (index) => (index % 2 === 0 ? -100 : 100),
          duration: PRELOADER_TIMING.blindsDuration,
          stagger: {
            amount: PRELOADER_TIMING.blindsStagger * NUM_COLUMNS,
            from: "center",
          },
          ease: EASINGS.blinds,
        },
        "-=0.2"
      );
    }, containerRef);

    return () => {
      setScrollLocked(false);
      ctx.revert();
    };
  }, [onComplete]);

  if (isCompleted) return null;

  return (
    <div ref={containerRef} className="volsa-preloader-overlay">
      {/* Venetian Blinds Column Grid Layer */}
      <div ref={blindsRef} className="volsa-blinds-container">
        {Array.from({ length: NUM_COLUMNS }).map((_, i) => (
          <div key={i} className="volsa-column-bar" />
        ))}
      </div>

      {/* Centered VOLSA Brand Logo Image Layer */}
      <div className="volsa-logo-layer">
        <div className="volsa-logo-stage">
          <Image
            ref={logoRef}
            src="/images/v-full.png"
            alt="VOLSA Brand Logo"
            width={400}
            height={200}
            className="w-full max-w-[280px] sm:max-w-[380px] h-auto object-contain drop-shadow-lg"
            priority
          />
        </div>
      </div>
    </div>
  );
}
