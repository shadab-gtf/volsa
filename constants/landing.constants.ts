/**
 * VOLSA Landing Page Constants
 * Section IDs, animation timings, and navigation config.
 */

export const SECTION_IDS = {
  hero: "hero",
  features: "features",
  agentCouncil: "agent-council",
  engines: "engines",
  secureFlow: "secure-flow",
  howItWorks: "how-it-works",
  stats: "stats",
  tokenomics: "tokenomics",
  roadmap: "roadmap",
  faq: "faq",
  cta: "cta",
} as const;

export const NAV_LINKS = [
  { label: "Features", href: `#${SECTION_IDS.features}` },
  { label: "How It Works", href: `#${SECTION_IDS.howItWorks}` },
  { label: "Tokenomics", href: `#${SECTION_IDS.tokenomics}` },
  { label: "Roadmap", href: `#${SECTION_IDS.roadmap}` },
  { label: "FAQ", href: `#${SECTION_IDS.faq}` },
] as const;

export const SCROLL_ANIMATION = {
  revealDuration: 0.8,
  revealStagger: 0.12,
  counterDuration: 2,
  sectionScrubDuration: 1,
} as const;
