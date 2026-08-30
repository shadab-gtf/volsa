"use client";

import React, { useRef, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SECTION_IDS } from "@/constants/landing.constants";
import { getSteps, type Step } from "@/services/landing.service";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

gsap.registerPlugin(ScrollTrigger);

const steps = getSteps();

/**
 * How it works — the header pins, the steps scroll.
 *
 * Vertical scroll drives horizontal motion: the eyebrow and heading hold their
 * place while the cards underneath travel left — two full cards in frame at a
 * time on a wide screen. One tween against one measured distance, not a
 * trigger per card.
 */
export function HowItWorksSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const pinTarget = pinRef.current;
    const track = trackRef.current;
    if (!section || !pinTarget || !track) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Measured through a function so `invalidateOnRefresh` picks up the new
    // value on resize — a captured constant left the track short or overshooting.
    const distance = () => Math.max(0, track.scrollWidth - section.clientWidth);

    const ctx = gsap.context(() => {
      gsap.to(track, {
        x: () => -distance(),
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: () => `+=${distance()}`,
          scrub: 0.6,
          // Pin the inner wrapper, not the <section>: pinning reparents its
          // target into a pin-spacer, and reparenting an element that sits in
          // a list of siblings breaks React's reconciliation of that list.
          pin: pinTarget,
          pinSpacing: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          fastScrollEnd: true,
        },
      });
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id={SECTION_IDS.howItWorks}
      className="relative w-full overflow-hidden bg-brand-dark text-white"
    >
      <div
        ref={pinRef}
        className="steps-pin flex min-h-svh flex-col justify-start gap-10 pt-20 pb-16 sm:gap-12 sm:pt-24 sm:pb-20 lg:gap-14"
      >
        <div className="max-w-384 mx-auto w-full px-5 sm:px-8">
          <ScrollReveal className="max-w-2xl">
            <span className="block text-[11px] font-sans font-bold uppercase tracking-[0.24em] text-brand-leaf">
              How it works
            </span>
            <h2 className="mt-5 font-heading text-4xl leading-[1.08] tracking-tight text-white sm:text-5xl">
              Four steps, then it runs itself
            </h2>
          </ScrollReveal>
        </div>

        <div
          ref={trackRef}
          className="steps-track flex w-full gap-6 px-5 will-change-transform sm:px-8 lg:gap-8"
        >
          {steps.map((step) => (
            <StepCard key={step.number} step={step} />
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Step card ───────────────────────────────────────────

function StepCard({ step }: { step: Step }) {
  return (
    <article className="group relative flex h-full min-h-[320px] w-[82vw] flex-shrink-0 flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 transition-colors duration-300 hover:border-white/20 hover:bg-white/[0.07] sm:min-h-[360px] sm:w-[60vw] sm:p-9 lg:min-h-[400px] lg:w-[44vw] lg:p-12 xl:w-[38vw]">
      <span className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-brand-leaf lg:h-20 lg:w-20">
        <StepGlyph number={step.number} />
      </span>
      <h3 className="mt-10 font-heading text-2xl leading-snug tracking-tight text-white sm:text-3xl">
        {step.title}
      </h3>
      <p className="mt-4 max-w-md text-base font-light leading-relaxed text-white/60">
        {step.description}
      </p>
    </article>
  );
}

// ─── Step glyph (hairline icons — no gradient fills) ─────

function StepGlyph({ number }: { number: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-8 w-8 lg:h-10 lg:w-10"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {number === 1 && (
        <>
          <rect x="3" y="6" width="18" height="13" rx="2.5" />
          <path d="M3 10h18" />
          <path d="M7.5 4.2h9" opacity="0.5" />
          <circle cx="16.5" cy="14.5" r="1.3" fill="currentColor" stroke="none" />
        </>
      )}
      {number === 2 && (
        <>
          <path d="M4 7h16M4 12h16M4 17h16" />
          <circle cx="9" cy="7" r="1.9" fill="var(--brand-dark)" />
          <circle cx="16" cy="12" r="1.9" fill="var(--brand-dark)" />
          <circle cx="11" cy="17" r="1.9" fill="var(--brand-dark)" />
          <path d="M9 4v1M16 9.5v1M11 14.5v1" strokeWidth="1" opacity="0.55" />
        </>
      )}
      {number === 3 && (
        <>
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="3.6" />
          <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
          <path d="M20 4 L13.7 10.3" strokeWidth="1.3" />
          <path d="M20 4 L20 7.4 M20 4 L16.6 4" strokeWidth="1.3" />
        </>
      )}
      {number === 4 && (
        <>
          <path d="M4 19V13M10.5 19V9M17 19V5" />
          <path d="M4 15.2 L10.5 10.6 L17 5" strokeWidth="1.2" opacity="0.7" />
          <circle cx="17" cy="5" r="1.2" fill="currentColor" stroke="none" />
        </>
      )}
    </svg>
  );
}
