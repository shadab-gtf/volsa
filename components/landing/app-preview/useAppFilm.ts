"use client";

import { useEffect, useRef, type RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CHAPTERS, CHAPTER_HOLD } from "./previewFilm.data";

gsap.registerPlugin(ScrollTrigger);

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Counts a text node up without touching React state. */
function countUp(
  timeline: gsap.core.Timeline,
  el: Element | null,
  to: number,
  options: { duration?: number; format?: (value: number) => string; at?: string | number } = {}
) {
  if (!el) return;
  const { duration = 1.4, format = money.format, at = "<" } = options;
  const counter = { value: 0 };
  timeline.to(
    counter,
    {
      value: to,
      duration,
      ease: "power2.out",
      onUpdate: () => {
        el.textContent = format(counter.value);
      },
    },
    at
  );
}

/**
 * The in-device film: four chapters that cut like an explainer video, looping
 * for as long as the device is on screen.
 *
 * Deliberately built as ONE paused master timeline rather than per-scene
 * triggers — a single playhead is what keeps the cuts feeling edited instead of
 * scroll-jittered, and it means the whole thing pauses in one call when the
 * section leaves the viewport.
 */
export function useAppFilm(
  rootRef: RefObject<HTMLElement | null>,
  onChapter?: (index: number) => void
) {
  // Held in a ref so a parent that re-renders on every chapter change (it does —
  // the rail below the device tracks the playhead) can't tear down the film.
  const onChapterRef = useRef(onChapter);
  useEffect(() => {
    onChapterRef.current = onChapter;
  }, [onChapter]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const scenes = gsap.utils.toArray<HTMLElement>("[data-scene]", root);
    if (!scenes.length) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const q = gsap.utils.selector(root);
    const announce = (index: number) => onChapterRef.current?.(index);

    // Reduced motion gets the finished first frame — a static, correct screen.
    if (reduced) {
      scenes.forEach((scene, index) => gsap.set(scene, { autoAlpha: index === 0 ? 1 : 0 }));
      const balance = root.querySelector(".film-balance");
      if (balance) balance.textContent = money.format(48920.75);
      announce(0);
      return;
    }

    const ctx = gsap.context(() => {
      // CSS hides every scene but the first before JS arrives; from here on the
      // timeline owns visibility for all of them.
      gsap.set(scenes, { autoAlpha: 0, zIndex: 1 });

      const master = gsap.timeline({
        repeat: -1,
        paused: true,
        defaults: { ease: "power3.out" },
      });

      scenes.forEach((scene, index) => {
        const inScene = gsap.utils.selector(scene);
        const chapter = CHAPTERS[index];

        // ─── Cut in ───
        master.call(() => announce(index), undefined, index === 0 ? 0 : ">");

        master.set(scene, { autoAlpha: 1, zIndex: 2 });
        master.fromTo(
          scene,
          { y: 34, scale: 0.985 },
          { y: 0, scale: 1, duration: 0.7, ease: "power3.out" },
          "<"
        );

        // Bottom-nav slot lights up as if someone tapped it.
        master.to(
          q(".film-nav-icon"),
          {
            color: (i: number) => (i === chapter.nav ? "#C6F19A" : "rgba(255,255,255,0.32)"),
            scale: (i: number) => (i === chapter.nav ? 1.08 : 1),
            duration: 0.4,
          },
          "<"
        );
        master.to(
          q(".film-nav-dot"),
          { scale: (i: number) => (i === chapter.nav ? 1 : 0), duration: 0.4 },
          "<"
        );

        // Generic content lift, shared by every scene.
        master.from(
          inScene(".film-in"),
          { y: 18, opacity: 0, duration: 0.55, stagger: 0.055 },
          "<0.1"
        );

        // ─── Per-chapter beats ───
        if (chapter.id === "portfolio") {
          countUp(master, scene.querySelector(".film-balance"), 48920.75, {
            duration: 1.5,
            at: "<0.1",
          });
        }

        if (chapter.id === "council") {
          const ring = scene.querySelector<SVGCircleElement>(".film-ring");
          if (ring) {
            const length = 2 * Math.PI * Number(ring.getAttribute("r"));
            master.fromTo(
              ring,
              { strokeDashoffset: length },
              { strokeDashoffset: length * (1 - 71 / 100), duration: 1.3, ease: "power2.inOut" },
              "<0.15"
            );
          }
          countUp(master, scene.querySelector(".film-consensus"), 71, {
            duration: 1.3,
            format: (value) => `${Math.round(value)}%`,
            at: "<",
          });
          master.from(
            inScene(".film-vote"),
            { x: -14, opacity: 0, duration: 0.4, stagger: 0.075 },
            "<0.2"
          );
          master.to(
            inScene(".film-live"),
            { opacity: 0.25, duration: 0.7, yoyo: true, repeat: 3 },
            "<"
          );
          master.from(
            inScene(".film-verdict"),
            { scale: 0.9, opacity: 0, duration: 0.5, ease: "back.out(2.2)" },
            ">-0.15"
          );
        }

        if (chapter.id === "execution") {
          const label = scene.querySelector(".film-fill-label");
          const setLabel = (text: string) => () => {
            if (label) label.textContent = text;
          };
          master.call(setLabel("Routing…"), undefined, "<");
          master.from(
            inScene(".film-candle"),
            {
              scaleY: 0,
              opacity: 0,
              transformOrigin: "50% 100%",
              duration: 0.32,
              stagger: 0.028,
              ease: "power2.out",
            },
            "<0.15"
          );
          master.from(inScene(".film-entry"), { opacity: 0, duration: 0.4 }, ">-0.1");
          master.fromTo(
            inScene(".film-fill-bar"),
            { scaleX: 0 },
            { scaleX: 1, duration: 1.1, ease: "power1.inOut" },
            "<"
          );
          master.call(setLabel("Filled"), undefined, ">");
          master.from(inScene(".film-fill-result"), { y: 8, opacity: 0, duration: 0.4 }, "<");
        }

        if (chapter.id === "exit") {
          master.fromTo(
            inScene(".film-rail-fill"),
            { scaleX: 0 },
            { scaleX: 1, duration: 0.9, ease: "power2.inOut" },
            "<0.1"
          );
          master.from(
            inScene(".film-rail"),
            { scale: 0, opacity: 0, duration: 0.35, stagger: 0.08, ease: "back.out(2)" },
            "<0.2"
          );
          master.from(
            inScene(".film-toast"),
            { y: 20, opacity: 0, duration: 0.5, ease: "back.out(1.6)" },
            ">-0.1"
          );
          countUp(master, scene.querySelector(".film-earnings"), 3284.6, {
            duration: 1.2,
            at: "<0.1",
          });
          master.to(
            inScene(".film-claim"),
            { scale: 1.06, duration: 0.45, yoyo: true, repeat: 3, ease: "sine.inOut" },
            ">-0.4"
          );
        }

        // ─── Hold, then cut out ───
        master.to({}, { duration: CHAPTER_HOLD });
        master.to(scene, {
          autoAlpha: 0,
          y: -26,
          scale: 0.99,
          duration: 0.45,
          ease: "power2.in",
        });
        master.set(scene, { zIndex: 1 });
      });

      // Only run while the device is actually watchable: an infinite timeline
      // ticking behind the fold is pure battery burn. The start deliberately
      // matches the section's own reveal (`top 72%`) rather than `top bottom` —
      // starting a viewport early meant the device finished its entrance
      // already halfway through chapter two, so nobody ever saw act one.
      ScrollTrigger.create({
        trigger: root,
        start: "top 78%",
        end: "bottom top",
        onToggle: (self) => (self.isActive ? master.play() : master.pause()),
      });

      // Pausing on a hidden tab keeps the loop in sync with what's watchable.
      const onVisibility = () => {
        if (document.hidden) master.pause();
        else if (ScrollTrigger.isInViewport(root)) master.play();
      };
      document.addEventListener("visibilitychange", onVisibility);
      return () => document.removeEventListener("visibilitychange", onVisibility);
    }, root);

    return () => ctx.revert();
  }, [rootRef, onChapter]);
}
