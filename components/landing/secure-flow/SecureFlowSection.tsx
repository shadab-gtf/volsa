"use client";

import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ArrowSwapHorizontal,
  CardAdd,
  ImportCurve,
  Send2,
  ShieldTick,
} from "iconsax-reactjs";
import { SECTION_IDS } from "@/constants/landing.constants";
import {
  getFlowSteps,
  getSecurityPillars,
  type FlowStep,
} from "@/services/landing.service";
import { FlowPhone } from "./FlowPhone";
import { SecurityGlyph } from "./SecurityGlyph";
import { createFlowFilm, FLOW_CHAPTERS } from "./useFlowFilm";
import { createScreenPlayer } from "./useFlowScreens";

gsap.registerPlugin(ScrollTrigger);

const steps = getFlowSteps();
const pillars = getSecurityPillars();

const HEADLINE = ["Your keys", "Your moves"];

const STEP_ICONS = {
  buy: CardAdd,
  swap: ArrowSwapHorizontal,
  send: Send2,
  withdraw: ImportCurve,
} as const;

/** Two steps down each side of the device. */
const LEFT_STEPS = steps.slice(0, 2);
const RIGHT_STEPS = steps.slice(2);

/**
 * Secure flow — the product's four money movements, then the case for trusting
 * it with them.
 *
 * The device sits in the middle at full size and plays the whole sequence by
 * itself; the four cards flank it and light up in turn. Scroll drives exactly
 * two things: the display-type handoff that opens the section, and whether the
 * film is running. Everything else performs on its own clock, which is what
 * makes it read as a product video rather than a scroll toy.
 */
export function SecureFlowSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const phoneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const pinTarget = pinRef.current;
    const stage = stageRef.current;
    const phone = phoneRef.current;
    if (!section || !pinTarget || !stage || !phone) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Reduced motion: the stylesheet has already unpinned and unclipped the
    // stage, so all that is left is to settle the device on its first screen
    // and leave every card's copy on show.
    if (reduced) {
      const player = createScreenPlayer(phone);
      player.settle(0);
      return () => player.dispose();
    }

    const film = createFlowFilm(stage, phone);

    // Two independent conditions gate the film, so nothing fights over the
    // playhead: the opening wipe must have handed the stage over, and the stage
    // must actually be on screen. `sync` is the only thing allowed to call
    // play/pause.
    let handedOver = false;
    let inView = false;
    const sync = () => {
      if (handedOver && inView && !document.hidden) film.play();
      else film.pause();
    };

    const ctx = gsap.context(() => {
      const q = gsap.utils.selector(section);

      // The 3D marks turn on their own clock. Binding them to scroll would
      // freeze them the instant the reader stops — which is exactly when they
      // are being looked at hardest.
      q<HTMLElement>(".glyph-tilt").forEach((tilt, index) => {
        gsap.to(tilt, {
          rotateY: 24,
          rotateX: -11,
          duration: 5.5,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
          delay: index * 0.7,
        });
      });

      // Security pillars — an ordinary reveal, below the pinned stage.
      gsap.from(q(".flow-vouch-intro"), {
        y: 26,
        autoAlpha: 0,
        duration: 0.8,
        stagger: 0.1,
        scrollTrigger: { trigger: q(".flow-vouch")[0], start: "top 84%", once: true },
      });
      gsap.from(q(".flow-pillar"), {
        y: 40,
        autoAlpha: 0,
        duration: 0.9,
        stagger: 0.14,
        ease: "power3.out",
        scrollTrigger: { trigger: q(".flow-vouch")[0], start: "top 74%", once: true },
      });

      ScrollTrigger.matchMedia({
        // ─── Desktop: one short pin, purely for the type handoff ───
        "(min-width: 1024px)": () => {
          gsap.set(stage, { clipPath: "inset(0% 0% 100% 0%)" });

          gsap.timeline({
            defaults: { ease: "power2.out" },
            scrollTrigger: {
              trigger: section,
              start: "top top",
              // Deliberately short. The film runs on its own clock, so holding
              // the reader through five viewports of pin would just be a toll
              // booth in front of content that is already playing.
              end: () => `+=${window.innerHeight * 1.15}`,
              // Pin the inner wrapper, never the <section>: pinning reparents
              // its target into a pin-spacer, and reparenting a node that sits
              // among sibling sections breaks React's reconciliation.
              pin: pinTarget,
              pinSpacing: true,
              anticipatePin: 1,
              scrub: 1,
              invalidateOnRefresh: true,
              fastScrollEnd: true,
              // The film waits for the wipe to hand the stage over, then keeps
              // running for as long as the stage is what's on screen.
              onUpdate: (self) => {
                handedOver = self.progress > 0.62;
                sync();
              },
              onLeave: () => {
                handedOver = true;
                sync();
              },
              onLeaveBack: () => {
                handedOver = false;
                sync();
              },
            },
          })
            .from(
              ".flow-type-line",
              { yPercent: 112, duration: 2, stagger: 0.4, ease: "power3.out" },
              0
            )
            .from(".flow-outline", { autoAlpha: 0, scaleY: 0.86, duration: 2 }, 0.4)
            .to(".flow-type-act", { scale: 1.12, duration: 3.6, ease: "none" }, 1.4)
            // The handoff: the type collapses upward from the same edge the
            // stage grows down from, so the drawing becomes the object.
            .to(
              ".flow-type-act",
              { clipPath: "inset(0% 0% 100% 0%)", duration: 2, ease: "power2.inOut" },
              3.6
            )
            .to(
              stage,
              { clipPath: "inset(0% 0% 0% 0%)", duration: 2, ease: "power2.inOut" },
              3.6
            )
            .from(".flow-stage-chrome", { y: 26, autoAlpha: 0, duration: 1 }, 4.4);
        },

        // ─── Narrow: no pin, no clip — nothing to hand over ───
        "(max-width: 1023px)": () => {
          handedOver = true;

          gsap.from(q(".flow-type-line"), {
            yPercent: 110,
            duration: 1,
            stagger: 0.12,
            ease: "power3.out",
            scrollTrigger: {
              trigger: q(".flow-type-act")[0],
              start: "top 82%",
              once: true,
            },
          });
        },
      });

      // Viewport gate, both breakpoints: a loop that keeps running after the
      // stage has scrolled away is pure battery burn. Measured against the
      // <section>, not the stage — the stage is absolutely positioned inside
      // the pinned container, so its own start/end resolve against a box that
      // does not move while the pin is held.
      ScrollTrigger.create({
        trigger: section,
        start: "top bottom",
        end: "bottom top",
        onToggle: (self) => {
          inView = self.isActive;
          sync();
        },
      });

      // A hidden tab should not burn frames on a loop nobody can see.
      const onVisibility = () => sync();
      document.addEventListener("visibilitychange", onVisibility);
      return () => document.removeEventListener("visibilitychange", onVisibility);
    }, section);

    return () => {
      ctx.revert();
      film.dispose();
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      id={SECTION_IDS.secureFlow}
      className="relative w-full bg-gradient-to-b from-[#e9f8d2] via-[#ddf3bb] to-[#eaf8d5] text-brand-forest"
    >
      {/* ─── Handoff stage ───────────────────────────────── */}
      <div
        ref={pinRef}
        className="flow-pin relative w-full overflow-hidden lg:h-svh"
      >
        {/* Act 1 · display type */}
        <div className="flow-type-act relative z-20 grid place-items-center px-5 py-20 lg:absolute lg:inset-0 lg:px-8 lg:py-0">
          <span
            className="flow-outline pointer-events-none absolute left-1/2 top-1/2 hidden h-[68svh] max-h-[620px] -translate-x-1/2 -translate-y-1/2 rounded-[2.8rem] border-2 border-white/80 lg:block"
            style={{ aspectRatio: "9 / 18.6" }}
            aria-hidden="true"
          />
          <h2 className="relative text-center font-heading uppercase leading-[0.86] tracking-[-0.02em] text-brand-forest">
            {HEADLINE.map((line) => (
              <span key={line} className="block overflow-hidden py-[0.04em]">
                <span className="flow-type-line block text-[clamp(2.5rem,11vw,9.5rem)] font-normal">
                  {line}
                </span>
              </span>
            ))}
          </h2>
        </div>

        {/* Act 2 · the device, centred and flanked */}
        <div ref={stageRef} className="flow-stage relative z-10 lg:absolute lg:inset-0">
          <div className="mx-auto flex h-full w-full max-w-[1400px] flex-col justify-center gap-7 px-5 pb-20 sm:px-8 lg:gap-5 lg:pb-0">
            <span className="flow-stage-chrome block text-center text-[11px] font-sans font-bold uppercase tracking-[0.24em] text-brand-leaf">
              How it works
            </span>

            {/* Cards left · device centre · cards right */}
            <div className="grid items-stretch gap-6 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:gap-8 xl:gap-12 max-w-[1240px] mx-auto w-full">
              <div className="order-2 flex flex-col justify-between gap-4 sm:flex-row lg:order-1 lg:flex-col lg:gap-5 h-full">
                {LEFT_STEPS.map((step) => (
                  <StepCard key={step.id} step={step} align="right" />
                ))}
              </div>

              <div
                ref={phoneRef}
                className="order-1 flex flex-shrink-0 justify-center lg:order-2"
              >
                <FlowPhone />
              </div>

              <div className="order-3 flex flex-col justify-between gap-4 sm:flex-row lg:flex-col lg:gap-5 h-full">
                {RIGHT_STEPS.map((step) => (
                  <StepCard key={step.id} step={step} align="left" />
                ))}
              </div>
            </div>

            {/* Non-custodial badge (Pagination rail removed as requested) */}
            <div className="flow-stage-chrome mx-auto flex w-full max-w-md flex-col items-center mt-2">
              <span className="flow-secured inline-flex items-center gap-2 rounded-full border border-brand-forest/15 bg-white/80 px-4 py-2 text-center shadow-sm">
                <ShieldTick size={14} variant="Bold" className="flex-shrink-0 text-brand-leaf" />
                <span className="text-[11px] font-sans font-semibold text-brand-forest">
                  Non-custodial — the keys never left the device
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── The security case ───────────────────────────── */}
      <div className="flow-vouch relative mx-auto w-full max-w-7xl px-5 pb-28 pt-24 sm:px-8 lg:pb-36 lg:pt-32">
        <span className="flow-vouch-intro block text-[11px] font-sans font-bold uppercase tracking-[0.24em] text-brand-leaf">
          And it stays yours
        </span>
        <h2 className="flow-vouch-intro mt-5 max-w-3xl font-heading text-3xl leading-[1.08] tracking-tight text-brand-forest sm:text-4xl lg:text-5xl">
          Automation you can revoke at any moment
        </h2>

        <div className="mt-16 grid gap-12 sm:grid-cols-2 lg:grid-cols-3 lg:gap-10">
          {pillars.map((pillar) => (
            <div key={pillar.id} className="flow-pillar">
              <SecurityGlyph glyph={pillar.glyph} />
              <h3 className="mt-7 font-heading text-xl leading-snug tracking-tight text-brand-forest sm:text-2xl">
                {pillar.title}
              </h3>
              <p className="mt-3 max-w-sm text-sm font-light leading-relaxed text-brand-dark/65">
                {pillar.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Step card ───────────────────────────────────────────

function StepCard({ step, align }: { step: FlowStep; align: "left" | "right" }) {
  const Icon = STEP_ICONS[step.id];

  return (
    <article
      className={`flow-card relative flex flex-1 min-h-0 flex-col justify-between overflow-hidden rounded-[1.75rem] border border-brand-forest/10 bg-white p-6 sm:p-7 shadow-[0_15px_45px_rgba(18,40,5,0.07)] transition-all duration-300 hover:shadow-[0_25px_60px_rgba(18,40,5,0.13)] hover:-translate-y-1 ${
        align === "right" ? "lg:text-right" : ""
      }`}
    >
      <div>
        <div
          className={`flex items-center gap-3 ${
            align === "right" ? "lg:flex-row-reverse" : ""
          }`}
        >
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[#0a1703] text-brand-lime shadow-sm">
            <Icon size={17} variant="Linear" />
          </span>
          <span className="font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-brand-forest/50">
            {step.index} · {step.label}
          </span>
        </div>

        <h3 className="mt-4 font-heading text-xl sm:text-2xl leading-[1.15] tracking-tight text-brand-forest">
          {step.title}
        </h3>
      </div>

      <div className="flow-card-body mt-4">
        <p className="text-xs sm:text-sm font-light leading-relaxed text-brand-dark/75">
          {step.description}
        </p>
        <span className="mt-3 block text-[10px] font-sans font-bold uppercase tracking-[0.18em] text-brand-leaf font-mono">
          {step.note}
        </span>
      </div>

      {/* Dwell meter for the chapter this card owns. */}
      <span
        className="flow-card-bar absolute inset-x-0 bottom-0 h-[2px] origin-left bg-brand-leaf"
        aria-hidden="true"
      />
    </article>
  );
}
