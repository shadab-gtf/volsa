/**
 * Shared geometry between the Hero product card and the feature cylinder carousel.
 *
 * Hero pins, moves its card to the cylinder's front-card slot, grows it in place into
 * the cylinder's full card size, then hands it directly to the cylinder as its first
 * card — no separate cylinder-only design to cut to. For that hand-off to read as one
 * continuous card rather than a swap, every cylinder card (this one included) renders
 * at the identical size/radius, and Hero must know exactly where the cylinder's
 * front-card slot sits on screen — hence the shared size classes and the DOM id below,
 * which HeroSection measures against at runtime instead of guessing a hardcoded target
 * position (which would drift the moment the cylinder's own layout or breakpoints
 * change).
 */

/** Compact — the card's resting size in the hero copy grid, and its size while still
 *  FLIPping toward the cylinder's slot. Grows into `CYLINDER_CARD_SIZE_CLASS` once
 *  centered. */
export const HANDOFF_CARD_SIZE_CLASS =
  "w-[305px] sm:w-[350px] md:w-[380px] h-[440px] sm:h-[500px] md:h-[550px]";

/** Expanded — every cylinder card's actual size, including the hero card once it has
 *  grown into the cylinder's first card. Heights are measured, not guessed: the
 *  expanded signal card's real content (pair tabs, chart, levels grid, agent
 *  breakdown, footer) needs ~622/638/638px at base/sm/md respectively before any
 *  breathing room, since none of that content shrinks with the breakpoint the way the
 *  card's own footprint does — these give it room to spare rather than clipping it. */
export const CYLINDER_CARD_SIZE_CLASS =
  "w-[332px] sm:w-[381px] md:w-[414px] h-[650px] sm:h-[665px] md:h-[665px]";

/**
 * Numeric twins of the two size classes above, at the same breakpoints Tailwind uses
 * here (sm 640px, md 768px). HeroSection needs raw pixel numbers to interpolate the
 * standalone card's width/height smoothly on every scroll frame — a Tailwind class
 * swap has no in-between frames to animate through.
 */
export const COMPACT_CARD_PX = {
  base: { w: 305, h: 440 },
  sm: { w: 350, h: 500 },
  md: { w: 380, h: 550 },
};

export const EXPANDED_CARD_PX = {
  base: { w: 332, h: 650 },
  sm: { w: 381, h: 665 },
  md: { w: 414, h: 665 },
};

export const HANDOFF_CARD_RADIUS_CLASS = "rounded-[32px] sm:rounded-[36px] md:rounded-[40px]";

/** Minimal dark glass shell — thin border, no vignette/glow stack. Shared by every card: the hero/signal card and every cylinder card. */
export const HANDOFF_CARD_SHELL_CLASS =
  "border border-white/15 bg-surface-panel-carousel/95 backdrop-blur-xl shadow-[0_20px_60px_rgba(var(--black-rgb),0.5)]";

export const HANDOFF_CARD_SHELL_FRONT_CLASS =
  "border-brand-leaf/60 bg-surface-panel-carousel/95 backdrop-blur-xl shadow-[0_20px_60px_rgba(var(--black-rgb),0.5)]";

/** The cylinder's currently-front card (moves between cards as the carousel rotates) — HeroSection measures this directly, not the carousel's outer wrapper, since the card carries its own extra transform the wrapper doesn't. */
export const HANDOFF_TARGET_ID = "cylinder-handoff-target";
