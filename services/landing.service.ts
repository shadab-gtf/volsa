/**
 * VOLSA Landing Page Data Service
 * All page content is centralized here. Components consume this data only.
 * Future API/CMS migration requires changes only in this file.
 */

export interface Feature {
  id: string;
  icon: string;
  title: string;
  description: string;
  tag: string;
  stat?: { value: string; label: string };
  visualPreset: "swarm" | "shield" | "router" | "matrix" | "oracle" | "vault";
  accent: string;
}

export interface Step {
  number: number;
  title: string;
  description: string;
}

export interface Stat {
  label: string;
  value: number;
  suffix: string;
  prefix?: string;
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
      id: "ai-agents",
      icon: "🤖",
      title: "Autonomous Intent Swarm",
      description:
        "Adaptive multi-agent consensus operating with zero latency MEV protection and real-time execution.",
      tag: "MEV Shield · 7 Agents",
      stat: { value: "0.2ms", label: "Consensus Latency" },
      visualPreset: "swarm",
      accent: "#66b616",
    },
    {
      id: "institutional-shield",
      icon: "🛡️",
      title: "Institutional ZK Shield",
      description:
        "Private state transitions with cryptographic multi-party computation and revocable permissions.",
      tag: "Zero-Knowledge · MPC",
      stat: { value: "100%", label: "Key Isolation" },
      visualPreset: "shield",
      accent: "#c6f19a",
    },
    {
      id: "smart-transfers",
      icon: "⚡",
      title: "Cross-Chain Liquidity Router",
      description:
        "Dynamic gas-optimized pathfinding across 12+ EVM and SVM networks with all-in pricing.",
      tag: "12+ Chains · Optimal Gas",
      stat: { value: "0.01%", label: "Avg Slippage" },
      visualPreset: "router",
      accent: "#8fe331",
    },
    {
      id: "strategy-builder",
      icon: "📊",
      title: "Neural Strategy Matrix",
      description:
        "Self-optimizing algorithmic execution models backtested against 10M+ blocks of historical data.",
      tag: "10M+ Blocks · ML Models",
      stat: { value: "99.9%", label: "Uptime SLA" },
      visualPreset: "matrix",
      accent: "#66b616",
    },
    {
      id: "predictions",
      icon: "🔮",
      title: "Real-Time Volatility Oracle",
      description:
        "Millisecond-precision sentiment, on-chain depth analysis, and regime detection algorithms.",
      tag: "Sub-Second · Sentiment",
      stat: { value: "24/7", label: "Real-time Telemetry" },
      visualPreset: "oracle",
      accent: "#c6f19a",
    },
    {
      id: "multi-wallet",
      icon: "🔐",
      title: "Non-Custodial Key Vault",
      description:
        "Hardware-grade device signing where private keys never leave your possession. Zero custody risk.",
      tag: "Non-Custodial · Biometric",
      stat: { value: "$0", label: "Custody Exposure" },
      visualPreset: "vault",
      accent: "#8fe331",
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

// ─── STATS ──────────────────────────────────────────────

export function getStats(): Stat[] {
  return [
    { label: "Active Wallets", value: 48000, suffix: "+", prefix: "" },
    { label: "Trading Volume", value: 2.4, suffix: "B", prefix: "$" },
    { label: "AI Agents Deployed", value: 12500, suffix: "+", prefix: "" },
    { label: "Strategies Executed", value: 890000, suffix: "+", prefix: "" },
  ];
}

// ─── TOKENOMICS ─────────────────────────────────────────

export function getTokenomics(): TokenAllocation[] {
  return [
    { label: "Community & Rewards", percentage: 35, color: "#66B616" },
    { label: "Development", percentage: 20, color: "#22480B" },
    { label: "Liquidity Pool", percentage: 18, color: "#C6F19A" },
    { label: "Team & Advisors", percentage: 12, color: "#3E7D0F" },
    { label: "Marketing", percentage: 10, color: "#8FE331" },
    { label: "Reserve", percentage: 5, color: "#D8F3D1" },
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
    consensus: 71,
    agents: [
      { name: "Momentum Scanner", vote: "BUY" },
      { name: "Technical Analyst", vote: "BUY" },
      { name: "Sentiment Oracle", vote: "BUY" },
      { name: "Volatility Regime", vote: "BUY" },
      { name: "Risk Manager", vote: "BUY" },
      { name: "Order Book Flow", vote: "HOLD" },
      { name: "LLM Strategist", vote: "HOLD" },
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
      tag: "7 Agents · Weighted consensus",
      glyph: "council",
      tone: "forest",
    },
    {
      id: "cex",
      title: "Binance spot, unattended",
      description:
        "A council-gated engine works spot majors around the clock with disciplined sizing, cooldowns and validated order rules.",
      tag: "CEX Engine",
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
        "Seven agents vote, preflight checks run, and one strong objection vetoes the trade before it reaches a venue.",
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
