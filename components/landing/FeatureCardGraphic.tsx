"use client";

import React from "react";
import { THEME_COLORS } from "@/constants/theme-colors";

interface FeatureCardGraphicProps {
  preset: "swarm" | "shield" | "router" | "matrix" | "oracle" | "vault";
  accentColor?: string;
  isFront?: boolean;
  zoomProgress?: number;
}

/**
 * `--primary`/`--brand-dark` flip per theme (leaf-on-black in dark, forest-on-mist in
 * light), but this dot's color is scroll-driven arithmetic, not a CSS value — it has to
 * be resolved to a real hex the moment the theme is read, not frozen at import time.
 */
function currentThemeHex(varName: "--primary" | "--brand-dark", fallback: string): string {
  if (typeof document === "undefined") return fallback;
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  if (varName === "--primary") return isDark ? THEME_COLORS.brandLeaf : THEME_COLORS.brandForest;
  return isDark ? THEME_COLORS.black : THEME_COLORS.brandDark;
}

/**
 * Pure helper function to interpolate between two Hex colors based on scroll progress factor.
 */
function interpolateColor(color1: string, color2: string, factor: number) {
  const c1 = color1.startsWith("#") ? color1 : THEME_COLORS.brandLeaf;
  const c2 = color2.startsWith("#") ? color2 : THEME_COLORS.black;

  const r1 = parseInt(c1.substring(1, 3), 16);
  const g1 = parseInt(c1.substring(3, 5), 16);
  const b1 = parseInt(c1.substring(5, 7), 16);

  const r2 = parseInt(c2.substring(1, 3), 16);
  const g2 = parseInt(c2.substring(3, 5), 16);
  const b2 = parseInt(c2.substring(5, 7), 16);

  const r = Math.round(r1 + factor * (r2 - r1));
  const g = Math.round(g1 + factor * (g2 - g1));
  const b = Math.round(b1 + factor * (b2 - b1));

  const rHex = r.toString(16).padStart(2, "0");
  const gHex = g.toString(16).padStart(2, "0");
  const bHex = b.toString(16).padStart(2, "0");

  return `#${rHex}${gHex}${bHex}`;
}

/**
 * High-end Web3 Dimensional Graphic for Feature Cards.
 * Clean, lightweight, wireframe 3D vector-based illustrations matching the VOLSA luxury brand identity.
 */
export function FeatureCardGraphic({
  preset,
  accentColor = "var(--primary)",
  isFront = false,
  zoomProgress = 0,
}: FeatureCardGraphicProps) {
  const id = `feature-glyph-${preset}`;

  return (
    <div className="relative w-full h-56 sm:h-64 flex items-center justify-center pointer-events-none select-none">
      {/* Background ambient radial glow */}
      <div
        className={`absolute w-44 h-44 rounded-full blur-2xl transition-opacity duration-500 ${
          isFront ? "opacity-35" : "opacity-15"
        }`}
        style={{
          background: `radial-gradient(circle, ${accentColor} 0%, transparent 70%)`,
        }}
      />

      <svg
        viewBox="0 0 200 180"
        className="relative z-10 w-52 sm:w-60 h-44 sm:h-52"
        style={{ overflow: "visible" }}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`${id}-grad`} x1="0" y1="0" x2="0.8" y2="1">
            <stop offset="0%" stopColor="var(--brand-glow)" />
            <stop offset="100%" stopColor={accentColor} />
          </linearGradient>
        </defs>

        {/* ─── 1. Swarm: Autonomous Intent Swarm (7-Agent Consensus Heptagon) ─── */}
        {preset === "swarm" && (
          <g fill="none" strokeWidth="1.5">
            {/* Inner & Outer Consensus Rings */}
            <circle cx="100" cy="90" r="54" stroke={accentColor} strokeOpacity="0.2" />
            <circle cx="100" cy="90" r="48" stroke="var(--white)" strokeOpacity="0.15" strokeDasharray="4 6" />
            
            {/* Heptagonal Consensus connections (7 agents) */}
            <polygon
              points="100,42 137.53,60.03 146.99,102.16 120.75,137.81 79.25,137.81 53.01,102.16 62.47,60.03"
              stroke={accentColor}
              strokeOpacity="0.45"
              strokeDasharray="6 4"
            />

            {/* Connecting Spoke Lines to Center */}
            {[
              { x: 100, y: 42 },
              { x: 137.53, y: 60.03 },
              { x: 146.99, y: 102.16 },
              { x: 120.75, y: 137.81 },
              { x: 79.25, y: 137.81 },
              { x: 53.01, y: 102.16 },
              { x: 62.47, y: 60.03 }
            ].map((node, i) => (
              <g key={i}>
                <line x1="100" y1="90" x2={node.x} y2={node.y} stroke="var(--white)" strokeOpacity="0.25" strokeWidth="1" />
                {/* Agent Nodes */}
                <circle cx={node.x} cy={node.y} r="6.5" fill="var(--surface-panel-carousel)" stroke={accentColor} strokeWidth="1.8" />
                <circle cx={node.x} cy={node.y} r="2.5" fill="var(--white)" />
              </g>
            ))}
            
            {/* Central Decision Core */}
            <circle cx="100" cy="90" r="14" fill={`url(#${id}-grad)`} stroke="var(--white)" strokeWidth="1.5" />
            <circle
              cx="100"
              cy="90"
              fill={isFront ? "var(--secondary)" : "var(--white)"}
              className="transition-all duration-500 ease-out"
              style={{ r: isFront ? 8.5 : 5 }}
            />
          </g>
        )}

        {/* ─── 2. Shield: Institutional ZK Shield (Double cryptographic shield) ─── */}
        {preset === "shield" && (
          <g fill="none" strokeWidth="1.5">
            {/* Outer Cryptographic Shield */}
            <path
              d="M100 25 L150 48 L150 96 C150 128 100 152 100 152 C100 152 50 128 50 96 L50 48 Z"
              stroke={`url(#${id}-grad)`}
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            
            {/* Inner Shield */}
            <path
              d="M100 37 L138 54 L138 90 C138 116 100 136 100 136 C100 136 62 116 62 90 L62 54 Z"
              stroke="var(--white)"
              strokeOpacity="0.45"
              strokeDasharray="5 3"
            />

            {/* Geometric Keylock / ZK Center Seal */}
            <g transform="translate(100, 85)" fill="none" strokeWidth="1.8">
              <rect x="-10" y="-2" width="20" height="20" rx="3" fill="var(--surface-panel-carousel)" stroke={accentColor} />
              <path d="M-6,-2 C-6,-8 6,-8 6,-2" stroke={accentColor} />
              <circle
                cx="0"
                cy="7"
                fill={isFront ? "var(--secondary)" : "var(--white)"}
                className="transition-all duration-500 ease-out"
                stroke="none"
                style={{ r: isFront ? 5 : 2.5 }}
              />
              <line x1="0" y1="9.5" x2="0" y2="13" stroke="var(--white)" strokeWidth="1.5" strokeLinecap="round" />
            </g>
          </g>
        )}

        {/* ─── 3. Router: Cross-Chain Liquidity Router (Network Node Triangle) ─── */}
        {preset === "router" && (
          <g fill="none" strokeWidth="1.5">
            {/* Intersecting path tunnels */}
            <polygon
              points="100,42 146,120 54,120"
              stroke="var(--white)"
              strokeOpacity="0.2"
              strokeDasharray="4 6"
            />
            
            {/* Core routing tracks */}
            <circle cx="100" cy="94" r="30" stroke={accentColor} strokeOpacity="0.35" strokeDasharray="3 3" />

            {/* Connecting spoke pipelines */}
            <line x1="100" y1="94" x2="100" y2="42" stroke={accentColor} strokeOpacity="0.5" />
            <line x1="100" y1="94" x2="146" y2="120" stroke={accentColor} strokeOpacity="0.5" />
            <line x1="100" y1="94" x2="54" y2="120" stroke={accentColor} strokeOpacity="0.5" />

            {/* Outer Network Chains / Nodes */}
            {[
              { x: 100, y: 42, label: "EVM" },
              { x: 146, y: 120, label: "SVM" },
              { x: 54, y: 120, label: "WASM" }
            ].map((node, i) => (
              <g key={i}>
                <circle cx={node.x} cy={node.y} r="9" fill="var(--surface-panel-carousel)" stroke="var(--white)" strokeWidth="1.8" />
                <circle cx={node.x} cy={node.y} r="3.5" fill={accentColor} />
              </g>
            ))}

            {/* Central Liquidity Core */}
            <circle cx="100" cy="94" r="14" fill={`url(#${id}-grad)`} stroke="var(--white)" strokeWidth="1.8" />
            <circle
              cx="100"
              cy="94"
              fill={isFront ? "var(--secondary)" : "var(--white)"}
              className="transition-all duration-500 ease-out"
              style={{ r: isFront ? 8 : 4.5 }}
            />
          </g>
        )}

        {/* ─── 4. Matrix: Neural Strategy Matrix (Execution Weights) ─── */}
        {preset === "matrix" && (
          <g fill="none" strokeWidth="1.5">
            {/* 4x4 Grid Matrix */}
            {[0, 1, 2, 3].map((row) => {
              const y = 52 + row * 25;
              return (
                <line key={`r-${row}`} x1="45" y1={y} x2="155" y2={y} stroke="var(--white)" strokeOpacity="0.15" />
              );
            })}
            {[0, 1, 2, 3].map((col) => {
              const x = 50 + col * 25;
              return (
                <line key={`c-${col}`} x1={x} y1="47" x2={x} y2="133" stroke="var(--white)" strokeOpacity="0.15" />
              );
            })}

            {/* Dynamic Strategy Execution Paths (Sharp flow indicators) */}
            <polyline
              points="50,127 75,102 100,102 125,77 150,52"
              stroke={accentColor}
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Grid Intersects */}
            {[
              { x: 50, y: 127, active: true },
              { x: 75, y: 102, active: true },
              { x: 100, y: 102, active: true },
              { x: 125, y: 77, active: true },
              { x: 150, y: 52, active: true },
              { x: 50, y: 52, active: false },
              { x: 150, y: 127, active: false },
              { x: 100, y: 52, active: false }
            ].map((node, i) => (
              <circle
                key={i}
                cx={node.x}
                cy={node.y}
                className="transition-all duration-500 ease-out"
                style={{
                  r: node.active ? (isFront ? 7.5 : 5.5) : 2.5,
                  fill: node.active ? (isFront ? "var(--secondary)" : "var(--surface-panel-carousel)") : "var(--white)"
                }}
                fillOpacity={node.active ? 1 : 0.25}
                stroke={node.active ? accentColor : "none"}
                strokeWidth={1.8}
              />
            ))}
          </g>
        )}

        {/* ─── 5. Oracle: Real-Time Volatility Oracle (Telemetry scope) ─── */}
        {preset === "oracle" && (
          <g fill="none" strokeWidth="1.5">
            {/* Volatility waves */}
            <path
              d="M32 100 Q 60 40, 90 90 T 148 70 T 168 110"
              stroke="var(--white)"
              strokeOpacity="0.25"
              strokeWidth="1.5"
            />
            <path
              d="M32 90 Q 65 140, 95 80 T 145 110 T 168 65"
              stroke={`url(#${id}-grad)`}
              strokeWidth="2.5"
              strokeLinecap="round"
            />

            {/* Oracle Sensor Reticle */}
            <g transform="translate(100, 85)">
              <circle cx="0" cy="0" r="28" stroke="var(--white)" strokeOpacity="0.25" strokeDasharray="4 6" />
              <circle cx="0" cy="0" r="16" fill="var(--surface-panel-carousel)" stroke={accentColor} strokeWidth="1.8" />
              <line x1="-34" y1="0" x2="34" y2="0" stroke={accentColor} strokeOpacity="0.4" strokeWidth="1" />
              <line x1="0" y1="-34" x2="0" y2="34" stroke={accentColor} strokeOpacity="0.4" strokeWidth="1" />
              <circle
                cx="0"
                cy="0"
                fill={isFront ? "var(--secondary)" : "var(--white)"}
                className="transition-all duration-500 ease-out"
                stroke="none"
                style={{ r: isFront ? 8 : 4 }}
              />
            </g>
          </g>
        )}

        {/* ─── 6. Vault: Non-Custodial Key Vault (Mechanical Dial door) ─── */}
        {preset === "vault" && (
          <g fill="none" strokeWidth="1.5">
            {/* Outer heavy dial ring */}
            <circle cx="100" cy="90" r="58" stroke={accentColor} strokeWidth="2.2" />
            <circle cx="100" cy="90" r="50" stroke="var(--white)" strokeOpacity="0.2" strokeDasharray="3 6" />
            <circle cx="100" cy="90" r="34" stroke="var(--white)" strokeOpacity="0.3" />

            {/* Dial Calibration Marks */}
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
              const angle = (i / 8) * Math.PI * 2;
              const x1 = parseFloat((100 + Math.cos(angle) * 50).toFixed(4));
              const y1 = parseFloat((90 + Math.sin(angle) * 50).toFixed(4));
              const x2 = parseFloat((100 + Math.cos(angle) * 58).toFixed(4));
              const y2 = parseFloat((90 + Math.sin(angle) * 58).toFixed(4));
              return (
                <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={accentColor} strokeWidth="1.8" />
              );
            })}

            {/* Central cryptographic Vault Key (Scaled Down) */}
            <g fill="none" strokeWidth="1.8">
              {/* Key Head Outline */}
              <circle cx="100" cy="78" r="7" stroke="var(--white)" />
              
              {/* Key Stem */}
              <line x1="100" y1="85" x2="100" y2="108" stroke="var(--white)" strokeLinecap="round" />
              
              {/* Key Teeth */}
              <line x1="100" y1="96" x2="105" y2="96" stroke="var(--white)" strokeLinecap="round" />
              <line x1="100" y1="102" x2="105" y2="102" stroke="var(--white)" strokeLinecap="round" />
              <line x1="100" y1="102" x2="103.5" y2="102" stroke={accentColor} strokeWidth="1.2" strokeLinecap="round" />

              {/* Inner Key Head Dot (Painted last to cover the key on zoom) */}
              <circle
                cx="100"
                cy="78"
                fill={
                  zoomProgress && zoomProgress > 0
                    ? interpolateColor(
                        currentThemeHex("--primary", THEME_COLORS.brandLeaf),
                        currentThemeHex("--brand-dark", THEME_COLORS.brandDark),
                        Math.min(1, zoomProgress / 0.5)
                      )
                    : (isFront ? "var(--secondary)" : accentColor)
                }
                stroke="none"
                style={{
                  r: zoomProgress && zoomProgress > 0 ? 5 + zoomProgress * 1500 : (isFront ? 5 : 2.5),
                  transition: zoomProgress && zoomProgress > 0 ? "none" : "r 0.5s ease, fill 0.5s ease",
                }}
              />
            </g>
          </g>
        )}
      </svg>
    </div>
  );
}

/**
 * Memoised: the parent carousel re-renders on every scroll frame as its rotation
 * angle changes, but this graphic's props hold steady while a card is off-front.
 * Without this, five SVG subtrees reconcile per frame through the whole pin.
 */
export const MemoFeatureCardGraphic = React.memo(FeatureCardGraphic);

export default FeatureCardGraphic;
