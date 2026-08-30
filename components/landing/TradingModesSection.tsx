"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { SECTION_IDS } from "@/constants/landing.constants";
import { getTradingModes, type StageOwner } from "@/services/landing.service";
import { MaskedHeading } from "@/components/ui/MaskedHeading";
import { useRevealOnScroll } from "@/hooks/useRevealOnScroll";

const content = getTradingModes();

/**
 * The machine's share of a stage, as a fraction. This is the only number in the
 * section, and every mark on screen is drawn from it: the gauge height, the level line,
 * the weight of the label. One value, one meaning.
 */
const SHARE: Record<StageOwner, number> = { you: 0, shared: 0.5, machine: 1 };

/** Milliseconds a mode holds before the section moves itself on. */
const DWELL = 5200;

/**
 * Trading Modes.
 *
 * Three modes, but not three products: one axis, along which the only thing that moves
 * is how many stages of a trade you keep. So the section is built as that axis rather
 * than as three cards — the same three columns stay on screen the whole time and only
 * their fill changes, which shows the handover instead of asserting it.
 *
 * It demonstrates itself until you touch it, and then it is yours: the first deliberate
 * choice stops the rotation for good. Nothing auto-advances behind your back once you
 * have shown you are driving.
 *
 * The ground is `brand-dark`, not the semantic `background`. The two resolve to the
 * same near-black only while the OS is in dark mode — `background` is mint in light —
 * so pointing at the semantic token would have made the section flip colour with the
 * viewer's OS while every other section on this light-only page stayed put.
 *
 * Three tiers, not one hue: brand-leaf is reserved for the active/selected state (the
 * chosen mode, its gauge, its level line) — the one thing actually changing. Headings
 * and direct-answer copy read in white; everything supporting or explanatory sits in
 * the muted brand-slate. Leaf stops meaning anything once it stops being exclusive to
 * the live selection.
 *
 * Everything that moves is a `transform` or an `opacity` on the compositor. There is no
 * scroll pin, no timeline and no WebGL here on purpose — the section before it already
 * takes nine screens of scroll, and a second hijack immediately after would read as a
 * page that will not let go.
 */
export function TradingModesSection() {
  const root = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const [taken, setTaken] = useState(false);
  const [live, setLive] = useState(false);

  useRevealOnScroll(root, { selector: ".tm-reveal", stagger: 0.08, start: "top 78%" });

  const choose = useCallback((i: number) => {
    setActive(i);
    setTaken(true);
  }, []);

  // Only ever runs while the section is actually on screen. A carousel cycling in a
  // part of the page nobody is looking at is pure waste, and it also means the reader
  // arrives at the first mode rather than halfway through the third.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const observer = new IntersectionObserver(([e]) => setLive(e.isIntersecting), {
      threshold: 0.4,
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!live || taken) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(
      () => setActive((i) => (i + 1) % content.modes.length),
      DWELL
    );
    return () => window.clearInterval(id);
  }, [live, taken]);

  const mode = content.modes[active];

  return (
    <section
      ref={root}
      id={SECTION_IDS.tradingModes}
      className="relative flex w-full flex-col justify-center bg-brand-dark px-6 py-24 sm:px-10 lg:min-h-svh lg:px-14 lg:py-28 xl:px-16"
    >
      <style>{`
        /* Re-mounted on every mode change, so the copy is written on rather than
           swapped. The clip edge travels with the rise; the two are one gesture. */
        @keyframes tmEnter {
          from { opacity: 0; transform: translateY(16px); clip-path: inset(0 0 100% 0); }
          to   { opacity: 1; transform: translateY(0);    clip-path: inset(0 0 0% 0); }
        }
        .tm-enter { animation: tmEnter 620ms cubic-bezier(0.22, 1, 0.36, 1) both; }
        @media (prefers-reduced-motion: reduce) { .tm-enter { animation: none; } }
      `}</style>

      <div className="mx-auto grid w-full max-w-384 gap-14 lg:grid-cols-[minmax(0,22rem)_1fr] lg:items-center lg:gap-12 xl:grid-cols-[minmax(0,30rem)_1fr] xl:gap-20">
        {/* ── The claim ── */}
        <div>
          <p className="tm-reveal font-sans text-[11px] font-bold uppercase tracking-[0.3em] text-brand-slate sm:text-xs">
            {content.eyebrow}
          </p>

          <MaskedHeading
            lines={content.title}
            tone="text-white"
            className="mt-8 text-[clamp(1.75rem,2.2vw,2.4rem)]"
          />

          <p className="tm-reveal mt-8 font-sans text-[clamp(1rem,1.2vw,1.15rem)] font-light leading-relaxed text-brand-slate">
            {content.subhead}
          </p>
        </div>

        {/* ── The axis ── */}
        <div className="tm-reveal">
          {/* Modes. Toggle buttons rather than a tablist: the contract is "one of these
              is on", which is what aria-pressed says, and it stays true under Tab. */}
          <div className="flex flex-wrap items-stretch gap-x-10 gap-y-4 sm:gap-x-14">
            {content.modes.map((m, i) => (
              <button
                key={m.id}
                type="button"
                aria-pressed={i === active}
                onClick={() => choose(i)}
                onFocus={() => choose(i)}
                className="group cursor-pointer text-left"
              >
                <span
                  className={`block font-sans text-[10px] font-bold uppercase tracking-[0.24em] transition-colors duration-500 ${
                    i === active ? "text-brand-leaf" : "text-brand-slate/60"
                  }`}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span
                  className={`mt-2 block font-heading text-[clamp(1.25rem,2vw,1.9rem)] leading-tight tracking-tight transition-colors duration-500 ${
                    i === active
                      ? "text-brand-leaf"
                      : "text-brand-slate/70 group-hover:text-brand-slate"
                  }`}
                >
                  {m.name}
                </span>
                <span
                  aria-hidden
                  className="mt-3 block h-px origin-left bg-brand-leaf transition-transform duration-[600ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
                  style={{ transform: `scaleX(${i === active ? 1 : 0})` }}
                />
              </button>
            ))}
          </div>

          {/* Stages. A hairline lattice, filled from the floor up. */}
          <div className="mt-12 grid grid-cols-3 border-l border-t border-brand-slate/20">
            {content.stages.map((stage, s) => {
              const cell = mode.stages[s];
              const share = SHARE[cell.owner];
              // A trade moves through these stages in order, so the handover should
              // too. Reading the change as one snap loses that; a short ripple keeps it.
              const delay = `${s * 110}ms`;

              return (
                <div
                  key={stage}
                  className="relative flex h-[30vh] flex-col justify-between overflow-hidden border-r border-b border-brand-slate/20 p-3 sm:p-5 lg:h-[40vh]"
                >
                  {/* Gauge. The stripes are one repeating gradient and the whole band is
                      one scaleY, so a mode change costs a single composited transform
                      no matter how tall the cell is. The fade lives on the parent, which
                      is why it stays put while the band inside it grows. */}
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0"
                    style={{
                      maskImage: "linear-gradient(to top, var(--black) 12%, transparent 100%)",
                      WebkitMaskImage:
                        "linear-gradient(to top, var(--black) 12%, transparent 100%)",
                    }}
                  >
                    <div
                      className="absolute inset-x-0 bottom-0 h-full origin-bottom text-brand-leaf transition-transform duration-[1000ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
                      style={{
                        transform: `scaleY(${share})`,
                        transitionDelay: delay,
                        backgroundImage:
                          "repeating-linear-gradient(90deg, currentColor 0 1px, transparent 1px 7px)",
                        opacity: 0.42,
                      }}
                    />
                  </div>

                  {/* The level itself. Anchored to the floor and lifted by its own share,
                      so it reads as a measurement rather than a border. */}
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 transition-transform duration-[1000ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
                    style={{ transform: `translateY(${-share * 100}%)`, transitionDelay: delay }}
                  >
                    <span
                      className="absolute inset-x-0 bottom-0 h-px bg-brand-leaf transition-opacity duration-500"
                      style={{ opacity: share === 0 ? 0 : 1 }}
                    />
                  </div>

                  <span className="relative flex flex-col gap-1 font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-brand-slate sm:flex-row sm:gap-2 sm:tracking-[0.24em]">
                    <span>{String(s + 1).padStart(2, "0")}</span>
                    <span>{stage}</span>
                  </span>

                  <span
                    key={`${mode.id}-${s}`}
                    className="tm-enter relative font-sans text-xs leading-snug font-light text-white sm:text-base"
                    style={{ animationDelay: delay }}
                  >
                    {cell.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* What the mode actually is. */}
          <div key={mode.id} className="tm-enter mt-10 flex flex-col gap-4 sm:flex-row sm:gap-10">
            <p className="font-heading text-[clamp(1.15rem,1.6vw,1.5rem)] leading-snug tracking-tight text-brand-leaf sm:w-2/5">
              {mode.tagline}
            </p>
            <p className="font-sans text-[clamp(0.95rem,1.05vw,1.05rem)] font-light leading-relaxed text-brand-slate sm:flex-1">
              {mode.body}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default TradingModesSection;
