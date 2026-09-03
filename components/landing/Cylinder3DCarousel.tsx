"use client";

import React, { useState, useEffect } from "react";
import { SignalCard } from "./hero/SignalCard";
import {
  BuySellMockScreen,
  ConvertMockScreen,
  DepositWithdrawMockScreen,
  TransferMockScreen,
  WalletMockScreen,
} from "./CylinderMockScreens";
import { CYLINDER_CARD_SIZE_CLASS, HANDOFF_TARGET_ID } from "./heroCylinderHandoff.constants";
import type { Feature } from "@/services/landing.service";

export interface Cylinder3DCarouselProps {
  features: Feature[];
  cylinderRef: React.RefObject<HTMLDivElement | null>;
  currentAngle?: number;
  radius?: number;
  className?: string;
  onCardClick?: (index: number) => void;
  zoomProgress?: number;
  /** 0 = still mid hand-off (card 0's own content is compact) → 1 = fully grown into
   *  the cylinder's card size. Only ever matters for a single frame right at the
   *  hand-off boundary — every other card ignores it. Defaults to 1: once the cylinder
   *  is actually the thing on screen, it's always showing the expanded card. */
  expandProgress?: number;
  /** Card 0's sample-signal index/hover-pause state, owned by HeroSection and shared
   *  with the standalone hero card — see SignalCard's own doc for why this can't be
   *  local state (two mounted copies during the crossfade would drift apart). */
  signalIndex: number;
  onSignalIndexSelect: (index: number) => void;
  onSignalHoverChange: (hovering: boolean) => void;
}

function renderCardContent(
  feature: Feature,
  opts: {
    isFront: boolean;
    expandProgress: number;
    zoomProgress: number;
    isZoomingLastCard: boolean;
    signalIndex: number;
    onSignalIndexSelect: (index: number) => void;
    onSignalHoverChange: (hovering: boolean) => void;
  }
) {
  const {
    isFront,
    expandProgress,
    zoomProgress,
    isZoomingLastCard,
    signalIndex,
    onSignalIndexSelect,
    onSignalHoverChange,
  } = opts;

  switch (feature.visualPreset) {
    case "signal":
      return (
        <SignalCard
          isFront={isFront}
          expandProgress={expandProgress}
          index={signalIndex}
          onIndexSelect={onSignalIndexSelect}
          onHoverChange={onSignalHoverChange}
        />
      );
    case "buySell":
      return <BuySellMockScreen isFront={isFront} title={feature.title} description={feature.description} />;
    case "convert":
      return <ConvertMockScreen isFront={isFront} title={feature.title} description={feature.description} />;
    case "depositWithdraw":
      return (
        <DepositWithdrawMockScreen isFront={isFront} title={feature.title} description={feature.description} />
      );
    case "transfer":
      return <TransferMockScreen isFront={isFront} title={feature.title} description={feature.description} />;
    case "wallet":
      return (
        <WalletMockScreen
          isFront={isFront}
          title={feature.title}
          description={feature.description}
          zoomProgress={zoomProgress}
          isZoomingLastCard={isZoomingLastCard}
        />
      );
    default:
      return null;
  }
}

/**
 * 3D Preserve-3D Cylinder Carousel for pinned scroll animation.
 *
 * Card 0 is the hero's own sample-signal card, grown to full size — not a different
 * design standing in for it. Cards 1-5 are small, self-contained mocks of the real
 * VOLSA screens they represent (Buy/Sell, Convert, Deposit/Withdraw, Transfer, Wallet),
 * each with its own header, controls and a cycling highlight while it's front-facing.
 * Every card shares one size and one shell, so the rotation reads as one continuous set
 * rather than six unrelated illustrations.
 *
 * Memoised at the bottom of this file for the same reason its children already are: the
 * hero re-renders this on every scroll frame of a very long pin, and without the memo an
 * unrelated state change up there (a hover flag, say) redoes all six cards' angle and
 * opacity math for nothing.
 */
function Cylinder3DCarouselImpl({
  features,
  cylinderRef,
  currentAngle = 0,
  radius: customRadius,
  className = "",
  onCardClick,
  zoomProgress = 0,
  expandProgress = 1,
  signalIndex,
  onSignalIndexSelect,
  onSignalHoverChange,
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
      className={`relative w-full h-[700px] sm:h-[720px] md:h-[730px] flex items-center justify-center select-none pointer-events-none ${className}`}
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
                // Only ever one card at a time — the id HeroSection measures against for
                // its FLIP target. Placed on the card itself, not this positioning
                // wrapper: the card carries its own translateY(-20px) (see the
                // transform below), so measuring the wrapper instead was consistently
                // 20px short.
                id={isFront ? HANDOFF_TARGET_ID : undefined}
                onClick={() => onCardClick?.(idx)}
                className={`absolute ${CYLINDER_CARD_SIZE_CLASS}`}
                style={{
                  transform: `rotateY(${cardAngle}deg) translateZ(${radius}px) translateY(-20px)`,
                  transformStyle: "preserve-3d",
                  backfaceVisibility: "hidden",
                  opacity,
                  zIndex: isZoomingLastCard ? 100 : undefined,
                }}
              >
                {renderCardContent(feature, {
                  isFront,
                  expandProgress,
                  zoomProgress,
                  isZoomingLastCard,
                  signalIndex,
                  onSignalIndexSelect,
                  onSignalHoverChange,
                })}
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

export const Cylinder3DCarousel = React.memo(Cylinder3DCarouselImpl);

export default Cylinder3DCarousel;
