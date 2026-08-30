"use client";

import React, { useCallback, useRef, useState } from "react";
import Image from "next/image";
import { Candle2, Home2, Judge, Add, Wallet3, type Icon } from "iconsax-reactjs";
import { CHAPTERS } from "./previewFilm.data";
import {
  CouncilScene,
  ExecutionScene,
  ExitScene,
  PortfolioScene,
} from "./PreviewScenes";
import { useAppFilm } from "./useAppFilm";

/** Bottom-nav slots, in render order. Index matches `Chapter.nav`. */
const NAV_ITEMS: Icon[] = [Home2, Candle2, Judge, Wallet3];

/**
 * The VOLSA app as a self-playing product film.
 *
 * Four chapters — portfolio, council vote, execution, auto-exit — cut through
 * one device, so the section's claim and its evidence share a single frame.
 * It reads like a screen recording, but it is DOM: crisp at any density, ~0kb
 * of video, and it never has to buffer.
 *
 * Every figure is illustrative sample data from the service layer.
 */
export function AppPreviewMock({ className = "" }: { className?: string }) {
  const deviceRef = useRef<HTMLDivElement>(null);
  const [chapter, setChapter] = useState(0);

  const onChapter = useCallback((index: number) => setChapter(index), []);
  useAppFilm(deviceRef, onChapter);

  return (
    <div className={`app-preview w-full max-w-[366px] ${className}`}>
      {/* Device frame */}
      <div
        ref={deviceRef}
        className="relative rounded-[2.7rem] border border-white/10 bg-black p-[9px] shadow-[0_50px_120px_-45px_rgba(var(--black-rgb),0.7)]"
      >
        <div className="relative aspect-[9/18.6] overflow-hidden rounded-[2.25rem] bg-black">
          {/* Status bar — persistent chrome, never part of a cut */}
          <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-7 pt-3.5 pb-1">
            <span className="text-[10px] font-sans font-medium text-white/50 tabular-nums">
              9:41 
            </span>
          </div>

          {/* Scene stack */}
          <div className="absolute inset-0">
            <PortfolioScene />
            <CouncilScene />
            <ExecutionScene />
            <ExitScene />
          </div>

          {/* Bottom bar — persistent chrome */}
          <div className="absolute inset-x-0 bottom-0 z-10 border-t border-white/[0.06] bg-black/95 px-6 pb-4 pt-3 backdrop-blur-sm">
            <div className="flex items-end justify-between">
              {NAV_ITEMS.slice(0, 2).map((NavIcon, index) => (
                <NavSlot key={index} Icon={NavIcon} />
              ))}
              <span className="w-12" />
              {NAV_ITEMS.slice(2).map((NavIcon, index) => (
                <NavSlot key={index + 2} Icon={NavIcon} />
              ))}
            </div>
          </div>

          {/* Centre action, overlapping the bar like a real app */}
          <div className="absolute bottom-[18px] left-1/2 z-20 -translate-x-1/2">
            <span className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-brand-leaf text-brand-dark shadow-[0_14px_34px_-8px_rgba(var(--brand-leaf-rgb),0.95)] ring-[5px] ring-black">
              <Add size={24} variant="Linear" />
            </span>
          </div>

          {/* Brand mark, inside the bezel where it can't clip a card */}
          <Image
            src="/images/v.png"
            alt=""
            width={1094}
            height={1024}
            aria-hidden="true"
            className="pointer-events-none absolute right-5 top-2.5 h-4 w-auto opacity-70"
          />
        </div>
      </div>
    </div>
  );
}

function NavSlot({ Icon }: { Icon: Icon }) {

  return (
    <span className="flex flex-col items-center gap-1.5">
      <Icon size={19} className="film-nav-icon text-white/30" />
      <span className="film-nav-dot h-1 w-1 scale-0 rounded-full bg-brand-leaf" />
    </span>
  );
}
