"use client";

import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  Candle2,
  InfoCircle,
  Judge,
  Routing2,
  ShieldTick,
  type Icon,
} from "iconsax-reactjs";
import { SECTION_IDS } from "@/constants/landing.constants";
import {
  getEngineHighlights,
  type EngineHighlight,
} from "@/services/landing.service";
import { AppPreviewMock } from "./app-preview/AppPreviewMock";

gsap.registerPlugin(ScrollTrigger);

const engines = getEngineHighlights();

const HEADING_WORDS = ["Two", "engines", "that", "never"];
const HEADING_ACCENT = "sleep";

const TONE_CLASSES: Record<EngineHighlight["tone"], string> = {
  forest: "bg-[#0c1c07] border-white/10 text-white shadow-[0_20px_50px_rgba(0,0,0,0.85)]",
  lime: "bg-[#0c1c07] border-white/10 text-white shadow-[0_20px_50px_rgba(0,0,0,0.85)]",
  dark: "bg-[#0c1c07] border-white/10 text-white shadow-[0_20px_50px_rgba(0,0,0,0.85)]",
  mint: "bg-[#0c1c07] border-white/10 text-white shadow-[0_20px_50px_rgba(0,0,0,0.85)]",
};

const TAG_CLASSES: Record<EngineHighlight["tone"], string> = {
  forest: "text-brand-lime/80",
  lime: "text-brand-lime/80",
  dark: "text-brand-lime/80",
  mint: "text-brand-lime/80",
};

const BODY_CLASSES: Record<EngineHighlight["tone"], string> = {
  forest: "text-white/65",
  lime: "text-white/65",
  dark: "text-white/65",
  mint: "text-white/65",
};

/** One iconsax mark per engine — used on the cards that carry no illustration. */
const ENGINE_ICONS: Record<EngineHighlight["glyph"], Icon> = {
  council: Judge,
  cex: Candle2,
  dex: Routing2,
  exit: ShieldTick,
};

/**
 * Engines showcase — a bento grid built around the app itself.
 *
 * Two stacks of engine cards flank a live-looking product preview, so the claim
 * ("agents earn for you") and the evidence (balance, claimable earnings, open
 * positions) sit in the same glance. One reveal timeline drives the whole thing.
 */
export function EnginesShowcaseSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = gsap.context(() => {
      const timeline = gsap.timeline({
        defaults: { ease: "power3.out" },
        scrollTrigger: { trigger: section, start: "top 72%", once: true },
      });

      timeline
        .from(".engines-word", {
          yPercent: 118,
          opacity: 0,
          duration: 0.85,
          stagger: 0.06,
        })
        .from(".engines-intro", { y: 26, opacity: 0, duration: 0.8, stagger: 0.1 }, 0.15)
        .from(
          ".app-preview",
          { y: 72, opacity: 0, scale: 0.965, duration: 1.2, ease: "power4.out" },
          0.1
        )
        .from(
          ".bento-card",
          {
            y: 44,
            opacity: 0,
            scale: 0.975,
            duration: 0.95,
            stagger: { each: 0.09, from: "center" },
            ease: "power4.out",
            clearProps: "transform",
          },
          0.35
        )
        .from(
          ".bento-visual",
          {
            scale: 0.8,
            opacity: 0,
            duration: 0.8,
            stagger: 0.08,
            ease: "back.out(1.7)",
            clearProps: "transform",
          },
          0.55
        )
        .from(
          ".app-preview .film-chapter",
          { y: 14, opacity: 0, duration: 0.6, stagger: 0.06 },
          0.75
        );

      ScrollTrigger.matchMedia({
        "(min-width: 1024px)": () => {
          gsap.to(".app-preview-float", {
            yPercent: -5,
            ease: "none",
            scrollTrigger: {
              trigger: section,
              start: "top bottom",
              end: "bottom top",
              scrub: 1,
              invalidateOnRefresh: true,
            },
          });
        },
      });
    }, section);

    return () => ctx.revert();
  }, []);

  const [leftStack, rightStack] = [engines.slice(0, 2), engines.slice(2)];

  return (
    <section
      ref={sectionRef}
      id={SECTION_IDS.engines}
      className="relative w-full overflow-hidden bg-[#f2faec] py-24 sm:py-32 px-5 sm:px-8"
    >
      {/* Soft brand wash behind the grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(70% 50% at 50% 0%, rgba(198,241,154,0.55) 0%, rgba(242,250,236,0) 70%)",
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-7xl mx-auto">
        {/* ─── Heading ─────────────────────────────────────── */}
        <div className="max-w-3xl">
          <span className="engines-intro block text-[11px] font-sans font-bold uppercase tracking-[0.24em] text-brand-leaf">
            Automate anything
          </span>

          <h2 className="mt-5 font-heading text-4xl sm:text-5xl lg:text-6xl leading-[1.06] tracking-tight text-brand-forest flex flex-wrap">
            {HEADING_WORDS.map((word) => (
              <span
                key={word}
                className="inline-block overflow-hidden py-1 mr-[0.26em] align-bottom"
              >
                <span className="engines-word inline-block font-normal">{word}</span>
              </span>
            ))}
            <span className="inline-block overflow-hidden py-1 align-bottom">
              <span className="engines-word inline-block font-normal text-brand-leaf">
                {HEADING_ACCENT}
              </span>
            </span>
          </h2>

          <p className="engines-intro mt-6 text-sm sm:text-base leading-relaxed text-brand-dark/70 font-light max-w-xl">
            Your capital works both venues at once. The council gates every
            entry, the engines take the trade, and the earnings land back in a
            wallet only you can open.
          </p>
        </div>

        {/* ─── Bento grid ──────────────────────────────────── */}
        <div className="mt-14 max-w-[1180px] mx-auto grid grid-cols-1 items-stretch gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,366px)_minmax(0,1fr)]">
          {/* Left Stack (2 Cards matching Mobile Frame Height) */}
          <div className="order-2 flex flex-col justify-between gap-5 lg:order-1 h-full">
            {leftStack.map((engine) => (
              <BentoCard key={engine.id} engine={engine} />
            ))}
          </div>

          {/* Center Column (Mobile Mockup — Unchanged Size) */}
          <div className="app-preview-float order-1 flex justify-center lg:order-2">
            <AppPreviewMock />
          </div>

          {/* Right Stack (2 Cards matching Mobile Frame Height) */}
          <div className="order-3 flex flex-col justify-between gap-5 lg:order-3 h-full">
            {rightStack.map((engine) => (
              <BentoCard key={engine.id} engine={engine} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Bento card ──────────────────────────────────────────

function BentoCard({
  engine,
}: {
  engine: EngineHighlight;
}) {
  return (
    <article
      className="bento-card group relative flex flex-1 min-h-0 flex-col justify-between overflow-hidden rounded-[1.5rem] sm:rounded-[1.75rem] border border-white/10 bg-[#0c1c07] p-6 sm:p-7 text-white shadow-[0_20px_40px_rgba(0,0,0,0.85)] transition-transform duration-500 ease-out will-change-transform hover:-translate-y-1.5"
    >
      <div>
        <h3 className="max-w-[16ch] font-heading text-xl sm:text-2xl leading-[1.15] tracking-tight text-white">
          {engine.title}
        </h3>
      </div>

      {/* 3D Vector Graphic matching compact specification */}
      <div className="pointer-events-none flex min-h-[95px] flex-1 items-center justify-center py-2 my-auto">
        <EngineGlyph kind={engine.glyph} tone={engine.tone} />
      </div>

      <div>
        <p className="text-xs sm:text-sm font-light leading-relaxed text-white/65">
          {engine.description}
        </p>
        <span className="mt-3 block text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-brand-lime/80">
          {engine.tag}
        </span>
      </div>
    </article>
  );
}

// ─── Iconsax orb (supporting cards) ──────────────────────

function IconOrb({
  kind,
  tone,
}: {
  kind: EngineHighlight["glyph"];
  tone: EngineHighlight["tone"];
}) {
  const Mark = ENGINE_ICONS[kind];
  const onDark = tone === "forest" || tone === "dark";

  return (
    <div className="bento-visual relative flex h-[100px] w-[100px] items-center justify-center">
      <span
        className={`absolute inset-0 rounded-full border ${
          onDark ? "border-brand-lime/15" : "border-brand-forest/[0.12]"
        }`}
        aria-hidden="true"
      />
      <span
        className={`absolute inset-[12px] rounded-full border ${
          onDark ? "border-brand-lime/25" : "border-brand-forest/20"
        }`}
        aria-hidden="true"
      />
      <span className="relative flex h-[60px] w-[60px] items-center justify-center rounded-full bg-gradient-to-b from-[#8FE331] to-[#2c5c0e] text-white shadow-[0_12px_24px_-10px_rgba(18,40,5,0.55)]">
        <Mark size={28} variant="Bulk" />
      </span>
    </div>
  );
}

// ─── Dimensional glyphs (pure SVG — no extra canvases) ───

function EngineGlyph({
  kind,
  tone,
}: {
  kind: EngineHighlight["glyph"];
  tone: EngineHighlight["tone"];
}) {
  const onDark = tone === "forest" || tone === "dark";
  const rim = onDark ? "#C6F19A" : "#22480B";
  const fillTop = onDark ? "#8FE331" : "#66B616";
  const fillBottom = onDark ? "#22480B" : "#C6F19A";
  const id = `glyph-${kind}`;

  return (
    <svg
      viewBox="0 0 200 150"
      className="bento-visual w-[62%] max-w-[160px] drop-shadow-[0_14px_24px_rgba(18,40,5,0.28)]"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`${id}-body`} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stopColor={fillTop} />
          <stop offset="100%" stopColor={fillBottom} />
        </linearGradient>
        <radialGradient id={`${id}-spec`} cx="0.32" cy="0.28" r="0.6">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
      </defs>

      {kind === "council" && (
        <g>
          <ellipse
            cx="100"
            cy="80"
            rx="76"
            ry="30"
            fill="none"
            stroke={rim}
            strokeOpacity="0.35"
            strokeWidth="1.5"
          />
          {[0, 1, 2, 3, 4, 5, 6].map((index) => {
            const angle = (index / 7) * Math.PI * 2;
            const x = parseFloat((100 + Math.cos(angle) * 76).toFixed(4));
            const y = parseFloat((80 + Math.sin(angle) * 30).toFixed(4));
            const voting = index < 5;
            return (
              <g key={index}>
                {voting && (
                  <line
                    x1="100"
                    y1="72"
                    x2={x}
                    y2={y}
                    stroke={rim}
                    strokeOpacity="0.4"
                    strokeWidth="1.2"
                  />
                )}
                <circle
                  cx={x}
                  cy={y}
                  r={voting ? 7 : 5}
                  fill={voting ? `url(#${id}-body)` : "none"}
                  stroke={rim}
                  strokeOpacity={voting ? 0.9 : 0.4}
                  strokeWidth="1.2"
                />
              </g>
            );
          })}
          <circle cx="100" cy="72" r="26" fill={`url(#${id}-body)`} />
          <circle cx="100" cy="72" r="26" fill={`url(#${id}-spec)`} />
          <circle
            cx="100"
            cy="72"
            r="34"
            fill="none"
            stroke={rim}
            strokeOpacity="0.4"
            strokeWidth="1.2"
          />
        </g>
      )}

      {kind === "cex" && (
        <g>
          {[0, 1, 2].map((layer) => {
            const y = 96 - layer * 26;
            return (
              <g key={layer}>
                <path
                  d={`M100 ${y - 22} L168 ${y} L100 ${y + 22} L32 ${y} Z`}
                  fill={`url(#${id}-body)`}
                  fillOpacity={1 - layer * 0.22}
                  stroke={rim}
                  strokeOpacity="0.5"
                  strokeWidth="1.2"
                />
              </g>
            );
          })}
          <path
            d="M78 62 L78 38 M78 38 L70 46 M78 38 L86 46"
            stroke={rim}
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M122 38 L122 62 M122 62 L114 54 M122 62 L130 54"
            stroke={rim}
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
        </g>
      )}

      {kind === "dex" && (
        <g fill="none" strokeWidth="9">
          <ellipse
            cx="76"
            cy="75"
            rx="40"
            ry="26"
            stroke={`url(#${id}-body)`}
            transform="rotate(-18 76 75)"
          />
          <ellipse
            cx="126"
            cy="75"
            rx="40"
            ry="26"
            stroke={rim}
            strokeOpacity="0.55"
            transform="rotate(-18 126 75)"
          />
          <ellipse
            cx="76"
            cy="75"
            rx="40"
            ry="26"
            stroke="#FFFFFF"
            strokeOpacity="0.22"
            strokeWidth="2"
            transform="rotate(-18 76 75)"
          />
        </g>
      )}

      {kind === "exit" && (
        <g>
          {[0, 1, 2, 3].map((bar) => {
            const height = 26 + bar * 22;
            const x = 46 + bar * 30;
            return (
              <g key={bar}>
                <path
                  d={`M${x} ${112 - height} L${x + 20} ${118 - height} L${x + 20} ${112} L${x} ${118} Z`}
                  fill={`url(#${id}-body)`}
                  fillOpacity={0.55 + bar * 0.15}
                />
                <path
                  d={`M${x} ${118} L${x + 20} ${112} L${x + 20} ${112} L${x} ${118} Z`}
                  stroke={rim}
                  strokeOpacity="0.4"
                  strokeWidth="1"
                  fill="none"
                />
              </g>
            );
          })}
          <path
            d="M40 96 L74 78 L104 84 L136 50 L166 34"
            fill="none"
            stroke={rim}
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="166" cy="34" r="6" fill={`url(#${id}-body)`} stroke={rim} strokeWidth="1.4" />
          <path
            d="M34 62 L172 62"
            stroke={rim}
            strokeOpacity="0.35"
            strokeWidth="1.2"
            strokeDasharray="5 6"
          />
        </g>
      )}
    </svg>
  );
}
