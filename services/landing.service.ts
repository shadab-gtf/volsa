import { SECTION_IDS } from "@/constants/landing.constants";
import { THEME_COLORS } from "@/constants/theme-colors";

/**
 * VOLSA Landing Page Data Service
 * All page content is centralized here. Components consume this data only.
 * Future API/CMS migration requires changes only in this file.
 */

export interface CtaLink {
  label: string;
  href: string;
}

export interface Hero {
  eyebrow: string;
  /** One entry per rendered line — each gets its own masked reveal. */
  headline: string[];
  subhead: string;
  primaryCta: CtaLink;
  secondaryCta: CtaLink;
  /** Control spectrum preview. Renders as a connected strip, any length. */
  spectrum: string[];
}

export interface AgentReading {
  label: string;
  /** Contribution to the decision layer, 0-100. */
  value: number;
}

export interface HeroSignal {
  pair: string;
  chain: string;
  price: string;
  change: string;
  action: "BUY" | "SELL" | "HOLD";
  confidence: number;
  entry: string;
  target: string;
  stop: string;
  /** Normalised 0-1 samples driving the sparkline. Length is free. */
  trend: number[];
  /** Target and stop rails, on the same 0-1 scale as `trend`. */
  targetAt: number;
  stopAt: number;
  agents: AgentReading[];
}

export interface PlatformComponent {
  id: string;
  title: string;
  description: string;
}

export interface PlatformOverview {
  eyebrow: string;
  /** Authored heading rows — see MaskedHeading. */
  title: string[];
  subhead: string;
  components: PlatformComponent[];
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  /**
   * How this agent's reading is used once the decision layer has it. Architecture, not
   * performance: what it contributes to the reconciliation, never what it returns.
   */
  detail: string;
  /**
   * What this agent reads, as bare vocabulary. Not claims and not metrics — three
   * words that say where the agent is looking. Three is the designed count; the
   * layout flows if a future agent needs a fourth.
   */
  watches: string[];
}

export interface AiEngine {
  eyebrow: string;
  title: string[];
  subhead: string;
  agents: Agent[];
  decision: { title: string; body: string };
  cadence: { value: string; unit: string; label: string };
}

export interface Feature {
  id: string;
  title: string;
  description: string;
  tag: string;
  /** Which self-contained mini product screen the cylinder card renders. "signal" is
   *  the hero's own sample-signal card, grown to the cylinder's size — every other
   *  preset is a small mock of that real app surface. */
  visualPreset: "signal" | "buySell" | "convert" | "depositWithdraw" | "transfer" | "wallet";
}

export interface Step {
  number: number;
  title: string;
  description: string;
}

export interface TokenAllocation {
  label: string;
  percentage: number;
  color: string;
}

export interface RoadmapPhase {
  quarter: string;
  title: string;
  items: string[];
  status: "completed" | "active" | "upcoming";
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface EngineHighlight {
  id: string;
  title: string;
  description: string;
  /** Mono footer label, e.g. "CEX ENGINE". */
  tag: string;
  /** Which illustration the card renders. */
  glyph: "council" | "cex" | "dex" | "exit";
  /** Surface treatment in the bento grid. */
  tone: "forest" | "lime" | "dark" | "mint";
}

export interface PreviewPosition {
  symbol: string;
  name: string;
  amount: string;
  value: string;
  change: string;
}

export type AgentVote = "BUY" | "HOLD" | "SELL";

export interface CouncilAgent {
  name: string;
  vote: AgentVote;
}

export interface AgentCouncil {
  pair: string;
  /** Share of the council voting to enter, 0-100. */
  consensus: number;
  agents: CouncilAgent[];
  preflight: { passed: number; total: number };
  slippageCap: string;
  route: string;
}

// ─── HERO ───────────────────────────────────────────────

export function getHeroData() {
  return {
    badge: "Web3 × AI Infrastructure",
    heading: "AI Agents That Work For You",
    subheading:
      "Autonomous trading, yield optimization & portfolio management — all under your control. Let intelligent agents generate revenue while you hold the keys.",
    primaryCta: { label: "Launch App", href: "#" },
    secondaryCta: { label: "Read Whitepaper", href: "#" },
  };
}

// ─── FEATURES ───────────────────────────────────────────

export function getFeatures(): Feature[] {
  return [
    {
      id: "sample-signal",
      title: "AI-Scanned Signals",
      description:
        "Eight agents scan every 15 seconds and hand you a reconciled call — entry, target, stop and their confidence behind it.",
      tag: "Live Sample · 8 Agents",
      visualPreset: "signal",
    },
    {
      id: "buy-sell",
      title: "One-Tap Buy & Sell",
      description:
        "Act on a signal or trade on your own terms — routed at the best available price the moment you confirm.",
      tag: "Instant Execution",
      visualPreset: "buySell",
    },
    {
      id: "convert",
      title: "Any Coin, Same Chain",
      description:
        "Swap any token you hold into any supported token — even ones you don't hold yet — at a flat routed fee.",
      tag: "PancakeSwap Routed",
      visualPreset: "convert",
    },
    {
      id: "deposit-withdraw",
      title: "Deposit & Withdraw",
      description:
        "Fund your wallet by address or a connected browser wallet — funds land and start trading within seconds.",
      tag: "BEP-20 · ~12s Confirm",
      visualPreset: "depositWithdraw",
    },
    {
      id: "transfer",
      title: "Cross-Chain Transfer",
      description:
        "Move value between your BSC and Solana wallets in one step — keep the coin or bridge to a different one.",
      tag: "BSC ⇄ Solana",
      visualPreset: "transfer",
    },
    {
      id: "wallet",
      title: "Your Keys, Your Wallet",
      description:
        "A personal wallet built for auto-trading, or connect your own — WalletConnect and every major browser wallet.",
      tag: "Non-Custodial",
      visualPreset: "wallet",
    },
  ];
}

// ─── HOW IT WORKS ───────────────────────────────────────

export function getSteps(): Step[] {
  return [
    {
      number: 1,
      title: "Connect Your Wallet",
      description:
        "Link your existing Web3 wallet in seconds. We never hold your keys — you stay in full control.",
    },
    {
      number: 2,
      title: "Configure Your AI Agent",
      description:
        "Choose risk tolerance, asset preferences, and target returns. The agent adapts to your profile.",
    },
    {
      number: 3,
      title: "Set Your Strategy",
      description:
        "Select from proven strategies or build your own. Every action is transparent and auditable on-chain.",
    },
    {
      number: 4,
      title: "Earn Passively",
      description:
        "Your agent executes trades, harvests yields, and compounds returns — all while you sleep.",
    },
  ];
}

// ─── TOKENOMICS ─────────────────────────────────────────

export function getTokenomics(): TokenAllocation[] {
  return [
    { label: "Community & Rewards", percentage: 35, color: THEME_COLORS.brandLeaf },
    { label: "Development", percentage: 20, color: THEME_COLORS.brandForest },
    { label: "Liquidity Pool", percentage: 18, color: THEME_COLORS.brandGlow },
    { label: "Team & Advisors", percentage: 12, color: THEME_COLORS.chartUpAlt },
    { label: "Marketing", percentage: 10, color: THEME_COLORS.brandGlowBright },
    { label: "Reserve", percentage: 5, color: THEME_COLORS.brandMist },
  ];
}

// ─── ROADMAP ────────────────────────────────────────────

export function getRoadmap(): RoadmapPhase[] {
  return [
    {
      quarter: "Q1 2025",
      title: "Foundation",
      items: [
        "Core smart contract deployment",
        "Multi-wallet integration (MetaMask, WalletConnect)",
        "Basic AI agent framework",
        "Security audit — Phase 1",
      ],
      status: "completed",
    },
    {
      quarter: "Q2 2025",
      title: "AI Engine",
      items: [
        "Advanced AI trading agents",
        "Strategy builder launch",
        "Token conversion aggregator",
        "Community beta program",
      ],
      status: "completed",
    },
    {
      quarter: "Q3 2025",
      title: "Expansion",
      items: [
        "Cross-chain bridge support",
        "AI prediction models v2",
        "Mobile app (iOS & Android)",
        "Governance token launch",
      ],
      status: "active",
    },
    {
      quarter: "Q4 2025",
      title: "Scale",
      items: [
        "Institutional API access",
        "Advanced portfolio analytics",
        "DAO governance activation",
        "Global marketing push",
      ],
      status: "upcoming",
    },
    {
      quarter: "Q1 2026",
      title: "Ecosystem",
      items: [
        "Third-party agent marketplace",
        "Social trading features",
        "Layer 2 optimization",
        "Strategic partnerships",
      ],
      status: "upcoming",
    },
  ];
}

// ─── FAQ ────────────────────────────────────────────────

export function getFaq(): FaqItem[] {
  return [
    {
      question: "What is VOLSA?",
      answer:
        "VOLSA is a Web3 AI infrastructure platform where autonomous agents generate revenue on your behalf. You maintain full control of your assets through your own wallet — we never hold your keys.",
    },
    {
      question: "How do AI agents make money for me?",
      answer:
        "Our AI agents analyze on-chain data, execute optimized trades, harvest DeFi yields, and compound returns automatically. You set the strategy and risk parameters; the agent handles execution 24/7.",
    },
    {
      question: "Is my wallet safe?",
      answer:
        "Absolutely. VOLSA uses non-custodial architecture — your private keys never leave your wallet. All agent actions are executed through audited smart contracts with revocable permissions.",
    },
    {
      question: "Which wallets are supported?",
      answer:
        "We support MetaMask, WalletConnect, Coinbase Wallet, Phantom, Rainbow, and more. You can connect multiple wallets and manage them from a single dashboard.",
    },
    {
      question: "What blockchains does VOLSA support?",
      answer:
        "Currently Ethereum, Polygon, Arbitrum, Optimism, and BSC. We are actively adding support for Solana, Avalanche, and Base.",
    },
    {
      question: "Are there any fees?",
      answer:
        "VOLSA charges a small performance fee on AI-generated profits only. There are no subscription fees, no deposit fees, and no withdrawal fees. You only pay when you earn.",
    },
  ];
}

// ─── AGENT COUNCIL ──────────────────────────────────────

export function getAgentCouncil(): AgentCouncil {
  return {
    pair: "SOL / USDC",
    consensus: 75,
    agents: [
      { name: "Market Analysis", vote: "BUY" },
      { name: "Momentum", vote: "BUY" },
      { name: "Technical Analysis", vote: "BUY" },
      { name: "Volume and Liquidity", vote: "BUY" },
      { name: "Risk", vote: "HOLD" },
      { name: "Sentiment", vote: "BUY" },
      { name: "Execution", vote: "BUY" },
      { name: "Portfolio", vote: "HOLD" },
    ],
    preflight: { passed: 15, total: 15 },
    slippageCap: "0.50%",
    route: "Jupiter",
  };
}

// ─── ENGINES SHOWCASE ───────────────────────────────────

export function getEngineHighlights(): EngineHighlight[] {
  return [
    {
      id: "council",
      title: "A council decides every entry",
      description:
        "Momentum, sentiment, technicals, order flow, volatility and risk each vote with confidence. One strong objection vetoes the trade.",
      tag: "8 Agents · Weighted consensus",
      glyph: "council",
      tone: "forest",
    },
    {
      id: "convert",
      title: "Cross-chain, near-free",
      description:
        "BSC and Solana balances convert directly into each other at a flat fee near $0.10 — no bridge hops, no exchange stopover.",
      tag: "~$0.10 · Cross-Chain",
      glyph: "cex",
      tone: "lime",
    },
    {
      id: "dex",
      title: "Solana and BNB Chain",
      description:
        "Jupiter, 1inch and PancakeSwap routing with a liquidity floor, trailing entries and a router that picks the cheapest all-in venue.",
      tag: "DEX Engine",
      glyph: "dex",
      tone: "dark",
    },
    {
      id: "exit",
      title: "Exits run themselves",
      description:
        "Set take-profit, stop-loss and trailing stops once. Position watchers close them on your rules whether you are watching or not.",
      tag: "TP · SL · Trailing",
      glyph: "exit",
      tone: "mint",
    },
  ];
}

/**
 * Illustrative in-app numbers for the preview mock. Marketing sample data —
 * never presented as realised performance.
 */
export function getWalletPreview() {
  return {
    account: "Portfolio 01",
    balance: 48920.75,
    dayChangeValue: "+$612.40",
    dayChangePercent: "+1.27%",
    agentEarnings: "$3,284.60",
    agentApy: "4.2% APY",
    actions: ["Buy", "Swap", "Send", "Withdraw"],
    positions: [
      { symbol: "SOL", name: "Solana", amount: "126.4 SOL", value: "$18,822.42", change: "+2.14%" },
      { symbol: "ETH", name: "Ethereum", amount: "3.08 ETH", value: "$11,647.30", change: "+0.88%" },
      { symbol: "BNB", name: "BNB Chain", amount: "9.72 BNB", value: "$6,215.90", change: "+1.36%" },
      { symbol: "JUP", name: "Jupiter", amount: "4,180 JUP", value: "$3,140.05", change: "+3.02%" },
    ] satisfies PreviewPosition[],
  };
}

// ─── SECURE FLOW ────────────────────────────────────────

export interface FlowStep {
  id: "buy" | "swap" | "send" | "withdraw";
  /** Rail number, e.g. "01". */
  index: string;
  /** Short verb shown on the rail and in the phone chrome. */
  label: string;
  title: string;
  description: string;
  /** Mono footnote under the card. */
  note: string;
}

export interface SecurityPillar {
  id: string;
  glyph: "key" | "shield" | "vault";
  title: string;
  description: string;
}

/**
 * The four money movements the wallet performs, in the order the pinned
 * section walks through them. Each one maps to a screen in the flow phone.
 */
export function getFlowSteps(): FlowStep[] {
  return [
    {
      id: "buy",
      index: "01",
      label: "Buy",
      title: "Fund it in one tap",
      description:
        "Card, bank transfer or on-chain deposit. The balance lands in a wallet you already hold the keys to — no account to open, nothing to custody.",
      note: "Card · Bank · On-chain",
    },
    {
      id: "swap",
      index: "02",
      label: "Swap",
      title: "Routed to the cheapest venue",
      description:
        "The router quotes Jupiter, 1inch and PancakeSwap together and prices the whole trade — fee, gas and impact — before a single token moves.",
      note: "All-in pricing · Liquidity floor",
    },
    {
      id: "send",
      index: "03",
      label: "Send",
      title: "Sent from your keys alone",
      description:
        "Every transfer is signed on your device against an allowlist you set. VOLSA can route it and never move it.",
      note: "Allowlist · Device signing",
    },
    {
      id: "withdraw",
      index: "04",
      label: "Withdraw",
      title: "Out whenever you want",
      description:
        "Agent earnings and principal leave on your schedule. No lockups, no notice period, no queue in front of you.",
      note: "No lockup · No notice",
    },
  ];
}

/** What actually keeps the money safe, said plainly. */
export function getSecurityPillars(): SecurityPillar[] {
  return [
    {
      id: "keys",
      glyph: "key",
      title: "Keys never leave your device",
      description:
        "Non-custodial by construction. VOLSA holds no key, no seed and no withdrawal right over your wallet.",
    },
    {
      id: "gate",
      glyph: "shield",
      title: "Every entry is gated",
      description:
        "Eight agents vote, preflight checks run, and one strong objection vetoes the trade before it reaches a venue.",
    },
    {
      id: "vault",
      glyph: "vault",
      title: "Withdrawals are allowlisted",
      description:
        "Funds can only ever land at destinations you signed for. An agent cannot invent a new one.",
    },
  ];
}

/**
 * Hero copy. The headline is authored as lines rather than one string because each
 * line is revealed independently — where it breaks is a design decision, not a
 * side effect of the container width.
 */
export function getHero(): Hero {
  return {
    eyebrow: "BNB Smart Chain · Solana",
    headline: ["Multi-chain trading,", "with AI you control."],
    subhead:
      "Eight specialized agents scan the market every 15 seconds. You decide whether they only advise you, execute inside limits you set, or run the strategy end to end.",
    primaryCta: { label: "Get Started", href: `#${SECTION_IDS.cta}` },
    secondaryCta: { label: "Explore the platform", href: `#${SECTION_IDS.platform}` },
    spectrum: ["You Trade", "AI Assists", "AI Executes"],
  };
}

/**
 * Illustrative signals for the hero panel.
 *
 * Deliberately labelled as samples in the UI: the spec is explicit that signals are
 * system-generated intelligence, never guaranteed outcomes, so a marketing surface
 * must not imply these are live calls. Shapes match the real signal payload
 * (§7) so the panel can be pointed at a feed later without a redesign.
 */
export function getHeroSignals(): HeroSignal[] {
  return [
    {
      pair: "BTC / USDT",
      chain: "BNB Smart Chain",
      price: "64,210.40",
      change: "+2.84%",
      action: "BUY",
      confidence: 82,
      entry: "64,210",
      target: "67,900",
      stop: "62,800",
      trend: [0.32, 0.3, 0.36, 0.34, 0.41, 0.45, 0.42, 0.5, 0.55, 0.52, 0.58, 0.63, 0.6, 0.68, 0.72, 0.7, 0.78, 0.82, 0.86, 0.92],
      targetAt: 0.96,
      stopAt: 0.18,
      agents: [
        { label: "Momentum", value: 84 },
        { label: "Technical", value: 77 },
        { label: "Liquidity", value: 61 },
        { label: "Risk", value: 32 },
      ],
    },
    {
      pair: "SOL / USDT",
      chain: "Solana",
      price: "182.65",
      change: "+0.41%",
      action: "HOLD",
      confidence: 46,
      entry: "—",
      target: "—",
      stop: "176.20",
      trend: [0.52, 0.54, 0.57, 0.59, 0.58, 0.55, 0.53, 0.54, 0.57, 0.6, 0.61, 0.59, 0.56, 0.54, 0.55, 0.58, 0.6, 0.59, 0.57, 0.56],
      targetAt: 0.82,
      stopAt: 0.3,
      agents: [
        { label: "Momentum", value: 41 },
        { label: "Technical", value: 52 },
        { label: "Liquidity", value: 74 },
        { label: "Risk", value: 48 },
      ],
    },
    {
      pair: "BNB / USDT",
      chain: "BNB Smart Chain",
      price: "598.12",
      change: "-3.17%",
      action: "SELL",
      confidence: 71,
      entry: "598.12",
      target: "561.40",
      stop: "612.90",
      trend: [0.88, 0.85, 0.9, 0.82, 0.78, 0.8, 0.72, 0.68, 0.71, 0.63, 0.58, 0.61, 0.52, 0.48, 0.5, 0.42, 0.38, 0.4, 0.33, 0.28],
      targetAt: 0.14,
      stopAt: 0.95,
      agents: [
        { label: "Momentum", value: 24 },
        { label: "Technical", value: 31 },
        { label: "Liquidity", value: 66 },
        { label: "Risk", value: 79 },
      ],
    },
  ];
}

/**
 * Platform overview — the six core components from the architecture spec.
 *
 * Descriptions stay to a single line each on purpose: this section says what exists,
 * not how it works. The dedicated sections further down carry the depth, and the six
 * are rendered as peers because the spec presents them as peers.
 */
export function getPlatform(): PlatformOverview {
  return {
    eyebrow: "Core platform architecture",
    title: ["Six systems.", "One trading ecosystem."],
    subhead:
      "Not a single trading screen. Custody, intelligence, execution and visibility are separate layers, so each can be upgraded, audited and scaled on its own.",
    components: [
      {
        id: "intelligence",
        title: "AI Trading Intelligence Layer",
        description:
          "The Super Machine — a network of specialised agents feeding one decision layer.",
      },
      {
        id: "wallets",
        title: "Multi-Chain Wallet Infrastructure",
        description:
          "BSC and Solana wallets, browser and external connections, plus platform wallets.",
      },
      {
        id: "engine",
        title: "Trading Engine",
        description:
          "Order creation and execution, stop-loss, take-profit, trailing orders, strategy runs.",
      },
      {
        id: "swap",
        title: "Multi-Chain Swap Engine",
        description: "Swaps inside each supported chain, and conversion across them.",
      },
      {
        id: "portfolio",
        title: "User Portfolio System",
        description:
          "Balances, holdings, open positions, profit and loss, and full trading history.",
      },
      {
        id: "alerts",
        title: "Notifications and Alerts",
        description: "Real-time alerts across supported devices and notification channels.",
      },
    ],
  };
}

/** Who carries a stage of the trade in a given mode. */
export type StageOwner = "you" | "machine" | "shared";

export interface ModeStage {
  owner: StageOwner;
  /** What actually happens here, in this mode. */
  label: string;
}

export interface TradingMode {
  id: string;
  name: string;
  /** One line. The mode in the fewest words that are still true. */
  tagline: string;
  body: string;
  /** Aligned index-for-index with `TradingModes.stages`. */
  stages: ModeStage[];
}

export interface TradingModes {
  eyebrow: string;
  title: string[];
  subhead: string;
  /** The trade, broken into the stages that can change hands. */
  stages: string[];
  modes: TradingMode[];
}

/**
 * Trading modes.
 *
 * The three modes are not three products — they are one axis, and the only thing that
 * moves along it is which stages of a trade you keep. So the data is shaped as that
 * axis: every mode answers the same three questions in the same order, which is what
 * lets the section show the handover instead of describing it.
 *
 * Nothing here promises an outcome. Automation is described as what it does on your
 * behalf, never as what it earns.
 */
export function getTradingModes(): TradingModes {
  return {
    eyebrow: "Trading Modes",
    title: ["You choose how much", "the machine does."],
    subhead:
      "The same eight agents run in every mode. What changes is where you stay in the loop — and you can move along that line whenever you want, in either direction.",
    stages: ["Analyse", "Decide", "Execute"],
    modes: [
      {
        id: "manual",
        name: "Manual",
        tagline: "Signals in. Every decision yours.",
        body:
          "The agents run and hand you their reconciled call. Nothing is placed on your behalf: you read the signal and you decide whether it becomes a trade.",
        stages: [
          { owner: "machine", label: "Eight agents" },
          { owner: "you", label: "Your call" },
          { owner: "you", label: "You place it" },
        ],
      },
      {
        id: "semi",
        name: "Semi-Automated",
        tagline: "Prepared for you. Released by you.",
        body:
          "The machine sizes and routes the trade, then stops. It waits on your approval, and places nothing until you give it.",
        stages: [
          { owner: "machine", label: "Eight agents" },
          { owner: "shared", label: "Proposed, you approve" },
          { owner: "machine", label: "Machine places it" },
        ],
      },
      {
        id: "auto",
        name: "Fully Automated",
        tagline: "Runs inside the limits you set.",
        body:
          "The machine carries the trade end to end. What it may risk, what it may hold and when it must stand down are yours to define, and it does not step outside them.",
        stages: [
          { owner: "machine", label: "Eight agents" },
          { owner: "machine", label: "Machine decides" },
          { owner: "machine", label: "Within your limits" },
        ],
      },
    ],
  };
}

/**
 * The Super Machine: its agent network, the decision layer that reconciles them, and
 * the scan cadence they run on.
 *
 * Agent names avoid an ampersand on purpose — the heading face ships no glyph for `&`
 * (or `%`), and renders a missing-glyph box instead of falling back.
 */
export function getAiEngine(): AiEngine {
  return {
    eyebrow: "The Super Machine",
    title: ["Eight specialists.", "One decision."],
    subhead:
      "One model asked to weigh momentum, liquidity, risk and sentiment at once judges each of them more shallowly than narrow agents judging them in parallel. So the work is split — and then reconciled.",
    agents: [
      {
        id: "market",
        name: "Market Analysis",
        role: "Reads overall market conditions.",
        detail:
          "Its read frames everything after it. A setup that looks strong on its own is weighed differently in a market that is turning over.",
        watches: ["Trend", "Regime", "Breadth"],
      },
      {
        id: "momentum",
        name: "Momentum",
        role: "Finds accelerating price movement.",
        detail:
          "Direction on its own is not enough. What matters here is whether a move is still building or already spending itself.",
        watches: ["Velocity", "Acceleration", "Exhaustion"],
      },
      {
        id: "technical",
        name: "Technical Analysis",
        role: "Reads indicators and market structure.",
        detail:
          "Structure and indicators are read together, so a level only counts when the shape of the market around it agrees.",
        watches: ["Structure", "Levels", "Indicators"],
      },
      {
        id: "liquidity",
        name: "Volume and Liquidity",
        role: "Tracks depth, volume and liquidity shifts.",
        detail:
          "A signal the book cannot absorb is not a signal. Depth is checked before size is ever discussed.",
        watches: ["Depth", "Volume", "Slippage"],
      },
      {
        id: "risk",
        name: "Risk",
        role: "Weighs downside and exposure.",
        detail:
          "Every candidate reaches the decision layer with its downside stated rather than assumed away.",
        watches: ["Drawdown", "Exposure", "Correlation"],
      },
      {
        id: "sentiment",
        name: "Sentiment",
        role: "Reads market and social sentiment where available.",
        detail:
          "Treated as context, not instruction. Crowd positioning is a reason to size differently, not a reason to trade.",
        watches: ["Social", "Flow", "Positioning"],
      },
      {
        id: "execution",
        name: "Execution",
        role: "Decides how a trade should be placed.",
        detail:
          "Route and timing are settled per chain, so the same call is placed differently on BNB Smart Chain than on Solana.",
        watches: ["Routing", "Timing", "Size"],
      },
      {
        id: "portfolio",
        name: "Portfolio",
        role: "Watches the account and its strategy allocation.",
        detail:
          "Nothing is judged alone. A candidate is measured against what the account already holds and where it is already exposed.",
        watches: ["Allocation", "Drift", "Rebalance"],
      },
    ],
    decision: {
      title: "Decision Layer",
      body: "Eight readings, one call. Conflicting outputs — strong momentum against thin liquidity — are reconciled here into a single signal.",
    },
    cadence: { value: "15", unit: "s", label: "Scan cadence" },
  };
}
