"use client";

import React from "react";
import {
  ArrowDown2,
  ArrowLeft2,
  ArrowSwapVertical,
  Bank,
  Card,
  Flash,
  Lock1,
  Routing2,
  ShieldTick,
  TickCircle,
  Wallet3,
} from "iconsax-reactjs";

/**
 * The four money-movement screens, plus the vault screen the security act
 * lands on. Each is absolutely stacked inside the device; the flow timeline
 * cross-fades between them and then plays that screen's own micro-film.
 *
 * Money is deliberately in the sans stack — the heading face is a subset with
 * no `$` glyph and renders a .notdef box in its place.
 */
const MONEY = "font-sans tabular-nums";

function Screen({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <div
      data-flow-screen={id}
      className="flow-screen absolute inset-0 flex flex-col px-6 pb-8 pt-10"
    >
      {children}
    </div>
  );
}

function ScreenHeader({ title }: { title: string }) {
  return (
    <div className="flow-head relative flex items-center justify-center pb-6">
      <ArrowLeft2 size={18} className="absolute left-0 text-white/40" />
      <span className="text-[13px] font-sans font-semibold text-white">{title}</span>
    </div>
  );
}

/** The primary CTA every screen ends on. */
function Cta({ label }: { label: string }) {
  return (
    <span className="flow-cta block rounded-2xl bg-brand-lime py-4 text-center text-[13px] font-sans font-bold text-brand-dark">
      {label}
    </span>
  );
}

// ─── Buy ─────────────────────────────────────────────────

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "⌫"];

export function BuyScreen() {
  return (
    <Screen id="buy">
      <ScreenHeader title="Buy USDC" />

      <div className="flex flex-1 flex-col items-center justify-center">
        <p className={`flow-amount text-[3.4rem] font-light leading-none text-white ${MONEY}`}>
          $0
        </p>
        <span className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/[0.07] px-4 py-2.5">
          <Card size={16} className="text-brand-lime" />
          <span className="text-[12px] font-sans text-white/85">Card · Visa 4291</span>
          <ArrowDown2 size={14} className="text-white/40" />
        </span>
      </div>

      <div className="mb-5">
        <Cta label="Buy" />
      </div>

      {/* Keypad — the flow timeline presses 1, 0, 0 so the amount types itself. */}
      <div className="grid grid-cols-3 gap-2">
        {KEYS.map((key) => (
          <span
            key={key}
            data-key={key}
            className="flow-key flex h-[46px] items-center justify-center rounded-xl bg-white/[0.05] text-[18px] font-sans font-light text-white"
          >
            {key}
          </span>
        ))}
      </div>
    </Screen>
  );
}

// ─── Swap ────────────────────────────────────────────────

export function SwapScreen() {
  return (
    <Screen id="swap">
      <ScreenHeader title="Swap" />

      <div className="relative">
        <div className="flow-leg rounded-2xl border border-white/[0.07] bg-white/[0.04] p-4">
          <span className="text-[10px] font-sans uppercase tracking-[0.16em] text-white/40">
            You pay
          </span>
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className={`text-2xl font-light text-white ${MONEY}`}>100.00</span>
            <span className="flex flex-shrink-0 items-center gap-2 rounded-full bg-white/[0.07] px-3 py-1.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-leaf/25 text-[8px] font-sans font-bold text-brand-lime">
                US
              </span>
              <span className="text-[12px] font-sans text-white">USDC</span>
            </span>
          </div>
        </div>

        <span className="flow-swap-pivot absolute left-1/2 top-1/2 z-10 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-[#0e2004] bg-brand-leaf text-brand-dark">
          <ArrowSwapVertical size={16} variant="Bold" />
        </span>

        <div className="flow-leg mt-2 rounded-2xl border border-white/[0.07] bg-white/[0.04] p-4">
          <span className="text-[10px] font-sans uppercase tracking-[0.16em] text-white/40">
            You receive
          </span>
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className={`flow-quote text-2xl font-light text-white ${MONEY}`}>0.000</span>
            <span className="flex flex-shrink-0 items-center gap-2 rounded-full bg-white/[0.07] px-3 py-1.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-leaf/25 text-[8px] font-sans font-bold text-brand-lime">
                SL
              </span>
              <span className="text-[12px] font-sans text-white">SOL</span>
            </span>
          </div>
        </div>
      </div>

      <ul className="mt-5 space-y-2.5">
        <Row label="Rate" value="1 SOL = $151.90" />
        <Row label="Network fee" value="$0.04" />
        <Row label="Price impact" value="0.02%" />
        <Row
          label="Route"
          value={
            <span className="flex items-center gap-1.5">
              <Routing2 size={13} className="text-brand-lime" />
              Jupiter
            </span>
          }
        />
      </ul>

      <div className="flow-best mt-5 flex items-center gap-2.5 rounded-xl border border-brand-leaf/30 bg-brand-leaf/10 px-3.5 py-3">
        <Flash size={15} variant="Bold" className="flex-shrink-0 text-brand-lime" />
        <span className="text-[11px] font-sans text-white/75">
          Cheapest all-in of 3 venues quoted
        </span>
      </div>

      <div className="mt-auto">
        <Cta label="Swap" />
      </div>
    </Screen>
  );
}

// ─── Send ────────────────────────────────────────────────

export function SendScreen() {
  return (
    <Screen id="send">
      <ScreenHeader title="Send" />

      <div className="flow-leg flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.04] p-4">
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-brand-leaf/15 text-[11px] font-sans font-bold text-brand-lime">
          TR
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-sans text-white">Treasury</span>
          <span className={`block truncate text-[11px] text-white/40 ${MONEY}`}>
            7xKq…9fRt
          </span>
        </span>
        <span className="flex flex-shrink-0 items-center gap-1 rounded-md bg-brand-leaf/15 px-2 py-1">
          <ShieldTick size={12} variant="Bold" className="text-brand-lime" />
          <span className="text-[9px] font-sans font-bold uppercase tracking-[0.1em] text-brand-lime">
            Allowlisted
          </span>
        </span>
      </div>

      <div className="mt-6 text-center">
        <p className={`text-[2.6rem] font-light leading-none text-white ${MONEY}`}>12.40</p>
        <p className="mt-2 text-[12px] font-sans text-white/40">SOL · $1,883.56</p>
      </div>

      <ul className="mt-7 space-y-2.5">
        <Row label="Network" value="Solana" />
        <Row label="Fee" value="$0.0004" />
        <Row label="Arrives" value="~2 seconds" />
      </ul>

      {/* Signing beat: the sheet slides up, then resolves to a tick. */}
      <div className="flow-sign mt-6 rounded-2xl border border-white/[0.07] bg-white/[0.04] p-4">
        <div className="flex items-center gap-2.5">
          <Lock1 size={15} className="flex-shrink-0 text-brand-lime" />
          <span className="text-[11px] font-sans text-white/70">
            Signed on this device — VOLSA never holds the key
          </span>
        </div>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/[0.08]">
          <span className="flow-sign-bar block h-full w-full origin-left rounded-full bg-brand-leaf" />
        </div>
      </div>

      <div className="mt-auto">
        <Cta label="Send" />
      </div>
    </Screen>
  );
}

// ─── Withdraw ────────────────────────────────────────────

export function WithdrawScreen() {
  return (
    <Screen id="withdraw">
      <ScreenHeader title="Withdraw" />

      <div className="text-center">
        <p className={`text-[2.6rem] font-light leading-none text-white ${MONEY}`}>$3,284.60</p>
        <p className="mt-2 text-[12px] font-sans text-brand-lime">Agent earnings · claimable now</p>
      </div>

      <div className="mt-7 space-y-2">
        <DestinationRow
          icon={<Bank size={17} className="text-brand-lime" />}
          title="Bank · •••• 8842"
          note="1–2 business days"
          active
        />
        <DestinationRow
          icon={<Wallet3 size={17} className="text-white/45" />}
          title="Self-custody wallet"
          note="~2 seconds"
        />
      </div>

      <ul className="mt-6 space-y-2.5">
        <Row label="Lockup" value="None" />
        <Row label="Notice period" value="None" />
        <Row label="Fee" value="$0.00" />
      </ul>

      <div className="flow-cleared mt-6 flex items-center gap-2.5 rounded-xl border border-brand-leaf/30 bg-brand-leaf/10 px-3.5 py-3">
        <TickCircle size={16} variant="Bold" className="flex-shrink-0 text-brand-lime" />
        <span className="text-[11px] font-sans text-white/75">
          Withdrawal cleared — no queue in front of you
        </span>
      </div>

      <div className="mt-auto">
        <Cta label="Withdraw" />
      </div>
    </Screen>
  );
}

function DestinationRow({
  icon,
  title,
  note,
  active = false,
}: {
  icon: React.ReactNode;
  title: string;
  note: string;
  active?: boolean;
}) {
  return (
    <div
      className={`flow-leg flex items-center gap-3 rounded-2xl border p-3.5 ${
        active
          ? "border-brand-leaf/40 bg-brand-leaf/[0.09]"
          : "border-white/[0.07] bg-white/[0.03]"
      }`}
    >
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white/[0.06]">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[12px] font-sans text-white/90">{title}</span>
        <span className="block text-[10px] font-sans text-white/40">{note}</span>
      </span>
      <span
        className={`h-4 w-4 flex-shrink-0 rounded-full border-2 ${
          active ? "border-brand-lime bg-brand-lime" : "border-white/20"
        }`}
      />
    </div>
  );
}

// ─── Vault (security act) ────────────────────────────────

export function VaultScreen() {
  return (
    <Screen id="vault">
      <ScreenHeader title="Security" />

      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <span className="flow-vault-mark relative flex h-24 w-24 items-center justify-center">
          <span className="absolute inset-0 rounded-full border border-brand-lime/15" />
          <span className="absolute inset-[12px] rounded-full border border-brand-lime/25" />
          <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-b from-[#8FE331] to-[#2c5c0e] text-white shadow-[0_16px_28px_-12px_rgba(18,40,5,0.7)]">
            <Lock1 size={26} variant="Bulk" />
          </span>
        </span>
        <p className="mt-6 text-[15px] font-sans font-semibold text-white">
          Only you can open this
        </p>
        <p className="mt-2 max-w-[220px] text-[12px] font-sans leading-relaxed text-white/50">
          Keys are generated and stored on your device. Nothing here can be moved
          without them.
        </p>
      </div>

      <ul className="space-y-2">
        {[
          "Non-custodial by construction",
          "Withdrawals allowlisted",
          "Council veto on every entry",
        ].map((line) => (
          <li
            key={line}
            className="flow-vault-row flex items-center gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3.5 py-3"
          >
            <TickCircle size={15} variant="Bold" className="flex-shrink-0 text-brand-lime" />
            <span className="text-[11px] font-sans text-white/70">{line}</span>
          </li>
        ))}
      </ul>
    </Screen>
  );
}

// ─── Shared ──────────────────────────────────────────────

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <li className="flow-row flex items-center justify-between gap-3">
      <span className="text-[11px] font-sans text-white/40">{label}</span>
      <span className={`text-[11px] text-white/80 ${MONEY}`}>{value}</span>
    </li>
  );
}
