"use client";

import gsap from "gsap";
import { createScreenPlayer } from "./useFlowScreens";

/** Seconds each chapter holds after its screen and card have finished landing. */
export const CHAPTER_HOLD = 3.4;

/** Chapters, in play order. The last one is the security beat — it owns no card. */
export const FLOW_CHAPTERS = ["buy", "swap", "send", "withdraw", "vault"] as const;

export interface FlowFilm {
  timeline: gsap.core.Timeline;
  play: () => void;
  pause: () => void;
  dispose: () => void;
}

/**
 * The autoplaying flow film.
 *
 * Screens are NOT scrubbed. Tying each screen to a scroll step meant the user
 * had to keep scrolling to see the product work, and any pause froze it
 * mid-gesture; a single looping playhead lets the whole sequence perform on its
 * own while the reader just watches. Scroll position only decides whether it is
 * running at all.
 *
 * On every cut the matching card rises into focus from below while the outgoing
 * one settles back — the card and the screen are the same event, so they move
 * on the same frame.
 */
export function createFlowFilm(root: HTMLElement, phone: HTMLElement): FlowFilm {
  const q = gsap.utils.selector(root);
  const player = createScreenPlayer(phone);

  const cards = q<HTMLElement>(".flow-card");
  const bodies = cards.map((card) => card.querySelector<HTMLElement>(".flow-card-body"));
  const bars = cards.map((card) => card.querySelector<HTMLElement>(".flow-card-bar"));
  const secured = q<HTMLElement>(".flow-secured");

  // Resting state. Set here rather than in the stylesheet so a reader with no
  // JS still gets the full card copy instead of four headings and blank space.
  gsap.set(bodies.filter(Boolean), { autoAlpha: 0, y: 16 });
  gsap.set(bars.filter(Boolean), { scaleX: 0, transformOrigin: "left center" });
  gsap.set(secured, { autoAlpha: 0, y: 18 });

  const timeline = gsap.timeline({
    repeat: -1,
    paused: true,
    defaults: { ease: "power3.out" },
  });

  FLOW_CHAPTERS.forEach((chapter, index) => {
    const card = cards[index];
    const body = bodies[index];
    const bar = bars[index];
    const isVault = chapter === "vault";
    const at = index === 0 ? 0 : ">";

    timeline.call(() => player.show(index), undefined, at);

    // Every card that is not the incoming one drops back to rest.
    cards.forEach((other, otherIndex) => {
      if (otherIndex === index) return;
      timeline.to(
        other,
        {
          y: 0,
          scale: 1,
          borderColor: "rgba(var(--white-rgb),0.1)",
          backgroundColor: "rgba(var(--black-rgb),0.92)",
          duration: 0.5,
        },
        "<"
      );
      const otherBody = bodies[otherIndex];
      if (otherBody) timeline.to(otherBody, { autoAlpha: 0, y: 16, duration: 0.4 }, "<");
      const otherBar = bars[otherIndex];
      if (otherBar) timeline.to(otherBar, { scaleX: 0, duration: 0.3 }, "<");
    });

    if (!isVault && card) {
      timeline.to(
        card,
        {
          y: -8,
          scale: 1.015,
          borderColor: "rgba(var(--brand-leaf-rgb),0.4)",
          backgroundColor: "rgba(var(--black-rgb),1)",
          duration: 0.6,
        },
        "<"
      );
      // The reveal the whole section is built around: copy rises out from under
      // the card's heading as the screen behind it changes.
      if (body) timeline.to(body, { autoAlpha: 1, y: 0, duration: 0.6 }, "<0.12");
    }

    // Security beat: no card owns it, so the badge under the device does.
    timeline.to(
      secured,
      { autoAlpha: isVault ? 1 : 0, y: isVault ? 0 : 18, duration: 0.5 },
      "<"
    );

    // Dwell. The active card's bar drains it, so the loop never feels arbitrary.
    if (bar) {
      timeline.fromTo(
        bar,
        { scaleX: 0 },
        { scaleX: 1, duration: CHAPTER_HOLD, ease: "none" },
        "<0.3"
      );
    } else {
      timeline.to({}, { duration: CHAPTER_HOLD });
    }
  });

  return {
    timeline,
    play: () => timeline.play(),
    pause: () => timeline.pause(),
    dispose: () => {
      timeline.kill();
      player.dispose();
    },
  };
}
