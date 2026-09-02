"use client";

import { useEffect, useState } from "react";

/**
 * Cycles a 0..count-1 index every `intervalMs`, only while `active` — the small "someone
 * is using this" pulse that makes a static mock screen read as a live app, without
 * pretending any of the numbers on it are real. Every cylinder card that mocks a real
 * VOLSA screen (Buy/Sell, Convert, Deposit/Withdraw, Transfer, Wallet) uses this to move
 * a highlight ring between its two or three focal controls.
 */
export function useCyclingHighlight(count: number, active: boolean, intervalMs = 2200) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!active || count <= 1) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const id = setInterval(() => setIndex((i) => (i + 1) % count), intervalMs);
    return () => clearInterval(id);
  }, [active, count, intervalMs]);

  return index;
}
