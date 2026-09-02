"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import * as THREE from "three";
import { THEME_COLORS } from "@/constants/theme-colors";
import { isLand } from "./worldLandGrid";

/**
 * The dotted-world-map "signal globe" that opens the particle finale, before it hands
 * off into the existing sand/headline sequence (see CylinderExplosionSphere's own
 * `PARTICLE_PHASES.sphereIn`, timed to fade in right as this fades out — the dune
 * explosion itself is untouched).
 *
 * Real coastlines (via `worldLandGrid`, built from the 110m world atlas), one brand
 * hue, and a handful of markers cycling through the actual alert/signal types the
 * product spec defines (§7 AI Signals, §30 Alerts & Notifications) — not generic
 * placeholder transactions.
 */

interface WorldSignalGlobeProps {
  /** 0 -> 1 across this component's own on-screen window: bloom in, idle-rotate while
   *  markers cycle, fade out. The caller owns the outer scroll mapping. */
  progress: number;
}

const DOT_COUNT = 5200;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

const MARKERS = [
  { lat: 40.7, lon: -74.0, title: "BUY signal", meta: "BTC · momentum", color: THEME_COLORS.signalUp },
  { lat: 51.5, lon: -0.12, title: "Trade executed", meta: "BSC · confirmed", color: THEME_COLORS.brandLeaf },
  { lat: 35.7, lon: 139.7, title: "Take-profit triggered", meta: "+12.4%", color: THEME_COLORS.signalUp },
  { lat: 1.35, lon: 103.8, title: "Deposit confirmed", meta: "BEP-20 · ~12s", color: THEME_COLORS.brandLeaf },
  { lat: -33.9, lon: 151.2, title: "Swap completed", meta: "USDT → BNB", color: THEME_COLORS.brandGlow },
  { lat: 25.2, lon: 55.3, title: "Cross-chain transfer", meta: "BSC ⇄ Solana", color: THEME_COLORS.brandLeaf },
  { lat: -23.5, lon: -46.6, title: "SELL signal", meta: "Risk contained", color: THEME_COLORS.signalDown },
  { lat: 19.4, lon: -99.1, title: "Withdrawal confirmed", meta: "~12s settle", color: THEME_COLORS.brandLeaf },
] as const;

const smoothstep = (t: number) => t * t * (3 - 2 * t);
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Single source of truth for the globe's lifecycle within its own 0-1 `progress`
 *  window — bloom in over the first ~28%, hold, fade out over the last ~22%. Used by
 *  both the outer DOM wrapper (so the Html popups fade with everything else) and the
 *  3D group's own scale/visibility, so neither can drift out of sync with the other. */
function globeEnvelope(progress: number) {
  const bloom = smoothstep(clamp01(progress / 0.28));
  const fadeOut = 1 - smoothstep(clamp01((progress - 0.78) / 0.22));
  return { bloom, opacity: bloom * fadeOut };
}

function latLonToVec3(lat: number, lon: number, r: number, out = new THREE.Vector3()): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return out.set(-r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
}

/** Soft flat circle, not a glow sprite — the reference globe's dots read as matte marks
 *  on a surface, not light sources. */
function useDotTexture() {
  return useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext("2d")!;
    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.82, "rgba(255,255,255,0.9)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 32, 32);
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, []);
}

function LandDots({ radius, color }: { radius: number; color: string }) {
  const texture = useDotTexture();

  const { positions, colors } = useMemo(() => {
    const pos: number[] = [];
    const col: number[] = [];
    const base = new THREE.Color(color);
    const shaded = new THREE.Color();
    for (let i = 0; i < DOT_COUNT; i++) {
      const y = 1 - (i / (DOT_COUNT - 1)) * 2;
      const ring = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = GOLDEN_ANGLE * i;
      const x = Math.cos(theta) * ring;
      const z = Math.sin(theta) * ring;

      const lat = Math.asin(y) * (180 / Math.PI);
      const lon = Math.atan2(z, -x) * (180 / Math.PI) - 180;
      // JS's `%` keeps the sign of the dividend, so a plain `((lon+180)%360)-180` leaves
      // negative inputs like -227° un-wrapped instead of landing on the equivalent 133°
      // — add 360 before the second modulo to force a positive intermediate first.
      const normalizedLon = (((lon + 180) % 360) + 360) % 360 - 180;

      if (!isLand(normalizedLon, lat)) continue;

      pos.push(x * radius, y * radius, z * radius);
      // Per-dot brightness variance, baked into vertex color rather than a custom
      // attribute — PointsMaterial only ever reads position/color/size, so this is the
      // one channel that actually renders. Deterministic (not Math.random()) so it
      // stays pure across re-renders: a classic sine hash, seeded on the dot's index.
      const seeded = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1;
      shaded.copy(base).multiplyScalar(0.55 + seeded * 0.45);
      col.push(shaded.r, shaded.g, shaded.b);
    }
    return { positions: new Float32Array(pos), colors: new Float32Array(col) };
  }, [radius, color]);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return geo;
  }, [positions, colors]);

  const material = useMemo(
    () =>
      new THREE.PointsMaterial({
        size: radius * 0.028,
        map: texture,
        vertexColors: true,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        sizeAttenuation: true,
      }),
    [radius, texture]
  );

  return <points geometry={geometry} material={material} />;
}

/** A very faint oversized backside shell — the cheap trick that reads as atmosphere. */
function AtmosphereGlow({ radius, color }: { radius: number; color: string }) {
  return (
    <mesh scale={1.045}>
      <sphereGeometry args={[radius, 48, 48]} />
      <meshBasicMaterial color={color} transparent opacity={0.05} side={THREE.BackSide} depthWrite={false} />
    </mesh>
  );
}

function MarkerDot({
  position,
  color,
  size,
}: {
  position: THREE.Vector3;
  color: string;
  size: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const pulse = 1 + Math.sin(clock.elapsedTime * 2.4 + position.x) * 0.12;
    ref.current.scale.setScalar(pulse);
  });
  return (
    <mesh ref={ref} position={position}>
      <sphereGeometry args={[size, 12, 12]} />
      <meshBasicMaterial color={color} />
    </mesh>
  );
}

function SignalPopup({
  marker,
  position,
}: {
  marker: (typeof MARKERS)[number];
  position: THREE.Vector3;
}) {
  return (
    <Html position={position} center distanceFactor={9} zIndexRange={[10, 0]} className="pointer-events-none">
      <div
        className="flex -translate-y-8 items-center gap-2 whitespace-nowrap rounded-xl border border-white/15 bg-surface-panel-carousel/90 px-3 py-2 shadow-[0_12px_30px_rgba(var(--black-rgb),0.5)] backdrop-blur-md"
        style={{ animation: "volsa-globe-pop 0.4s ease-out" }}
      >
        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: marker.color }} />
        <span className="font-sans">
          <span className="block text-[11px] font-semibold text-white">{marker.title}</span>
          <span className="block text-[9px] text-white/50">{marker.meta}</span>
        </span>
      </div>
    </Html>
  );
}

function Globe({ progress, radius }: { progress: number; radius: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const [activeMarker, setActiveMarker] = useState(0);
  // Only mouse/trackpad gets drag-to-rotate: a touch drag on this globe is also the
  // gesture for scrolling the pinned page past it, and OrbitControls' touch handler
  // calls preventDefault() on that drag — capturing it here would trap a phone user's
  // scroll instead of letting the page continue. Touch still gets the idle spin below.
  const fineCursor = useMemo(
    () => typeof window !== "undefined" && window.matchMedia("(pointer: fine)").matches,
    []
  );

  useEffect(() => {
    // Cycles which marker's card is showing — same cadence as the cylinder mock
    // screens' highlight cycle, so the two feel like one motion language.
    const id = setInterval(() => setActiveMarker((i) => (i + 1) % MARKERS.length), 2400);
    return () => clearInterval(id);
  }, []);

  const { bloom, opacity } = globeEnvelope(progress);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    groupRef.current.scale.setScalar(0.55 + bloom * 0.45);
    // OrbitControls' own autoRotate handles idle spin by orbiting the camera once it's
    // mounted (fine-pointer devices); without it, this is the only motion the globe has.
    if (!fineCursor) {
      groupRef.current.rotation.y += delta * 0.12;
    }
  });

  const markerPositions = useMemo(
    () => MARKERS.map((m) => latLonToVec3(m.lat, m.lon, radius * 1.01)),
    [radius]
  );

  return (
    <>
      <group ref={groupRef} visible={opacity > 0.01}>
        <LandDots radius={radius} color={THEME_COLORS.brandLeaf} />
        <AtmosphereGlow radius={radius} color={THEME_COLORS.brandLeaf} />
        {MARKERS.map((m, i) => (
          <MarkerDot key={m.title} position={markerPositions[i]} color={m.color} size={radius * 0.02} />
        ))}
        <SignalPopup marker={MARKERS[activeMarker]} position={markerPositions[activeMarker]} />
      </group>
      {fineCursor && (
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          enableDamping
          dampingFactor={0.08}
          rotateSpeed={0.5}
          autoRotate
          autoRotateSpeed={0.7}
        />
      )}
    </>
  );
}

function Scene({ progress }: { progress: number }) {
  const { viewport } = useThree();
  const radius = Math.min(viewport.width, viewport.height) * 0.32;

  return (
    <>
      <ambientLight intensity={1.4} />
      <Globe progress={progress} radius={radius} />
    </>
  );
}

export function WorldSignalGlobe({ progress }: WorldSignalGlobeProps) {
  const { opacity } = globeEnvelope(progress);

  return (
    <div
      className="pointer-events-auto absolute inset-0"
      style={{ opacity }}
      aria-hidden="true"
    >
      <style>{`@keyframes volsa-globe-pop { from { opacity: 0; transform: translateY(-24px) scale(0.92); } to { opacity: 1; transform: translateY(-32px) scale(1); } }`}</style>
      <Canvas
        camera={{ position: [0, 0, 9], fov: 42 }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      >
        <Scene progress={progress} />
      </Canvas>
    </div>
  );
}

export default WorldSignalGlobe;
