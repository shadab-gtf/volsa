"use client";

import React, { useRef, useEffect } from "react";
import * as THREE from "three";

interface CylinderExplosionSphereProps {
  /** 0 -> 1 slice of the pinned Features scroll that belongs to the particle stage. */
  zoomProgress: number;
  activeColor?: string;
}

/** Brand palette — mirrors the tokens declared in app/globals.css. */
const BRAND = {
  mint: "#d8f3d1",
  lime: "#c6f19a",
  leaf: "#66b616",
  forest: "#22480b",
  dark: "#122805",
} as const;

/**
 * Timeline for the particle stage, expressed in `particleProgress` (0 -> 1) — the
 * tail slice of the pinned section's scroll. Single source of truth: FeaturesSection
 * imports this so nothing can drift out of sync with the WebGL beats.
 *
 * Beat sheet:
 *   0.00 - 0.06  sphere blooms out of the dark
 *   0.06 - 0.14  lit sphere turns, surface breathing
 *   0.14 - 0.30  blast outward, gravity rakes it into a desert dune field
 *   0.30 - 0.33  dune vista holds (camera lifts to a standing-in-the-desert view)
 *   0.33 - 0.93  four text beats — see TEXT_BEATS
 *   0.93 - 1.00  hyper-warp exit as the camera dives through
 */
export const PARTICLE_PHASES = {
  sphereIn: { start: 0.0, end: 0.06 },
  explodeToDunes: { start: 0.14, end: 0.3 },
  warp: { start: 0.93, end: 1.0 },
  particleFade: { start: 0.95, end: 1.0 },
} as const;

/**
 * Ordered text beats. Each morphs in from whatever came before (the dunes for the
 * first, the previous headline afterwards) and then holds dead still to be read.
 * `width` is the target world width of the block — the sampler fits the type to it.
 */
export const TEXT_BEATS: {
  lines: string[];
  width: number;
  morph: { start: number; end: number };
  hold: { start: number; end: number };
}[] = [
  {
    lines: ["IN YOUR CONTROL"],
    width: 100,
    morph: { start: 0.33, end: 0.42 },
    hold: { start: 0.42, end: 0.52 },
  },
  {
    lines: ["ZERO BRIDGE", "VULNERABILITIES"],
    width: 86,
    morph: { start: 0.52, end: 0.58 },
    hold: { start: 0.58, end: 0.66 },
  },
  {
    lines: ["SOVEREIGN", "WEALTH SHIELD"],
    width: 80,
    morph: { start: 0.66, end: 0.72 },
    hold: { start: 0.72, end: 0.8 },
  },
  {
    lines: ["ZERO", "CUSTODY RISK"],
    width: 80,
    morph: { start: 0.8, end: 0.86 },
    hold: { start: 0.86, end: 0.93 },
  },
];

/** Normalized 0 -> 1 position of `p` inside a phase window, clamped at both ends. */
const span = (p: number, phase: { start: number; end: number }) =>
  Math.min(1, Math.max(0, (p - phase.start) / (phase.end - phase.start)));

const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const easeInCubic = (t: number) => t * t * t;
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

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

/**
 * Samples real glyph outlines into particle positions.
 *
 * Rendering the text to an offscreen canvas and reading back its filled pixels gives
 * true letterforms in the brand face for any string. The previous hand-coded stroke
 * maths only covered nine characters and drew them as 1px mathematical lines, which is
 * why the type looked scratchy.
 */
function sampleTextToPositions(
  lines: string[],
  count: number,
  worldWidth: number,
  fontStack: string
): Float32Array {
  const out = new Float32Array(count * 3);
  if (typeof document === "undefined") return out;

  const CANVAS_W = 1600;
  const LINE_H = 240;
  const CANVAS_H = LINE_H * lines.length;

  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return out;

  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  // Not in every 2D context typing yet; harmless where unsupported.
  try {
    (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = "0.05em";
  } catch {
    /* noop */
  }

  // Fit the widest line to 92% of the canvas, capped so tall lines never collide.
  const PROBE = 200;
  ctx.font = `600 ${PROBE}px ${fontStack}`;
  const widest = Math.max(1, ...lines.map((l) => ctx.measureText(l).width));
  const size = Math.min(LINE_H * 0.78, PROBE * ((CANVAS_W * 0.92) / widest));
  ctx.font = `600 ${size}px ${fontStack}`;

  lines.forEach((line, i) => ctx.fillText(line, CANVAS_W / 2, LINE_H * (i + 0.5)));

  // Collect filled pixels on a 2px stride — plenty of resolution, cheap to shuffle.
  const data = ctx.getImageData(0, 0, CANVAS_W, CANVAS_H).data;
  const filled: number[] = [];
  for (let y = 0; y < CANVAS_H; y += 2) {
    for (let x = 0; x < CANVAS_W; x += 2) {
      if (data[(y * CANVAS_W + x) * 4] > 140) filled.push(x, y);
    }
  }

  const pixels = filled.length / 2;
  if (!pixels) return out;

  // Shuffle so particles land evenly across the glyphs. Sampling with replacement
  // leaves visible clumps and holes at this density.
  for (let i = pixels - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const ax = filled[i * 2];
    const ay = filled[i * 2 + 1];
    filled[i * 2] = filled[j * 2];
    filled[i * 2 + 1] = filled[j * 2 + 1];
    filled[j * 2] = ax;
    filled[j * 2 + 1] = ay;
  }

  const scale = worldWidth / CANVAS_W;
  for (let i = 0; i < count; i++) {
    const p = (i % pixels) * 2;
    const px = filled[p] + (Math.random() - 0.5) * 2.2;
    const py = filled[p + 1] + (Math.random() - 0.5) * 2.2;

    out[i * 3] = (px - CANVAS_W / 2) * scale;
    out[i * 3 + 1] = (CANVAS_H / 2 - py) * scale + 2;
    out[i * 3 + 2] = (Math.random() - 0.5) * 1.5;
  }

  return out;
}

/**
 * GPU-accelerated WebGL particle stage.
 *
 * A lit Fibonacci sphere blows apart into a wind-carved desert dune field, the sand
 * lifts into "IN YOUR CONTROL", then morphs headline to headline before warping past
 * the camera. Every timing lives in PARTICLE_PHASES / TEXT_BEATS.
 */
export function CylinderExplosionSphere({
  zoomProgress,
  activeColor = BRAND.leaf,
}: CylinderExplosionSphereProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const pointsRef = useRef<THREE.Points | null>(null);
  const geometryRef = useRef<THREE.BufferGeometry | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const progressRef = useRef(0);
  useEffect(() => {
    progressRef.current = zoomProgress;
  }, [zoomProgress]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const PARTICLE_COUNT = 24000;
    const SPHERE_R = 31;
    const DUNE_BASE = -30;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1200);
    camera.position.set(0, 0, 132);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // ─── Soft round sprite so particles read as glowing grains, not squares ───
    const sprite = document.createElement("canvas");
    sprite.width = 32;
    sprite.height = 32;
    const sctx = sprite.getContext("2d")!;
    const grad = sctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.28, "rgba(255,255,255,0.9)");
    grad.addColorStop(0.62, "rgba(255,255,255,0.22)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    sctx.fillStyle = grad;
    sctx.fillRect(0, 0, 32, 32);
    const particleTexture = new THREE.CanvasTexture(sprite);

    // ─── Buffers ───
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const normals = new Float32Array(PARTICLE_COUNT * 3); // unit sphere dir, doubles as blast vector
    const dunePos = new Float32Array(PARTICLE_COUNT * 3);
    const velocities = new Float32Array(PARTICLE_COUNT);
    const phases = new Float32Array(PARTICLE_COUNT);

    const colSphere = new Float32Array(PARTICLE_COUNT * 3);
    const colSand = new Float32Array(PARTICLE_COUNT * 3);
    const colText = new Float32Array(PARTICLE_COUNT * 3);

    const cMint = new THREE.Color(BRAND.mint);
    const cLime = new THREE.Color(BRAND.lime);
    const cLeaf = new THREE.Color(activeColor);
    const cForest = new THREE.Color(BRAND.forest);
    const cDark = new THREE.Color(BRAND.dark);
    const tmp = new THREE.Color();

    // Fake key light for the sphere. Baking a lambert term per particle is what makes
    // an additive point cloud read as a solid 3D ball instead of a flat blob.
    const LX = -0.42;
    const LY = 0.72;
    const LZ = 0.55;
    const LLEN = Math.sqrt(LX * LX + LY * LY + LZ * LZ);

    const GOLDEN = Math.PI * (3 - Math.sqrt(5));

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const idx = i * 3;

      // ── Fibonacci sphere: even coverage, no pole pile-up, no lat/lon moiré ──
      const ny = 1 - (i / (PARTICLE_COUNT - 1)) * 2;
      const ring = Math.sqrt(Math.max(0, 1 - ny * ny));
      const theta = GOLDEN * i;
      const nx = Math.cos(theta) * ring;
      const nz = Math.sin(theta) * ring;

      normals[idx] = nx;
      normals[idx + 1] = ny;
      normals[idx + 2] = nz;

      positions[idx] = nx * SPHERE_R;
      positions[idx + 1] = ny * SPHERE_R;
      positions[idx + 2] = nz * SPHERE_R;

      velocities[i] = 0.75 + Math.random() * 1.35;
      phases[i] = Math.random() * Math.PI * 2;

      // ── Dune field: scatter across the sand plane, drop onto the height field ──
      const dx = (Math.random() - 0.5) * 220;
      const dz = -70 + Math.random() * 140;
      const h = duneHeight(dx, dz);
      // Bias toward the surface so we render a skin of sand, not a solid slab.
      const depth = Math.pow(Math.random(), 1.8) * 6;

      dunePos[idx] = dx;
      dunePos[idx + 1] = DUNE_BASE + h - depth;
      dunePos[idx + 2] = dz;

      // ── Sphere palette: lambert-shaded brand green with mint speculars ──
      const lambert = Math.max(0, (nx * LX + ny * LY + nz * LZ) / LLEN);
      const shade = 0.16 + Math.pow(lambert, 0.75) * 0.84;
      tmp.copy(cForest).lerp(cLeaf, clamp01(shade * 1.25));
      if (shade > 0.72) tmp.lerp(cLime, (shade - 0.72) / 0.28);
      if (Math.random() < 0.05) tmp.lerp(cMint, 0.75); // sparse highlight grains
      colSphere[idx] = tmp.r;
      colSphere[idx + 1] = tmp.g;
      colSphere[idx + 2] = tmp.b;

      // ── Sand palette: lit by slope, so crests glow and lee faces fall into shadow ──
      const slope = duneHeight(dx + 4, dz) - duneHeight(dx - 4, dz);
      const lit = clamp01(0.52 - slope * 0.055);
      const crest = clamp01((h + 22) / 44);
      const sand = clamp01(crest * 0.55 + lit * 0.6 - depth * 0.05);
      tmp.copy(cDark).lerp(cLeaf, clamp01(sand * 1.5));
      if (sand > 0.6) tmp.lerp(cLime, (sand - 0.6) / 0.4);
      if (sand > 0.88) tmp.lerp(cMint, (sand - 0.88) / 0.12);
      colSand[idx] = tmp.r;
      colSand[idx + 1] = tmp.g;
      colSand[idx + 2] = tmp.b;

      // ── Text palette: bright and near-uniform so headlines stay legible ──
      const t = Math.random();
      tmp.copy(cLime).lerp(cMint, t * 0.8);
      if (t < 0.22) tmp.lerp(cLeaf, 0.55);
      colText[idx] = tmp.r;
      colText[idx + 1] = tmp.g;
      colText[idx + 2] = tmp.b;

      colors[idx] = colSphere[idx];
      colors[idx + 1] = colSphere[idx + 1];
      colors[idx + 2] = colSphere[idx + 2];
    }

    // ─── Text targets (re-sampled once webfonts settle) ───
    let textTargets: Float32Array[] = TEXT_BEATS.map((b) =>
      sampleTextToPositions(b.lines, PARTICLE_COUNT, b.width, resolveHeadingFont())
    );

    let disposed = false;
    if (typeof document !== "undefined" && document.fonts?.ready) {
      document.fonts.ready
        .then(() => {
          if (disposed) return;
          const font = resolveHeadingFont();
          textTargets = TEXT_BEATS.map((b) =>
            sampleTextToPositions(b.lines, PARTICLE_COUNT, b.width, font)
          );
        })
        .catch(() => {
          /* keep the first-pass sampling */
        });
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geometryRef.current = geometry;

    const material = new THREE.PointsMaterial({
      size: 1.15,
      vertexColors: true,
      map: particleTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      opacity: 0,
      depthWrite: false,
      sizeAttenuation: true,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);
    pointsRef.current = points;

    // ─── Render loop ───
    let time = 0;
    let smoothed = 0;
    let lastSand = -1;
    let lastText = -1;

    const animate = () => {
      time += 0.016;

      // Ease toward the scroll value so scrubbing feels fluid rather than stepped.
      smoothed += (progressRef.current - smoothed) * 0.11;
      const progress = smoothed;

      const posAttr = geometry.attributes.position as THREE.BufferAttribute;
      const colAttr = geometry.attributes.color as THREE.BufferAttribute;
      const posArray = posAttr.array as Float32Array;
      const colArray = colAttr.array as Float32Array;

      const pDunes = easeInOutCubic(span(progress, PARTICLE_PHASES.explodeToDunes));
      const pWarp = easeInCubic(span(progress, PARTICLE_PHASES.warp));

      // Which headline is on screen, and how far through its morph are we?
      let beat = -1;
      for (let b = TEXT_BEATS.length - 1; b >= 0; b--) {
        if (progress >= TEXT_BEATS[b].morph.start) {
          beat = b;
          break;
        }
      }
      const morphT = beat >= 0 ? easeInOutCubic(span(progress, TEXT_BEATS[beat].morph)) : 0;
      const src = beat > 0 ? textTargets[beat - 1] : dunePos;
      const dst = beat >= 0 ? textTargets[beat] : null;
      const finalText = textTargets[textTargets.length - 1];

      const textBlend = beat > 0 ? 1 : beat === 0 ? morphT : 0;
      const sandBlend = pDunes * (1 - textBlend);

      material.opacity =
        progress > PARTICLE_PHASES.particleFade.start
          ? 1 - span(progress, PARTICLE_PHASES.particleFade)
          : span(progress, PARTICLE_PHASES.sphereIn);

      // ── Camera: lifts into a standing-in-the-desert view, dives through on warp ──
      const vista = pDunes * (1 - textBlend);
      camera.position.y = vista * 9;
      camera.position.z = 132 + vista * 12 - pWarp * 112;
      camera.lookAt(0, vista * -7, 0);
      camera.updateProjectionMatrix();

      // ── Sphere turns until the blast; everything after that is locked square-on ──
      if (pDunes < 1 && pWarp === 0) {
        points.rotation.y = time * 0.07 * (1 - pDunes);
        points.rotation.x = time * 0.03 * (1 - pDunes);
      } else {
        points.rotation.y *= 0.85;
        points.rotation.x *= 0.85;
      }

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const idx = i * 3;
        const nx = normals[idx];
        const ny = normals[idx + 1];
        const nz = normals[idx + 2];
        const vel = velocities[i];
        const ph = phases[i];

        // 1. Sphere — a smooth breathing skin. Driven off cartesian normals, so it
        //    never collapses into the lobed polygon that the old spherical harmonics
        //    produced at low frequency.
        const skin =
          Math.sin(nx * 3.4 + time) *
          Math.cos(ny * 3.1 - time * 0.8) *
          Math.sin(nz * 3.7 + time * 1.3);
        const r = SPHERE_R + skin * 1.7 * (1 - pDunes);

        let x = nx * r;
        let y = ny * r;
        let z = nz * r;

        // 2. Sphere -> dune field. The sin() blast arc throws grains out and pulls them
        //    back; gravity then rakes them down onto the height field. No box clamps —
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
        //    radially and re-converge, which reads as the words rebuilding themselves.
        if (beat >= 0 && dst) {
          const burst = Math.sin(morphT * Math.PI) * (beat === 0 ? 14 : 22) * vel;
          const bx = beat === 0 ? Math.cos(ph) * burst * 0.7 : nx * burst;
          const by = beat === 0 ? burst * 0.9 : ny * burst;
          const bz = beat === 0 ? Math.sin(ph) * burst * 0.7 : nz * burst;

          x = src[idx] + (dst[idx] - src[idx]) * morphT + bx;
          y = src[idx + 1] + (dst[idx + 1] - src[idx + 1]) * morphT + by;
          z = src[idx + 2] + (dst[idx + 2] - src[idx + 2]) * morphT + bz;

          // Sub-glyph shimmer (0.16 units against ~11 units of cap height) so held text
          // reads as living grains rather than a frozen bitmap.
          const sh = 0.16 * morphT * (1 - pWarp);
          x += Math.sin(time * 1.4 + ph * 3) * sh;
          y += Math.cos(time * 1.1 + ph * 4) * sh;
        }

        // 4. Warp exit — straight out past the diving camera, with a gravity rake.
        if (pWarp > 0) {
          const d = pWarp * 190 * vel;
          x = finalText[idx] + nx * d + Math.sin(time * 0.5 + ph) * 6 * pWarp;
          y = finalText[idx + 1] + ny * d - Math.pow(pWarp, 2) * 70 * vel;
          z = finalText[idx + 2] + nz * d;
        }

        posArray[idx] = x;
        posArray[idx + 1] = y;
        posArray[idx + 2] = z;
      }

      posAttr.needsUpdate = true;

      // Palette cross-fade. Only rewritten when the blend actually moved, so during the
      // long holds this loop is skipped entirely.
      if (Math.abs(sandBlend - lastSand) > 0.002 || Math.abs(textBlend - lastText) > 0.002) {
        for (let i = 0; i < PARTICLE_COUNT; i++) {
          const idx = i * 3;
          for (let c = 0; c < 3; c++) {
            const base =
              colSphere[idx + c] + (colSand[idx + c] - colSphere[idx + c]) * sandBlend;
            colArray[idx + c] = base + (colText[idx + c] - base) * textBlend;
          }
        }
        colAttr.needsUpdate = true;
        lastSand = sandBlend;
        lastText = textBlend;
      }

      renderer.render(scene, camera);
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      disposed = true;
      window.removeEventListener("resize", handleResize);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      geometry.dispose();
      material.dispose();
      particleTexture.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, [activeColor]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-40 w-full h-full pointer-events-none overflow-hidden"
      aria-hidden="true"
    />
  );
}

export default CylinderExplosionSphere;
