"use client";

import React, { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SECTION_IDS } from "@/constants/landing.constants";
import { THEME_COLORS } from "@/constants/theme-colors";
import { getHero, getFeatures } from "@/services/landing.service";
import { Button } from "@/components/ui/Button";
import { usePreloaderDone } from "@/hooks/usePreloaderDone";
import { usePointerParallax } from "@/hooks/usePointerParallax";
import {
  COMPACT_CARD_PX,
  EXPANDED_CARD_PX,
  HANDOFF_CARD_SIZE_CLASS,
  HANDOFF_TARGET_ID,
} from "./heroCylinderHandoff.constants";
import { HeroBackground } from "./HeroBackground";
import { SignalCard, SIGNALS as HERO_SIGNALS, CYCLE_MS as SIGNAL_CYCLE_MS } from "./hero/SignalCard";
import { Cylinder3DCarousel } from "./Cylinder3DCarousel";
import { FeaturesMarqueeBackdrop } from "./FeaturesMarqueeBackdrop";
import { TEXT_BEATS } from "./cylinderExplosion.data";

/**
 * WebGL, loaded on demand: this is a ~100k-particle Three.js scene, and it only ever
 * mounts once `stageMounted` flips true deep into this section's scroll — importing it
 * eagerly would ship that whole particle system in the main bundle for every visitor,
 * most of whom never reach it.
 */
const CylinderExplosionSphere = dynamic(
  () => import("./CylinderExplosionSphere").then((m) => m.CylinderExplosionSphere),
  { ssr: false }
);

/**
 * Same story as above, plus this one drags in three-globe geometry helpers
 * (topojson-client/d3-geo) that nothing else on the page needs — mounted only for the
 * brief window before the dune explosion takes over, then unmounted again.
 */
const WorldSignalGlobe = dynamic(
  () => import("./WorldSignalGlobe").then((m) => m.WorldSignalGlobe),
  { ssr: false }
);

/** Where the signal globe's own 0-1 window ends, in `particleProgress` terms — past
 *  this point it's unmounted entirely and CylinderExplosionSphere's sand/headline
 *  sequence owns the stage, exactly as before this globe existed. Left with a small
 *  gap before CylinderExplosionSphere's own `PARTICLE_PHASES.sphereIn` starts (see
 *  that file) rather than overlapping it: the two are different enough shapes — a
 *  dotted world map versus a solid lambert-shaded ball — that fading one in while the
 *  other is still fading out reads as a blobby double-exposure, not a clean handoff. */
const GLOBE_WINDOW_END = 0.11;

gsap.registerPlugin(ScrollTrigger);

const hero = getHero();
const features = getFeatures();

/**
 * Hero — one continuous pinned section, not two. It starts as copy-and-a-live-sample,
 * then hands off into the cylinder feature carousel and its WebGL particle finale, all
 * under a single pin and a single background.
 *
 * That single-pin shape is deliberate, not incidental: an earlier version pinned Hero
 * and FeaturesSection separately and bridged the gap between them, which meant
 * FeaturesSection's own box entered the viewport under ordinary scroll before its pin
 * ever engaged — nothing gated its visibility, so the cylinder (and its own background)
 * was visible underneath the hero card well before the hand-off. Folding both into one
 * pin removes that seam entirely: nothing "next" exists to leak into view, because
 * there is no next section here, just a later phase of this one.
 *
 * Four motion layers, each deliberately cheap:
 *   1. Entrance, gated on the preloader — one timeline, transform/opacity only.
 *   2. Pointer parallax via a shared hook (coalesced, opt-out on touch).
 *   3. Hand-off phase (0 → heroFrac of the pin): copy fades, the card FLIPs to the
 *      cylinder's front-card slot, grows in place into the cylinder's full card size —
 *      revealing the pair tabs / levels / agent breakdown it didn't have room for while
 *      compact — then crossfades into the (until-now invisible) cylinder group sitting
 *      right there, already showing that same expanded card as its own first card. The
 *      card is never swapped for a different design; the cylinder just picks up where
 *      the hero card's own growth left off.
 *   4. Feature phase (heroFrac → 1): the cylinder rotates through the cards, the active
 *      card's zoom dot swells to swallow the viewport, then the WebGL particle stage
 *      takes over. This math is unchanged from the original FeaturesSection — only
 *      renumbered onto the shared 0–1 progress this component now owns.
 */
export function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const bgWrapperRef = useRef<HTMLDivElement>(null);
  const heroGroupRef = useRef<HTMLDivElement>(null);
  const parallaxRef = useRef<HTMLDivElement>(null);
  const cardWrapperRef = useRef<HTMLDivElement>(null);
  const featuresGroupRef = useRef<HTMLDivElement>(null);
  const cylinderRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const isPreloaderDone = usePreloaderDone();

  const [activeIndex, setActiveIndex] = useState(0);
  const [currentAngle, setCurrentAngle] = useState(0);
  const [zoomProgress, setZoomProgress] = useState(0);
  const [particleProgress, setParticleProgress] = useState(0);
  // 0 = the card is still compact (hero grid, or mid-FLIP). 1 = it has grown into the
  // cylinder's full size and revealed its expanded content. Drives both the standalone
  // card's own content reveal and the prop the cylinder hands its own copy of it.
  const [expandProgress, setExpandProgress] = useState(0);

  // The sample-signal card's own index/hover-pause, owned here rather than inside
  // SignalCard: the card mounts twice at once during the crossfade (the standalone hero
  // instance and the cylinder's own copy of it), and two independent autoplay timers
  // drift apart within seconds — the pair tabs on one card were seen highlighting a
  // different pair than the price panel showed. A single shared timer makes that
  // impossible; both instances just render whatever it says.
  const [signalIndex, setSignalIndex] = useState(0);
  const [signalPaused, setSignalPaused] = useState(false);

  useEffect(() => {
    if (signalPaused || !isPreloaderDone) return;
    const id = setInterval(() => setSignalIndex((i) => (i + 1) % HERO_SIGNALS.length), SIGNAL_CYCLE_MS);
    return () => clearInterval(id);
  }, [signalPaused, isPreloaderDone]);

  // Mounting the WebGL stage costs a synchronous burst of work — 100k particle buffers
  // plus the first headline sampling. Doing that at the moment the sphere is meant to
  // appear stalls exactly the frame you are watching, so mount it well before, still
  // fully transparent, and let it be warm and idle by the time the dot zoom lands.
  const [stageMounted, setStageMounted] = useState(false);
  const stageMountedRef = useRef(false);

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

  // The combined pin. See the component doc comment for why this is one trigger instead
  // of two — the short version is that a second pinned section can't be gated by the
  // first, so it has to not be a second section at all.
  useEffect(() => {
    const section = sectionRef.current;
    const leftCol = parallaxRef.current;
    const cardWrapper = cardWrapperRef.current;
    const heroGroup = heroGroupRef.current;
    const featuresGroup = featuresGroupRef.current;
    const headerEl = headerRef.current;
    if (!section || !leftCol || !cardWrapper || !heroGroup || !featuresGroup) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const anglePerCard = 360 / features.length;
    const totalRotation = -(features.length - 1) * anglePerCard;

    // Compact/expanded pixel sizes at the current breakpoint — re-picked on every
    // measure (mount + resize) since which breakpoint applies can change. Tailwind
    // classes can't be interpolated frame by frame, so the expand phase below drives
    // the wrapper's width/height from these numbers directly instead.
    const pickPx = (table: typeof COMPACT_CARD_PX) => {
      const w = window.innerWidth;
      if (w >= 768) return table.md;
      if (w >= 640) return table.sm;
      return table.base;
    };
    let compact = pickPx(COMPACT_CARD_PX);
    let expanded = pickPx(EXPANDED_CARD_PX);

    // The card FLIPs to wherever the cylinder's front card actually sits (its own
    // centered layout, not a guessed viewport position) — both live in this same pinned
    // box now, so the target is always laid out and measurable, pinned or not.
    const delta = { x: 0, y: 0 };
    const measureDelta = () => {
      compact = pickPx(COMPACT_CARD_PX);
      expanded = pickPx(EXPANDED_CARD_PX);

      const targetEl = document.getElementById(HANDOFF_TARGET_ID);
      if (!targetEl) return;

      gsap.set(cardWrapper, { x: 0, y: 0, width: compact.w, height: compact.h });

      const cardRect = cardWrapper.getBoundingClientRect();
      const targetRect = targetEl.getBoundingClientRect();
      delta.x = targetRect.left + targetRect.width / 2 - (cardRect.left + cardRect.width / 2);
      delta.y = targetRect.top + targetRect.height / 2 - (cardRect.top + cardRect.height / 2);
    };

    const ctx = gsap.context(() => {
      measureDelta();

      // Room for the fade/move/expand/crossfade hand-off, then the original
      // FeaturesSection runway (rotation, dot zoom, four particle text beats) unchanged.
      // 2.4x rather than a tighter multiple specifically so each phase below — especially
      // the expand and the crossfade — gets a generous scroll distance to play out over;
      // a short window reads as an instant cut no matter how it's eased, since there's
      // barely any scroll for the eased curve to actually traverse.
      const HERO_RUNWAY = window.innerHeight * 2.4;
      const FEATURES_RUNWAY = window.innerHeight * 16.5;
      const heroFrac = HERO_RUNWAY / (HERO_RUNWAY + FEATURES_RUNWAY);

      // Smoothstep: eases both ends of a 0–1 ramp instead of a linear cut, so motion and
      // opacity both ease in and out rather than starting/stopping abruptly.
      const smoothstep = (t: number) => t * t * (3 - 2 * t);

      // Everything below reads `p`, not `self.progress` directly: a plain scroll listener
      // snaps to wherever the wheel/trackpad delta lands, so one fast notch would jump
      // every gsap.set() here straight to its new value no matter how the smoothstep
      // curves shape the motion in between. Routing progress through a tween scrubbed by
      // a numeric `scrub` gives GSAP's own (frame-rate-correct, already-tested) catch-up
      // interpolation instead — the whole hand-off gets real time-based duration, so it
      // eases smoothly toward the target progress rather than teleporting to it.
      const applyProgress = (p: number) => {
        if (p <= heroFrac) {
          const hp = p / heroFrac;

          // Phase 1 (0 → 0.16 of hp): the copy fades out.
          gsap.set(leftCol, { opacity: 1 - Math.min(1, hp / 0.16) });

          // Phase 2 (0.14 → 0.46 of hp): the card FLIPs to the cylinder's front-card
          // slot, smoothstep-eased, still at its compact size.
          const moveT = smoothstep(Math.min(1, Math.max(0, (hp - 0.14) / 0.32)));
          gsap.set(cardWrapper, {
            x: delta.x * moveT,
            y: delta.y * moveT,
          });

          // Phase 3 (0.46 → 0.78 of hp): once centered, the card grows in place from
          // its compact size to the cylinder's full card size — revealing the pair
          // tabs, levels grid and agent breakdown it didn't have room for while
          // compact. `expandT` drives both the wrapper's own width/height (below) and
          // the card's internal clip-path reveal (via the `expandProgress` prop).
          const expandT = smoothstep(Math.min(1, Math.max(0, (hp - 0.46) / 0.32)));
          gsap.set(cardWrapper, {
            width: compact.w + (expanded.w - compact.w) * expandT,
            height: compact.h + (expanded.h - compact.h) * expandT,
          });
          setExpandProgress(expandT);

          // Phase 4 (0.8 → 1.0 of hp): now that both cards are the same size and show
          // the same content, the card crossfades into the cylinder group, which has
          // been sitting at opacity 0 (invisible, not just "behind") this whole time —
          // this is the only place its opacity ever moves off 0 before this. Nothing
          // visibly changes at the swap itself; the two cards are identical here.
          const crossT = smoothstep(Math.min(1, Math.max(0, (hp - 0.8) / 0.2)));
          gsap.set(cardWrapper, { opacity: 1 - crossT });
          gsap.set(featuresGroup, { opacity: crossT });
          gsap.set(heroGroup, { pointerEvents: "auto" });

          // Scrolling back up out of the feature phase leaves `currentAngle` (and the
          // zoom/particle progress) wherever they last were — nothing here ever resets
          // them, since only the feature-phase branch below sets them. Reset every
          // frame the hero phase is active, so the cylinder is always at rest (card 0
          // square to the viewer) whenever this phase's own pixel-perfect crossfade
          // target is measured, and so a stale particle overlay can't linger behind it.
          setCurrentAngle(0);
          setActiveIndex(0);
          setZoomProgress(0);
          setParticleProgress(0);
        } else {
          gsap.set(leftCol, { opacity: 0 });
          gsap.set(cardWrapper, { opacity: 0 });
          gsap.set(featuresGroup, { opacity: 1 });
          gsap.set(heroGroup, { pointerEvents: "none" });
          setExpandProgress(1);

          // From here down: identical math to the original FeaturesSection, just fed
          // by `subP` (this phase's own 0–1) instead of the whole pin's progress.
          const subP = (p - heroFrac) / (1 - heroFrac);

          const rotationProgress = Math.min(1, subP / 0.32);
          setCurrentAngle(rotationProgress * totalRotation);

          const cardIndex = Math.min(
            features.length - 1,
            Math.max(0, Math.round(rotationProgress * (features.length - 1)))
          );
          setActiveIndex(cardIndex);

          setZoomProgress(Math.min(1, Math.max(0, (subP - 0.32) / 0.055)));
          setParticleProgress(Math.min(1, Math.max(0, (subP - 0.375) / 0.625)));

          if (!stageMountedRef.current && subP > 0.14) {
            stageMountedRef.current = true;
            setStageMounted(true);
          }

          // Header fades out as the dot zoom starts, same window FeaturesSection
          // always used (0.315–0.37 of the feature phase). Its fade-in is free: it's
          // a descendant of `featuresGroup`, whose own opacity already carried it in
          // during the crossfade above.
          if (headerEl) {
            const headerFadeT = Math.min(1, Math.max(0, (subP - 0.315) / 0.055));
            gsap.set(headerEl, { opacity: 1 - headerFadeT });
          }
        }
      };

      // The scrubbed proxy tween: ScrollTrigger drives `proxy.p` from 0 to 1 across the
      // pin's scroll range, but a numeric `scrub` makes it lag behind the raw scroll
      // position by that many seconds, catching up smoothly instead of matching it
      // frame-for-frame — this is what actually removes the jerk, independent of the
      // smoothstep shaping inside applyProgress above.
      const proxy = { p: 0 };
      const progressTween = gsap.to(proxy, {
        p: 1,
        ease: "none",
        duration: 1,
        onUpdate: () => applyProgress(proxy.p),
      });

      ScrollTrigger.create({
        trigger: section,
        pin: section,
        pinSpacing: true,
        start: "top top",
        end: () => `+=${HERO_RUNWAY + FEATURES_RUNWAY}`,
        scrub: 0.65,
        animation: progressTween,
        onRefresh: measureDelta,
      });
    }, section);

    return () => ctx.revert();
  }, []);

  const activeFeature = features[activeIndex];

  return (
    <section
      ref={sectionRef}
      id={SECTION_IDS.hero}
      className="relative min-h-svh h-screen w-full overflow-hidden select-none motion-reduce:h-auto motion-reduce:min-h-0"
    >
      {/* One background, used for the whole pin — hero copy, hand-off, and the cylinder
          carousel all sit on it. FeaturesSection used to paint its own image+overlay
          background here; removed, since this section never leaves Hero's. */}
      <div ref={bgWrapperRef} className="absolute inset-0">
        <HeroBackground />
      </div>

      {/* ── Hero group: copy + live card sample ── */}
      <div
        ref={heroGroupRef}
        className="absolute inset-0 z-20 flex min-h-svh items-center px-6 pt-28 pb-20 sm:px-10 lg:px-14 lg:pt-24 lg:pb-12 xl:px-16 motion-reduce:relative motion-reduce:min-h-0 motion-reduce:py-16"
      >
        <div className="relative z-10 mx-auto grid w-full max-w-[96rem] items-center gap-14 will-change-transform lg:grid-cols-[1fr_minmax(0,28rem)] lg:items-stretch lg:gap-20">
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
          <div className="flex items-center justify-center">
            <div ref={cardWrapperRef} className={`relative z-30 ${HANDOFF_CARD_SIZE_CLASS} will-change-transform`}>
              <SignalCard
                expandProgress={expandProgress}
                index={signalIndex}
                onIndexSelect={setSignalIndex}
                onHoverChange={setSignalPaused}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Features group: cylinder carousel + particle finale ──
          Starts at opacity 0 (via GSAP, not a CSS class — see the reduced-motion note
          below) and only ever reveals through the crossfade above, so nothing here is
          visible a moment before the card has actually arrived at its position. */}
      <div
        ref={featuresGroupRef}
        className="absolute inset-0 z-10 flex flex-col justify-between pt-8 pb-12 sm:pt-12 sm:pb-16 motion-reduce:relative motion-reduce:opacity-100"
      >
        <FeaturesMarqueeBackdrop activeTitle={activeFeature?.title} dark />

        <div className="h-4 sm:h-8" />

        <div className="relative z-20 w-full max-w-7xl mx-auto flex-1 flex items-center justify-center mt-10 md:mt-16">
          <Cylinder3DCarousel
            features={features}
            cylinderRef={cylinderRef}
            currentAngle={currentAngle}
            zoomProgress={zoomProgress}
            expandProgress={expandProgress}
            signalIndex={signalIndex}
            onSignalIndexSelect={setSignalIndex}
            onSignalHoverChange={setSignalPaused}
          />
        </div>

        <div
          ref={headerRef}
          className="relative z-30 w-full max-w-8xl mx-auto flex flex-col md:flex-row md:items-end md:justify-between gap-6 pointer-events-none px-6 mt-2 sm:mt-4"
        >
          <h2 className="font-heading text-2xl sm:text-[2.2rem] text-white tracking-tight leading-[1.1] max-w-[15ch] text-left">
            Everything You Need in One Platform
          </h2>

          <p className="text-xs sm:text-sm text-white/70 leading-relaxed font-sans max-w-[36ch] md:max-w-[42ch] text-left md:text-right">
            From AI-powered intent swarms to institutional zero-knowledge vaults — VOLSA gives you sovereign control over your Web3 financial stack.
          </p>
        </div>
      </div>

      {/* ─── WebGL Particle Stage (headlines are particles, no DOM overlay) ─── */}
      {stageMounted && (
        <div
          className="absolute inset-0 z-[150] bg-surface-deepest pointer-events-none"
          style={{
            // Deep space goes opaque before the sphere blooms, so the dot zoom hands
            // off to black instead of showing the carousel through the particles.
            opacity: particleProgress > 0 ? Math.min(1, particleProgress / 0.045) : 0,
          }}
        >
          {/* Lower bound matters as much as the upper one: `particleProgress` sits at 0
              for the whole cylinder-rotation phase, so a bare `< GLOBE_WINDOW_END`
              check kept a second WebGL context alive (and building its geometry) all
              the way through it. */}
          {particleProgress > 0.002 && particleProgress < GLOBE_WINDOW_END && (
            <WorldSignalGlobe progress={Math.min(1, particleProgress / GLOBE_WINDOW_END)} />
          )}
          <CylinderExplosionSphere zoomProgress={particleProgress} activeColor={THEME_COLORS.brandLeaf} />
        </div>
      )}

      {/* ─── Screen-Reader Accessible Fallback for the feature carousel ─── */}
      <div className="sr-only" aria-live="polite">
        <h2>Active Feature: {activeFeature?.title}</h2>
        <p>{activeFeature?.description}</p>
        <ul>
          {features.map((f) => (
            <li key={f.id}>
              <h3>{f.title}</h3>
              <p>{f.description}</p>
            </li>
          ))}
        </ul>
        {/* The closing headlines render as particles, so mirror them for assistive tech. */}
        <ul>
          {TEXT_BEATS.map((beat) => (
            <li key={beat.lines.join(" ")}>{beat.lines.join(" ")}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default HeroSection;
