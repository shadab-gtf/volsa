"use client";

import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const STATEMENT_WORDS = [
  "We", "bring", "radical", "structure", "to", "decentralized",
  "Web3", "portfolios", "and", "the", "execution", "of", "AI", "intelligence."
];

const BAR_COUNT = 36;

/**
 * Editorial Statement Section with Word-by-Word Clip Path Reveal:
 * - Individual word clip-path mask reveal on scroll
 * - No italic styling — pure clean serif typography
 * - Continuous subtle sine-wave animation on vertical frequency bars
 *
 * The scroll-scrubbed growth and the endless idle float live on two nested
 * elements on purpose: pointing both at the same `scaleY` made the two tweens
 * overwrite each other every frame, which read as a stutter in the bars.
 */
export function StatementSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const textRef = useRef<HTMLHeadingElement>(null);
  const waveRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const textEl = textRef.current;
    const waveEl = waveRef.current;
    if (!section || !textEl || !waveEl) return;

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReduced) return;

    const words = textEl.querySelectorAll(".statement-word");
    const barShells = waveEl.querySelectorAll<HTMLDivElement>(".wave-bar");
    const barCores = waveEl.querySelectorAll<HTMLDivElement>(".wave-bar-core");

    const ctx = gsap.context(() => {
      // 1. Word-by-word clip-path mask reveal on scroll scrub
      gsap.fromTo(
        words,
        { yPercent: 115, opacity: 0 },
        {
          yPercent: 0,
          opacity: 1,
          duration: 1.2,
          stagger: 0.05,
          ease: "power3.out",
          scrollTrigger: {
            trigger: section,
            start: "top 78%",
            end: "top 25%",
            scrub: 0.8,
          },
        }
      );

      // 2. Wave bar shells grow with scroll. Scale only — tweening opacity here
      //    flattened the per-bar centre falloff set in the markup.
      gsap.fromTo(
        barShells,
        { scaleY: 0.2 },
        {
          scaleY: 1,
          duration: 1.5,
          stagger: { amount: 0.5, from: "center" },
          ease: "power3.out",
          scrollTrigger: {
            trigger: section,
            start: "top 85%",
            end: "bottom 30%",
            scrub: 1,
          },
        }
      );

      // 3. Continuous gentle idle float — on the inner core, so it composes
      //    with the scrubbed shell scale instead of fighting it.
      barCores.forEach((core, idx) => {
        gsap.to(core, {
          scaleY: 1.15,
          duration: 1.8 + (idx % 5) * 0.3,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          delay: (idx % 7) * 0.12,
        });
      });
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative w-full min-h-[75svh] flex items-center justify-between overflow-hidden bg-[#eaf7e2]/70 py-28 px-6 sm:px-16"
    >
      <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left Editorial Text — Word-by-Word Clip Path Masking */}
        <div className="lg:col-span-8 z-10">
          <h2
            ref={textRef}
            className="font-heading text-3xl sm:text-5xl lg:text-6xl text-brand-forest leading-[1.3] tracking-tight flex flex-wrap"
          >
            {STATEMENT_WORDS.map((word, idx) => (
              <span
                key={idx}
                className="inline-block overflow-hidden py-1 mr-[0.28em] align-bottom"
              >
                <span className="statement-word inline-block font-heading text-brand-forest font-normal">
                  {word}
                </span>
              </span>
            ))}
          </h2>
        </div>

        {/* Right Vertical Frequency Wave Graphic */}
        <div className="lg:col-span-4 flex justify-end">
          <div
            ref={waveRef}
            className="flex items-center gap-1.5 sm:gap-2 h-72 sm:h-[400px] overflow-hidden opacity-90"
          >
            {Array.from({ length: BAR_COUNT }).map((_, i) => {
              const centerDist = Math.abs(i - BAR_COUNT / 2) / (BAR_COUNT / 2);
              const heightPercent = parseFloat(
                Math.max(25, Math.sin((i / BAR_COUNT) * Math.PI) * 100).toFixed(4)
              );
              const opacity = parseFloat((0.35 + (1 - centerDist) * 0.65).toFixed(4));

              return (
                <div
                  key={i}
                  className="wave-bar w-1.5 sm:w-2 origin-center"
                  style={{
                    height: `${heightPercent}%`,
                    opacity,
                  }}
                >
                  <div
                    className="wave-bar-core w-full h-full rounded-full origin-center will-change-transform"
                    style={{
                      background:
                        "linear-gradient(180deg, #66B616 0%, #22480B 65%, rgba(34, 72, 11, 0.1) 100%)",
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
