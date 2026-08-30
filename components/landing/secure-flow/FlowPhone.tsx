"use client";

import React from "react";
import {
  BuyScreen,
  SendScreen,
  SwapScreen,
  VaultScreen,
  WithdrawScreen,
} from "./FlowScreens";

/**
 * The device the secure-flow section drives. Screens are stacked absolutely and
 * cross-faded by the flow timeline; the frame itself never moves, so the cuts
 * read as an app being used rather than a carousel of pictures.
 *
 * Height-first sizing (`h-[min(...)]` + aspect ratio) keeps the whole device
 * inside the pinned viewport on short laptops instead of overflowing the pin.
 */
export function FlowPhone() {
  return (
    <div className="flow-phone relative aspect-[9/18.6] h-[min(660px,72svh)] sm:h-[min(720px,76svh)] lg:h-[min(780px,82svh)] w-[360px] max-w-full">
      {/* Glow bed — separates the dark device from the pale stage. */}
      <span
        className="pointer-events-none absolute -inset-10 rounded-[50%] bg-brand-leaf/25 blur-3xl"
        aria-hidden="true"
      />


      <div className="relative h-full rounded-[2.8rem] border border-white/10 bg-black p-[9px] shadow-[0_60px_120px_-40px_rgba(var(--black-rgb),0.55)]">
        <div className="relative h-full overflow-hidden rounded-[2.35rem] bg-black">
          {/* Status bar */}
          <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-7 pt-3">
            <span className="text-[10px] font-sans font-medium tabular-nums text-white/45">
              9:41
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1 w-1 rounded-full bg-brand-lime" />
              <span className="text-[9px] font-sans uppercase tracking-[0.16em] text-white/35">
                Secured
              </span>
            </span>
          </div>

          {/* Screen stack — order must match FLOW_SCREEN_IDS in the section.
              Wrapped so `.flow-screen:not(:first-child)` in the stylesheet can
              hide the inactive four without the status bar counting as a
              sibling. */}
          <div className="absolute inset-0">
            <BuyScreen />
            <SwapScreen />
            <SendScreen />
            <WithdrawScreen />
            <VaultScreen />
          </div>

          {/* Home indicator */}
          <span className="absolute bottom-2 left-1/2 z-10 h-1 w-28 -translate-x-1/2 rounded-full bg-white/20" />
        </div>
      </div>
    </div>
  );
}
