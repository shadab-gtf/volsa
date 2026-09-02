"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { THEME_COLORS } from "@/constants/theme-colors";
import { isLand } from "./worldLandGrid";

/**
 * The dotted-world-map "signal globe" that opens the particle finale, before it hands
 * off into the existing sand/headline sequence (see CylinderExplosionSphere's own
 * `PARTICLE_PHASES.sphereIn`, timed to start once this has faded out — the dune
 * explosion itself is untouched).
 *
 * Real coastlines (via `worldLandGrid`, a precomputed 2KB bitmask), one brand hue, and
 * markers cycling through the actual alert/signal types the product spec defines
 * (§7 AI Signals, §30 Alerts & Notifications) — not generic placeholder transactions.
 *
 * Deliberately raw three.js rather than react-three-fiber, matching the other WebGL
 * components here. r3f 9.7.0 (the current release) constructs a `THREE.Clock`, which
 * three r183+ warns is deprecated on every mount, and it plus drei added ~260KB of JS
 * for one short-lived scene. Everything drei was doing for us — orbit drag, the HTML
 * marker labels — is a few lines each below, against a render loop we can actually
 * park when the globe isn't on screen.
 */

interface WorldSignalGlobeProps {
  /** 0 -> 1 across this component's own on-screen window: bloom in, idle-rotate while
   *  markers cycle, fade out. The caller owns the outer scroll mapping. */
  progress: number;
}

/** Dots sampled over the sphere; only those over land are kept (~29% of them). */
const SAMPLE_COUNT = 5200;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const MARKER_CYCLE_MS = 2400;

const MARKERS = [
  { lat: 40.7, lon: -74.0, title: "BUY signal", meta: "BTC · momentum", color: THEME_COLORS.signalUp },
  { lat: 51.5, lon: -0.12, title: "Trade executed", meta: "BSC · confirmed", color: THEME_COLORS.brandLeaf },
  { lat: 35.7, lon: 139.7, title: "Take-profit triggered", meta: "+12.4%", color: THEME_COLORS.signalUp },
  { lat: 1.35, lon: 103.8, title: "Deposit confirmed", meta: "BEP-20 · ~12s", color: THEME_COLORS.brandLeaf },
  { lat: -33.9, lon: 151.2, title: "Swap completed", meta: "USDT → BNB", color: THEME_COLORS.brandGlow },
  { lat: 25.2, lon: 55.3, title: "Cross-chain transfer", meta: "BSC ⇄ Solana", color: THEME_COLORS.brandLeaf },
  { lat: -23.5, lon: -46.6, title: "SELL signal", meta: "Risk contained", color: THEME_COLORS.signalDown },
  { lat: 19.4, lon: -99.1, title: "Withdrawal confirmed", meta: "~12s settle", color: THEME_COLORS.brandLeaf },
];

const smoothstep = (t: number) => t * t * (3 - 2 * t);
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Bloom in over the first ~28% of the window, hold, fade out over the last ~22%. */
function globeEnvelope(progress: number) {
  const bloom = smoothstep(clamp01(progress / 0.28));
  const fadeOut = 1 - smoothstep(clamp01((progress - 0.78) / 0.22));
  return { bloom, opacity: bloom * fadeOut };
}

const RAD = Math.PI / 180;

function latLonToVec3(lat: number, lon: number, r: number, out = new THREE.Vector3()) {
  const phi = (90 - lat) * RAD;
  const theta = (lon + 180) * RAD;
  return out.set(-r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
}

const FOV = 42;
const CAM_Z = 9;

export function WorldSignalGlobe({ progress }: WorldSignalGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(progress);
  const activeMarkerRef = useRef(0);
  const [activeMarker, setActiveMarker] = useState(0);

  // Mirrored into refs (not read during render) so the rAF loop can sample the latest
  // values without the effect that owns the scene having to re-run — same pattern as
  // CylinderExplosionSphere.
  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  useEffect(() => {
    activeMarkerRef.current = activeMarker;
  }, [activeMarker]);

  const { opacity } = globeEnvelope(progress);

  useEffect(() => {
    const id = setInterval(
      () => setActiveMarker((i) => (i + 1) % MARKERS.length),
      MARKER_CYCLE_MS
    );
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;
    if (!width || !height) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(FOV, width / height, 0.1, 100);
    camera.position.set(0, 0, CAM_Z);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    // Radius fitted to the shorter visible axis so the globe holds its framing in
    // portrait as well as landscape.
    const visH = 2 * Math.tan((FOV * RAD) / 2) * CAM_Z;
    const radius = Math.min(visH * (width / height), visH) * 0.32;

    const group = new THREE.Group();
    scene.add(group);

    // ── Dot sprite: a soft flat circle, not a glow. The reference dot globes read as
    //    matte marks on a surface rather than light sources. ──
    const sprite = document.createElement("canvas");
    sprite.width = 32;
    sprite.height = 32;
    const sctx = sprite.getContext("2d")!;
    const grad = sctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.82, "rgba(255,255,255,0.9)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    sctx.fillStyle = grad;
    sctx.fillRect(0, 0, 32, 32);
    const dotTexture = new THREE.CanvasTexture(sprite);

    // ── Land dots ──
    const positions: number[] = [];
    const colors: number[] = [];
    const base = new THREE.Color(THEME_COLORS.brandLeaf);
    const shaded = new THREE.Color();

    for (let i = 0; i < SAMPLE_COUNT; i++) {
      const y = 1 - (i / (SAMPLE_COUNT - 1)) * 2;
      const ring = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = GOLDEN_ANGLE * i;
      const x = Math.cos(theta) * ring;
      const z = Math.sin(theta) * ring;

      const lat = Math.asin(y) / RAD;
      // JS's `%` keeps the dividend's sign, so the extra +360 is what actually wraps
      // negative longitudes (-227° -> 133°) instead of leaving them out of range.
      const lon = (((Math.atan2(z, -x) / RAD - 180 + 180) % 360) + 360) % 360 - 180;
      if (!isLand(lon, lat)) continue;

      positions.push(x * radius, y * radius, z * radius);
      // Per-dot brightness variance, deterministic so it never shifts between mounts.
      const seeded = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1;
      shaded.copy(base).multiplyScalar(0.55 + seeded * 0.45);
      colors.push(shaded.r, shaded.g, shaded.b);
    }

    const dotGeometry = new THREE.BufferGeometry();
    dotGeometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    dotGeometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));

    const dotMaterial = new THREE.PointsMaterial({
      size: radius * 0.028,
      map: dotTexture,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      sizeAttenuation: true,
    });
    group.add(new THREE.Points(dotGeometry, dotMaterial));

    // ── Atmosphere: one faint oversized backside shell. ──
    const glowGeometry = new THREE.SphereGeometry(radius * 1.045, 32, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(THEME_COLORS.brandLeaf),
      transparent: true,
      opacity: 0.05,
      side: THREE.BackSide,
      depthWrite: false,
    });
    group.add(new THREE.Mesh(glowGeometry, glowMaterial));

    // ── Markers: one shared geometry/material set, positioned per marker. ──
    const markerGeometry = new THREE.SphereGeometry(radius * 0.02, 10, 10);
    const markerMaterials: THREE.MeshBasicMaterial[] = [];
    const markerMeshes: THREE.Mesh[] = [];
    const markerAnchors: THREE.Vector3[] = [];

    MARKERS.forEach((m) => {
      const pos = latLonToVec3(m.lat, m.lon, radius * 1.01);
      const material = new THREE.MeshBasicMaterial({ color: new THREE.Color(m.color), transparent: true });
      const mesh = new THREE.Mesh(markerGeometry, material);
      mesh.position.copy(pos);
      group.add(mesh);
      markerMaterials.push(material);
      markerMeshes.push(mesh);
      markerAnchors.push(pos);
    });

    // ── Drag to rotate. A handful of pointer handlers instead of OrbitControls: this
    //    only ever needs yaw/pitch on one group, and OrbitControls' touch handling
    //    calls preventDefault(), which would trap the page scroll this pinned section
    //    depends on. Pointer drag is left to mouse/trackpad for the same reason. ──
    const fineCursor = window.matchMedia("(pointer: fine)").matches;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let spinY = 0;
    let tiltX = 0;
    let idleSpin = true;

    const onPointerDown = (e: PointerEvent) => {
      if (!fineCursor) return;
      dragging = true;
      idleSpin = false;
      lastX = e.clientX;
      lastY = e.clientY;
      renderer.domElement.setPointerCapture(e.pointerId);
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return;
      spinY += (e.clientX - lastX) * 0.005;
      tiltX = Math.max(-0.6, Math.min(0.6, tiltX + (e.clientY - lastY) * 0.004));
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const endDrag = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      idleSpin = true;
      if (renderer.domElement.hasPointerCapture(e.pointerId)) {
        renderer.domElement.releasePointerCapture(e.pointerId);
      }
    };

    if (fineCursor) {
      renderer.domElement.addEventListener("pointerdown", onPointerDown);
      renderer.domElement.addEventListener("pointermove", onPointerMove);
      renderer.domElement.addEventListener("pointerup", endDrag);
      renderer.domElement.addEventListener("pointercancel", endDrag);
    }

    // ── Render loop. Parked whenever the globe is effectively invisible, so it costs
    //    nothing for the long stretch of scroll where it isn't the thing on screen. ──
    const timer = new THREE.Timer();
    let frame = 0;
    let disposed = false;
    const projected = new THREE.Vector3();

    const animate = () => {
      frame = requestAnimationFrame(animate);
      timer.update();
      const dt = Math.min(0.05, timer.getDelta());

      const { bloom, opacity: envOpacity } = globeEnvelope(progressRef.current);
      if (envOpacity <= 0.005) {
        renderer.clear();
        return;
      }

      if (idleSpin) spinY += dt * 0.12;
      group.rotation.set(tiltX, spinY, 0);
      group.scale.setScalar(0.55 + bloom * 0.45);

      dotMaterial.opacity = 0.85 * envOpacity;
      glowMaterial.opacity = 0.05 * envOpacity;

      const pulse = 1 + Math.sin(timer.getElapsed() * 2.4) * 0.12;
      for (let i = 0; i < markerMeshes.length; i++) {
        markerMeshes[i].scale.setScalar(pulse);
        markerMaterials[i].opacity = envOpacity;
      }

      renderer.render(scene, camera);

      // Park the active marker's label on top of its projected screen position. Done
      // straight on the DOM node rather than through React so the marker card tracking
      // a spinning globe never costs a re-render.
      const label = labelRef.current;
      if (label) {
        const anchor = markerAnchors[activeMarkerRef.current];
        if (anchor) {
          projected.copy(anchor).applyMatrix4(group.matrixWorld).project(camera);
          const front = projected.z < 1;
          label.style.transform = `translate(-50%, -140%) translate(${((projected.x + 1) / 2) * width}px, ${((1 - projected.y) / 2) * height}px)`;
          label.style.opacity = front ? String(envOpacity) : "0";
        }
      }
    };

    frame = requestAnimationFrame(animate);

    const handleResize = () => {
      if (disposed || !containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      if (!w || !h) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", handleResize);
      if (fineCursor) {
        renderer.domElement.removeEventListener("pointerdown", onPointerDown);
        renderer.domElement.removeEventListener("pointermove", onPointerMove);
        renderer.domElement.removeEventListener("pointerup", endDrag);
        renderer.domElement.removeEventListener("pointercancel", endDrag);
      }
      dotGeometry.dispose();
      dotMaterial.dispose();
      glowGeometry.dispose();
      glowMaterial.dispose();
      markerGeometry.dispose();
      markerMaterials.forEach((m) => m.dispose());
      dotTexture.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, []);

  const marker = MARKERS[activeMarker];

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden [&>canvas]:pointer-events-auto"
      style={{ opacity }}
      aria-hidden="true"
    >
      <div
        ref={labelRef}
        className="pointer-events-none absolute left-0 top-0 flex items-center gap-2 whitespace-nowrap rounded-xl border border-white/15 bg-surface-panel-carousel/90 px-3 py-2 shadow-[0_12px_30px_rgba(var(--black-rgb),0.5)] will-change-transform"
        style={{ opacity: 0 }}
      >
        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: marker.color }} />
        <span className="font-sans">
          <span className="block text-[11px] font-semibold text-white">{marker.title}</span>
          <span className="block text-[9px] text-white/50">{marker.meta}</span>
        </span>
      </div>
    </div>
  );
}

export default WorldSignalGlobe;
