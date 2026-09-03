"use client";

import React from "react";
import {
  HANDOFF_CARD_RADIUS_CLASS,
  HANDOFF_CARD_SHELL_CLASS,
  HANDOFF_CARD_SHELL_FRONT_CLASS,
} from "./heroCylinderHandoff.constants";
import { useCyclingHighlight } from "./useCyclingHighlight";

/**
 * Five self-contained mini product screens — Buy/Sell, Convert, Deposit/Withdraw,
 * Transfer, Wallet — one per non-signal cylinder card. Each mirrors a real VOLSA screen
 * closely enough to read as "this is the app," not an icon standing in for a feature,
 * and each cycles a highlight ring between its two or three focal controls while it's
 * the cylinder's front card, so a static mock still reads as something alive.
 *
 * They share one shell (identical to the hero/signal card's) and one header pattern, so
 * all six cylinder cards — this file's five plus the signal card — read as one family.
 */

const FIELD_HIGHLIGHT = "border-brand-leaf/70 shadow-[0_0_0_3px_rgba(var(--brand-leaf-rgb),0.16)]";

function MockScreenShell({
  isFront,
  overflowVisible,
  opacity,
  children,
}: {
  isFront: boolean;
  overflowVisible?: boolean;
  /** Fades the shell itself, not just its content — used while the wallet card is
   *  zooming, so its own dark background doesn't sit visibly on top of the fullscreen
   *  reveal (see `HeroZoomReveal`) once that's covering the screen. */
  opacity?: number;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`relative flex h-full w-full flex-col ${HANDOFF_CARD_RADIUS_CLASS} ${
        isFront ? HANDOFF_CARD_SHELL_FRONT_CLASS : HANDOFF_CARD_SHELL_CLASS
      } ${overflowVisible ? "" : "overflow-hidden"} p-6 sm:p-7`}
      style={opacity === undefined ? undefined : { opacity }}
    >
      {children}
    </div>
  );
}

function ScreenHeader({ label, meta }: { label: string; meta?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="inline-flex items-center gap-2 font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-white/60">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-leaf opacity-70" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-leaf" />
        </span>
        {label}
      </span>
      {meta && (
        <span className="font-sans text-[10px] uppercase tracking-[0.16em] text-white/40">{meta}</span>
      )}
    </div>
  );
}

function ScreenTitle({ title, description }: { title: string; description: string }) {
  return (
    <div className="mt-5">
      <h4 className="font-heading text-xl font-semibold leading-snug tracking-tight text-white sm:text-[1.4rem]">
        {title}
      </h4>
      <p className="mt-1.5 font-sans text-[11px] leading-relaxed text-white/55 sm:text-xs">{description}</p>
    </div>
  );
}

interface ScreenProps {
  isFront: boolean;
  title: string;
  description: string;
}

/** ─── Buy & Sell ─────────────────────────────────────────────────────── */
function BuySellMockScreenBase({ isFront, title, description }: ScreenProps) {
  const active = useCyclingHighlight(2, isFront);

  return (
    <MockScreenShell isFront={isFront}>
      <ScreenHeader label="Buy & Sell" meta="BTC / USDT" />
      <ScreenTitle title={title} description={description} />

      <div className="mt-6 flex gap-2">
        <div
          className={`flex-1 rounded-xl py-2.5 text-center font-sans text-xs font-bold uppercase tracking-wider text-white transition-all duration-500 ${
            active === 0 ? `bg-signal-up ${FIELD_HIGHLIGHT}` : "bg-signal-up/85"
          }`}
        >
          Buy
        </div>
        <div className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] py-2.5 text-center font-sans text-xs font-semibold uppercase tracking-wider text-white/45">
          Sell
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-3">
        <p className="font-sans text-[9px] uppercase tracking-[0.14em] text-white/40">Amount</p>
        <p className="mt-1 font-heading text-xl text-white tabular-nums">
          0.0842 <span className="text-sm text-white/40">BTC</span>
        </p>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2">
        {["25%", "50%", "75%", "MAX"].map((l) => (
          <div
            key={l}
            className="rounded-lg border border-white/10 bg-white/[0.03] py-1.5 text-center font-sans text-[10px] font-semibold text-white/55"
          >
            {l}
          </div>
        ))}
      </div>

      <div className="mt-auto pt-5">
        <div
          className={`rounded-xl py-3 text-center font-sans text-xs font-bold uppercase tracking-wider text-white transition-all duration-500 ${
            active === 1 ? `bg-signal-up ${FIELD_HIGHLIGHT}` : "bg-signal-up/90"
          }`}
        >
          Place Buy Order
        </div>
      </div>
    </MockScreenShell>
  );
}

/** ─── Convert ────────────────────────────────────────────────────────── */
function ConvertMockScreenBase({ isFront, title, description }: ScreenProps) {
  const active = useCyclingHighlight(2, isFront);

  return (
    <MockScreenShell isFront={isFront}>
      <ScreenHeader label="Convert" meta="BSC" />
      <ScreenTitle title={title} description={description} />

      <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-3">
        <div className="flex items-center justify-between">
          <span className="font-sans text-[9px] uppercase tracking-[0.14em] text-white/40">From</span>
          <span
            className={`rounded-md px-1.5 py-0.5 font-sans text-[9px] font-bold uppercase tracking-wider transition-all duration-500 ${
              active === 0 ? "border border-brand-leaf/70 text-brand-leaf" : "border border-white/10 text-white/40"
            }`}
          >
            Max
          </span>
        </div>
        <div className="mt-2 flex items-end justify-between">
          <span className="font-heading text-xl text-white/90">120.0</span>
          <span className="font-sans text-xs font-bold text-white/70">USDC</span>
        </div>
      </div>

      <div className="relative my-1.5 flex justify-center">
        <div
          className={`flex h-7 w-7 items-center justify-center rounded-full border transition-all duration-500 ${
            active === 1 ? `border-brand-leaf/70 bg-brand-leaf/10 ${FIELD_HIGHLIGHT}` : "border-white/15 bg-surface-panel-carousel"
          }`}
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-white/70" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M7 10l5-5 5 5M7 14l5 5 5-5" />
          </svg>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-3">
        <p className="font-sans text-[9px] uppercase tracking-[0.14em] text-white/40">To (estimated)</p>
        <div className="mt-2 flex items-end justify-between">
          <span className="font-heading text-xl text-brand-leaf">0.192</span>
          <span className="font-sans text-xs font-bold text-white/70">BNB</span>
        </div>
      </div>

      <p className="mt-3 font-sans text-[10px] leading-relaxed text-white/35">
        $0.10 flat fee + network gas, routed at the best available price.
      </p>

      <div className="mt-auto pt-4">
        <div className="rounded-xl bg-brand-leaf py-3 text-center font-sans text-xs font-bold uppercase tracking-wider text-black">
          Convert USDC → BNB
        </div>
      </div>
    </MockScreenShell>
  );
}

/** ─── Deposit / Withdraw ─────────────────────────────────────────────── */
function DepositWithdrawMockScreenBase({ isFront, title, description }: ScreenProps) {
  const active = useCyclingHighlight(2, isFront);

  return (
    <MockScreenShell isFront={isFront}>
      <ScreenHeader label="Deposit / Withdraw" meta="BEP-20" />
      <ScreenTitle title={title} description={description} />

      <div className="mt-6 flex gap-2">
        <div className="flex-1 rounded-xl border border-brand-leaf/40 bg-brand-leaf/15 py-2 text-center font-sans text-[10px] font-bold uppercase tracking-wider text-brand-leaf">
          Deposit
        </div>
        <div className="flex-1 rounded-xl border border-white/10 py-2 text-center font-sans text-[10px] font-semibold uppercase tracking-wider text-white/45">
          Withdraw
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5">
        <p className="font-sans text-[9px] uppercase tracking-[0.14em] text-white/40">Your address</p>
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <span className="truncate font-sans text-[11px] text-white/70">0x18f5…b076</span>
          <span
            className={`shrink-0 rounded-md px-2 py-1 font-sans text-[9px] font-bold uppercase tracking-wider transition-all duration-500 ${
              active === 0 ? "border border-brand-leaf/70 text-brand-leaf" : "border border-white/10 text-white/45"
            }`}
          >
            Copy
          </span>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
          <p className="font-sans text-[9px] uppercase tracking-[0.14em] text-white/40">Asset</p>
          <p className="mt-1 font-sans text-xs font-semibold text-white/80">USDT</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
          <p className="font-sans text-[9px] uppercase tracking-[0.14em] text-white/40">Amount</p>
          <p className="mt-1 font-sans text-xs font-semibold text-white/80">100</p>
        </div>
      </div>

      <div className="mt-auto pt-5">
        <div
          className={`rounded-xl py-3 text-center font-sans text-xs font-bold uppercase tracking-wider text-black transition-all duration-500 ${
            active === 1 ? `bg-brand-leaf ${FIELD_HIGHLIGHT}` : "bg-brand-leaf/85"
          }`}
        >
          Connect Wallet to Send
        </div>
      </div>
    </MockScreenShell>
  );
}

/** ─── Transfer ───────────────────────────────────────────────────────── */
function TransferMockScreenBase({ isFront, title, description }: ScreenProps) {
  const active = useCyclingHighlight(2, isFront);

  return (
    <MockScreenShell isFront={isFront}>
      <ScreenHeader label="Transfer" meta="BSC ⇄ SOL" />
      <ScreenTitle title={title} description={description} />

      <div className="mt-6 flex gap-2">
        <div
          className={`flex-1 rounded-xl py-2 text-center font-sans text-[10px] font-bold uppercase tracking-wider text-white transition-all duration-500 ${
            active === 0 ? `bg-white/10 ${FIELD_HIGHLIGHT}` : "bg-white/[0.06] text-white/70"
          }`}
        >
          BSC → Solana
        </div>
        <div className="flex-1 rounded-xl border border-white/10 py-2 text-center font-sans text-[10px] font-semibold uppercase tracking-wider text-white/40">
          Solana → BSC
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5">
        <p className="font-sans text-[9px] uppercase tracking-[0.14em] text-white/40">Token on BSC wallet</p>
        <p className="mt-1.5 font-sans text-xs font-semibold text-white/80">USDC</p>
      </div>

      <div
        className={`mt-3 rounded-xl border px-3.5 py-2.5 transition-all duration-500 ${
          active === 1 ? FIELD_HIGHLIGHT : "border-white/10"
        }`}
      >
        <p className="font-sans text-xs text-white/35">Search symbol (ETH, BTC, SOL…)</p>
      </div>

      <p className="mt-2.5 text-center font-sans text-[10px] text-white/30">No tokens with balance on BSC.</p>

      <div className="mt-auto flex items-center justify-center pt-5">
        <span className="font-sans text-[10px] font-semibold uppercase tracking-wider text-white/40">
          Refresh balances
        </span>
      </div>
    </MockScreenShell>
  );
}

interface WalletScreenProps extends ScreenProps {
  /** Set only on the cylinder's last card. The fullscreen "swallow" reveal itself no
   *  longer lives here — see `HeroZoomReveal` for why — but the row content still fades
   *  out as it starts, so the card doesn't look frozen mid-transition. */
  zoomProgress?: number;
  isZoomingLastCard?: boolean;
}

/** ─── Wallet ─────────────────────────────────────────────────────────── */
function WalletMockScreenBase({
  isFront,
  title,
  description,
  zoomProgress = 0,
  isZoomingLastCard = false,
}: WalletScreenProps) {
  const zooming = zoomProgress > 0;
  const active = useCyclingHighlight(3, isFront && !zooming);
  const contentOpacity = zooming ? Math.max(0, 1 - zoomProgress * 3) : 1;
  // Slower than the row content above, and deliberately so: `HeroZoomReveal` covers the
  // screen from its own seed rectangle outward, and this card's own shell background
  // (95% opaque) sat visibly on top of that reveal until it faded — too early a fade
  // exposed whatever's behind the card before the reveal had grown to cover it.
  const shellOpacity = zooming ? Math.max(0, 1 - zoomProgress / 0.55) : 1;

  const rows = [
    { label: "Personal Wallet", meta: "Recommended · auto trading" },
    { label: "Solana deposit", meta: "Show address + QR" },
    { label: "WalletConnect", meta: "Trust, Rainbow, OKX + 50 more" },
  ];

  return (
    <MockScreenShell isFront={isFront} overflowVisible={isZoomingLastCard} opacity={shellOpacity}>
      <div style={{ opacity: contentOpacity }}>
        <ScreenHeader label="Wallet" meta="Non-Custodial" />
        <ScreenTitle title={title} description={description} />

        <div className="mt-6 space-y-2.5">
          {rows.map((row, i) => (
            <div
              key={row.label}
              className={`flex items-center gap-3 rounded-xl border px-3.5 py-2.5 transition-all duration-500 ${
                active === i ? "border-brand-leaf/60 bg-brand-leaf/[0.06]" : "border-white/10 bg-white/[0.03]"
              }`}
            >
              <span className="h-6 w-6 shrink-0 rounded-full bg-white/10" aria-hidden />
              <span className="min-w-0">
                <span className="block font-sans text-xs font-semibold text-white/85">{row.label}</span>
                <span className="block truncate font-sans text-[9px] text-white/40">{row.meta}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </MockScreenShell>
  );
}

/**
 * Memoised exports. The carousel re-renders on every scroll frame as its rotation angle
 * changes, but these screens only care about `isFront` and their (static) copy — without
 * this, six full mock UIs reconcile per frame for nothing.
 */
export const BuySellMockScreen = React.memo(BuySellMockScreenBase);
export const ConvertMockScreen = React.memo(ConvertMockScreenBase);
export const DepositWithdrawMockScreen = React.memo(DepositWithdrawMockScreenBase);
export const TransferMockScreen = React.memo(TransferMockScreenBase);
export const WalletMockScreen = React.memo(WalletMockScreenBase);
