"use client";

import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SECTION_IDS } from "@/constants/landing.constants";
import { HeroBackground } from "./HeroBackground";
import { usePreloaderDone } from "@/hooks/usePreloaderDone";

gsap.registerPlugin(ScrollTrigger);

/**
 * Hero section matching the exact typography, structure, and aesthetic of the reference design:
 * - 100vh height
 * - Hardware-accelerated mouse parallax (quickTo — one reused tween, no per-event churn)
 * - Scroll-linked lift + fade so the hero hands off to the next section
 * - Glowing organic color blob background overlay
 * - Headline, Subheading, and CTAs animate bottom-to-initial AFTER loader completes
 */
export function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const parallaxRef = useRef<HTMLDivElement>(null);
  const isPreloaderDone = usePreloaderDone();

  // 1. Entrance animation after preloader completes
  useEffect(() => {
    const container = contentRef.current;
    if (!container || !isPreloaderDone) return;

    const children = container.querySelectorAll(".hero-animate-item");

    const tween = gsap.fromTo(
      children,
      { y: 60, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 1.1,
        stagger: 0.12,
        delay: 0.15,
        ease: "power3.out",
      }
    );

    return () => {
      tween.kill();
    };
  }, [isPreloaderDone]);

  // 2. Mouse parallax — a single reused quickTo tween per axis.
  //    gsap.to() on every mousemove allocates a fresh tween ~60×/second.
  useEffect(() => {
    const target = parallaxRef.current;
    if (!target || !isPreloaderDone) return;

    // Pointer parallax is meaningless on touch, and reduced motion opts out.
    const canHover = window.matchMedia(
      "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)"
    ).matches;
    if (!canHover) return;

    const moveX = gsap.quickTo(target, "x", { duration: 1.1, ease: "power3.out" });
    const moveY = gsap.quickTo(target, "y", { duration: 1.1, ease: "power3.out" });

    let queued = false;
    let clientX = 0;
    let clientY = 0;

    // Coalesce bursts of pointer events down to one write per frame.
    function flush() {
      queued = false;
      moveX((clientX / window.innerWidth - 0.5) * 20);
      moveY((clientY / window.innerHeight - 0.5) * 20);
    }

    function onPointerMove(e: PointerEvent) {
      clientX = e.clientX;
      clientY = e.clientY;
      if (!queued) {
        queued = true;
        requestAnimationFrame(flush);
      }
    }

    window.addEventListener("pointermove", onPointerMove, { passive: true });

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      gsap.killTweensOf(target);
    };
  }, [isPreloaderDone]);

  // 3. Scroll-linked hand-off: content lifts and fades as the hero leaves.
  useEffect(() => {
    const section = sectionRef.current;
    const content = contentRef.current;
    if (!section || !content) return;

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReduced) return;

    const ctx = gsap.context(() => {
      gsap.to(content, {
        yPercent: -14,
        opacity: 0.15,
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id={SECTION_IDS.hero}
      className="relative w-full h-svh min-h-svh flex flex-col items-center justify-center pt-20 px-6 sm:px-12 overflow-hidden bg-[#f7fdf4]"
    >
      {/* Generative Glowing Blob Background */}
      <HeroBackground />

      {/* Hero Core Content Header with Parallax */}
      <div
        ref={contentRef}
        className="relative z-10 max-w-5xl mx-auto text-center w-full will-change-transform"
      >
        <div ref={parallaxRef} className="will-change-transform">
          {/* Headline */}
          <div className="hero-animate-item mb-8 opacity-0">
            <h1 className="font-heading text-5xl sm:text-7xl lg:text-8xl text-brand-forest leading-[1.05] tracking-tight font-normal">
              Where Web3 AI <br />
              finds balance.
            </h1>
          </div>

          {/* Subheading */}
          <div className="hero-animate-item max-w-xl mx-auto mb-10 opacity-0">
            <p className="text-sm sm:text-base text-brand-dark/70 font-sans leading-relaxed font-light">
              VOLSA is an infrastructure platform for deploying and executing autonomous
              AI agents. Every position is analyzed, priced, and executed within systems
              designed for absolute control.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="hero-animate-item flex flex-row items-center justify-center gap-6 opacity-0">
            <a
              href="#"
              className="rounded-none bg-brand-forest px-7 py-3.5 text-xs sm:text-sm font-heading font-semibold text-white transition-all duration-300 ease-out hover:bg-brand-dark hover:-translate-y-0.5 shadow-md hover:shadow-lg"
            >
              Launch App
            </a>
            <a
              href={`#${SECTION_IDS.features}`}
              className="text-xs sm:text-sm font-heading font-medium text-brand-dark/80 underline underline-offset-8 decoration-brand-dark/30 hover:decoration-brand-forest hover:text-brand-forest transition-all duration-300 ease-out"
            >
              View Infrastructure
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
