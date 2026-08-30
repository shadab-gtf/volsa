/**
 * Landing page constants — section ids, navigation, and shared animation timings.
 *
 * Sections are only ever addressed through SECTION_IDS, so one can be renamed,
 * reordered, or swapped out without hunting down hardcoded hashes. NAV_LINKS is the
 * single source for the overlay menu and any future header nav: adding an entry is one
 * line, and a non-hash href falls through to normal navigation on its own.
 */

export const SECTION_IDS = {
  hero: "hero",
  platform: "platform",
  aiEngine: "ai-engine",
  tradingModes: "trading-modes",
  multiChain: "multi-chain",
  security: "security",
  securityArchitecture: "security-architecture",
  howItWorks: "how-it-works",
  faq: "faq",
  cta: "cta",

  // Legacy ids, still referenced by sections queued for replacement.
  engines: "engines",
  stats: "stats",
  tokenomics: "tokenomics",
} as const;

export type SectionId = (typeof SECTION_IDS)[keyof typeof SECTION_IDS];

export type NavLink = {
  label: string;
  /** A `#id` scrolls smoothly; anything else navigates normally. */
  href: string;
};

/**
 * Overview-level navigation: the product's six pillars, not a table of contents.
 * Sections such as How It Works and the closing CTA stay in the scroll flow without
 * taking a nav slot.
 */
export const NAV_LINKS: readonly NavLink[] = [
  { label: "Platform", href: `#${SECTION_IDS.platform}` },
  { label: "AI Engine", href: `#${SECTION_IDS.aiEngine}` },
  { label: "Trading Modes", href: `#${SECTION_IDS.tradingModes}` },
  { label: "Multi-Chain", href: `#${SECTION_IDS.multiChain}` },
  { label: "Security", href: `#${SECTION_IDS.security}` },
  { label: "FAQ", href: `#${SECTION_IDS.faq}` },
] as const;

/** Primary header action. Repoint `href` at the app URL once it exists. */
export const NAV_CTA: NavLink = {
  label: "Get Started",
  href: `#${SECTION_IDS.cta}`,
};

export const SCROLL_ANIMATION = {
  revealDuration: 0.8,
  revealStagger: 0.12,
  counterDuration: 2,
  sectionScrubDuration: 1,
} as const;
