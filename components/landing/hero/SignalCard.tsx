"use client";

import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { getHeroSignals, type HeroSignal } from "@/services/landing.service";
import { usePreloaderDone } from "@/hooks/usePreloaderDone";
import { usePointerParallax } from "@/hooks/usePointerParallax";
import {
  HANDOFF_CARD_RADIUS_CLASS,
  HANDOFF_CARD_SHELL_CLASS,
  HANDOFF_CARD_SHELL_FRONT_CLASS,
} from "@/components/landing/heroCylinderHandoff.constants";
import { Sparkline } from "./Sparkline";

/** Exported so HeroSection can own the shared autoplay timer and signal count — see the
 *  `index` prop doc below for why this card doesn't drive its own cycle any more. */
export const SIGNALS = getHeroSignals();
export const CYCLE_MS = 5200;

type Direction = "up" | "down" | "flat";

interface ActionTheme {
  badge: string;
  /** Sets `currentColor`, which the sparkline's stroke and fill gradient inherit. */
  accent: string;
  bar: string;
  dot: string;
  direction: Direction;
}

/**
 * One theme per signal action, so BUY / SELL / HOLD reads at a glance across the whole
 * card — badge, trend line, area fill, head marker and agent bars all move together
 * rather than the chart staying green under a red SELL.
 */
const ACTION_THEME: Record<HeroSignal["action"], ActionTheme> = {
  BUY: {
    badge: "bg-signal-up text-white",
    accent: "text-signal-up",
    bar: "from-signal-up to-signal-up-soft",
    dot: "bg-signal-up ring-signal-up/25",
    direction: "up",
  },
  SELL: {
    badge: "bg-signal-down text-white",
    accent: "text-signal-down",
    bar: "from-signal-down to-signal-down-soft",
    dot: "bg-signal-down ring-signal-down/25",
    direction: "down",
  },
  HOLD: {
    badge: "bg-signal-flat text-white",
    accent: "text-signal-flat",
    bar: "from-signal-flat to-signal-flat-soft",
    dot: "bg-signal-flat ring-signal-flat/25",
    direction: "flat",
  },
};

const ARROW_PATH: Record<Direction, string> = {
  up: "M5 0 10 8H0z",
  down: "M5 10 0 2h10z",
  flat: "M0 4h10v3H0z",
};

/** Direction glyph drawn as a path — no reliance on a font shipping ▲ or ▼. */
function DirectionMark({ direction }: { direction: Direction }) {
  return (
    <svg viewBox="0 0 10 10" className="h-2 w-2" aria-hidden focusable="false">
      <path d={ARROW_PATH[direction]} fill="currentColor" />
    </svg>
  );
}

/** Chart rail. `at` is 0-1 on the trend scale, so it lines up with the sparkline. */
function Rail({ at, label }: { at: number; label: string }) {
  return (
    <div
      className="chart-rail pointer-events-none absolute inset-x-0 flex items-center gap-2"
      style={{ top: `${(1 - at) * 100}%` }}
    >
      <span className="flex-1 border-t border-dashed border-white/20" />
      <span className="font-sans text-[9px] uppercase tracking-[0.14em] text-white/40">
        {label}
      </span>
    </div>
  );
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

interface SignalCardProps {
  /** Leaf-tinted shell border, same as every other cylinder card's "front" state.
   *  Defaults on: standalone in the hero, this card is always the front one. */
  isFront?: boolean;
  /** 0 = the compact card (header, price/action, chart only) — what sits in the hero
   *  copy grid and rides the FLIP move to center. 1 = fully expanded: pair tabs, the
   *  Entry/Target/Stop levels grid, the agent breakdown and the footer note are all
   *  revealed too. Defaults to 1 — inside the cylinder this card is always expanded;
   *  only Hero's standalone instance animates it down to 0 and back up. */
  expandProgress?: number;
  /** Which sample signal is showing. Lifted up to HeroSection rather than owned here:
   *  this card mounts twice at once during the hand-off crossfade (the standalone hero
   *  instance and the cylinder's own copy of it), and two independent autoplay timers
   *  drift apart within seconds — the pair tabs on one card were seen highlighting SOL
   *  while the price panel showed BNB. A single shared index makes that impossible. */
  index: number;
  onIndexSelect: (index: number) => void;
  onHoverChange: (hovering: boolean) => void;
}

/**
 * Hero signal panel — a sample of what the Super Machine puts on screen, and the
 * cylinder carousel's first card. It starts compact in the hero copy grid, FLIPs to the
 * cylinder's front-card slot, then grows in place into the fully-detailed version below
 * — the same card the whole way, never swapped for a different design.
 *
 * Every field maps to the signal payload in the spec: asset, price, action, strength,
 * entry, target, stop-loss, and the agent readings behind the decision. Nothing here is
 * invented beyond that.
 *
 * Cycles on a timer owned by HeroSection (see `index` above) that pauses on hover, and
 * the pair tabs drive it directly.
 */
export function SignalCard({
  isFront = true,
  expandProgress = 1,
  index,
  onIndexSelect,
  onHoverChange,
}: SignalCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const tiltRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  const signal = SIGNALS[index];
  const theme = ACTION_THEME[signal.action];
  const last = signal.trend[signal.trend.length - 1];

  const isPreloaderDone = usePreloaderDone();

  usePointerParallax(tiltRef, { strength: 12 });

  // Crosshair. Run the pointer across the chart and a rule tracks it while a marker
  // rides the curve, sampled between points by linear interpolation so it sits on the
  // line rather than snapping to the nearest sample. This is what a real chart does.
  //
  // The pointer's x, the interpolated y and the track size are all written as CSS
  // variables from one rAF-coalesced layout read, so the markers move on transforms
  // alone — positioning them with `left`/`top` would relayout on every frame.
  useEffect(() => {
    const el = chartRef.current;
    if (!el) return;

    // The marker reads the track size even with no pointer present, so measuring is not
    // gated on hover — only the tracking below is.
    const measure = () => {
      const rect = el.getBoundingClientRect();
      if (!rect.width) return;
      el.style.setProperty("--track", `${rect.width}px`);
      el.style.setProperty("--track-y", `${rect.height}px`);
    };
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(el);

    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      return () => observer.disconnect();
    }

    const trend = signal.trend;
    let queued = false;
    let clientX = 0;

    const flush = () => {
      queued = false;
      const rect = el.getBoundingClientRect();
      if (!rect.width) return;

      const t = clamp01((clientX - rect.left) / rect.width);
      const f = t * (trend.length - 1);
      const i = Math.floor(f);
      const value = trend[i] + (trend[Math.min(i + 1, trend.length - 1)] - trend[i]) * (f - i);

      el.style.setProperty("--cx", t.toFixed(4));
      el.style.setProperty("--cy", (1 - value).toFixed(4));
    };

    const onMove = (event: PointerEvent) => {
      clientX = event.clientX;
      if (!queued) {
        queued = true;
        requestAnimationFrame(flush);
      }
    };
    const onEnter = () => el.style.setProperty("--cross", "1");
    const onLeave = () => el.style.setProperty("--cross", "0");

    el.addEventListener("pointermove", onMove, { passive: true });
    el.addEventListener("pointerenter", onEnter);
    el.addEventListener("pointerleave", onLeave);

    return () => {
      observer.disconnect();
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerenter", onEnter);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, [signal]);

  // ── Two timelines, and deliberately two effects ──
  //
  // They are split because a `gsap.context` reverts everything it applied when its
  // effect re-runs. Sharing one effect keyed on `index` meant the first signal cycle
  // reverted the entrance — restoring the shell to its `opacity-0` class — and then ran
  // the swap, which never touches the shell. The card simply vanished. The entrance now
  // depends only on the preloader, so nothing reverts it until unmount.

  // Entrance: the card assembles the way a product film would — frame, header, the
  // reading, then the chart drawing itself. Every beat overlaps the one before, so it
  // reads as one continuous take rather than a queue.
  useEffect(() => {
    if (!isPreloaderDone) return;

    const ctx = gsap.context(() => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        gsap.set(".card-shell, .card-head, .card-pair, .card-price, .card-badge, .card-change, .chart-rail", {
          opacity: 1,
          clearProps: "transform,clipPath",
        });
        return;
      }

      // Deliberately stops at the chart: the pair tabs, levels grid, agent breakdown
      // and footer note aren't entrance-animated here at all — they're gated behind
      // `expandProgress` instead (see the render below), which starts at 0 for the
      // standalone hero instance and only ramps up once the card has FLIPped to the
      // cylinder's slot. Animating them in here too would mean they're already sitting
      // fully revealed underneath the clip the moment expandProgress finally opens it.
      gsap
        .timeline({ defaults: { ease: "power3.out" } })
        .fromTo(".card-shell", { opacity: 0, y: 44, scale: 0.985 }, { opacity: 1, y: 0, scale: 1, duration: 1 })
        .fromTo(".card-head", { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.5 }, 0.34)
        .fromTo(".card-pair", { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.45 }, 0.6)
        .fromTo(".card-price", { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.65 }, 0.72)
        .fromTo(".card-badge", { opacity: 0, scale: 0.82 }, { opacity: 1, scale: 1, duration: 0.5, ease: "back.out(2)" }, 0.86)
        .fromTo(".card-change", { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.4 }, 0.94)
        .fromTo(".chart-rail", { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: 0.6, stagger: 0.1 }, 1.05)
        .fromTo(".chart-plot", { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: 1.35, ease: "power2.inOut" }, 1.1)
        .fromTo(".chart-head", { scale: 0 }, { scale: 1, duration: 0.55, ease: "back.out(2.2)" }, 2.1);
    }, cardRef);

    return () => ctx.revert();
  }, [isPreloaderDone]);

  // Swap: the short version, replaying only what actually changed when the signal
  // cycles. Re-assembling furniture that never moved would be wrong on every count.
  //
  // The guard compares against the last index actually animated rather than counting
  // renders, so it stays correct when an effect is invoked twice for the same value.
  const animatedIndex = useRef<number | null>(null);

  useEffect(() => {
    if (!isPreloaderDone) return;
    if (animatedIndex.current === index) return;

    const isFirst = animatedIndex.current === null;
    animatedIndex.current = index;
    if (isFirst) return; // the entrance already covers this one

    const ctx = gsap.context(() => {
      gsap
        .timeline({ defaults: { ease: "power3.out" } })
        .fromTo(
          ".card-pair, .card-price, .card-badge, .card-change, .card-level, .card-conf",
          { opacity: 0, y: 10 },
          { opacity: 1, y: 0, duration: 0.5, stagger: 0.035 }
        )
        .fromTo(".chart-plot", { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: 1.05, ease: "power2.inOut" }, 0)
        .fromTo(".chart-rail", { opacity: 0, x: -8 }, { opacity: 1, x: 0, duration: 0.55, stagger: 0.08 }, 0.3)
        .fromTo(".chart-head", { scale: 0 }, { scale: 1, duration: 0.45, ease: "back.out(2)" }, 0.95)
        .fromTo(".agent-bar", { scaleX: 0 }, { scaleX: 1, duration: 0.7, stagger: 0.06, ease: "power2.out" }, 0.18);
    }, cardRef);

    return () => ctx.revert();
  }, [index, isPreloaderDone]);

  return (
    <div
      ref={cardRef}
      onMouseEnter={() => onHoverChange(true)}
      onMouseLeave={() => onHoverChange(false)}
      className="h-full w-full"
    >
      <div
        ref={tiltRef}
        className={`card-shell flex h-full flex-col opacity-0 ${HANDOFF_CARD_RADIUS_CLASS} ${
          isFront ? HANDOFF_CARD_SHELL_FRONT_CLASS : HANDOFF_CARD_SHELL_CLASS
        } overflow-hidden p-6 will-change-transform sm:p-8`}
      >
        {/* Header */}
        <div className="card-head flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-white/60">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-leaf opacity-70" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-leaf" />
            </span>
            Sample signal
          </span>
          <span className="font-sans text-[10px] uppercase tracking-[0.16em] text-white/40">
            scan · 15s
          </span>
        </div>

        {/* Pair tabs — revealed only once expanded. `maxHeight` (capped well above the
            row's real height, so it finishes opening early) grows the layout space
            smoothly without depending on grid/flex intrinsic-sizing edge cases; the
            clip-path + opacity on the inner layer is what actually gives it the wipe,
            and keeps animating for the rest of the expand phase after maxHeight has
            already cleared out of the way. */}
        <div className="overflow-hidden" style={{ maxHeight: expandProgress * 200 }}>
          <div
            className="overflow-hidden"
            style={{ clipPath: `inset(0 0 ${(1 - expandProgress) * 100}% 0)`, opacity: expandProgress }}
          >
            <div className="mt-4 flex gap-1 rounded-xl bg-primary/5 p-1">
              {SIGNALS.map((s, i) => (
                <button
                  key={s.pair}
                  onClick={() => onIndexSelect(i)}
                  aria-pressed={i === index}
                  className={`card-tab flex-1 rounded-lg px-2 py-1.5 font-sans text-[11px] font-semibold uppercase tracking-wider transition-colors duration-300 ${
                    i === index ? "bg-primary text-primary-foreground shadow-sm" : "text-white/45 hover:text-white"
                  }`}
                >
                  {s.pair.split(" / ")[0]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Price + action */}
        <div className="mt-6 flex items-end justify-between gap-4">
          <div>
            <p className="card-pair font-sans text-[10px] uppercase tracking-[0.16em] text-white/45">
              {signal.pair} · {signal.chain}
            </p>
            <p className="card-price mt-1.5 font-heading text-[2.35rem] leading-none tracking-tight tabular-nums text-white">
              {signal.price}
            </p>
          </div>

          <div className="shrink-0 text-right">
            <span
              className={`card-badge inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-sans text-xs font-bold tracking-[0.12em] ${theme.badge}`}
            >
              <DirectionMark direction={theme.direction} />
              {signal.action}
            </span>
            <p className={`card-change mt-2 font-sans text-sm font-semibold tabular-nums ${theme.accent}`}>
              {signal.change}
            </p>
          </div>
        </div>

        {/* Trend. The wrapper's text colour drives the stroke and the fill gradient,
            so switching action re-themes the whole chart with no extra props. */}
        <div
          ref={chartRef}
          className={`relative mt-6 min-h-[7rem] w-full flex-1 ${theme.accent}`}
          style={{ "--cx": 1, "--cy": 1 - last } as React.CSSProperties}
        >
          <Rail at={signal.targetAt} label="Target" />
          <Rail at={signal.stopAt} label="Stop" />

          <div className="chart-plot absolute inset-0">
            <Sparkline points={signal.trend} gradientId="hero-spark" className="h-full w-full" />
          </div>

          {/* Tracking rule — only present while the pointer is over the chart. */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 w-px bg-current opacity-[calc(var(--cross,0)*0.35)]"
            style={{ transform: "translateX(calc(var(--cx) * var(--track, 0px)))" }}
          />

          {/* Marker. Rests at the latest sample; rides the curve while tracking. */}
          <span
            aria-hidden
            className={`chart-head pointer-events-none absolute left-0 top-0 h-2.5 w-2.5 rounded-full ring-4 ${theme.dot}`}
            style={{
              transform:
                "translate(calc(var(--cx) * var(--track, 100%) - 50%), calc(var(--cy) * var(--track-y, 100%) - 50%))",
            }}
          />
        </div>

        {/* Levels + agent breakdown + footer note — same expand gating as the pair tabs
            above, revealed together as one block once the card has grown into the
            cylinder's first card. */}
        <div className="shrink-0 overflow-hidden" style={{ maxHeight: expandProgress * 500 }}>
          <div
            className="overflow-hidden"
            style={{ clipPath: `inset(0 0 ${(1 - expandProgress) * 100}% 0)`, opacity: expandProgress }}
          >
            {/* Levels */}
            <div className="mt-5 grid grid-cols-3 gap-3 border-y border-white/10 py-3.5">
              {[
                ["Entry", signal.entry],
                ["Target", signal.target],
                ["Stop", signal.stop],
              ].map(([label, value]) => (
                <div key={label} className="card-level">
                  <p className="font-sans text-[9px] uppercase tracking-[0.14em] text-white/40">{label}</p>
                  <p className="mt-1 font-heading text-lg tabular-nums text-white">{value}</p>
                </div>
              ))}
            </div>

            {/* Agent breakdown — the decision layer's inputs, not a black box */}
            <div className="mt-4">
              <div className="flex items-baseline justify-between">
                <p className="card-conf font-sans text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">
                  8 agents · confidence
                </p>
                {/* The heading face ships no percent glyph, so the sign is set in sans. */}
                <p className={`card-conf ${theme.accent}`}>
                  <span className="font-heading text-xl tabular-nums">{signal.confidence}</span>
                  <span className="font-sans text-xs font-semibold">%</span>
                </p>
              </div>

              <div className="mt-3 space-y-2.5">
                {signal.agents.map((agent) => (
                  <div key={agent.label} className="agent-row flex items-center gap-3">
                    <span className="w-[4.75rem] shrink-0 font-sans text-[10px] uppercase tracking-wider text-white/45">
                      {agent.label}
                    </span>
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-primary/10">
                      <span
                        className={`agent-bar block h-full origin-left rounded-full bg-gradient-to-r ${theme.bar}`}
                        style={{ width: `${agent.value}%` }}
                      />
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <p className="card-note mt-5 border-t border-white/10 pt-3 font-sans text-[9px] uppercase tracking-[0.14em] text-white/30">
              Illustrative · not investment advice
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
