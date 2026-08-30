"use client";

import React, { useState, useEffect } from "react";
import { MemoFeatureCardGraphic } from "./FeatureCardGraphic";
import type { Feature } from "@/services/landing.service";

/** One hairline mark per preset — the badge's icon, not a decorated emoji. */
function FeatureBadgeIcon({ preset }: { preset: Feature["visualPreset"] }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 text-brand-leaf"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {preset === "swarm" && (
        <>
          <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
          {[0, 72, 144, 216, 288].map((deg) => {
            const rad = (deg * Math.PI) / 180;
            // Fixed precision, not the raw float: server and client can
            // otherwise stringify the same number differently and trip a
            // hydration mismatch on this attribute.
            const x = (12 + Math.cos(rad) * 8).toFixed(3);
            const y = (12 + Math.sin(rad) * 8).toFixed(3);
            return (
              <g key={deg}>
                <line x1="12" y1="12" x2={x} y2={y} />
                <circle cx={x} cy={y} r="1.3" />
              </g>
            );
          })}
        </>
      )}
      {preset === "shield" && (
        <path d="M12 3 L19 6 V11 C19 16 15.5 19.5 12 21 C8.5 19.5 5 16 5 11 V6 Z" />
      )}
      {preset === "router" && (
        <>
          <circle cx="12" cy="4.5" r="1.5" />
          <circle cx="19" cy="17" r="1.5" />
          <circle cx="5" cy="17" r="1.5" />
          <path d="M12 6 V12 M12 12 L18 16.2 M12 12 L6 16.2" />
        </>
      )}
      {preset === "matrix" && <path d="M5 19 V13 M12 19 V8 M19 19 V4" />}
      {preset === "oracle" && (
        <>
          <path d="M3 13 Q7 6 11 13 T19 10" />
          <circle cx="19" cy="10" r="1.3" fill="currentColor" stroke="none" />
        </>
      )}
      {preset === "vault" && (
        <>
          <rect x="5" y="10" width="14" height="10" rx="2" />
          <path d="M8 10 V7 a4 4 0 0 1 8 0 v3" />
        </>
      )}
    </svg>
  );
}

export interface Cylinder3DCarouselProps {
  features: Feature[];
  cylinderRef: React.RefObject<HTMLDivElement | null>;
  currentAngle?: number;
  radius?: number;
  className?: string;
  onCardClick?: (index: number) => void;
  zoomProgress?: number;
}

/**
 * 3D Preserve-3D Cylinder Carousel for pinned scroll animation.
 * Features clean Web3 vector illustrations, dark obsidian cards, and smooth scroll rotation.
 */
export function Cylinder3DCarousel({
  features,
  cylinderRef,
  currentAngle = 0,
  radius: customRadius,
  className = "",
  onCardClick,
  zoomProgress = 0,
}: Cylinder3DCarouselProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const radius = customRadius ?? (isMobile ? 270 : 395);
  const anglePerCard = 360 / features.length;

  return (
    <div
      className={`relative w-full h-[480px] sm:h-[530px] md:h-[580px] flex items-center justify-center select-none pointer-events-none ${className}`}
      style={{ perspective: isMobile ? "950px" : "1350px" }}
    >
      <div
        className="relative w-full h-full flex items-center justify-center pointer-events-auto"
        style={{ transformStyle: "preserve-3d" }}
      >
        <div
          ref={cylinderRef}
          className="relative w-full h-full flex items-center justify-center will-change-transform"
          style={{
            transformStyle: "preserve-3d",
            transform: `translateZ(${-radius}px) rotateY(${currentAngle}deg)`,
          }}
        >
          {features.map((feature, idx) => {
            const cardAngle = idx * anglePerCard;

            // Calculate angle relative to front view for visual focus
            let relativeAngle = ((cardAngle + currentAngle) % 360 + 360) % 360;
            if (relativeAngle > 180) relativeAngle -= 360;

            const isFront = Math.abs(relativeAngle) < anglePerCard * 0.45;
            const distFromFront = Math.abs(relativeAngle);
            let opacity = parseFloat(Math.max(0.38, 1.0 - (distFromFront / 180) * 0.72).toFixed(4));

            const isZoomingLastCard = isFront && idx === features.length - 1 && zoomProgress > 0;

            // Fade out other cards completely as the last card is zooming
            if (zoomProgress > 0 && idx !== features.length - 1) {
              opacity = parseFloat((opacity * (1 - zoomProgress)).toFixed(4));
            }

            return (
              <div
                key={feature.id}
                onClick={() => onCardClick?.(idx)}
                className={`absolute w-[305px] sm:w-[350px] md:w-[380px] h-[440px] sm:h-[500px] md:h-[550px] rounded-[32px] sm:rounded-[36px] md:rounded-[40px] border transition-colors duration-500 group ${
                  isZoomingLastCard ? "" : "overflow-hidden"
                } ${isFront
                  ? "border-brand-leaf/60 bg-surface-panel-carousel/95 shadow-[0_30px_70px_rgba(var(--shadow-carousel-rgb),0.95)]"
                  : "border-white/15 bg-surface-panel-carousel-alt/90 shadow-[0_20px_50px_rgba(var(--black-rgb),0.85)]"
                }`}
                style={{
                  transform: `rotateY(${cardAngle}deg) translateZ(${radius}px) translateY(-20px)`,
                  transformStyle: "preserve-3d",
                  backfaceVisibility: "hidden",
                  opacity,
                  zIndex: isZoomingLastCard ? 100 : undefined,
                }}
              >
                {/* Top Category Badge Overlay */}
                <div className="absolute top-6 left-6 right-6 z-30 flex items-center justify-between pointer-events-none">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-sans font-bold uppercase tracking-wider bg-black/40 border border-white/15 text-brand-leaf backdrop-blur-md">
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: "var(--primary)" }}
                    />
                    {feature.tag}
                  </span>
                  <span className="opacity-90 drop-shadow-md">
                    <FeatureBadgeIcon preset={feature.visualPreset} />
                  </span>
                </div>

                {/* Center Vector Dimensional Graphic (No Black 3D Blob) */}
                <div
                  className={`absolute inset-x-0 top-16 sm:top-18 flex items-center justify-center ${
                    isZoomingLastCard ? "z-40" : "z-10"
                  }`}
                >
                  <MemoFeatureCardGraphic
                    preset={feature.visualPreset}
                    accentColor="var(--primary)"
                    isFront={isFront}
                    zoomProgress={idx === features.length - 1 ? zoomProgress : 0}
                  />
                </div>

                {/* Inner Ambient Glow matching Theme */}
                <div
                  className="absolute -top-12 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full pointer-events-none opacity-35 blur-2xl"
                  style={{
                    background: `radial-gradient(circle, var(--primary) 0%, transparent 70%)`,
                  }}
                />

                {/* Vignette Overlay matching User UI Pattern */}
                <div className="absolute inset-0 z-20 bg-gradient-to-t from-surface-panel-deep/98 via-surface-panel-deep/20 to-surface-panel-deep/50 pointer-events-none" />

                {/* Glass Edge Highlights */}
                <div className="absolute inset-0 z-20 rounded-[32px] sm:rounded-[36px] md:rounded-[40px] ring-1 ring-inset ring-white/15 pointer-events-none" />

                {/* Card Title & Description Overlay at Bottom */}
                <div className="absolute bottom-7 left-7 right-7 z-30">
                  <h4 className="text-2xl sm:text-3xl font-heading font-semibold text-white tracking-tight leading-snug">
                    {feature.title}
                  </h4>
                  <p className="text-xs sm:text-sm text-white/75 mt-2.5 leading-relaxed line-clamp-2 font-sans">
                    {feature.description}
                  </p>

                  {/* Stat & Status Footer */}
                  {feature.stat && (
                    <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-mono font-bold text-brand-leaf block">
                          {feature.stat.value}
                        </span>
                        <span className="text-[9px] uppercase tracking-wider text-white/40 font-sans block">
                          {feature.stat.label}
                        </span>
                      </div>

                      <div
                        className={`px-3 py-1 rounded-full text-[11px] font-sans font-semibold transition-all duration-300 ${isFront
                          ? "bg-brand-leaf text-brand-dark shadow-sm"
                          : "bg-white/10 text-white/70"
                          }`}
                      >
                        {isFront ? "Consensus Active" : "Inspect Protocol"}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Floor Contact Reflection / Ambient Shadow */}
      <div
        className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-[75%] h-20 rounded-full blur-3xl pointer-events-none opacity-60"
        style={{
          background: "radial-gradient(ellipse at center, rgba(var(--vignette-carousel-rgb),0.9) 0%, transparent 70%)",
        }}
        aria-hidden="true"
      />
    </div>
  );
}

export default Cylinder3DCarousel;
