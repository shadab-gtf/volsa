/**
 * Shared geometry between the Hero product card and the feature cylinder carousel.
 *
 * Hero pins, recenters its card, then crossfades it into the cylinder's front card as
 * the feature phase takes over the same pin. For that swap to read as one continuous
 * card rather than a cut, both must render at the identical size/radius, and Hero must
 * know exactly where the cylinder's front-card slot sits on screen — hence the shared
 * size classes and the DOM id below, which HeroSection measures against at runtime
 * instead of guessing a hardcoded target position (which would drift the moment the
 * cylinder's own layout or breakpoints change).
 */

export const HANDOFF_CARD_SIZE_CLASS =
  "w-[305px] sm:w-[350px] md:w-[380px] h-[440px] sm:h-[500px] md:h-[550px]";

export const HANDOFF_CARD_RADIUS_CLASS = "rounded-[32px] sm:rounded-[36px] md:rounded-[40px]";

/** Minimal dark glass shell — thin border, no vignette/glow stack. Shared by Hero's card and every cylinder card. */
export const HANDOFF_CARD_SHELL_CLASS =
  "border border-white/15 bg-surface-panel-carousel/95 backdrop-blur-xl shadow-[0_20px_60px_rgba(var(--black-rgb),0.5)]";

export const HANDOFF_CARD_SHELL_FRONT_CLASS =
  "border-brand-leaf/60 bg-surface-panel-carousel/95 backdrop-blur-xl shadow-[0_20px_60px_rgba(var(--black-rgb),0.5)]";

/** The cylinder's currently-front card (moves between cards as the carousel rotates) — HeroSection measures this directly, not the carousel's outer wrapper, since the card carries its own extra transform the wrapper doesn't. */
export const HANDOFF_TARGET_ID = "cylinder-handoff-target";
