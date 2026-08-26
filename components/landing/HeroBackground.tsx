"use client";

import React from "react";

/**
 * Ultra-Performance Hero Background:
 * - Uses hardware-accelerated radial gradients (zero blur filter repaints = 120fps smooth scrolling)
 * - Slow, long-period drift (20s+) so the glow reads as ambient light, not motion
 * - Rich top-to-bottom soft lime gradient mesh
 */
export function HeroBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      <style>{`
        @keyframes floatBlob1 {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          33% { transform: translate3d(80px, -50px, 0) scale(1.12); }
          66% { transform: translate3d(-60px, 65px, 0) scale(0.94); }
        }
        @keyframes floatBlob2 {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          33% { transform: translate3d(-90px, 60px, 0) scale(1.1); }
          66% { transform: translate3d(65px, -75px, 0) scale(0.95); }
        }
        @keyframes floatBlob3 {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          33% { transform: translate3d(70px, 75px, 0) scale(0.92); }
          66% { transform: translate3d(-75px, -55px, 0) scale(1.14); }
        }
        .hero-blob {
          animation-timing-function: cubic-bezier(0.45, 0, 0.55, 1);
          animation-iteration-count: infinite;
          will-change: transform;
        }
        @media (prefers-reduced-motion: reduce) {
          .hero-blob { animation: none !important; }
        }
      `}</style>

      {/* Rich Base Mesh Gradient Overlay */}
      <div
        className="absolute inset-0 opacity-90"
        style={{
          background:
            "linear-gradient(180deg, rgba(206, 245, 162, 0.75) 0%, rgba(228, 250, 202, 0.45) 45%, rgba(247, 253, 244, 0.95) 100%)",
        }}
      />

      {/* Blob 1: Top Left Lime Glow — Hardware Accelerated Radial Gradient */}
      <div
        className="hero-blob absolute -top-32 -left-32 w-[650px] h-[650px] opacity-80"
        style={{
          background:
            "radial-gradient(circle, rgba(206, 245, 162, 0.85) 0%, rgba(206, 245, 162, 0.3) 40%, rgba(206, 245, 162, 0) 70%)",
          animationName: "floatBlob1",
          animationDuration: "22s",
        }}
      />

      {/* Blob 2: Center Right Bright Glow — Hardware Accelerated Radial Gradient */}
      <div
        className="hero-blob absolute top-1/4 -right-24 w-[700px] h-[700px] opacity-75"
        style={{
          background:
            "radial-gradient(circle, rgba(198, 241, 154, 0.85) 0%, rgba(198, 241, 154, 0.3) 45%, rgba(198, 241, 154, 0) 70%)",
          animationName: "floatBlob2",
          animationDuration: "27s",
        }}
      />

      {/* Blob 3: Center Bottom Deep Forest Glow — Hardware Accelerated Radial Gradient */}
      <div
        className="hero-blob absolute -bottom-32 left-1/3 w-[600px] h-[600px] opacity-70"
        style={{
          background:
            "radial-gradient(circle, rgba(102, 182, 22, 0.4) 0%, rgba(102, 182, 22, 0.15) 45%, rgba(102, 182, 22, 0) 70%)",
          animationName: "floatBlob3",
          animationDuration: "31s",
        }}
      />
    </div>
  );
}
