"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Float, Html } from "@react-three/drei";
import { GlossySphereSwarm } from "./GlossySphereSwarm";
import type { Feature } from "@/services/landing.service";

interface FeaturesCarousel3DProps {
  features: Feature[];
  activeIndex: number;
  onSelectIndex: (index: number) => void;
  className?: string;
}

const RADIUS = 4.6;
const ANGLE_STEP = (Math.PI * 2) / 6;

/**
 * 3D Scene containing the cylindrical card carousel, lighting, and contact shadows.
 */
function CarouselScene({
  features,
  activeIndex,
  onSelectIndex,
}: {
  features: Feature[];
  activeIndex: number;
  onSelectIndex: (index: number) => void;
}) {
  const { viewport } = useThree();
  const isMobile = viewport.width < 5.5;

  const currentRotation = useRef<number>(activeIndex);
  const isDragging = useRef<boolean>(false);
  const dragStartX = useRef<number>(0);
  const dragStartRotation = useRef<number>(0);
  const velocity = useRef<number>(0);
  const lastPointerX = useRef<number>(0);

  // Sync target rotation with activeIndex prop when not dragging
  useEffect(() => {
    if (!isDragging.current) {
      // Find the shortest rotational path to activeIndex
      const current = currentRotation.current;
      const count = features.length;
      const normalizedCurrent = ((current % count) + count) % count;
      let diff = activeIndex - normalizedCurrent;
      if (diff > count / 2) diff -= count;
      if (diff < -count / 2) diff += count;
      currentRotation.current = current; // anchor
    }
  }, [activeIndex, features.length]);

  // Pointer drag event handlers for direct touch / mouse spinning
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    isDragging.current = true;
    dragStartX.current = e.clientX;
    dragStartRotation.current = currentRotation.current;
    lastPointerX.current = e.clientX;
    velocity.current = 0;
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const deltaX = e.clientX - dragStartX.current;
    const instantaneousDelta = e.clientX - lastPointerX.current;
    lastPointerX.current = e.clientX;

    // Convert pixels to angular rotation
    const rotationDelta = (deltaX / window.innerWidth) * 3.5;
    currentRotation.current = dragStartRotation.current - rotationDelta;
    velocity.current = -(instantaneousDelta / window.innerWidth) * 4.0;
  }, []);

  const handlePointerUp = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;

    // Snap to closest card index based on current rotation + slight inertia
    const predicted = currentRotation.current + velocity.current * 0.4;
    const count = features.length;
    const nearestIndex = (((Math.round(predicted) % count) + count) % count);
    onSelectIndex(nearestIndex);
  }, [features.length, onSelectIndex]);

  // Animation frame loop for continuous smooth motion & dampening
  useFrame((state, delta) => {
    const count = features.length;

    if (!isDragging.current) {
      // Calculate target rotation anchored to activeIndex
      const cur = currentRotation.current;
      const normalizedCur = ((cur % count) + count) % count;
      let diff = activeIndex - normalizedCur;
      if (diff > count / 2) diff -= count;
      if (diff < -count / 2) diff += count;

      const target = cur + diff;
      currentRotation.current = THREE.MathUtils.damp(cur, target, 7.5, delta);
    }
  });

  return (
    <group
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {/* Dynamic Ambient and Studio Key Lights */}
      <ambientLight intensity={1.4} color="#eef8ea" />
      <directionalLight
        position={[6, 8, 8]}
        intensity={2.8}
        color="#ffffff"
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      {/* Brand Green Rim / Mood Lights */}
      <directionalLight
        position={[-7, 4, -4]}
        intensity={2.2}
        color="#66b616"
      />
      <pointLight
        position={[0, 3, 2]}
        intensity={1.8}
        color="#c6f19a"
        distance={8}
      />

      {/* Floating 3D Carousel Cards */}
      {features.map((feature, index) => (
        <CarouselCard3D
          key={feature.id}
          feature={feature}
          index={index}
          totalCount={features.length}
          currentRotationRef={currentRotation}
          activeIndex={activeIndex}
          isMobile={isMobile}
          onSelect={() => onSelectIndex(index)}
        />
      ))}

      {/* Ground Contact Shadow for Realistic Physical Depth */}
      <ContactShadows
        position={[0, -2.45, 0]}
        opacity={0.7}
        scale={16}
        blur={2.2}
        far={6}
        color="#081404"
      />
    </group>
  );
}

/**
 * Individual 3D Card with dynamic cylindrical positioning, Drei HTML surface, and glossy spheres.
 */
function CarouselCard3D({
  feature,
  index,
  totalCount,
  currentRotationRef,
  activeIndex,
  isMobile,
  onSelect,
}: {
  feature: Feature;
  index: number;
  totalCount: number;
  currentRotationRef: React.MutableRefObject<number>;
  activeIndex: number;
  isMobile: boolean;
  onSelect: () => void;
}) {
  const cardGroupRef = useRef<THREE.Group>(null);
  const [isHovered, setIsHovered] = useState(false);

  useFrame(() => {
    if (!cardGroupRef.current) return;

    const rot = currentRotationRef.current;
    // Calculate normalized angular difference from front center
    let diff = (index - rot) % totalCount;
    if (diff > totalCount / 2) diff -= totalCount;
    if (diff < -totalCount / 2) diff += totalCount;

    const angle = diff * ANGLE_STEP;
    const r = isMobile ? RADIUS * 0.88 : RADIUS;

    // Cylindrical coordinates
    const x = Math.sin(angle) * r;
    const z = Math.cos(angle) * r - r;
    const y = -Math.abs(Math.sin(angle * 0.5)) * 0.18;

    cardGroupRef.current.position.set(x, y, z);
    // Face towards camera / center arc
    cardGroupRef.current.rotation.y = -angle * 0.95;

    // Scale and opacity dropoff based on distance from center
    const distFromCenter = Math.abs(diff);
    const baseScale = isMobile ? 0.82 : 0.98;
    const scale = Math.max(0.68, baseScale - distFromCenter * 0.09);
    cardGroupRef.current.scale.set(scale, scale, scale);
  });

  const isFront = activeIndex === index;

  return (
    <group
      ref={cardGroupRef}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onPointerOver={() => {
        setIsHovered(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setIsHovered(false);
        document.body.style.cursor = "";
      }}
    >
      {/* 3D Glossy Sphere Cluster bursting from top of active card */}
      <group position={[0, 0.42, 0.28]}>
        <Float
          speed={isFront ? 2.2 : 0.8}
          rotationIntensity={isFront ? 0.35 : 0.1}
          floatIntensity={isFront ? 0.45 : 0.15}
        >
          <GlossySphereSwarm
            preset={feature.visualPreset}
            accentColor={feature.accent}
            isActive={isFront}
          />
        </Float>
      </group>

      {/* 3D Physical Card Backplate Mesh */}
      <mesh position={[0, 0, 0]} castShadow receiveShadow>
        <planeGeometry args={[2.5, 3.6]} />
        <meshStandardMaterial
          color={isFront ? "#0c170a" : "#081007"}
          roughness={0.25}
          metalness={0.88}
          transparent
          opacity={isFront ? 0.98 : 0.72}
        />
      </mesh>

      {/* HTML Interactive Surface Overlay rendered in 3D */}
      <Html
        transform
        distanceFactor={2.7}
        position={[0, 0, 0.03]}
        className="pointer-events-auto select-none"
        style={{
          width: "360px",
          height: "520px",
          transition: "filter 0.3s ease, opacity 0.3s ease",
          opacity: isFront ? 1 : isHovered ? 0.85 : 0.65,
          filter: isFront ? "none" : "brightness(0.7) blur(0.2px)",
        }}
      >
        <div
          onClick={onSelect}
          className={`relative w-full h-full rounded-[2rem] p-7 flex flex-col justify-between overflow-hidden border transition-all duration-300 cursor-pointer ${
            isFront
              ? "bg-gradient-to-b from-[#14260d]/95 via-[#0d1c08]/95 to-[#071004]/98 border-brand-leaf/40 shadow-[0_20px_50px_rgba(18,40,5,0.7)] ring-1 ring-brand-lime/20"
              : "bg-[#0b1607]/85 border-brand-forest/30 hover:border-brand-leaf/30 shadow-lg"
          }`}
        >
          {/* Ambient Glow Gradient inside card */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full pointer-events-none opacity-40 blur-2xl"
            style={{
              background: `radial-gradient(circle, ${feature.accent}44 0%, transparent 70%)`,
            }}
          />

          {/* Top Header Tag & Badge */}
          <div className="relative z-10 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-sans font-bold uppercase tracking-wider bg-white/5 border border-white/10 text-brand-lime backdrop-blur-md">
              <span
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ backgroundColor: feature.accent }}
              />
              {feature.tag}
            </span>
            <span className="text-xl opacity-80">{feature.icon}</span>
          </div>

          {/* Center Visual Space reserved for 3D Floating WebGL Orbs */}
          <div className="relative flex-1 w-full flex items-center justify-center my-2 pointer-events-none" />

          {/* Bottom Content Area matching Reference Design */}
          <div className="relative z-10 mt-auto pt-4 border-t border-white/10">
            <h3 className="font-heading text-2xl text-white font-semibold tracking-tight mb-2.5 leading-snug">
              {feature.title}
            </h3>
            <p className="text-xs text-white/70 font-sans leading-relaxed line-clamp-3 mb-4">
              {feature.description}
            </p>

            {/* Stat and Trigger Footer */}
            {feature.stat && (
              <div className="flex items-center justify-between pt-2">
                <div>
                  <div className="text-xs text-brand-lime font-mono font-semibold">
                    {feature.stat.value}
                  </div>
                  <div className="text-[9px] text-white/40 uppercase tracking-wider font-sans">
                    {feature.stat.label}
                  </div>
                </div>

                <div
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-sans font-semibold transition-colors flex items-center gap-1 ${
                    isFront
                      ? "bg-brand-leaf text-brand-dark shadow-sm"
                      : "bg-white/10 text-white/70"
                  }`}
                >
                  {isFront ? "Active Consensus" : "Select View"}
                  <span>→</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </Html>
    </group>
  );
}

/**
 * Full R3F Canvas wrapper for the Features 3D Carousel.
 */
export function FeaturesCarousel3D({
  features,
  activeIndex,
  onSelectIndex,
  className = "",
}: FeaturesCarousel3DProps) {
  return (
    <div
      className={`relative w-full h-[580px] sm:h-[640px] lg:h-[700px] cursor-grab active:cursor-grabbing ${className}`}
    >
      <Canvas
        camera={{
          position: [0, 0.3, 6.2],
          fov: 42,
          near: 0.1,
          far: 100,
        }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
        }}
        dpr={[1, 2]}
      >
        <CarouselScene
          features={features}
          activeIndex={activeIndex}
          onSelectIndex={onSelectIndex}
        />
      </Canvas>
    </div>
  );
}
export default FeaturesCarousel3D;

