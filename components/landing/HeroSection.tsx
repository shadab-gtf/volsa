"use client";

import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SECTION_IDS } from "@/constants/landing.constants";
import { getHero } from "@/services/landing.service";
import { Button } from "@/components/ui/Button";
import { usePreloaderDone } from "@/hooks/usePreloaderDone";
import { usePointerParallax } from "@/hooks/usePointerParallax";
import { HeroBackground } from "./HeroBackground";
import { SignalCard } from "./hero/SignalCard";

gsap.registerPlugin(ScrollTrigger);

const hero = getHero();

/**
 * Hero — copy on the left, a live sample of the product on the right.
 *
 * Copy comes from `getHero()`, so wording and line breaks change without touching this
 * file. Three motion layers, each deliberately cheap:
 *   1. Entrance, gated on the preloader — one timeline, transform/opacity only.
 *   2. Pointer parallax via a shared hook (coalesced, opt-out on touch).
 *   3. A scrubbed lift/fade that hands the screen over to the next section.
 */
export function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const parallaxRef = useRef<HTMLDivElement>(null);
  const isPreloaderDone = usePreloaderDone();

  usePointerParallax(parallaxRef, { strength: 16, enabled: isPreloaderDone });

  // Entrance. The headline rides up out of a clipping mask while everything else rises
  // and fades, overlapped so the whole thing reads as one movement.
  //
  // Every start value lives in the `fromTo`, never in a CSS transform: GSAP resolves
  // computed transforms to a pixel matrix, so a CSS `translateY(110%)` reads back as
  // yPercent 0 and animating yPercent to 0 becomes a no-op that strands the line under
  // its mask.
  useEffect(() => {
    if (!isPreloaderDone) return;

    const ctx = gsap.context(() => {
      gsap
        .timeline({ delay: 0.15, defaults: { ease: "power3.out" } })
        .fromTo(".hero-eyebrow", { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7 })
        .fromTo(
          ".hero-line",
          { yPercent: 110 },
          { yPercent: 0, duration: 1.15, stagger: 0.09, ease: "power4.out" },
          "-=0.45"
        )
        .fromTo(
          ".hero-rise",
          { y: 26, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.9, stagger: 0.1 },
          "-=0.8"
        );
    }, sectionRef);

    return () => ctx.revert();
  }, [isPreloaderDone]);

  // Scroll hand-off: the hero lifts and dims as the next section takes over.
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = gsap.context(() => {
      gsap.to(contentRef.current, {
        yPercent: -10,
        opacity: 0.15,
        ease: "none",
        scrollTrigger: { trigger: section, start: "top top", end: "bottom top", scrub: true },
      });
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id={SECTION_IDS.hero}
      className="relative flex min-h-svh w-full items-center overflow-hidden bg-surface px-6 pt-28 pb-20 sm:px-10 lg:px-14 lg:pt-24 lg:pb-12 xl:px-16"
    >
      <HeroBackground />

      <div
        ref={contentRef}
        className="relative z-10 mx-auto grid w-full max-w-[96rem] items-center gap-14 will-change-transform lg:grid-cols-[1fr_minmax(0,28rem)] lg:items-stretch lg:gap-20"
      >
        {/* ── Copy ── */}
        <div ref={parallaxRef} className="will-change-transform lg:self-center">
          <p className="hero-eyebrow mb-6 font-sans text-[10px] font-bold uppercase tracking-[0.28em] text-foreground/55 opacity-0 sm:text-xs">
            {hero.eyebrow}
          </p>

          {/* One clamp replaces four breakpoints. The rem ceiling matters: the grid
              caps at max-w-[96rem], so a purely vw-driven size would outgrow its column
              on wide screens and wrap — and a wrapped line breaks the mask reveal,
              which assumes one authored line renders as exactly one row. */}
          <h1 className="font-heading text-[clamp(1.9rem,4.4vw,4rem)] font-normal leading-[1.08] tracking-tight text-foreground">
            {hero.headline.map((line) => (
              <span key={line} className="block overflow-hidden pb-[0.08em]">
                <span className="hero-line block whitespace-nowrap">{line}</span>
              </span>
            ))}
          </h1>

          <p className="hero-rise mt-7 max-w-xl font-sans text-sm font-light leading-relaxed text-foreground/70 opacity-0 sm:text-base">
            {hero.subhead}
          </p>

          <div className="hero-rise mt-9 flex flex-col items-start gap-4 opacity-0 sm:flex-row sm:items-center sm:gap-5">
            <Button href={hero.primaryCta.href} variant="primary" size="md">
              {hero.primaryCta.label}
            </Button>
            <Button href={hero.secondaryCta.href} variant="ghost" size="md" className="group">
              {hero.secondaryCta.label}
              <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
            </Button>
          </div>

          {/* Control spectrum. Rendered from the array, so adding a mode is a data
              change — the connectors index themselves. */}
          <div className="hero-rise mt-12 flex items-center gap-3 font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-foreground/45 opacity-0 sm:gap-4 sm:text-[11px]">
            {hero.spectrum.map((label, index) => (
              <React.Fragment key={label}>
                {index > 0 && <span aria-hidden className="h-px w-5 bg-foreground/25 sm:w-8" />}
                <span>{label}</span>
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* ── Product proof ── */}
        <div className="flex justify-center lg:h-[calc(100svh-9rem)] lg:max-h-184">
          <SignalCard />
        </div>
      </div>
    </section>
  );
}

export default HeroSection;
