"use client";

import createGlobe, { type Globe, type Marker } from "cobe";
import { THEME_COLORS } from "@/constants/theme-colors";

/**
 * cobe's dotted-map globe (github.com/shuding/cobe), wrapped as the shell for the
 * Features stage's globe phase.
 *
 * It replaces what the particle buffer used to draw for itself — and only that. The
 * same buffer still explodes into the dune field and rebuilds itself into the
 * headlines, and the same eight signal cards still annotate the same eight markers;
 * see the handoff note in CylinderExplosionSphere.
 *
 * This wrapper exists for three things the raw package doesn't give us:
 *
 *  1. **It draws on demand.** cobe v2 has no render loop of its own — `update()`
 *     issues the draw synchronously — so the shell is stepped from the Three.js loop
 *     that already runs this stage. One clock drives both, which is what makes the
 *     crossfade impossible to desync.
 *  2. **It projects markers itself.** The package publishes marker screen positions
 *     only as CSS anchor names, which Firefox and Safari don't implement. `project()`
 *     mirrors cobe's own projection math instead, so a signal card can be parked on a
 *     dot with a plain transform — exactly as it was when the dots were Three.js
 *     meshes and `Vector3.project()` supplied the same two numbers.
 *  3. **It solves `scale` from a radius.** The dissolve only reads as one substance
 *     becoming another if both spheres are the same size on screen, and cobe sizes its
 *     globe through an opaque multiplier. `cobeScaleForRadius` inverts it.
 */

/**
 * cobe's globe radius in its own clip space — `ee` in the bundle, and the number every
 * `0.64` in its shaders is the square of. The package doesn't export it, so it is
 * mirrored here; the projection and both solves below are derived from it, so this is
 * the one constant to re-check if cobe is ever upgraded.
 */
const COBE_RADIUS = 0.8;

/** How far a marker dot floats above the surface, in those same units. */
const MARKER_ELEVATION = 0.02;

const RAD = Math.PI / 180;

/**
 * cobe's `scale` that lands its globe on a target on-screen radius, given as a share
 * of the canvas height.
 *
 * Its projection puts a surface point at `(c / aspect * scale + 1) / 2` across the
 * width, with `c` maxing out at COBE_RADIUS, so the horizontal radius comes to
 * `COBE_RADIUS * scale / (2 * aspect) * width` — which cancels down to a function of
 * the height alone, matching the vertical axis exactly. The globe is therefore always
 * circular, and always `COBE_RADIUS / 2 * scale` of the canvas height in radius.
 */
export const cobeScaleForRadius = (radiusOverHeight: number) =>
  (radiusOverHeight * 2) / COBE_RADIUS;

/**
 * cobe's marker `size` for a dot of a given radius, as a share of the globe's radius.
 *
 * Its marker quad spans `2 * size` in globe space and the fragment shader keeps only
 * the disc of radius 0.25 inside that quad, so the dot that actually reaches the
 * screen is `0.5 * size` in globe-space radius. This divides that out.
 */
const markerSizeForRadius = (radiusOverGlobe: number) =>
  (radiusOverGlobe * COBE_RADIUS) / 0.5;

/** `#rrggbb` -> the 0..1 triple cobe wants. Raw sRGB: cobe writes `gl_FragColor`
 *  directly, with no colour management in between, unlike the Three.js scene. */
const hexToRgb01 = (hex: string): [number, number, number] => {
  const n = parseInt(hex.replace("#", ""), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

/**
 * Shell palette. One hue, like the rest of this stage: every value is brand leaf at a
 * different level, never a different colour.
 *
 * cobe's shader resolves to `baseColor * (dot + 0.1) + pow(1 - facing, 4) * glowColor`
 * with `dot` peaking at `mapBrightness`. Brightness is therefore capped just under the
 * point where leaf's green channel would clip — clipping is a hue shift toward yellow,
 * which is the one thing the surrounding code is careful never to do.
 */
const MAP_BRIGHTNESS = 0.9;
/** Floor under the map's land mask, so ocean dots stay faintly lit. Without it the
 *  water goes empty and the silhouette stops describing a sphere — the same reason the
 *  particle globe kept its ocean grains instead of dropping them. */
const MAP_BASE_BRIGHTNESS = 0.18;
/** Falloff of dot brightness toward the limb. */
const DIFFUSE = 1.2;
/**
 * Dot density. The shader's per-pixel cost is fixed no matter what this is — it always
 * tests four Fibonacci candidates — so density here is free, unlike the CPU-integrated
 * grains it replaces. High enough to read as a continuous map, short of the point where
 * neighbouring dots touch and the grid turns back into a solid ball.
 */
const MAP_SAMPLES = 24000;

export type CobeProjection = { x: number; y: number; visible: boolean };

/** A marker in the terms this stage already thinks in: degrees and a hex colour. */
export type ShellMarker = { lat: number; lon: number; color: string };

export type CobeGlobeShell = {
  /**
   * Draws one frame at the given orientation.
   *
   * `phi` and `theta` are the Three.js globe group's `rotation.y` and `rotation.x`
   * verbatim — no conversion. cobe's projection collapses to `x·cos φ + z·sin φ` for
   * the screen x and `x·sin φ·sin θ + y·cos θ − z·cos φ·sin θ` for the screen y, which
   * is precisely what `Rx(θ) · Ry(φ)` gives, and that is the matrix Three.js builds for
   * an XYZ-order Euler with `rotation.z` left at zero. The same lat/lon -> vector
   * mapping on both sides completes it, so one pair of angles steers both spheres.
   */
  draw: (phi: number, theta: number, dotPulse: number) => void;
  /** Fades the shell. Uses CSS rather than cobe's own `opacity`, which bottoms out at
   *  half alpha (`(1 + opacity) * 0.5` in the shader) and so cannot reach zero. */
  setOpacity: (opacity: number) => void;
  /** New canvas size in CSS px, plus the `scale` from `cobeScaleForRadius`. */
  resize: (width: number, height: number, scale: number) => void;
  /** Screen position of a marker, in CSS px within the canvas. `visible` goes false
   *  once the dot turns behind the limb, where cobe's marker shader discards it. */
  project: (index: number, out: CobeProjection) => void;
  destroy: () => void;
};

export function createCobeGlobeShell(opts: {
  /** The stage's own positioned box. The canvas goes in as its first child, so the
   *  shell paints under the signal card and its connector. */
  container: HTMLElement;
  markers: ShellMarker[];
  /** Dot radius as a share of the globe's radius — carried over from the Three.js
   *  marker meshes, which scaled to `sphereR * 0.018`. */
  dotRadius: number;
  /** Canvas size in CSS px. */
  width: number;
  height: number;
  scale: number;
  /** Brand accent for the map itself. */
  color: string;
}): CobeGlobeShell {
  const { container, markers, dotRadius, color } = opts;

  let width = opts.width;
  let height = opts.height;
  let scale = opts.scale;
  let phi = 0;
  let theta = 0;

  const canvas = document.createElement("canvas");
  canvas.style.cssText = "display:block;width:100%;height:100%";
  container.insertBefore(canvas, container.firstChild);

  const baseSize = markerSizeForRadius(dotRadius);
  const markerColors = markers.map((m) => hexToRgb01(m.color));
  // Rebuilt in place every frame so the dots can pulse as they always did. The buffer
  // is eight markers wide — a couple of hundred bytes — so re-uploading it per frame
  // costs less than the bookkeeping that would avoid it.
  const cobeMarkers: Marker[] = markers.map((m, i) => ({
    location: [m.lat, m.lon],
    size: baseSize,
    color: markerColors[i],
  }));

  // cobe appends to `document.head` when it sets up marker anchor names; snapshot it
  // first so the element it adds can be told apart from everything else on the page.
  const headBefore = new Set(Array.from(document.head.children));

  const globe: Globe = createGlobe(canvas, {
    devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2),
    width,
    height,
    phi,
    theta,
    scale,
    offset: [0, 0],
    // Bright dots on a dark ball, rather than the inverse.
    dark: 1,
    diffuse: DIFFUSE,
    mapSamples: MAP_SAMPLES,
    mapBrightness: MAP_BRIGHTNESS,
    mapBaseBrightness: MAP_BASE_BRIGHTNESS,
    baseColor: hexToRgb01(color),
    markerColor: hexToRgb01(color),
    // Deliberately near-black: a bright glow would put a white-green halo around the
    // globe, and this stage sits on deep space with nothing else lit.
    glowColor: hexToRgb01(THEME_COLORS.brandDark),
    markerElevation: MARKER_ELEVATION,
    markers: cobeMarkers,
  });

  // cobe wraps the canvas in a `position:relative` div of its own for CSS anchor
  // positioning, inserted where the canvas was. Left alone that div sits in normal
  // flow and takes the container's space; pin it instead, the way the canvas was.
  const wrapper = canvas.parentElement;
  if (wrapper && wrapper !== container) {
    wrapper.style.cssText = "position:absolute;inset:0;pointer-events:none";
  }

  // cobe rewrites a <style> element on every update() to publish `--cobe-*` anchor
  // names for markers carrying an `id`. None of ours do, so that rule set is empty and
  // will stay empty — but the write still dirties document style on every frame we
  // draw, which here is every frame of a pinned scroll. Detaching the element turns
  // that write into a no-op on a node the document can't see; cobe keeps its own
  // reference, so nothing throws, and its `destroy()` still removes it harmlessly.
  // Guarded on the rule set actually being empty, so a future version that puts
  // something real in there is left alone.
  for (const node of Array.from(document.head.children)) {
    if (
      !headBefore.has(node) &&
      node instanceof HTMLStyleElement &&
      node.textContent === ":root{}"
    ) {
      node.remove();
    }
  }

  return {
    draw(nextPhi, nextTheta, dotPulse) {
      phi = nextPhi;
      theta = nextTheta;
      const size = baseSize * dotPulse;
      for (const m of cobeMarkers) m.size = size;
      // No width/height here: assigning them re-allocates the WebGL drawing buffer,
      // so they belong to `resize` alone.
      globe.update({ phi, theta, markers: cobeMarkers });
    },

    setOpacity(opacity) {
      const shown = opacity > 0.001;
      canvas.style.opacity = shown ? String(opacity) : "0";
      // Out of the compositor entirely while hidden. The context survives, so the
      // shell never has to recompile its shaders on the way back.
      if (wrapper) wrapper.style.display = shown ? "" : "none";
    },

    resize(nextWidth, nextHeight, nextScale) {
      width = nextWidth;
      height = nextHeight;
      scale = nextScale;
      globe.update({ width, height, scale, phi, theta });
    },

    project(index, out) {
      const m = markers[index];
      const r = COBE_RADIUS + MARKER_ELEVATION;
      const lat = m.lat * RAD;
      // cobe's own lat/lon -> vector mapping, which is the mapping this stage already
      // used for its Three.js marker anchors.
      const lon = m.lon * RAD - Math.PI;
      const ring = Math.cos(lat);
      const x = -ring * Math.cos(lon) * r;
      const y = Math.sin(lat) * r;
      const z = ring * Math.sin(lon) * r;

      const cp = Math.cos(phi);
      const sp = Math.sin(phi);
      const ct = Math.cos(theta);
      const st = Math.sin(theta);

      const px = cp * x + sp * z;
      const py = sp * st * x + ct * y - cp * st * z;
      const depth = -sp * ct * x + st * y + cp * ct * z;

      out.x = ((px / (width / height)) * scale + 1) * 0.5 * width;
      out.y = (-py * scale + 1) * 0.5 * height;
      out.visible = depth >= 0;
    },

    destroy() {
      globe.destroy();
      (wrapper ?? canvas).remove();
    },
  };
}
