"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { THEME_COLORS } from "@/constants/theme-colors";

/** Sampling canvas resolution. Higher means finer glyph edges, not more particles. */
const CANVAS_W = 900;
const CANVAS_H = 1200;

/**
 * How much of a beat the glyph stays still. The remainder is the flight.
 *
 * This is the whole reason the sequence is legible: if the morph were spread evenly
 * across a beat the digit would never once be a digit — it would sit permanently
 * half-way between two shapes. Holding for most of the beat means you read "04", and
 * only then does it come apart.
 */
const HOLD = 0.52;

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
 * Turns a character into `count` points.
 *
 * The glyph is drawn to an offscreen canvas and its filled pixels read back, which is
 * what lets any character in the brand face become geometry — no traced path data, no
 * font-to-mesh step. Points are then drawn from that ink set *with replacement* and
 * jittered by a sub-pixel amount: sampling without replacement would cap the cloud at
 * the pixel count and leave a visible grid, whereas jittered oversampling reads as
 * genuine density.
 *
 * Every glyph in a sequence must return the same `count`, because point *i* of one
 * glyph is what flies to point *i* of the next.
 */
function sampleGlyph(
  char: string,
  count: number,
  worldHeight: number,
  thickness: number
): Float32Array {
  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const positions = new Float32Array(count * 3);
  if (!ctx) return positions;

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
  if (!pixels) return positions;

  // Height, not width, sets the scale — otherwise a "1" would tower over an "8".
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
  }

  return positions;
}

interface CloudProps {
  attrs: THREE.BufferAttribute[];
  seeds: THREE.BufferAttribute;
  /** Per beat: +1 parks the glyph in the right half, -1 in the left. */
  sides: number[];
  driver: { current: number };
  color: string;
  reduced: boolean;
}

/**
 * The cloud.
 *
 * Drift, flight and the recoil from the pointer all happen in the vertex shader. At this
 * count that is the whole design: moving a fifth of a million points on the CPU would
 * mean rewriting and re-uploading a multi-megabyte buffer every frame, where the GPU
 * does it from a handful of uniforms.
 *
 * Glyphs are swapped by re-attaching cached BufferAttributes rather than rebuilding
 * them. Three keys its GPU buffers off the attribute object, so a beat change re-points
 * two bindings and uploads nothing — which matters, because a scrubbed scroll can cross
 * the same boundary a dozen times while the reader wobbles on it.
 */
function Cloud({ attrs, seeds, sides, driver, color, reduced }: CloudProps) {
  const group = useRef<THREE.Group>(null);
  const material = useRef<THREE.ShaderMaterial>(null);
  const [pair, setPair] = useState(0);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uMorph: { value: 0 },
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

    const last = attrs.length - 2;
    const beat = Math.min(Math.max(driver.current, 0), last + 1);
    const i = Math.min(Math.floor(beat), last);
    const t = beat - i;

    // One React render per beat change — eight across the whole section, not one a frame.
    if (i !== pair) setPair(i);

    // Hold, then fly — on a smootherstep, which is the whole difference between this
    // reading as smooth and reading as merely eased. Its first *and* second derivatives
    // are zero at both ends, so the cloud leaves from rest and arrives at rest. A plain
    // power curve still has velocity left at the target: the particles reach the glyph
    // and stop dead, and the eye reads that stop as a jolt.
    const s = t <= HOLD ? 0 : (t - HOLD) / (1 - HOLD);
    const m = s * s * s * (s * (s * 6 - 15) + 10);
    u.uMorph.value = m;

    if (!reduced) u.uTime.value += dt;
    u.uPixelRatio.value = state.gl.getPixelRatio();

    if (!group.current) return;

    // Below a landscape aspect the glyph has no half to sit in, so it centres and
    // becomes a backdrop the copy sits over.
    const wide = state.viewport.width > state.viewport.height * 1.1;
    const offset = wide ? state.viewport.width * 0.25 : 0;
    const x = THREE.MathUtils.lerp(sides[i] ?? 1, sides[i + 1] ?? 1, m) * offset;

    const k = 1 - Math.pow(0.004, dt);
    group.current.position.x = x;

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

    // Pointer arrives in NDC; the viewport gives world units at z = 0. The group's own
    // offset is subtracted because the shader works in local space.
    u.uPointer.value.set(
      (state.pointer.x * state.viewport.width) / 2 - x,
      (state.pointer.y * state.viewport.height) / 2
    );
  });

  const from = attrs[pair];
  const to = attrs[Math.min(pair + 1, attrs.length - 1)];

  return (
    <group ref={group}>
      <points frustumCulled={false}>
        <bufferGeometry>
          <primitive object={from} attach="attributes-position" />
          <primitive object={to} attach="attributes-aTarget" />
          <primitive object={seeds} attach="attributes-aSeed" />
        </bufferGeometry>
        <shaderMaterial
          ref={material}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          vertexShader={`
            attribute vec3 aTarget;
            attribute float aSeed;
            uniform float uTime;
            uniform float uMorph;
            uniform vec2 uPointer;
            uniform float uRadius;
            uniform float uStrength;
            uniform float uPixelRatio;
            varying float vShade;

            void main() {
              float s = aSeed * 6.2831853;

              // Each particle runs the same 0..1 curve, started at a different moment.
              // Without the stagger the cloud leaves and lands as one solid block; with
              // it, the glyph comes apart as a wave and reassembles as one.
              float local = clamp((uMorph - aSeed * 0.22) / 0.78, 0.0, 1.0);
              float e = local * local * (3.0 - 2.0 * local);

              vec3 p = mix(position, aTarget, e);

              // In flight the cloud opens out. sin() peaks at the midpoint and is
              // exactly zero at both ends, so this can never disturb a settled glyph.
              float flight = sin(e * 3.1415927);
              p.z += flight * (aSeed - 0.5) * 2.6;
              p.xy += flight * normalize(p.xy + vec2(0.0001)) * (0.25 + aSeed * 0.85);

              // Idle drift. Three different rates keep the surface from shimmering in
              // unison.
              p.x += sin(uTime * 0.5 + s) * 0.03;
              p.y += cos(uTime * 0.42 + s * 1.7) * 0.03;
              p.z += sin(uTime * 0.33 + s * 2.3) * 0.06;

              // Recoil. smoothstep gives a soft shoulder, so the cloud parts around the
              // cursor instead of snapping at a hard radius.
              vec2 away = p.xy - uPointer;
              float force = smoothstep(uRadius, 0.0, length(away));
              p.xy += normalize(away + vec2(0.0001)) * force * uStrength;

              // Depth alone carries the texture: every grain is the one primary colour,
              // and only its weight varies. Grains thin while travelling, which is what
              // stops the flight from reading as a bright smear.
              vShade = (0.3 + aSeed * 0.5) * (1.0 - flight * 0.45);

              vec4 mv = modelViewMatrix * vec4(p, 1.0);
              gl_PointSize = (0.65 + aSeed * 0.5) * (1.0 + flight * 0.7) * uPixelRatio * (9.0 / -mv.z);
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

interface ParticleIndexProps {
  /** Characters in the heading face, in the order they are stepped through. */
  glyphs: string[];
  /** Per beat: +1 parks the glyph in the right half of the canvas, -1 in the left. */
  sides: number[];
  /** Fractional beat index, written by the scroll driver and read every frame. */
  driver: { current: number };
  className?: string;
  /** Glyph height in world units. The camera sees roughly 6.6 of them vertically. */
  height?: number;
}

/**
 * A sequence of glyphs, drawn as one particle cloud that reshapes itself.
 *
 * Glyphs are sampled one per frame rather than in a single pass. Nine at once is a third
 * of a second of blocked main thread — long enough to land as a stall exactly when the
 * section is being scrolled into. Sampled progressively, the first digit is up almost
 * immediately and the rest arrive well before the reader can scroll to them.
 */
export function ParticleIndex({
  glyphs,
  sides,
  driver,
  className = "",
  height = 3.6,
}: ParticleIndexProps) {
  const wrapper = useRef<HTMLDivElement>(null);
  const [attrs, setAttrs] = useState<THREE.BufferAttribute[]>([]);
  const [seeds, setSeeds] = useState<THREE.BufferAttribute | null>(null);
  const [color, setColor] = useState<string>(THEME_COLORS.brandForest);
  const [visible, setVisible] = useState(false);

  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // The glyph list is a literal at every call site, so its identity is not stable;
  // the joined string is what actually decides whether a rebuild is needed.
  const key = glyphs.join("");

  // Built once the webfont has settled, otherwise the glyphs are sampled from the
  // fallback face and every shape is wrong.
  useEffect(() => {
    let cancelled = false;
    const chars = key.split("");

    const build = () => {
      if (cancelled) return;
      const coarse = window.matchMedia("(pointer: coarse)").matches;
      const cores = navigator.hardwareConcurrency ?? 4;
      const count = coarse || cores <= 4 ? 70_000 : 200_000;

      const seed = new Float32Array(count);
      for (let i = 0; i < count; i++) seed[i] = Math.random();

      setSeeds(new THREE.BufferAttribute(seed, 1));
      setColor(themeColor("--primary", THEME_COLORS.brandForest));

      // Accumulated locally rather than appended to previous state: a rebuild starts
      // from an empty list of its own, so its first publish replaces the old glyphs
      // outright and the two generations can never interleave.
      const built: THREE.BufferAttribute[] = [];
      let i = 0;

      const step = () => {
        if (cancelled || i >= chars.length) return;
        built.push(new THREE.BufferAttribute(sampleGlyph(chars[i], count, height, 0.72), 3));
        i++;
        setAttrs([...built]);
        requestAnimationFrame(step);
      };

      step();
    };

    // Always deferred, never called straight from the effect body — the font promise
    // usually does that anyway, and relying on it would leave one branch synchronous.
    (document.fonts?.ready ?? Promise.resolve()).then(build).catch(build);

    return () => {
      cancelled = true;
    };
  }, [key, height]);

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
      {seeds && attrs.length > 1 && (
        <Canvas
          camera={{ position: [0, 0, 8], fov: 45 }}
          dpr={[1, 1.75]}
          frameloop={visible ? "always" : "never"}
          gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
        >
          <Cloud
            attrs={attrs}
            seeds={seeds}
            sides={sides}
            driver={driver}
            color={color}
            reduced={reduced}
          />
        </Canvas>
      )}
    </div>
  );
}

export default ParticleIndex;
