"use client";

import React, { useRef, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SECTION_IDS } from "@/constants/landing.constants";
import { getSteps } from "@/services/landing.service";
import { SectionHeading } from "@/components/ui/SectionHeading";

gsap.registerPlugin(ScrollTrigger);

const steps = getSteps();

/**
 * "How It Works" section with horizontal scroll-driven cards.
 * The section pins while the user scrolls, and cards slide left.
 */
export function HowItWorksSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const pinTarget = pinRef.current;
    const track = trackRef.current;
    if (!section || !pinTarget || !track) return;

    const prefersReduced = globalThis.matchMedia?.(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReduced) return;

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
          // Pin the inner wrapper, not the <section>. Pinning reparents its
          // target into a pin-spacer, and reparenting an element that sits in a
          // list of siblings breaks React's reconciliation of that list (it
          // throws removeChild NotFoundError when the page's sections change).
          pin: pinTarget,
          pinSpacing: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          // Snap back into a settled card position when a fast flick ends.
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
        className="min-h-svh flex flex-col justify-center py-24 sm:py-32 px-5 sm:px-8"
      >
        <div className="max-w-7xl mx-auto w-full mb-16">
          <SectionHeading
            title="Four Steps to Passive Revenue"
            subtitle="From wallet connection to automated earnings — get started in minutes."
            align="left"
            dark
          />
        </div>

        <div
          ref={trackRef}
          className="flex gap-8 max-w-7xl mx-auto w-full pl-0 will-change-transform"
        >
          {steps.map((step) => (
            <div
              key={step.number}
              className="flex-shrink-0 w-[85vw] sm:w-[420px] rounded-none border border-white/10 bg-white/[0.06] p-10 flex flex-col transition-colors duration-300 hover:border-white/20 hover:bg-white/[0.09]"
            >
              <span className="text-7xl font-heading text-brand-leaf/30 mb-6">
                0{step.number}
              </span>
              <h3 className="font-heading text-2xl text-white mb-4">
                {step.title}
              </h3>
              <p className="text-base leading-relaxed text-white/60">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
