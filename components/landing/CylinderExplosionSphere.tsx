"use client";

import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { THEME_COLORS } from "@/constants/theme-colors";
import { TEXT_BEATS } from "./cylinderExplosion.data";
import { isLand } from "./worldLandGrid";

interface CylinderExplosionSphereProps {
  /** 0 -> 1 slice of the pinned Features scroll that belongs to the particle stage. */
  zoomProgress: number;
  activeColor?: string;
}

/** Brand palette — mirrors the tokens declared in app/globals.css. One hue only:
 *  every grain is a lightness step between `dark` and `leaf`, never a different hue. */
const BRAND = {
  leaf: THEME_COLORS.brandLeaf,
  dark: THEME_COLORS.brandDark,
} as const;

// ─── Scene constants ────────────────────────────────────────────────────────────
/**
 * Full-fat grain count. Dial this one number to trade density against frame budget.
 *
 * Every grain's position is integrated on the CPU each frame, so this number is the
 * single biggest lever on scroll smoothness in the whole section — it was 100k, which
 * measured far past the frame budget once the rest of the page was animating alongside
 * it. At 55k the headlines still sample densely enough to read as solid letterforms.
 */
const GRAINS_HIGH = 55000;
/** Fallback for phones and low-core machines — same look, a third of the CPU cost. */
const GRAINS_LOW = 18000;
/** Grain diameter in world units. Sized just under the sphere's own grain spacing. */
const GRAIN_SIZE = 0.3;
/** Share of the budget the headlines consume; the remainder becomes ambient dust. */
const TEXT_SHARE = 0.86;

/**
 * Sphere radius as a share of the shorter visible axis. Fixed world radii break on
 * portrait, where the visible width collapses to well under the height.
 */
const SPHERE_FILL = 0.37;
/** Surface ripple depth, as a share of the radius, so the look holds at any size. */
const SPHERE_SKIN = 0.05;
const DUNE_BASE = -30;
const CAM_Z = 132;
const FOV = 50;
const RAD = Math.PI / 180;

/** Below this the stage is doing nothing visible — see the render-loop bail below. */
const ACTIVE_THRESHOLD = 0.001;

/**
 * Markers cycled while the globe holds — content pulled straight from the product
 * spec's alert/signal vocabulary (§7 AI Signals, §30 Alerts & Notifications), placed at
 * plausible city locations the way a real "live activity" globe scatters its markers.
 */
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
const MARKER_CYCLE_MS = 2400;

function latLonToVec3(lat: number, lon: number, r: number, out = new THREE.Vector3()) {
  const phi = (90 - lat) * RAD;
  const theta = (lon + 180) * RAD;
  return out.set(-r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
}

/**
 * Timeline for the particle stage, expressed in `particleProgress` (0 -> 1) — the
 * tail slice of the pinned section's scroll. Single source of truth: HeroSection
 * imports this so nothing can drift out of sync with the WebGL beats.
 *
 * Beat sheet:
 *   0.00 - 0.05  the globe blooms in — same particle buffer as the rest of this
 *                component, just colored by real coastlines instead of a flat lambert
 *                ball (see the land/ocean palette below), with drag-to-rotate and
 *                marker popups. This is the whole point of the merge: there is no
 *                separate globe scene to crossfade from, so nothing to hand off
 *                awkwardly — the thing that explodes *is* the globe.
 *   0.05 - 0.14  holds: idle-rotate, markers cycle, ready for the blast
 *   0.14 - 0.30  blast outward, gravity rakes it into a desert dune field (markers and
 *                the popup fade out over the first quarter of this)
 *   0.30 - 0.33  dune vista holds (camera lifts to a standing-in-the-desert view)
 *   0.33 - 0.93  four text beats — see TEXT_BEATS
 *   0.93 - 1.00  the closing headline simply holds
 *
 * There is deliberately no fade-to-black exit. A pinned full-height section still has
 * to scroll its own screen away after the pin releases, so ending on emptiness buys a
 * screen and a half of dead black before the next section arrives. Holding the last
 * headline instead means it physically scrolls off as the next section pushes in.
 */
export const PARTICLE_PHASES = {
  globeIn: { start: 0.0, end: 0.05 },
  explodeToDunes: { start: 0.14, end: 0.3 },
} as const;

/** Normalized 0 -> 1 position of `p` inside a phase window, clamped at both ends. */
const span = (p: number, phase: { start: number; end: number }) =>
  Math.min(1, Math.max(0, (p - phase.start) / (phase.end - phase.start)));

const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Frame-rate independent smoothing factor for a per-frame lerp of strength `k` at 60fps. */
const smoothK = (k: number, dt: number) => 1 - Math.pow(1 - k, dt * 60);

/**
 * Height of the dune field at a point on the sand plane.
 *
 * Four sine octaves at unrelated frequencies give long primary ridges plus finer
 * ripples without ever visibly repeating on screen. The closing `pow` re-profiles the
 * result so crests are sharp and troughs broad and soft — that asymmetry is what reads
 * as wind-carved sand rather than a wobbly sheet.
 */
function duneHeight(x: number, z: number): number {
  let h = Math.sin(x * 0.0225 - z * 0.041 + 2.3) * 12;
  h += Math.sin(x * 0.048 + z * 0.027) * 8.5;
  h += Math.sin(x * 0.106 + z * 0.068 + 5.1) * 3.4;
  h += Math.sin(x * 0.0061 + 0.9) * 6.5;

  const n = Math.max(-1, Math.min(1, h / 30.4));
  return Math.sign(n) * Math.pow(Math.abs(n), 0.7) * 22;
}

/** Resolves the site's heading face into something `ctx.font` accepts. */
function resolveHeadingFont(): string {
  if (typeof window === "undefined") return "Georgia, serif";
  const root = getComputedStyle(document.documentElement);
  const stack =
    root.getPropertyValue("--font-heading").trim() ||
    root.getPropertyValue("--font-morona").trim();
  return stack || "Georgia, serif";
}

/** A sampled headline: glyph grains occupy [0, count), ambient dust fills the rest. */
type SampledText = { positions: Float32Array; count: number };

const LINE_RATIO = 1.22; // line height as a multiple of font size
const RENDER_PX = 240; // canvas font size — sampling resolution, not final scale

/**
 * Samples real glyph outlines into evenly spaced particle positions.
 *
 * Text is drawn to an offscreen canvas in the brand face and read back, so any string
 * renders as true letterforms. Grains are then picked on a *jittered grid* rather than
 * by random rejection sampling — random picks clump and leave holes, which is what
 * makes particle type dissolve into a fuzzy blob. A grid guarantees even coverage.
 *
 * Grid spacing is solved from the actual ink area so the headline always consumes
 * TEXT_SHARE of the budget: raise the grain count and the letters get denser rather
 * than the leftovers piling up in the dust field.
 */
function sampleText(
  lines: string[],
  total: number,
  maxWorldWidth: number,
  maxWorldHeight: number,
  fontStack: string
): SampledText {
  const positions = new Float32Array(total * 3);
  if (typeof document === "undefined") return { positions, count: 0 };

  const measure = document.createElement("canvas").getContext("2d");
  if (!measure) return { positions, count: 0 };

  measure.font = `600 ${RENDER_PX}px ${fontStack}`;
  const widestPx = Math.max(1, ...lines.map((l) => measure.measureText(l).width));

  // Fit to whichever axis binds first, in world units.
  const worldSize = Math.min(
    maxWorldWidth / (widestPx / RENDER_PX),
    maxWorldHeight / (LINE_RATIO * lines.length)
  );
  const scale = worldSize / RENDER_PX;

  const CANVAS_W = Math.ceil(widestPx * 1.08);
  const CANVAS_H = Math.ceil(RENDER_PX * LINE_RATIO * lines.length);

  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return { positions, count: 0 };

  ctx.fillStyle = THEME_COLORS.black;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.fillStyle = THEME_COLORS.white;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `600 ${RENDER_PX}px ${fontStack}`;
  lines.forEach((line, i) =>
    ctx.fillText(line, CANVAS_W / 2, RENDER_PX * LINE_RATIO * (i + 0.5))
  );

  const data = ctx.getImageData(0, 0, CANVAS_W, CANVAS_H).data;
  const isInk = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < CANVAS_W && y < CANVAS_H && data[(y * CANVAS_W + x) * 4] > 110;

  // Measure the ink so the grid step can be solved for, rather than guessed at.
  let inkPx = 0;
  for (let i = 0; i < data.length; i += 4) if (data[i] > 110) inkPx++;
  if (!inkPx) return { positions, count: 0 };

  const budget = Math.floor(total * TEXT_SHARE);
  // step^2 grains-worth of ink per grain => step = sqrt(ink / budget).
  const step = Math.max(1.15, Math.sqrt(inkPx / budget));

  const pts: number[] = [];
  for (let gy = step * 0.5; gy < CANVAS_H && pts.length / 2 < budget; gy += step) {
    for (let gx = step * 0.5; gx < CANVAS_W && pts.length / 2 < budget; gx += step) {
      const jx = gx + (Math.random() - 0.5) * step * 0.55;
      const jy = gy + (Math.random() - 0.5) * step * 0.55;
      // Fall back to the cell centre so thin strokes are never skipped entirely.
      if (isInk(Math.round(jx), Math.round(jy))) pts.push(jx, jy);
      else if (isInk(Math.round(gx), Math.round(gy))) pts.push(gx, gy);
    }
  }

  const count = Math.min(pts.length / 2, budget);
  const halfW = CANVAS_W / 2;
  const halfH = CANVAS_H / 2;

  for (let i = 0; i < count; i++) {
    positions[i * 3] = (pts[i * 2] - halfW) * scale;
    positions[i * 3 + 1] = (halfH - pts[i * 2 + 1]) * scale + 2;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 1.2;
  }

  // Ambient dust: parked behind the text plane so it adds depth, never clutter.
  for (let i = count; i < total; i++) {
    positions[i * 3] = (Math.random() - 0.5) * maxWorldWidth * 2.8;
    positions[i * 3 + 1] = (Math.random() - 0.5) * maxWorldHeight * 2.6;
    positions[i * 3 + 2] = -170 + Math.random() * 140;
  }

  return { positions, count };
}

/**
 * GPU-accelerated WebGL particle stage.
 *
 * The same particle buffer plays three roles in sequence: a dotted world-map globe
 * (real coastlines, drag-to-rotate, cycling signal markers), which blows apart into a
 * wind-carved desert dune field, which lifts into "IN YOUR CONTROL" and rebuilds
 * itself headline to headline before warping past the camera. Every timing lives in
 * PARTICLE_PHASES / TEXT_BEATS; the type is re-fitted to the viewport on every resize.
 */
export function CylinderExplosionSphere({
  zoomProgress,
  activeColor = BRAND.leaf,
}: CylinderExplosionSphereProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);
  const activeMarkerRef = useRef(0);
  const [activeMarker, setActiveMarker] = useState(0);

  useEffect(() => {
    progressRef.current = zoomProgress;
  }, [zoomProgress]);

  useEffect(() => {
    activeMarkerRef.current = activeMarker;
  }, [activeMarker]);

  useEffect(() => {
    const id = setInterval(() => setActiveMarker((i) => (i + 1) % MARKERS.length), MARKER_CYCLE_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Six figures of grains is comfortable on a desktop GPU but the per-frame maths is
    // CPU-side, so step down where cores are scarce or we are on a handset.
    const coarse = window.matchMedia?.("(pointer: coarse)").matches ?? false;
    const cores = navigator.hardwareConcurrency ?? 4;
    const COUNT = coarse || cores <= 4 ? GRAINS_LOW : GRAINS_HIGH;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(FOV, width / height, 0.1, 1200);
    camera.position.set(0, 0, CAM_Z);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    // ─── Grain sprite: hard bright core, short halo. A wide soft falloff is what
    //     smears neighbouring grains into a single mass, so keep the tail tight. ───
    const sprite = document.createElement("canvas");
    sprite.width = 64;
    sprite.height = 64;
    const sctx = sprite.getContext("2d")!;
    const grad = sctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, `rgba(${THEME_COLORS.whiteRgb},1)`);
    grad.addColorStop(0.45, `rgba(${THEME_COLORS.whiteRgb},1)`);
    grad.addColorStop(0.66, `rgba(${THEME_COLORS.whiteRgb},0.5)`);
    grad.addColorStop(0.85, `rgba(${THEME_COLORS.whiteRgb},0.1)`);
    grad.addColorStop(1, `rgba(${THEME_COLORS.whiteRgb},0)`);
    sctx.fillStyle = grad;
    sctx.fillRect(0, 0, 64, 64);
    const particleTexture = new THREE.CanvasTexture(sprite);

    // ─── Buffers ───
    const positions = new Float32Array(COUNT * 3);
    const colors = new Float32Array(COUNT * 3);
    const normals = new Float32Array(COUNT * 3); // unit dir, doubles as blast vector
    const dunePos = new Float32Array(COUNT * 3);
    const velocities = new Float32Array(COUNT);

    // Precomputed trig. At this grain count a Math.sin() per particle per frame is the
    // single biggest cost in the loop, so every oscillator is expanded with the
    // angle-addition identity and driven by a handful of per-frame globals instead.
    const sinP = new Float32Array(COUNT); // sin/cos of the particle's own phase
    const cosP = new Float32Array(COUNT);
    const sinK1 = new Float32Array(COUNT); // two travelling waves over the sphere skin
    const cosK1 = new Float32Array(COUNT);
    const sinK2 = new Float32Array(COUNT);
    const cosK2 = new Float32Array(COUNT);

    const colSphere = new Float32Array(COUNT * 3);
    const colSand = new Float32Array(COUNT * 3);
    const colText = new Float32Array(COUNT * 3);
    const colDust = new Float32Array(COUNT * 3);

    const cLeaf = new THREE.Color(activeColor);
    const cDark = new THREE.Color(BRAND.dark);
    const tmp = new THREE.Color();

    // Fake key light. Baking a lambert term per particle is what makes a point cloud
    // read as a solid 3D ball rather than a flat disc.
    const LX = -0.42;
    const LY = 0.72;
    const LZ = 0.55;
    const LLEN = Math.sqrt(LX * LX + LY * LY + LZ * LZ);
    const GOLDEN = Math.PI * (3 - Math.sqrt(5));

    for (let i = 0; i < COUNT; i++) {
      const idx = i * 3;

      // ── Fibonacci sphere: even coverage, no pole pile-up, no lat/lon moiré ──
      const ny = 1 - (i / (COUNT - 1)) * 2;
      const ring = Math.sqrt(Math.max(0, 1 - ny * ny));
      const theta = GOLDEN * i;
      const nx = Math.cos(theta) * ring;
      const nz = Math.sin(theta) * ring;

      normals[idx] = nx;
      normals[idx + 1] = ny;
      normals[idx + 2] = nz;

      // Seeded at unit scale; the first frame scales these by the fitted radius.
      positions[idx] = nx;
      positions[idx + 1] = ny;
      positions[idx + 2] = nz;

      velocities[i] = 0.75 + Math.random() * 1.35;

      const ph = Math.random() * Math.PI * 2;
      sinP[i] = Math.sin(ph);
      cosP[i] = Math.cos(ph);

      const k1 = nx * 3.4 + ny * 3.1 + nz * 3.7;
      const k2 = nx * 2.1 - ny * 4.2 + nz * 1.7;
      sinK1[i] = Math.sin(k1);
      cosK1[i] = Math.cos(k1);
      sinK2[i] = Math.sin(k2);
      cosK2[i] = Math.cos(k2);

      // ── Dune field: scatter across the sand plane, drop onto the height field ──
      const dx = (Math.random() - 0.5) * 210;
      const dz = -52 + Math.random() * 100;
      const h = duneHeight(dx, dz);
      const depth = Math.pow(Math.random(), 1.8) * 5; // hug the surface, not a solid slab

      dunePos[idx] = dx;
      dunePos[idx + 1] = DUNE_BASE + h - depth;
      dunePos[idx + 2] = dz;

      // ── Globe palette: land dots lit brand-leaf (lambert-shaded, same as the old
      //    flat sphere), ocean dots pushed toward black so they read as invisible
      //    against the backdrop. Colour-masked, not filtered out — every particle,
      //    ocean included, still explodes into the dune field exactly as before, so the
      //    dune field is exactly as dense as it always was. ──
      const lat = Math.asin(ny) / RAD;
      const lonRaw = Math.atan2(nz, -nx) / RAD - 180;
      // JS's `%` keeps the dividend's sign, so the extra +360 is what actually wraps
      // negative longitudes (-227° -> 133°) instead of leaving them out of range.
      const lon = (((lonRaw + 180) % 360) + 360) % 360 - 180;
      const lambert = Math.max(0, (nx * LX + ny * LY + nz * LZ) / LLEN);

      if (isLand(lon, lat)) {
        const shade = 0.4 + Math.pow(lambert, 0.75) * 0.6;
        tmp.copy(cDark).lerp(cLeaf, clamp01(shade));
      } else {
        tmp.copy(cDark).multiplyScalar(0.05 + lambert * 0.05);
      }
      colSphere[idx] = tmp.r;
      colSphere[idx + 1] = tmp.g;
      colSphere[idx + 2] = tmp.b;

      // ── Sand palette: same hue, lit by slope so crests glow and lee faces shadow ──
      const slope = duneHeight(dx + 4, dz) - duneHeight(dx - 4, dz);
      const lit = clamp01(0.52 - slope * 0.055);
      const crest = clamp01((h + 22) / 44);
      const sand = clamp01(crest * 0.55 + lit * 0.6 - depth * 0.05);
      tmp.copy(cDark).lerp(cLeaf, clamp01(sand));
      colSand[idx] = tmp.r;
      colSand[idx + 1] = tmp.g;
      colSand[idx + 2] = tmp.b;

      // ── Text palette: bright brand-leaf. Normal blending means these values are
      //    what you actually see, so they are kept high in value for legibility —
      //    a little per-grain brightness jitter, never a hue shift. ──
      tmp.copy(cLeaf).multiplyScalar(0.88 + Math.random() * 0.22);
      colText[idx] = tmp.r;
      colText[idx + 1] = tmp.g;
      colText[idx + 2] = tmp.b;

      // ── Dust palette: same hue, well down in value so it never competes ──
      tmp.copy(cDark).lerp(cLeaf, 0.4);
      colDust[idx] = tmp.r * 0.5;
      colDust[idx + 1] = tmp.g * 0.5;
      colDust[idx + 2] = tmp.b * 0.5;

      colors[idx] = colSphere[idx];
      colors[idx + 1] = colSphere[idx + 1];
      colors[idx + 2] = colSphere[idx + 2];
    }

    // ─── Viewport-fitted geometry: sphere radius and text targets ───
    let sphereR = 31;
    let fit = { maxW: 100, maxH: 70, narrow: false, font: "Georgia, serif" };
    let beatCache: (SampledText | null)[] = [];
    let idleHandle: number | null = null;

    // ─── Globe group: the particle sphere plus its marker meshes, rotated together so
    //     drag and idle-spin apply to both without tracking two transforms. ───
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    const markerGeometry = new THREE.SphereGeometry(1, 10, 10);
    const markerMaterials: THREE.MeshBasicMaterial[] = [];
    const markerMeshes: THREE.Mesh[] = [];
    const markerAnchors: THREE.Vector3[] = MARKERS.map(() => new THREE.Vector3());

    MARKERS.forEach((m) => {
      const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color(m.color),
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(markerGeometry, material);
      globeGroup.add(mesh);
      markerMaterials.push(material);
      markerMeshes.push(mesh);
    });

    /** Re-anchors marker meshes to the current `sphereR` — called once up front and
     *  again whenever `fitToViewport` re-solves the radius on resize. */
    const repositionMarkers = () => {
      MARKERS.forEach((m, i) => {
        latLonToVec3(m.lat, m.lon, sphereR * 1.01, markerAnchors[i]);
        markerMeshes[i].position.copy(markerAnchors[i]);
        markerMeshes[i].scale.setScalar(sphereR * 0.018);
      });
    };

    /** Samples one headline, memoised. Cheap after the first call. */
    const ensureBeat = (i: number): SampledText => {
      const hit = beatCache[i];
      if (hit) return hit;
      const b = TEXT_BEATS[i];
      const built = sampleText(
        fit.narrow && b.linesNarrow ? b.linesNarrow : b.lines,
        COUNT,
        fit.maxW,
        fit.maxH,
        fit.font
      );
      beatCache[i] = built;
      return built;
    };

    const fitToViewport = () => {
      const visH = 2 * Math.tan((FOV * Math.PI) / 360) * CAM_Z;
      const visW = visH * camera.aspect;
      const narrow = camera.aspect < 1.15;

      sphereR = Math.min(visW, visH) * SPHERE_FILL;
      fit = {
        narrow,
        maxW: visW * (narrow ? 0.92 : 0.84),
        maxH: visH * 0.6,
        font: resolveHeadingFont(),
      };

      repositionMarkers();

      beatCache = [];
      // Only the first headline is needed for a long while; let the browser fold the
      // rest into idle time so the sphere is never waiting on them.
      if (idleHandle !== null) cancelIdleCallback?.(idleHandle);
      idleHandle =
        typeof requestIdleCallback === "function"
          ? requestIdleCallback(() => {
              idleHandle = null;
              for (let i = 0; i < TEXT_BEATS.length && !disposed; i++) ensureBeat(i);
            })
          : (setTimeout(() => {
              idleHandle = null;
              for (let i = 0; i < TEXT_BEATS.length && !disposed; i++) ensureBeat(i);
            }, 400) as unknown as number);
    };

    let disposed = false;
    fitToViewport();

    if (typeof document !== "undefined" && document.fonts?.ready) {
      // Re-fit once webfonts settle, otherwise the first pass measures the fallback.
      document.fonts.ready.then(() => !disposed && fitToViewport()).catch(() => {});
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: GRAIN_SIZE,
      vertexColors: true,
      map: particleTexture,
      transparent: true,
      // Normal, not additive: additive stacking is what bleached overlapping brand
      // green into flat white. This keeps every grain its own colour.
      blending: THREE.NormalBlending,
      opacity: 0,
      depthWrite: false,
      sizeAttenuation: true,
    });

    const points = new THREE.Points(geometry, material);
    globeGroup.add(points);

    // ─── Drag to rotate. A handful of pointer handlers rather than a controls library:
    //     this only ever needs yaw/pitch on one group, and a library's touch handling
    //     tends to call preventDefault(), which would trap the page scroll this pinned
    //     section depends on. Pointer drag is left to mouse/trackpad for that reason —
    //     touch keeps the idle auto-spin without capturing the gesture at all. ───
    const fineCursor = window.matchMedia("(pointer: fine)").matches;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let dragYOffset = 0;
    let dragXOffset = 0;

    const onPointerDown = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      renderer.domElement.setPointerCapture(e.pointerId);
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return;
      dragYOffset += (e.clientX - lastX) * 0.005;
      dragXOffset = Math.max(-0.6, Math.min(0.6, dragXOffset + (e.clientY - lastY) * 0.004));
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const endDrag = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      if (renderer.domElement.hasPointerCapture(e.pointerId)) {
        renderer.domElement.releasePointerCapture(e.pointerId);
      }
    };

    if (fineCursor) {
      renderer.domElement.style.pointerEvents = "auto";
      renderer.domElement.style.cursor = "grab";
      renderer.domElement.addEventListener("pointerdown", onPointerDown);
      renderer.domElement.addEventListener("pointermove", onPointerMove);
      renderer.domElement.addEventListener("pointerup", endDrag);
      renderer.domElement.addEventListener("pointercancel", endDrag);
    }

    // ─── Render loop ───
    const clock = new THREE.Timer();
    let frame = 0;
    let time = 0;
    let lastSand = -1;
    let lastText = -1;
    let lastBeat = -2;
    const projected = new THREE.Vector3();

    const animate = () => {
      // Real delta keeps easing and drift identical on 60/120/144Hz displays.
      clock.update();
      const dt = Math.min(0.05, clock.getDelta());
      time += dt;

      // No exponential smoothing here on top of `progressRef.current` — HeroSection's
      // own GSAP-scrubbed proxy tween (scrub: 0.65) already smooths raw scroll before
      // this prop ever updates. A second smoothing pass stacked on top of that one
      // just adds pure lag with no extra softness to show for it — it's what made the
      // globe visibly arrive a beat late after the card's reveal finished.
      const progress = progressRef.current;

      // This stage mounts early (see `stageMounted` in HeroSection) so its buffers are
      // warm before the dot zoom lands — but `zoomProgress` sits at exactly 0 for the
      // whole cylinder-rotation phase before it, and integrating every grain's position
      // to render nothing was the single largest wasted cost during that phase. Bail
      // before the per-particle work, not after it.
      frame = requestAnimationFrame(animate);
      if (progress < ACTIVE_THRESHOLD) {
        if (material.opacity !== 0) {
          material.opacity = 0;
          renderer.render(scene, camera);
        }
        if (labelRef.current) labelRef.current.style.opacity = "0";
        return;
      }

      const posAttr = geometry.attributes.position as THREE.BufferAttribute;
      const colAttr = geometry.attributes.color as THREE.BufferAttribute;
      const posArray = posAttr.array as Float32Array;
      const colArray = colAttr.array as Float32Array;

      const pDunes = easeInOutCubic(span(progress, PARTICLE_PHASES.explodeToDunes));

      // Which headline is on screen, and how far through its morph are we?
      let beat = -1;
      for (let b = TEXT_BEATS.length - 1; b >= 0; b--) {
        if (progress >= TEXT_BEATS[b].morph.start) {
          beat = b;
          break;
        }
      }
      const morphT = beat >= 0 ? easeInOutCubic(span(progress, TEXT_BEATS[beat].morph)) : 0;
      const cur = beat >= 0 ? ensureBeat(beat) : null;
      const prev = beat > 0 ? ensureBeat(beat - 1) : null;
      const src = prev ? prev.positions : dunePos;
      const dst = cur ? cur.positions : null;

      // Glyph grains live in [0, count). The rest are ambient dust, and the boundary
      // moves between beats — particles genuinely swap roles as the words rebuild.
      const nCur = cur ? cur.count : 0;
      const nPrev = prev ? prev.count : 0;

      const textBlend = beat > 0 ? 1 : beat === 0 ? morphT : 0;
      const sandBlend = pDunes * (1 - textBlend);

      material.opacity = span(progress, PARTICLE_PHASES.globeIn);

      // ── Camera: lifts into a standing-in-the-desert view, then pushes in through the
      //     closing beat's scatter and settles back as the headline locks. ──
      const vista = pDunes * (1 - textBlend);
      const dive = beat === TEXT_BEATS.length - 1 ? Math.sin(morphT * Math.PI) : 0;
      camera.position.y = vista * 9;
      camera.position.z = CAM_Z + vista * 12 - dive * 62;
      camera.lookAt(0, vista * -7, 0);

      // ── Globe turns (auto-spin plus any drag offset) until the blast, which unwinds
      //     it smoothly back to square-on — every explosion starts from the same
      //     canonical orientation no matter how much the globe was dragged. ──
      if (pDunes < 1) {
        globeGroup.rotation.y = (time * 0.07 + dragYOffset) * (1 - pDunes);
        globeGroup.rotation.x = (time * 0.03 + dragXOffset) * (1 - pDunes);
      } else {
        const damp = smoothK(0.15, dt);
        globeGroup.rotation.y -= globeGroup.rotation.y * damp;
        globeGroup.rotation.x -= globeGroup.rotation.x * damp;
      }

      // Per-frame oscillator globals — the only trig calls in the whole frame.
      const shC = Math.cos(time * 1.4);
      const shS = Math.sin(time * 1.4);
      const dfC = Math.cos(time * 0.22);
      const dfS = Math.sin(time * 0.22);

      const holding = beat >= 0 && dst !== null && morphT >= 1;

      if (holding) {
        // ── Hold path: the headline is locked. Only shimmer and dust drift move, so
        //    skip the sphere, dune and morph maths entirely for the long readable beats.
        for (let i = 0; i < COUNT; i++) {
          const idx = i * 3;
          const sp = sinP[i];
          const cp = cosP[i];

          if (i < nCur) {
            // Sub-grain shimmer, well below grain spacing, so held type stays sharp
            // while still reading as living particles.
            posArray[idx] = dst![idx] + (sp * shC + cp * shS) * 0.12;
            posArray[idx + 1] = dst![idx + 1] + (cp * shC - sp * shS) * 0.12;
            posArray[idx + 2] = dst![idx + 2];
          } else {
            posArray[idx] = dst![idx] + (sp * dfC + cp * dfS) * 2.4;
            posArray[idx + 1] = dst![idx + 1] + (cp * dfC - sp * dfS) * 1.8;
            posArray[idx + 2] = dst![idx + 2];
          }
        }
      } else {
        const skinAmp = sphereR * SPHERE_SKIN * (1 - pDunes);
        const w1C = Math.cos(time);
        const w1S = Math.sin(time);
        const w2C = Math.cos(time * 1.3);
        const w2S = Math.sin(time * 1.3);
        const beatBurst = beat >= 0 ? TEXT_BEATS[beat].burst : 0;

        for (let i = 0; i < COUNT; i++) {
          const idx = i * 3;
          const nx = normals[idx];
          const ny = normals[idx + 1];
          const nz = normals[idx + 2];
          const vel = velocities[i];
          const sp = sinP[i];
          const cp = cosP[i];

          // 1. Sphere — two travelling waves over the surface, expanded from
          //    sin(k + wt) so no trig is needed per particle.
          let x: number;
          let y: number;
          let z: number;

          if (skinAmp > 0) {
            const skin =
              (sinK1[i] * w1C + cosK1[i] * w1S) * 0.6 +
              (sinK2[i] * w2C + cosK2[i] * w2S) * 0.4;
            const r = sphereR + skin * skinAmp;
            x = nx * r;
            y = ny * r;
            z = nz * r;
          } else {
            x = nx * sphereR;
            y = ny * sphereR;
            z = nz * sphereR;
          }

          // 2. Sphere -> dune field. The sin() blast arc throws grains out and pulls
          //    them back; gravity then rakes them onto the height field. No box clamps —
          //    those were what squared the cloud off into a wall.
          if (pDunes > 0) {
            const blast = Math.sin(pDunes * Math.PI) * 30 * vel;
            x = x + (dunePos[idx] - x) * pDunes + nx * blast;
            y = y + (dunePos[idx + 1] - y) * pDunes + ny * blast;
            z = z + (dunePos[idx + 2] - z) * pDunes + nz * blast;

            if (pDunes > 0.35) {
              const g = Math.pow((pDunes - 0.35) / 0.65, 2) * 30 * vel;
              y = Math.max(dunePos[idx + 1], y - g);
            }
          }

          // 3. Text beats. Beat 0 lifts off the sand on an updraft; later beats scatter
          //    radially and re-converge, reading as the words rebuilding themselves.
          if (beat >= 0 && dst) {
            const burst = Math.sin(morphT * Math.PI) * beatBurst * vel;
            const bx = beat === 0 ? cp * burst * 0.7 : nx * burst;
            const by = beat === 0 ? burst * 0.9 : ny * burst;
            const bz = beat === 0 ? sp * burst * 0.7 : nz * burst;

            x = src[idx] + (dst[idx] - src[idx]) * morphT + bx;
            y = src[idx + 1] + (dst[idx + 1] - src[idx + 1]) * morphT + by;
            z = src[idx + 2] + (dst[idx + 2] - src[idx + 2]) * morphT + bz;

            if (i >= nCur) {
              x += (sp * dfC + cp * dfS) * 2.4;
              y += (cp * dfC - sp * dfS) * 1.8;
            }
          }

          posArray[idx] = x;
          posArray[idx + 1] = y;
          posArray[idx + 2] = z;
        }
      }

      posAttr.needsUpdate = true;

      // Palette cross-fade, skipped entirely during the long holds.
      if (
        beat !== lastBeat ||
        Math.abs(sandBlend - lastSand) > 0.002 ||
        Math.abs(textBlend - lastText) > 0.002
      ) {
        for (let i = 0; i < COUNT; i++) {
          const idx = i * 3;
          // Glyph or dust, cross-faded across the morph so role swaps are invisible.
          const roleFrom = i < nPrev ? 1 : 0;
          const roleTo = i < nCur ? 1 : 0;
          const role = beat > 0 ? roleFrom + (roleTo - roleFrom) * morphT : roleTo;

          for (let c = 0; c < 3; c++) {
            const lit = colDust[idx + c] + (colText[idx + c] - colDust[idx + c]) * role;
            const base =
              colSphere[idx + c] + (colSand[idx + c] - colSphere[idx + c]) * sandBlend;
            colArray[idx + c] = base + (lit - base) * textBlend;
          }
        }
        colAttr.needsUpdate = true;
        lastSand = sandBlend;
        lastText = textBlend;
        lastBeat = beat;
      }

      // Markers + popup: fade out over the first quarter of the blast, gone well
      // before the dune field settles. Pulses gently while visible.
      const markerVisibility = material.opacity * (1 - easeInOutCubic(clamp01(pDunes / 0.22)));
      const pulse = 1 + Math.sin(time * 2.4) * 0.12;
      for (let m = 0; m < MARKERS.length; m++) {
        markerMaterials[m].opacity = markerVisibility;
        markerMeshes[m].visible = markerVisibility > 0.01;
        markerMeshes[m].scale.setScalar(sphereR * 0.018 * pulse);
      }

      renderer.render(scene, camera);

      // Park the active marker's label on top of its projected screen position, read
      // straight off the DOM node rather than through React so a spinning globe never
      // costs a re-render. Done after render() so `globeGroup.matrixWorld` — updated
      // internally by render() — reflects this frame's rotation, not last frame's.
      const label = labelRef.current;
      if (label) {
        if (markerVisibility > 0.01) {
          const anchor = markerAnchors[activeMarkerRef.current];
          projected.copy(anchor).applyMatrix4(globeGroup.matrixWorld).project(camera);
          const front = projected.z < 1;
          label.style.transform = `translate(-50%, -160%) translate(${((projected.x + 1) / 2) * width}px, ${((1 - projected.y) / 2) * height}px)`;
          label.style.opacity = front ? String(markerVisibility) : "0";
        } else {
          label.style.opacity = "0";
        }
      }
    };

    frame = requestAnimationFrame(animate);

    // ─── Park the loop while the section is off-screen. The stage no longer fades to
    //     nothing at the end, so without this it would render a static frame forever. ───
    const visibility = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (!frame) {
            clock.reset(); // discard the paused span so nothing jumps on resume
            frame = requestAnimationFrame(animate);
          }
        } else if (frame) {
          cancelAnimationFrame(frame);
          frame = 0;
        }
      },
      { rootMargin: "10%" }
    );
    visibility.observe(container);

    // ─── Responsive: re-fit the type to the new viewport, debounced ───
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);

      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (!disposed) {
          fitToViewport();
          lastBeat = -2; // force a palette rebuild against the new grain counts
        }
      }, 160);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      disposed = true;
      if (idleHandle !== null) cancelIdleCallback?.(idleHandle);
      visibility.disconnect();
      window.removeEventListener("resize", handleResize);
      if (resizeTimer) clearTimeout(resizeTimer);
      cancelAnimationFrame(frame);
      if (fineCursor) {
        renderer.domElement.removeEventListener("pointerdown", onPointerDown);
        renderer.domElement.removeEventListener("pointermove", onPointerMove);
        renderer.domElement.removeEventListener("pointerup", endDrag);
        renderer.domElement.removeEventListener("pointercancel", endDrag);
      }
      geometry.dispose();
      material.dispose();
      particleTexture.dispose();
      markerGeometry.dispose();
      markerMaterials.forEach((m) => m.dispose());
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, [activeColor]);

  const marker = MARKERS[activeMarker];

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-40 w-full h-full pointer-events-none overflow-hidden"
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

export default CylinderExplosionSphere;
