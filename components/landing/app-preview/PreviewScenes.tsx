"use client";

import React from "react";
import {
  Add,
  ArrowDown2,
  ArrowLeft2,
  ArrowRight2,
  ArrowSwapHorizontal,
  CardAdd,
  ImportCurve,
  Send2,
  Sort,
  TickCircle,
  type Icon,
} from "iconsax-reactjs";
import { getAgentCouncil, getWalletPreview } from "@/services/landing.service";
import {
  CANDLES,
  CHART,
  EXIT_RAILS,
  candleX,
  priceToY,
} from "./previewFilm.data";

const preview = getWalletPreview();
const council = getAgentCouncil();

const ACTION_ICONS: Record<string, Icon> = {
  Buy: CardAdd,
  Swap: ArrowSwapHorizontal,
  Send: Send2,
  Withdraw: ImportCurve,
};

/**
 * Money never uses `font-heading`: Morona is a 7KB subset with no `$` glyph,
 * so every currency figure rendered a .notdef box in front of the number.
 */
const MONEY = "font-sans tabular-nums";

/** Scene shell — absolutely stacked so a cut costs no layout. */
function Scene({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <div
      data-scene={id}
      className="film-scene absolute inset-0 flex flex-col px-6 pt-9 pb-[88px]"
    >
      {children}
    </div>
  );
}

function SceneHeader({
  back,
  title,
  trailing,
}: {
  back?: boolean;
  title: React.ReactNode;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="film-in flex items-center justify-between gap-3 pb-4">
      <span className="flex min-w-0 items-center gap-2">
        {back && <ArrowLeft2 size={16} className="flex-shrink-0 text-white/45" />}
        <span className="truncate text-sm font-sans text-white/90">{title}</span>
      </span>
      {trailing}
    </div>
  );
}

// ─── 01 · Portfolio ──────────────────────────────────────

export function PortfolioScene() {
  return (
    <Scene id="portfolio">
      <SceneHeader
        title={
          <span className="flex items-center gap-1.5">
            {preview.account}
            <ArrowDown2 size={14} className="text-white/45" />
          </span>
        }
        trailing={
          <span className="flex items-center gap-3.5 text-white/40">
            <Add size={18} />
            <Sort size={18} />
          </span>
        }
      />

      <div className="film-in">
        <p className={`film-balance text-[2.2rem] font-medium leading-none text-white ${MONEY}`}>
          $0.00
        </p>
        <p className={`mt-2.5 text-xs text-brand-lime ${MONEY}`}>
          {preview.dayChangeValue} ({preview.dayChangePercent}) today
        </p>
      </div>

      <div className="mt-6 grid grid-cols-4 gap-2">
        {preview.actions.map((action) => {
          const ActionIcon = ACTION_ICONS[action] ?? ArrowSwapHorizontal;
          return (
            <div
              key={action}
              className="film-in flex flex-col items-center gap-2 rounded-2xl border border-white/[0.07] bg-white/[0.045] py-3.5"
            >
              <ActionIcon size={17} className="text-brand-lime" />
              <span className="text-[10px] font-sans text-white/60">{action}</span>
            </div>
          );
        })}
      </div>

      <div className="film-in mt-3.5 flex items-center justify-between gap-3 rounded-2xl border border-brand-leaf/25 bg-brand-leaf/[0.09] px-4 py-3.5">
        <span className="min-w-0">
          <span className="block text-[10px] font-sans uppercase tracking-[0.18em] text-white/45">
            Agent earnings
          </span>
          <span className="mt-1 flex items-baseline gap-2">
            <span className={`text-lg font-medium text-white ${MONEY}`}>
              {preview.agentEarnings}
            </span>
            <span className="text-[10px] font-sans font-bold text-brand-lime">
              {preview.agentApy}
            </span>
          </span>
        </span>
        <span className="flex-shrink-0 rounded-xl bg-brand-leaf px-4 py-2 text-[11px] font-sans font-bold uppercase tracking-wider text-brand-dark">
          Claim
        </span>
      </div>

      <div className="film-in mt-6 flex items-center gap-1">
        <span className="font-heading text-base text-white">Positions</span>
        <ArrowRight2 size={14} className="text-white/35" />
      </div>

      <ul className="mt-1">
        {preview.positions.map((position) => (
          <li key={position.symbol} className="film-in flex items-center gap-3 py-2.5">
            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-brand-leaf/25 bg-brand-leaf/10 text-[10px] font-sans font-bold text-brand-lime">
              {position.symbol}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-sans text-white/85">
                {position.name}
              </span>
              <span className={`block text-[11px] text-white/35 ${MONEY}`}>
                {position.amount}
              </span>
            </span>
            <span className="text-right">
              <span className={`block text-sm text-white ${MONEY}`}>{position.value}</span>
              <span className={`block text-[11px] text-brand-lime ${MONEY}`}>
                {position.change}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </Scene>
  );
}

// ─── 02 · Council ────────────────────────────────────────

const RING_RADIUS = 46;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

export function CouncilScene() {
  return (
    <Scene id="council">
      <SceneHeader
        back
        title={`Council · ${council.pair}`}
        trailing={
          <span className="flex items-center gap-1.5 rounded-full border border-brand-leaf/30 bg-brand-leaf/10 px-2.5 py-1">
            <span className="film-live h-1.5 w-1.5 rounded-full bg-brand-lime" />
            <span className="text-[9px] font-sans font-bold uppercase    text-brand-lime">
              Live
            </span>
          </span>
        }
      />

      <div className="film-in relative mx-auto mt-2 h-[112px] w-[112px]">
        <svg viewBox="0 0 112 112" className="h-full w-full -rotate-90">
          <circle
            cx="56"
            cy="56"
            r={RING_RADIUS}
            fill="none"
            stroke="rgba(198,241,154,0.13)"
            strokeWidth="7"
          />
          <circle
            className="film-ring"
            cx="56"
            cy="56"
            r={RING_RADIUS}
            fill="none"
            stroke="#8FE331"
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={RING_LENGTH}
            strokeDashoffset={RING_LENGTH}
          />
        </svg>
        <span className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`film-consensus text-2xl font-medium text-white ${MONEY}`}>0%</span>
          <span className="mt-0.5 text-[8px] font-sans uppercase tracking-[0.18em] text-white/40">
            Consensus
          </span>
        </span>
      </div>

      <ul className="mt-5 space-y-1">
        {council.agents.map((agent) => (
          <li
            key={agent.name}
            className="film-vote flex items-center justify-between gap-3 rounded-lg px-2 py-[7px]"
          >
            <span className="truncate text-[12px] font-sans text-white/70">{agent.name}</span>
            <span
              className={`flex-shrink-0 rounded-md px-2 py-[3px] text-[9px] font-sans font-bold uppercase   ${
                agent.vote === "BUY"
                  ? "bg-brand-leaf/20 text-brand-lime"
                  : "bg-white/[0.06] text-white/40"
              }`}
            >
              {agent.vote}
            </span>
          </li>
        ))}
      </ul>

      <div className="film-in mt-auto grid grid-cols-3 gap-2 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-3">
        <Stat label="Preflight" value={`${council.preflight.passed}/${council.preflight.total}`} />
        <Stat label="Slippage" value={council.slippageCap} />
        <Stat label="Route" value={council.route} />
      </div>

      <div className="film-verdict mt-3 flex items-center justify-center gap-2 rounded-xl border border-brand-leaf/40 bg-brand-leaf/15 py-2.5">
        <TickCircle size={16} variant="Bold" className="text-brand-lime" />
        <span className="text-[11px] font-sans font-bold uppercase    text-brand-lime">
          Entry approved
        </span>
      </div>
    </Scene>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span className="block text-center">
      <span className="block text-[8px] font-sans uppercase tracking-[0.14em] text-white/35">
        {label}
      </span>
      <span className={`mt-1 block text-[12px] text-white/85 ${MONEY}`}>{value}</span>
    </span>
  );
}

// ─── 03 · Execution ──────────────────────────────────────

export function ExecutionScene() {
  const entryY = priceToY(CHART.entry);

  return (
    <Scene id="execution">
      <SceneHeader
        back
        title={
          <span className="flex items-baseline gap-2">
            SOL / USDC
            <span className={`text-[11px] text-brand-lime ${MONEY}`}>+2.14%</span>
          </span>
        }
        trailing={
          <span className="rounded-md border border-white/10 px-2 py-1 text-[9px] font-sans font-bold uppercase tracking-[0.14em] text-white/50">
            Spot
          </span>
        }
      />

      <p className={`film-in text-[1.7rem] font-medium leading-none text-white ${MONEY}`}>
        $151.90
      </p>

      <svg
        viewBox={`0 0 ${CHART.width} ${CHART.height}`}
        className="film-in mt-4 w-full"
        aria-hidden="true"
      >
        {[0, 1, 2, 3].map((line) => {
          const y = CHART.padTop + line * ((CHART.height - CHART.padTop - CHART.padBottom) / 3);
          return (
            <line
              key={line}
              x1="0"
              x2={CHART.width}
              y1={y}
              y2={y}
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="1"
            />
          );
        })}

        {CANDLES.map(([open, high, low, close], index) => {
          const x = candleX(index);
          const up = close >= open;
          const top = priceToY(Math.max(open, close));
          const bottom = priceToY(Math.min(open, close));
          const colour = up ? "#8FE331" : "#3f7a1a";
          return (
            <g key={index} className="film-candle">
              <line
                x1={x + CHART.bodyWidth / 2}
                x2={x + CHART.bodyWidth / 2}
                y1={priceToY(high)}
                y2={priceToY(low)}
                stroke={colour}
                strokeWidth="1.2"
                opacity="0.75"
              />
              <rect
                x={x}
                y={top}
                width={CHART.bodyWidth}
                height={Math.max(bottom - top, 1.5)}
                rx="1"
                fill={colour}
                opacity={up ? 0.95 : 0.6}
              />
              <rect
                x={x}
                y={CHART.height - CHART.padBottom + 8}
                width={CHART.bodyWidth}
                height={Math.max(Math.abs(close - open) * 12, 2)}
                rx="1"
                fill={colour}
                opacity="0.28"
              />
            </g>
          );
        })}

        <g className="film-entry">
          <line
            x1="0"
            x2={CHART.width}
            y1={entryY}
            y2={entryY}
            stroke="#C6F19A"
            strokeWidth="1"
            strokeDasharray="4 5"
            opacity="0.7"
          />
          <rect x={CHART.width - 54} y={entryY - 8} width="54" height="16" rx="4" fill="#C6F19A" />
          <text
            x={CHART.width - 27}
            y={entryY + 4}
            textAnchor="middle"
            fontSize="9"
            fontWeight="700"
            fill="#122805"
          >
            {CHART.entry}
          </text>
        </g>
      </svg>

      <div className="film-in mt-4 flex  items-center gap-2">
        {["Jupiter", "0.42% all-in", "Cheapest venue"].map((pill, index) => (
          <p
            key={pill}
            className={`rounded-full px-3 py-1 text-xs  font-medium    ${
              index === 0
                ? "bg-brand-leaf text-brand-dark"
                : "border border-white/10 text-white/45"
            }`}
          >
            {pill}
          </p>
        ))}
      </div>

      <div className="film-in mt-auto rounded-2xl border border-white/[0.07] bg-white/[0.035] p-4">
        <div className="flex items-center justify-between">
          <p className="text-[11px]  uppercase    text-white/45">
            Router
          </p>
          <span className="film-fill-label text-[11px] font-sans font-bold text-brand-lime">
            Routing…
          </span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
          <div className="film-fill-bar h-full w-full origin-left rounded-full bg-gradient-to-r from-brand-leaf to-[#C6F19A]" />
        </div>
        <div className="film-fill-result mt-3 flex items-center gap-2">
          <TickCircle size={15} variant="Bold" className="text-brand-lime" />
          <span className={`text-[11px] text-white/75 ${MONEY}`}>
            Filled · 126.4 SOL @ ${CHART.entry}
          </span>
        </div>
      </div>
    </Scene>
  );
}

// ─── 04 · Exit ───────────────────────────────────────────

export function ExitScene() {
  return (
    <Scene id="exit">
      <SceneHeader
        back
        title="Position · SOL"
        trailing={
          <span className="rounded-md border border-brand-leaf/30 bg-brand-leaf/10 px-2 py-1 text-[9px] font-sans font-bold uppercase tracking-[0.14em] text-brand-lime">
            Auto-exit on
          </span>
        }
      />

      <div className="film-in rounded-2xl border border-white/[0.07] bg-white/[0.035] p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-[11px] font-sans uppercase    text-white/40">
            Unrealised
          </span>
          <span className={`text-[11px] text-white/45 ${MONEY}`}>126.4 SOL</span>
        </div>
        <p className={`mt-2 text-[1.9rem] font-medium leading-none text-brand-lime ${MONEY}`}>
          +$402.18
        </p>
        <div className={`mt-3 flex items-center gap-4 text-[11px] text-white/45 ${MONEY}`}>
          <span>
            Entry <span className="text-white/75">${CHART.entry}</span>
          </span>
          <span>
            Mark <span className="text-white/75">$151.90</span>
          </span>
        </div>
      </div>

      <div className="film-in mt-5">
        <span className="block text-[10px] font-sans uppercase tracking-[0.18em] text-white/40">
          Exit rules
        </span>
        <div className="relative mt-6 h-1 rounded-full bg-white/[0.08]">
          <div className="film-rail-fill absolute inset-y-0 left-0 w-full origin-left rounded-full bg-gradient-to-r from-brand-forest via-brand-leaf to-[#C6F19A]" />
          {EXIT_RAILS.map((rail) => (
            <span
              key={rail.id}
              className="absolute -top-[3px] -translate-x-1/2"
              style={{ left: `${rail.at}%` }}
            >
              {/* GSAP owns the inner node's transform; the half-pixel shift that
                  centres the marker stays on the wrapper, out of its way. */}
              <span className="film-rail flex flex-col items-center">
                <span className="h-[7px] w-[7px] rounded-full bg-white ring-2 ring-[#0e2004]" />
                <span className="mt-2 whitespace-nowrap text-[8px] font-sans uppercase   text-white/35">
                  {rail.label}
                </span>
                <span className={`text-[9px] text-white/70 ${MONEY}`}>{rail.value}</span>
              </span>
            </span>
          ))}
        </div>
      </div>

      <div className="film-toast mt-16 flex items-center gap-3 rounded-2xl border border-brand-leaf/35 bg-brand-leaf/15 px-4 py-3">
        <TickCircle size={18} variant="Bold" className="flex-shrink-0 text-brand-lime" />
        <span className="min-w-0">
          <span className="block text-[11px]  font-medium text-white">
            Take-profit hit
          </span>
          <span className={`block text-[10px] text-white/55 ${MONEY}`}>
            Closed 126.4 SOL · no input needed
          </span>
        </span>
      </div>

      <div className="film-in mt-auto rounded-2xl border border-brand-leaf/25 bg-brand-leaf/[0.09] p-4">
        <span className="block text-[10px] font-sans uppercase tracking-[0.18em] text-white/45">
          Agent earnings
        </span>
        <div className="mt-2 flex items-end justify-between gap-3">
          <span className={`film-earnings text-2xl font-medium text-white ${MONEY}`}>$0.00</span>
          <span className="film-claim flex-shrink-0 rounded-xl bg-brand-leaf px-5 py-2.5 text-[11px] font-sans font-bold uppercase tracking-wider text-brand-dark">
            Claim
          </span>
        </div>
      </div>
    </Scene>
  );
}