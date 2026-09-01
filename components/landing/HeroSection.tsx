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
import { HANDOFF_CARD_SIZE_CLASS, HANDOFF_TARGET_ID } from "./heroCylinderHandoff.constants";
import { HeroBackground } from "./HeroBackground";
import { SignalCard } from "./hero/SignalCard";
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
 *      cylinder's front-card slot, then crossfades into the (until-now invisible)
 *      cylinder group right there.
 *   4. Feature phase (heroFrac → 1): the cylinder rotates through the cards, the active
 *      card's key dot zooms out to swallow the viewport, then the WebGL particle stage
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

    // The card FLIPs to wherever the cylinder's front card actually sits (its own
    // centered layout, not a guessed viewport position) — both live in this same pinned
    // box now, so the target is always laid out and measurable, pinned or not.
    const delta = { x: 0, y: 0 };
    const measureDelta = () => {
      const targetEl = document.getElementById(HANDOFF_TARGET_ID);
      if (!targetEl) return;

      gsap.set(cardWrapper, { x: 0, y: 0 });

      const cardRect = cardWrapper.getBoundingClientRect();
      const targetRect = targetEl.getBoundingClientRect();
      delta.x = targetRect.left + targetRect.width / 2 - (cardRect.left + cardRect.width / 2);
      delta.y = targetRect.top + targetRect.height / 2 - (cardRect.top + cardRect.height / 2);
    };

    const ctx = gsap.context(() => {
      measureDelta();

      // Room for the fade/move/hold/crossfade hand-off, then the original
      // FeaturesSection runway (rotation, dot zoom, four particle text beats) unchanged.
      // 2.2x rather than a tighter multiple specifically so the crossfade below gets a
      // generous scroll distance to play out over — a short window reads as an instant
      // swap no matter how it's eased, since there's barely any scroll for the eased
      // curve to actually traverse.
      const HERO_RUNWAY = window.innerHeight * 2.2;
      const FEATURES_RUNWAY = window.innerHeight * 16.5;
      const heroFrac = HERO_RUNWAY / (HERO_RUNWAY + FEATURES_RUNWAY);

      // Smoothstep: eases both ends of a 0–1 ramp instead of a linear cut, so motion and
      // opacity both ease in and out rather than starting/stopping abruptly.
      const smoothstep = (t: number) => t * t * (3 - 2 * t);

      ScrollTrigger.create({
        trigger: section,
        pin: section,
        pinSpacing: true,
        start: "top top",
        end: () => `+=${HERO_RUNWAY + FEATURES_RUNWAY}`,
        onRefresh: measureDelta,
        onUpdate: (self) => {
          const p = self.progress;

          if (p <= heroFrac) {
            const hp = p / heroFrac;

            // Phase 1 (0 → 0.28 of hp): the copy fades out.
            gsap.set(leftCol, { opacity: 1 - Math.min(1, hp / 0.28) });

            // Phase 2 (0.22 → 0.58 of hp): the card FLIPs to the cylinder's front-card
            // slot, smoothstep-eased. 0.58 → 0.7 is a deliberate hold: the card sits
            // centered and settled before the crossfade below picks it up.
            const moveT = Math.min(1, Math.max(0, (hp - 0.22) / 0.36));
            gsap.set(cardWrapper, {
              x: delta.x * smoothstep(moveT),
              y: delta.y * smoothstep(moveT),
            });

            // Phase 3 (0.7 → 1.0 of hp): card crossfades into the cylinder group, which
            // has been sitting at opacity 0 (invisible, not just "behind") this whole
            // time — this is the only place its opacity ever moves off 0 before this.
            // A wide, eased window on purpose: this is the one moment where the hero
            // card visibly becomes the cylinder's front card, so it gets the most
            // scroll distance and the softest curve of any phase here.
            const crossT = smoothstep(Math.min(1, Math.max(0, (hp - 0.7) / 0.3)));
            gsap.set(cardWrapper, { opacity: 1 - crossT });
            gsap.set(featuresGroup, { opacity: crossT });
            gsap.set(heroGroup, { pointerEvents: "auto" });
          } else {
            gsap.set(leftCol, { opacity: 0 });
            gsap.set(cardWrapper, { opacity: 0 });
            gsap.set(featuresGroup, { opacity: 1 });
            gsap.set(heroGroup, { pointerEvents: "none" });

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
        },
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
              <SignalCard />
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
