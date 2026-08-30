"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { THEME_COLORS } from "@/constants/theme-colors";

/** Sampling canvas resolution. Higher means finer glyph edges, not more particles. */
const CANVAS_W = 900;
const CANVAS_H = 1200;

interface Cloud {
  positions: Float32Array;
  seeds: Float32Array;
}

/** Reads a theme token off the root element, so a palette change flows through. */
function themeColor(token: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  return value || fallback;
}

/** Resolves the site's heading face into something `ctx.font` accepts. */
function headingFont(): string {
  const root = getComputedStyle(document.documentElement);
  return (
    root.getPropertyValue("--font-heading").trim() ||
    root.getPropertyValue("--font-morona").trim() ||
    "Georgia, serif"
  );
}

/**
 * Turns a character into a particle cloud.
 *
 * The glyph is drawn to an offscreen canvas and its filled pixels read back, which is
 * what lets any character in the brand face become geometry — no traced path data, no
 * font-to-mesh step. Points are then drawn from that ink set *with replacement* and
 * jittered by a sub-pixel amount: sampling without replacement would cap the cloud at
 * the pixel count and leave a visible grid, whereas jittered oversampling reads as
 * genuine density.
 */
function sampleGlyph(char: string, count: number, worldHeight: number, thickness: number): Cloud {
  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  if (!ctx) return { positions, seeds };

  ctx.fillStyle = THEME_COLORS.black;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.fillStyle = THEME_COLORS.white;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Fit the glyph to the canvas by measuring once and scaling the type size to match.
  const probe = 600;
  ctx.font = `${probe}px ${headingFont()}`;
  const width = Math.max(1, ctx.measureText(char).width);
  const size = Math.min((CANVAS_W * 0.92 * probe) / width, CANVAS_H * 0.95);
  ctx.font = `${size}px ${headingFont()}`;
  ctx.fillText(char, CANVAS_W / 2, CANVAS_H / 2);

  const data = ctx.getImageData(0, 0, CANVAS_W, CANVAS_H).data;
  const ink: number[] = [];

  // The ink's own bounding box is tracked while scanning, so `worldHeight` means the
  // height of the glyph you actually see. Scaling by the canvas instead would leave the
  // font's ascender and descender padding baked in, and a numeral would silently render
  // a third smaller than asked for.
  let minX = CANVAS_W;
  let maxX = 0;
  let minY = CANVAS_H;
  let maxY = 0;

  for (let y = 0; y < CANVAS_H; y++) {
    for (let x = 0; x < CANVAS_W; x++) {
      if (data[(y * CANVAS_W + x) * 4] <= 128) continue;
      ink.push(x, y);
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  const pixels = ink.length / 2;
  if (!pixels) return { positions, seeds };

  const scale = worldHeight / Math.max(1, maxY - minY);
  const centreX = (minX + maxX) / 2;
  const centreY = (minY + maxY) / 2;

  for (let i = 0; i < count; i++) {
    const p = Math.floor(Math.random() * pixels) * 2;
    const x = ink[p] + (Math.random() - 0.5) * 2;
    const y = ink[p + 1] + (Math.random() - 0.5) * 2;

    positions[i * 3] = (x - centreX) * scale;
    positions[i * 3 + 1] = (centreY - y) * scale;
    // A slab rather than a plane, so rotation reveals volume instead of a flat card.
    positions[i * 3 + 2] = (Math.random() - 0.5) * thickness;
    seeds[i] = Math.random();
  }

  return { positions, seeds };
}

interface CloudProps {
  cloud: Cloud;
  color: string;
  reduced: boolean;
}

/**
 * The cloud itself.
 *
 * Every particle's drift and its recoil from the pointer are computed in the vertex
 * shader. At this count that is the whole design: moving a third of a million points on
 * the CPU would mean rewriting and re-uploading a four-megabyte buffer every frame,
 * where the GPU does it from four uniforms.
 */
function Numeral({ cloud, color, reduced }: CloudProps) {
  const group = useRef<THREE.Group>(null);
  const material = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPointer: { value: new THREE.Vector2(999, 999) },
      uRadius: { value: 1.1 },
      uStrength: { value: 0.55 },
      uPixelRatio: { value: 1 },
      uColor: { value: new THREE.Color(color) },
    }),
    [color]
  );

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const u = material.current?.uniforms;
    if (!u) return;

    if (!reduced) u.uTime.value += dt;
    u.uPixelRatio.value = state.gl.getPixelRatio();

    // Pointer arrives in NDC; the viewport gives world units at z = 0, which is the
    // plane the glyph sits on.
    u.uPointer.value.set(
      (state.pointer.x * state.viewport.width) / 2,
      (state.pointer.y * state.viewport.height) / 2
    );

    if (group.current) {
      const k = 1 - Math.pow(0.004, dt);
      group.current.rotation.y = THREE.MathUtils.lerp(
        group.current.rotation.y,
        state.pointer.x * 0.38,
        k
      );
      group.current.rotation.x = THREE.MathUtils.lerp(
        group.current.rotation.x,
        -state.pointer.y * 0.22,
        k
      );
    }
  });

  return (
    <group ref={group}>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[cloud.positions, 3]} />
          <bufferAttribute attach="attributes-aSeed" args={[cloud.seeds, 1]} />
        </bufferGeometry>
        <shaderMaterial
          ref={material}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          vertexShader={`
            attribute float aSeed;
            uniform float uTime;
            uniform vec2 uPointer;
            uniform float uRadius;
            uniform float uStrength;
            uniform float uPixelRatio;
            varying float vShade;

            void main() {
              vec3 p = position;
              float s = aSeed * 6.2831853;

              // Per-particle drift. Three different rates keep the surface from
              // shimmering in unison.
              p.x += sin(uTime * 0.5 + s) * 0.03;
              p.y += cos(uTime * 0.42 + s * 1.7) * 0.03;
              p.z += sin(uTime * 0.33 + s * 2.3) * 0.06;

              // Recoil. smoothstep gives a soft shoulder, so the cloud parts around the
              // cursor instead of snapping at a hard radius.
              vec2 away = p.xy - uPointer;
              float dist = length(away);
              float force = smoothstep(uRadius, 0.0, dist);
              p.xy += normalize(away + vec2(0.0001)) * force * uStrength;

              // Depth alone carries the texture: every grain is the one primary
              // colour, and only its weight varies.
              vShade = 0.3 + aSeed * 0.5;

              vec4 mv = modelViewMatrix * vec4(p, 1.0);
              gl_PointSize = (0.65 + aSeed * 0.5) * uPixelRatio * (9.0 / -mv.z);
              gl_Position = projectionMatrix * mv;
            }
          `}
          fragmentShader={`
            uniform vec3 uColor;
            varying float vShade;

            void main() {
              vec2 c = gl_PointCoord - 0.5;
              if (dot(c, c) > 0.25) discard;
              gl_FragColor = vec4(uColor, vShade);
            }
          `}
        />
      </points>
    </group>
  );
}

interface ParticleNumeralProps {
  /** Any character in the heading face — "8", "3", a letter. */
  value: string;
  className?: string;
}

/**
 * A numeral rendered as a particle cloud.
 *
 * The count is chosen from what the device can carry, and the render loop is parked
 * whenever the canvas is off-screen — a page with more than one WebGL surface should
 * never have two of them drawing at once.
 */
export function ParticleNumeral({ value, className = "" }: ParticleNumeralProps) {
  const wrapper = useRef<HTMLDivElement>(null);
  const [cloud, setCloud] = useState<Cloud | null>(null);
  const [color, setColor] = useState<string>(THEME_COLORS.brandForest);
  const [visible, setVisible] = useState(false);

  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Build once the webfont has settled, otherwise the glyph is sampled from the
  // fallback face and the shape is wrong.
  useEffect(() => {
    let cancelled = false;

    const build = () => {
      if (cancelled) return;
      const coarse = window.matchMedia("(pointer: coarse)").matches;
      const cores = navigator.hardwareConcurrency ?? 4;
      const count = coarse || cores <= 4 ? 220_000 : 850_000;
      setColor(themeColor("--primary", THEME_COLORS.brandForest));
      setCloud(sampleGlyph(value, count, 5.9, 0.72));
    };

    if (document.fonts?.ready) document.fonts.ready.then(build).catch(build);
    else build();

    return () => {
      cancelled = true;
    };
  }, [value]);

  useEffect(() => {
    const el = wrapper.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      rootMargin: "10%",
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={wrapper} className={className}>
      {cloud && (
        <Canvas
          camera={{ position: [0, 0, 8], fov: 45 }}
          dpr={[1, 1.75]}
          frameloop={visible ? "always" : "never"}
          gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
        >
          <Numeral cloud={cloud} color={color} reduced={reduced} />
        </Canvas>
      )}
    </div>
  );
}

export default ParticleNumeral;
