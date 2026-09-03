"use client";

import React, { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SECTION_IDS } from "@/constants/landing.constants";
import { getAiEngine } from "@/services/landing.service";
import { MaskedHeading } from "@/components/ui/MaskedHeading";
import { AmbientField } from "@/components/ui/AmbientField";
import { scrollToTarget } from "@/components/ui/SmoothScrollProvider";

/**
 * WebGL, loaded on demand rather than shipped with the first paint. `ssr: false`
 * because a canvas has nothing to render on the server.
 */
const ParticleIndex = dynamic(
  () => import("./ai/ParticleIndex").then((m) => m.ParticleIndex),
  { ssr: false, loading: () => <div className="h-full w-full" /> }
);

gsap.registerPlugin(ScrollTrigger);

const engine = getAiEngine();

/**
 * Beats: the title card, then one per agent. The glyph sequence is derived from the
 * roster rather than written out, so a ninth agent adds a ninth chapter and a ninth
 * digit without anyone touching this file.
 */
const GLYPHS = [
  String(engine.agents.length),
  ...engine.agents.map((_, i) => String(i + 1)),
];
const BEATS = GLYPHS.length;

/** +1 parks the glyph in the right half; the copy takes the other one. */
const SIDES = GLYPHS.map((_, i) => (i % 2 === 0 ? 1 : -1));

/** Viewport heights of scroll per beat. */
const BEAT_SCROLL = 1.0;

/**
 * Fraction of a beat the copy holds still, matched to `HOLD` in ParticleIndex, and the
 * length of a wipe. Copy and cloud have to agree on when a beat is over, or the text
 * would leave while its digit is still standing.
 */
const HOLD = 0.52;
const WIPE = 0.26;

/** Two-digit index, so the column never reflows between 09 and 10. */
const pad = (n: number) => String(n).padStart(2, "0");

/** Shared panel geometry. Half the stage on desktop, the whole of it below that. */
const PANEL =
  "beat pointer-events-none absolute inset-y-0 left-0 z-20 flex w-full items-center px-6 sm:px-10 lg:w-1/2 lg:px-14 xl:px-16";

/**
 * AI Engine — the Super Machine, read one agent at a time.
 *
 * The section pins and becomes a projector. A single particle cloud is the index: it
 * holds the agent count, then reshapes itself into 1, 2, 3 … as you scroll, crossing the
 * stage each time so it always sits opposite the copy. One cloud, nine glyphs — the
 * number is never redrawn, only rearranged, which is what makes the sequence read as one
 * continuous object rather than nine slides.
 *
 * Everything hangs off one ScrollTrigger. The timeline is measured in beats, so its own
 * playhead *is* the fractional agent index; that number is written to a plain ref the
 * render loop reads. Taking it from the timeline rather than from scroll progress is the
 * point: with `scrub` the copy lags the scroll by design, and a cloud driven off raw
 * progress would morph a beat ahead of the words it belongs to.
 */
export function AiEngineSection() {
  const stage = useRef<HTMLDivElement>(null);
  const driver = useRef(0);

  /**
   * Which way the skip button points. The section pins for several viewport-heights,
   * so someone arriving from below is just as stuck as someone arriving from above —
   * the escape hatch has to face whichever way they were already travelling.
   *
   * Mirrored into a ref so the scroll callback can compare without reading state, and
   * only lifted into React when it actually flips, which is rare — a re-render per
   * scroll frame here would be far more expensive than the button is worth.
   */
  const [skipUp, setSkipUp] = useState(false);
  const skipUpRef = useRef(false);

  useEffect(() => {
    const root = stage.current;
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = gsap.context(() => {
      gsap.set(".beat", { clipPath: "inset(0% 0% 100% 0%)", y: 34, opacity: 0 });
      gsap.set(".beat-0", { clipPath: "inset(0% 0% 0% 0%)", y: 0, opacity: 1 });
      gsap.set(".rail-tick", { opacity: 0.2, scaleY: 1 });
      gsap.set(".tick-0", { opacity: 1, scaleY: 1.9 });
      gsap.set(".skip-btn", { opacity: 1 });

      const tl = gsap.timeline({
        defaults: { ease: "power2.out" },
        scrollTrigger: {
          trigger: root,
          start: "top top",
          end: () => `+=${BEATS * BEAT_SCROLL * window.innerHeight}`,
          pin: true,
          scrub: 1.0,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            const up = self.direction === -1;
            if (up !== skipUpRef.current) {
              skipUpRef.current = up;
              setSkipUp(up);
            }
          },
        },
      });

      // Length is asserted up front. Without it the timeline would end at its last tween
      // and the final beat would get no hold — and `time()` would no longer be the beat
      // index, which is what the cloud is reading.
      tl.to({}, { duration: BEATS });

      tl.eventCallback("onUpdate", () => {
        // The last beat has no successor to fly to, so it holds through the tail of the
        // scroll rather than overshooting past the final glyph.
        driver.current = Math.min(tl.time(), BEATS - 1);
      });

      GLYPHS.forEach((_, i) => {
        // Copy is consumed by a downward edge and re-drawn by the same edge on the far
        // side. Out runs [HOLD, HOLD+WIPE] and in runs [1-WIPE, 1], so they barely graze:
        // the stage is at its emptiest exactly when the cloud is at its most scattered,
        // and the small overlap that remains is two panels on opposite halves.
        if (i > 0) {
          tl.to(
            `.beat-${i}`,
            { clipPath: "inset(0% 0% 0% 0%)", y: 0, opacity: 1, duration: WIPE },
            i - WIPE
          );
          tl.to(`.tick-${i}`, { opacity: 1, scaleY: 1.9, duration: WIPE }, i - WIPE);
        }

        if (i < BEATS - 1) {
          tl.to(
            `.beat-${i}`,
            {
              clipPath: "inset(100% 0% 0% 0%)",
              y: -26,
              opacity: 0,
              duration: WIPE,
              ease: "power2.inOut",
            },
            i + HOLD
          );
          tl.to(
            `.tick-${i}`,
            { opacity: 0.2, scaleY: 1, duration: WIPE, ease: "power2.inOut" },
            i + HOLD
          );
        }
      });

      // The button used to fade out on the last beat, on the reasoning that there was
      // nothing left to skip past. That only held while it pointed one way: at the tail
      // of the pin, someone scrolling up still has the whole section ahead of them, and
      // a hidden button is exactly the wrong answer there. It stays for the full pin.
    }, root);

    return () => ctx.revert();
  }, []);

  // Skipping "onward" means past whichever end you are heading for: the section after
  // this one going down, the section before it going up.
  const skipTarget = skipUp ? SECTION_IDS.platform : SECTION_IDS.tradingModes;

  // A longer glide than the navbar's own anchor jumps: this section can pin
  // for several viewport-heights of scroll, and the default 1.1s duration
  // that feels right for a short nav hop would read as a hard snap here.
  function handleSkip(event: React.MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    scrollToTarget(`#${skipTarget}`, { duration: 1.8 });
  }

  return (
    <section id={SECTION_IDS.aiEngine} className="relative w-full bg-surface-tint-a">
      <style>{`
        /* Pre-hydration state. GSAP writes inline styles a frame later; without this the
           first paint stacks all nine panels on top of each other. */
        .beat-veiled { opacity: 0; clip-path: inset(0% 0% 100% 0%); }

        /* No pin, no flight, no stage: the beats become a plain stacked list. Declared
           last so it outranks both the veil above and the utilities it overrides. */
        @media (prefers-reduced-motion: reduce) {
          .ai-stage { height: auto; overflow: visible; }
          .beat {
            position: relative;
            inset: auto;
            width: 100%;
            padding-block: 4.5rem;
            opacity: 1;
            clip-path: none;
            transform: none;
          }
          .ai-index, .ai-rail, .skip-btn { display: none; }
        }
      `}</style>

      <div ref={stage} className="ai-stage relative h-svh w-full overflow-hidden">
        <AmbientField />

        {/* Skips the scroll-jack entirely — jumps straight out of the section, in
            whichever direction the reader was already scrolling. */}
        <a
          href={`#${skipTarget}`}
          onClick={handleSkip}
          aria-label={skipUp ? "Skip back to previous section" : "Skip to next section"}
          className="skip-btn group pointer-events-auto absolute right-6 top-24 z-30 flex items-center gap-2 border-b border-foreground/25 pb-1 font-sans text-[10px] font-bold uppercase tracking-[0.24em] text-foreground/50 transition-colors duration-300 hover:border-foreground/60 hover:text-foreground/90 sm:right-10 sm:top-28 lg:right-14 xl:right-16"
        >
          Skip
          <svg
            viewBox="0 0 16 16"
            className={`h-3 w-3 transition-transform duration-300 ${
              skipUp ? "rotate-180 group-hover:-translate-y-0.5" : "group-hover:translate-y-0.5"
            }`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M3 6l5 5 5-5" />
          </svg>
        </a>

        {/* The index. Full-stage, because the glyph travels across it. Dimmed on narrow
            screens, where there is no second column and the copy sits over it. */}
        <div className="ai-index absolute inset-0 z-10 opacity-25 lg:opacity-100">
          <ParticleIndex
            glyphs={GLYPHS}
            sides={SIDES}
            driver={driver}
            className="h-full w-full"
          />
        </div>

        {/* ── Beat 0: the claim ── */}
        <div className={`${PANEL} beat-0`}>
          <div className="w-full">
            <p className="font-sans text-[10px] font-bold uppercase tracking-[0.3em] text-foreground/60 sm:text-xs">
              {engine.eyebrow}
            </p>

            <MaskedHeading
              lines={engine.title}
              className="mt-9 text-[clamp(2.4rem,5vw,4.8rem)]"
            />

            <p className="mt-9 max-w-2xl font-sans text-[clamp(1.05rem,1.5vw,1.4rem)] font-light leading-relaxed text-foreground/70">
              {engine.subhead}
            </p>

            <p className="mt-6 max-w-xl font-sans text-[clamp(0.95rem,1.05vw,1.1rem)] font-light leading-relaxed text-foreground/50">
              {engine.decision.body}
            </p>

            <div className="mt-12 flex items-center gap-4">
              <span aria-hidden className="h-px w-14 bg-foreground/25" />
              <span className="font-sans text-[10px] font-bold uppercase tracking-[0.24em] text-foreground/50">
                {engine.agents.length} agents · {engine.cadence.value}
                {engine.cadence.unit} scan
              </span>
            </div>
          </div>
        </div>

        {/* ── Beats 1..n: one agent each, alternating sides ── */}
        {engine.agents.map((agent, i) => (
          <div
            key={agent.id}
            className={`${PANEL} beat-veiled beat-${i + 1} ${
              (i + 1) % 2 === 1 ? "lg:left-1/2" : ""
            }`}
          >
            <div className="w-full">
              <p className="font-sans text-[11px] font-bold uppercase tracking-[0.3em] text-foreground/45 sm:text-xs">
                Agent {pad(i + 1)}
              </p>

              <h3 className="mt-8 font-heading text-[clamp(2.6rem,5.4vw,5.2rem)] font-normal leading-[1.02] tracking-tight text-foreground">
                {agent.name}
              </h3>

              <p className="mt-8 max-w-2xl font-sans text-[clamp(1.15rem,1.8vw,1.75rem)] font-light leading-snug text-foreground/70">
                {agent.role}
              </p>

              <p className="mt-6 max-w-xl font-sans text-[clamp(0.95rem,1.05vw,1.1rem)] font-light leading-relaxed text-foreground/50">
                {agent.detail}
              </p>

              <div className="mt-12 flex items-center gap-6">
                <span aria-hidden className="h-px w-10 shrink-0 bg-foreground/25" />
                <ul className="flex flex-wrap gap-x-6 gap-y-2">
                  {agent.watches.map((w) => (
                    <li
                      key={w}
                      className="font-sans text-[11px] font-bold uppercase tracking-[0.24em] text-foreground/55"
                    >
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}

        {/* ── Where you are ── */}
        <div className="ai-rail pointer-events-none absolute inset-x-6 bottom-7 z-20 flex items-center gap-5 sm:inset-x-10 lg:inset-x-14 xl:inset-x-16">
          <span className="font-sans text-[10px] font-bold uppercase tracking-[0.24em] text-foreground/35">
            {engine.decision.title}
          </span>
          <span aria-hidden className="h-px flex-1 bg-foreground/15" />
          <div aria-hidden className="flex items-end gap-1.5">
            {GLYPHS.map((_, i) => (
              <span
                key={i}
                className={`rail-tick tick-${i} block h-3 w-px origin-bottom bg-foreground opacity-20`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default AiEngineSection;
