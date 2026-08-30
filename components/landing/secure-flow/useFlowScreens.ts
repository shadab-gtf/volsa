"use client";

import gsap from "gsap";

/** Screen order inside `FlowPhone`. Index 4 is the security act's vault. */
export const FLOW_SCREEN_IDS = ["buy", "swap", "send", "withdraw", "vault"] as const;

/**
 * Each screen's own micro-film — the beat that plays once it lands.
 *
 * These are what make the device look recorded rather than rendered: the Buy
 * keypad types its own amount, the swap quote resolves, the send signs, the
 * withdrawal clears. They run detached from the scrubbed master so a fast
 * flick can't smear them frame by frame across the scroll.
 */
type Beat = (scope: gsap.core.Timeline, screen: HTMLElement) => void;

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const BEATS: Record<string, Beat> = {
  buy(tl, screen) {
    const q = gsap.utils.selector(screen);
    const amount = screen.querySelector<HTMLElement>(".flow-amount");
    const keys = q<HTMLElement>(".flow-key");
    const byLabel = (label: string) =>
      keys.find((key) => key.dataset.key === label) ?? null;

    // Types "100" one key at a time, the amount landing with each press.
    const presses: Array<[key: string, value: number]> = [
      ["1", 1],
      ["0", 10],
      ["0", 100],
    ];

    presses.forEach(([label, value], index) => {
      const key = byLabel(label);
      const at = 0.35 + index * 0.32;
      if (key) {
        tl.to(key, { backgroundColor: "rgba(var(--brand-glow-rgb),0.22)", duration: 0.1 }, at);
        tl.to(key, { scale: 0.92, duration: 0.1 }, at);
        tl.to(key, { backgroundColor: "rgba(var(--white-rgb),0.05)", scale: 1, duration: 0.22 }, at + 0.1);
      }
      tl.call(
        () => {
          if (amount) amount.textContent = money.format(value);
        },
        undefined,
        at + 0.04
      );
    });

    tl.fromTo(
      q(".flow-cta"),
      { scale: 1 },
      { scale: 1.03, duration: 0.3, yoyo: true, repeat: 1, ease: "sine.inOut" },
      1.45
    );
  },

  swap(tl, screen) {
    const q = gsap.utils.selector(screen);
    const quote = screen.querySelector<HTMLElement>(".flow-quote");
    const counter = { value: 0 };

    tl.from(q(".flow-leg"), { y: 16, opacity: 0, duration: 0.5, stagger: 0.12 }, 0.1);
    tl.from(
      q(".flow-swap-pivot"),
      { scale: 0, rotate: -120, duration: 0.5, ease: "back.out(2)" },
      0.3
    );
    tl.to(
      counter,
      {
        value: 0.658,
        duration: 0.9,
        ease: "power2.out",
        onUpdate: () => {
          if (quote) quote.textContent = counter.value.toFixed(3);
        },
      },
      0.55
    );
    tl.from(q(".flow-row"), { x: 12, opacity: 0, duration: 0.35, stagger: 0.07 }, 0.7);
    tl.from(
      q(".flow-best"),
      { y: 14, opacity: 0, duration: 0.45, ease: "back.out(1.6)" },
      1.1
    );
  },

  send(tl, screen) {
    const q = gsap.utils.selector(screen);
    tl.from(q(".flow-leg"), { y: 16, opacity: 0, duration: 0.5 }, 0.1);
    tl.from(q(".flow-row"), { x: 12, opacity: 0, duration: 0.35, stagger: 0.08 }, 0.4);
    tl.from(q(".flow-sign"), { y: 18, opacity: 0, duration: 0.5 }, 0.6);
    tl.fromTo(
      q(".flow-sign-bar"),
      { scaleX: 0 },
      { scaleX: 1, duration: 1, ease: "power1.inOut" },
      0.8
    );
    tl.fromTo(
      q(".flow-cta"),
      { scale: 1 },
      { scale: 1.03, duration: 0.3, yoyo: true, repeat: 1, ease: "sine.inOut" },
      1.8
    );
  },

  withdraw(tl, screen) {
    const q = gsap.utils.selector(screen);
    tl.from(q(".flow-leg"), { y: 16, opacity: 0, duration: 0.45, stagger: 0.12 }, 0.1);
    tl.from(q(".flow-row"), { x: 12, opacity: 0, duration: 0.35, stagger: 0.08 }, 0.45);
    tl.from(
      q(".flow-cleared"),
      { y: 16, opacity: 0, duration: 0.5, ease: "back.out(1.6)" },
      0.9
    );
  },

  vault(tl, screen) {
    const q = gsap.utils.selector(screen);
    tl.from(
      q(".flow-vault-mark"),
      { scale: 0.7, opacity: 0, duration: 0.7, ease: "back.out(1.8)" },
      0.1
    );
    tl.from(q(".flow-vault-row"), { x: 14, opacity: 0, duration: 0.4, stagger: 0.1 }, 0.5);
  },
};

/**
 * Cross-fades to a screen and plays its beat.
 *
 * Returns a disposer so the caller can kill an in-flight beat — during a scrub
 * the target screen can change mid-animation, and a stale timeline writing to a
 * hidden screen is exactly how a "video" starts looking like a glitch.
 */
export function createScreenPlayer(root: HTMLElement) {
  const screens = gsap.utils.toArray<HTMLElement>("[data-flow-screen]", root);
  let active = -1;
  let beat: gsap.core.Timeline | null = null;

  const show = (index: number) => {
    if (index === active || !screens[index]) return;
    active = index;

    beat?.kill();
    beat = null;

    screens.forEach((screen, i) => {
      if (i === index) return;
      gsap.to(screen, { autoAlpha: 0, duration: 0.28, overwrite: true });
    });

    const screen = screens[index];
    gsap.fromTo(
      screen,
      { autoAlpha: 0, y: 14 },
      { autoAlpha: 1, y: 0, duration: 0.4, ease: "power2.out", overwrite: true }
    );

    const id = FLOW_SCREEN_IDS[index];
    const play = BEATS[id];
    if (play) {
      beat = gsap.timeline();
      play(beat, screen);
    }
  };

  /** Shows a screen with no animation and no beat — the reduced-motion path. */
  const settle = (index: number) => {
    if (!screens[index]) return;
    active = index;
    beat?.kill();
    beat = null;
    screens.forEach((screen, i) => gsap.set(screen, { autoAlpha: i === index ? 1 : 0 }));
    const amount = screens[index].querySelector<HTMLElement>(".flow-amount");
    if (amount) amount.textContent = money.format(100);
    const quote = screens[index].querySelector<HTMLElement>(".flow-quote");
    if (quote) quote.textContent = "0.658";
  };

  return {
    show,
    settle,
    dispose: () => {
      beat?.kill();
      beat = null;
    },
  };
}
