/**
 * Static score for the in-device film.
 *
 * Everything here is deterministic on purpose: the scenes render on the server
 * too, so a `Math.random()` candle would hydrate into a different chart.
 */

export interface Chapter {
  id: string;
  /** Rail label under the device. */
  label: string;
  /** Which bottom-nav slot lights up while this chapter plays. */
  nav: number;
}

/** The four acts: money in → decision → execution → exit. */
export const CHAPTERS: Chapter[] = [
  { id: "portfolio", label: "Your portfolio", nav: 0 },
  { id: "council", label: "The council votes", nav: 2 },
  { id: "execution", label: "The engine executes", nav: 1 },
  { id: "exit", label: "Exits run themselves", nav: 3 },
];

/** Seconds each chapter holds once it has finished animating in. */
export const CHAPTER_HOLD = 3.1;

// ─── Scene 3: candles ────────────────────────────────────

export type Candle = readonly [open: number, high: number, low: number, close: number];

export const CANDLES: Candle[] = [
  [143.1, 144.2, 142.6, 143.9],
  [143.9, 144.6, 143.2, 143.4],
  [143.4, 144.0, 142.4, 142.8],
  [142.8, 143.6, 142.2, 143.5],
  [143.5, 145.1, 143.3, 144.8],
  [144.8, 145.4, 144.1, 144.3],
  [144.3, 145.0, 143.6, 144.9],
  [144.9, 146.4, 144.7, 146.1],
  [146.1, 146.8, 145.2, 145.6],
  [145.6, 146.3, 144.9, 146.0],
  [146.0, 147.9, 145.8, 147.6],
  [147.6, 148.2, 146.9, 147.2],
  [147.2, 148.0, 146.6, 147.9],
  [147.9, 149.6, 147.7, 149.2],
  [149.2, 149.8, 148.3, 148.7],
  [148.7, 149.4, 148.0, 149.1],
  [149.1, 150.7, 148.9, 150.4],
  [150.4, 151.2, 149.8, 150.1],
  [150.1, 151.0, 149.5, 150.8],
  [150.8, 152.1, 150.5, 151.9],
];

export const CHART = {
  width: 300,
  height: 168,
  padTop: 8,
  padBottom: 34,
  slot: 14,
  bodyWidth: 8,
  /** Price the council's entry filled at — drawn as the dashed rail. */
  entry: 148.32,
} as const;

const prices = CANDLES.flat();
const low = Math.min(...prices) - 0.6;
const high = Math.max(...prices) + 0.6;

/** Price → SVG y, inside the plot area. */
export function priceToY(price: number) {
  const plot = CHART.height - CHART.padTop - CHART.padBottom;
  return CHART.padTop + ((high - price) / (high - low)) * plot;
}

/** Candle index → SVG x of the body's left edge. */
export function candleX(index: number) {
  return 5 + index * CHART.slot;
}

// ─── Scene 4: exit rails ─────────────────────────────────

export const EXIT_RAILS = [
  { id: "sl", label: "Stop-loss", value: "−2.5%", at: 12 },
  { id: "entry", label: "Entry", value: "$148.32", at: 34 },
  { id: "trail", label: "Trailing", value: "1.2%", at: 62 },
  { id: "tp", label: "Take-profit", value: "+6.0%", at: 88 },
] as const;
