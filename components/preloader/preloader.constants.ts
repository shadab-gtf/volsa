/**
 * VOLSA Preloader Constants & Timing Configuration
 */

export const BRAND_COLORS = {
  mint: "#D8F3D1",     // Pale Mint background
  forest: "#22480B",   // Forest Green primary
  leaf: "#66B616",     // Leaf Green accent
  lime: "#C6F19A",     // Soft Lime accent
  dark: "#122805",     // Ultra Dark Forest
  white: "#FFFFFF",
};

export const NUM_COLUMNS = 14;

export const PRELOADER_TIMING = {
  markScaleDuration: 0.7,
  wordmarkSlideDuration: 0.8,
  taglineFadeDuration: 0.5,
  holdDuration: 0.8,
  blindsStagger: 0.04,
  blindsDuration: 1.1,
  minDisplayTimeMs: 1800,
};

export const EASINGS = {
  logo: "power3.out",
  slide: "power4.out",
  blinds: "power4.inOut",
};
