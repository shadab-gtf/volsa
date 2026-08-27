"use client";

import React, { useRef, useState, useEffect } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SECTION_IDS } from "@/constants/landing.constants";
import { getFeatures } from "@/services/landing.service";
import { Cylinder3DCarousel } from "./Cylinder3DCarousel";
import { FeaturesMarqueeBackdrop } from "./FeaturesMarqueeBackdrop";
import { CylinderExplosionSphere, TEXT_BEATS } from "./CylinderExplosionSphere";

gsap.registerPlugin(ScrollTrigger);

const features = getFeatures();

/**
 * Features Section — pinned, fully scroll-driven 3D cylinder carousel into a WebGL
 * particle stage. Bidirectional and 100% scrub-linked:
 * - 0% to 32%: 3D cylinder rotates through the feature cards.
 * - 32% to 37.5%: the active card's key dot zooms out to swallow the viewport.
 * - 37.5% to 100%: particle stage. Lit sphere -> desert dune field -> "IN YOUR CONTROL"
 *   -> three security headlines, each rebuilt from the last -> hyper-warp exit.
 *   Every beat inside it is timed by PARTICLE_PHASES / TEXT_BEATS, and the headlines
 *   are drawn as particles rather than DOM text, so there is no overlay to keep in sync.
 */
export function FeaturesSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const cylinderRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const bgWrapperRef = useRef<HTMLDivElement>(null);

  const [activeIndex, setActiveIndex] = useState(0);
  const [currentAngle, setCurrentAngle] = useState(0);
  
  // Independent scroll progress segments
  const [zoomProgress, setZoomProgress] = useState(0);      // key dot zoom (0.32 to 0.375)
  const [particleProgress, setParticleProgress] = useState(0);  // WebGL particles (0.375 to 1.00)

  // Mounting the WebGL stage costs a synchronous burst of work — 100k particle buffers
  // plus the first headline sampling. Doing that at the moment the sphere is meant to
  // appear stalls exactly the frame you are watching, so mount it well before, still
  // fully transparent, and let it be warm and idle by the time the dot zoom lands.
  const [stageMounted, setStageMounted] = useState(false);
  const stageMountedRef = useRef(false);

  useEffect(() => {
    const section = sectionRef.current;
    const pinTarget = pinRef.current;
    const cylinder = cylinderRef.current;
    const bgWrapper = bgWrapperRef.current;
    if (!section || !pinTarget || !cylinder || !bgWrapper) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const anglePerCard = 360 / features.length;
    const totalRotation = -(features.length - 1) * anglePerCard;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          pin: pinTarget,
          pinSpacing: true,
          start: "top top",
          end: () => `+=${window.innerHeight * 16.5}`, // Four particle text beats, each needing room to read
          scrub: 1.0, // The particle stage adds its own dt-based easing; more here just lags
          invalidateOnRefresh: true,
          // No `anticipatePin` and no `fastScrollEnd` here on purpose — both fight
          // Lenis. anticipatePin engages the pin early by a velocity estimate, which
          // is a correction for native momentum scroll; Lenis already hands
          // ScrollTrigger a frame-synced position, so the offset just snaps the
          // section into place. fastScrollEnd slams the scrub to its end state on a
          // fast flick, which is a jolt by design.
          onUpdate: (self) => {
            const progress = self.progress;

            // 1. Carousel rotates during first 40% of the scroll
            const rotationProgress = Math.min(1, progress / 0.32);
            const targetAngle = rotationProgress * totalRotation;
            setCurrentAngle(targetAngle);

            const cardIndex = Math.min(
              features.length - 1,
              Math.max(0, Math.round(rotationProgress * (features.length - 1)))
            );
            setActiveIndex(cardIndex);

            // 2. Key dot zoom progress (0.32 to 0.375)
            const dotZoom = Math.min(1, Math.max(0, (progress - 0.32) / 0.055));
            setZoomProgress(dotZoom);

            // 3. WebGL particle timeline progress (0.375 to 1.00 of total scroll)
            const partZoom = Math.min(1, Math.max(0, (progress - 0.375) / 0.625));
            setParticleProgress(partZoom);

            // Warm the WebGL stage up during the carousel, long before it is visible.
            if (!stageMountedRef.current && progress > 0.14) {
              stageMountedRef.current = true;
              setStageMounted(true);
            }
          },
        },
      });

      // Phase 2: Fade out background wrapper and header text as the dot zoom starts
      tl.to(
        bgWrapper,
        {
          opacity: 0,
          ease: "power2.out",
          duration: 0.055,
        },
        0.315
      );

      if (headerRef.current) {
        tl.to(
          headerRef.current,
          {
            opacity: 0,
            ease: "power2.out",
            duration: 0.055,
          },
          0.315
        );
      }
      // Clear the navbar while the section is still approaching, so the frame the pin
      // engages on carries no other motion.
      const hideNavbar = () => {
        const navbar = document.querySelector("nav");
        if (navbar) {
          gsap.to(navbar, { yPercent: -120, opacity: 0, duration: 0.45, ease: "power2.out" });
        }
      };

      ScrollTrigger.create({
        trigger: section,
        start: "top 75%",
        end: "bottom top",
        onEnter: hideNavbar,
        onLeave: hideNavbar,
        onEnterBack: hideNavbar,
        onLeaveBack: hideNavbar,
      });
    }, section);

    // No local ScrollTrigger.refresh() here: SmoothScrollProvider already refreshes on
    // mount and again once fonts settle. An extra refresh re-measures every pin on the
    // page, and doing that on a timer is its own source of jumps.
    return () => ctx.revert();
  }, []);

  const activeFeature = features[activeIndex];

  return (
    <section
      ref={sectionRef}
      id={SECTION_IDS.features}
      className="relative z-10 w-full bg-[#0a1208] overflow-hidden"
    >
      {/* ─── Pinned Inner Container (GSAP Pin Target) ─── */}
      <div
        ref={pinRef}
        className="relative w-full min-h-svh h-screen flex flex-col justify-between items-center pt-8 pb-12 sm:pt-12 sm:pb-16 overflow-hidden select-none"
      >
        {/* ─── Background Image with Smooth Overlay ─── */}
        <div
          ref={bgWrapperRef}
          className="absolute inset-0 z-0 overflow-hidden pointer-events-none"
          aria-hidden="true"
        >
          <Image
            src="/images/background.png"
            alt="Features Background"
            fill
            priority
            className="object-cover object-center scale-100 opacity-95"
            sizes="100vw"
          />

          {/* Premium Frosted Glass Overlay */}
          <div className="absolute inset-0 backdrop-blur-[12px] bg-[#0a1208]/55" />

          {/* Soft Edge Feathering */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a1208]/95 via-transparent to-[#0a1208]/80" />

          {/* Ambient Radial Glow */}
          <div className="absolute -top-20 -left-20 w-[500px] h-[500px] rounded-full bg-[#66b616]/20 blur-[120px]" />
          <div className="absolute -bottom-20 -right-20 w-[500px] h-[500px] rounded-full bg-[#c6f19a]/15 blur-[120px]" />
        </div>

        {/* ─── Background Monumental Marquee Watermark ─── */}
        <FeaturesMarqueeBackdrop activeTitle={activeFeature?.title} dark={true} />

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

        {/* ─── WebGL Particle Stage (headlines are particles, no DOM overlay) ─── */}
        {stageMounted && (
          <div
            className="absolute inset-0 z-[150] bg-[#050b04] pointer-events-none"
            style={{
              // Deep space goes opaque before the sphere blooms, so the dot zoom hands
              // off to black instead of showing the carousel through the particles.
              opacity: particleProgress > 0 ? Math.min(1, particleProgress / 0.045) : 0,
            }}
          >
            <CylinderExplosionSphere zoomProgress={particleProgress} activeColor="#66b616" />
          </div>
        )}

        {/* ─── Screen-Reader Accessible Fallback ─── */}
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
      </div>
    </section>
  );
}

export default FeaturesSection;

