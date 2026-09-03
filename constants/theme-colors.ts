/**
 * JS-readable mirror of the palette in app/globals.css.
 *
 * Canvas, Three.js and inline SVG props can't read CSS custom properties
 * directly, so every color consumed by those APIs lives here instead of as
 * a literal hex string in the component. Keep every value in sync with its
 * `--token` twin in app/globals.css — that file is still the source of
 * truth for anything rendered as DOM/Tailwind.
 */
export const THEME_COLORS = {
  brandMint: "#CEE28B",
  brandForest: "#22480b",
  brandLeaf: "#c0fc01",
  brandLime: "#CEE28B",
  brandDark: "#122805",

  surface: "#f7fdf4",

  signalUp: "#3f780d",
  signalUpSoft: "#c0fc01",
  signalDown: "#b3350f",
  signalDownSoft: "#e0a68d",
  signalDownBright: "#ff4d3d",
  signalFlat: "#8a6508",
  signalFlatSoft: "#d9c384",

  white: "#ffffff",
  whiteRgb: "255, 255, 255",
  black: "#000000",

  brandGlow: "#c6f19a",
  brandGlowRgb: "198, 241, 154",
  brandGlowBright: "#8fe331",
  brandGlowBrightRgb: "143, 227, 49",
  brandGlowSoft: "#9adc4a",
  brandGlowSoftRgb: "154, 220, 74",
  brandRim: "#a6f04e",
  brandMist: "#d8f3d1",
  brandMistRgb: "216, 243, 209",
  brandSlate: "#899089",
  brandSlateRgb: "137, 144, 137",

  brandForestRgb: "34, 72, 11",
  brandLeafRgb: "192, 252, 1",
  brandDarkRgb: "18, 40, 5",
  surfaceRgb: "247, 253, 244",

  brandLogoLight: "#7acc22",
  brandLogoMid: "#4da012",
  brandLogoDark: "#3a7210",

  chartUpAlt: "#3e7d0f",
  chartDownMock: "#3f7a1a",

  surfaceDevice: "#0a1703",
  surfaceDeviceAlt: "#0e2004",
  surfacePanel: "#0c1c07",
  surfacePanelCarousel: "#060e03",
  surfacePanelCarouselAlt: "#040a02",
  surfacePanelDeep: "#030702",
  surfacePanelCarousel3d: "#0b1607",
  surfaceGradient1: "#14260d",
  surfaceGradient2: "#0d1c08",
  surfaceGradient3: "#071004",
  surfaceDeepest: "#050b04",
  surfacePanelFeatures: "#0a1208",
  surfaceCanvasBg: "#08110a",
  surfacePlatform: "#0a1405",
  glyphGradientDark1: "#0a1c04",
  glyphGradientDark2: "#14300a",
  glyphGradientDark3: "#1d3f09",
  sphereEmissive: "#121913",
  sphereEmissiveAlt: "#050d06",
  sphereFront: "#0c170a",
  sphereBack: "#081007",
  networkDim: "#1f4a0c",
  networkPale: "#4a6b32",
  badgeGradientDark: "#2c5c0e",
  ambientLight: "#eef8ea",

  surfaceTintA: "#eef7e0",
  surfaceTintB: "#eaf7e2",
  surfaceTintC: "#f2faec",
  flowGradient1: "#e9f8d2",
  flowGradient2: "#ddf3bb",
  flowGradient3: "#eaf8d5",
} as const;
