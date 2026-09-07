"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  MESSAGE_DISSOLVE,
  MESSAGE_FADE_IN,
  MESSAGE_GAP,
  SEA_MESSAGES,
} from "./seaMessages.data";

/**
 * Underwater sea scene: one koi, swimming.
 *
 * Raw Three.js rather than React Three Fiber, like CylinderExplosionSphere and for the
 * same reasons — the whole thing is one imperative render loop with shader injection
 * and an IntersectionObserver parking it, none of which gains anything from a
 * reconciler, and staying off drei keeps this lazy chunk to the loader alone.
 *
 * The asset drives most of the decisions here. `public/mesh/koi-fish.opt.glb` has **no
 * skeleton, no animation clips and one merged mesh**, so there is nothing to pose: the
 * swimming is a travelling wave along the body, applied in the vertex shader. See
 * KOI_FORWARD for how the body's own axes were measured, and KOI_PRELUDE for the wave.
 */

/**
 * Sea palette, sampled from real water and leaning very slightly green so the scene
 * sits on a green-accented site without reading as a second brand.
 *
 * Same call the dune vista makes: this is a *scene*, not a UI surface, so it is
 * sampled from the thing it depicts rather than derived from the brand ramp. Nothing
 * here is the accent — the accent stays `--primary`, and this section doesn't use it.
 */
const SEA = {
  /** Water column, top to bottom. Painted in CSS behind a transparent canvas. */
  shallow: "#1d6b6e",
  mid: "#0d3f4a",
  deep: "#04161f",
  /** Sunlight through the surface, and the caustics it throws. */
  sun: "#cfeee0",
  caustic: "#9fe0c8",
  /** Suspended particulate. */
  mote: "#cfeadd",
} as const;

/** Koi length in world units once the asset is re-scaled. Camera distance, fog density
 *  and the swim path are all expressed against this, so changing it rescales the scene
 *  rather than breaking its proportions. */
const KOI_LENGTH = 1.7;
const CAM_DIST = 5.2;
const FOV = 42;
const FOG_DENSITY = 0.105;

/**
 * The koi's own axes, measured off the asset rather than assumed.
 *
 * The mesh does not lie along any cardinal axis. PCA over its 27,841 vertices puts the
 * body along [-0.515, 0.023, 0.857] — a diagonal in XZ — with a 3.3:1 spread over the
 * two perpendicular axes (0.322 against 0.097 and 0.093). Those two are within 4% of
 * each other, so PCA cannot say which way is up; KOI_UP is whichever minor axis sits
 * closest to world up, 0.937 of it, which is the orientation the model was authored in.
 *
 * Head-versus-tail comes from the volume centroid, which on a fish sits forward of the
 * bounding-box centre because head and belly are bulky where the tail is thin. It
 * measures 58.3% along the body axis against the bbox's 50%, so the nose is at
 * +KOI_FORWARD. That rests on one measurement of a mesh whose winding is inverted (its
 * signed volume came out negative, which is consistent with the `doubleSided` flag it
 * ships with), and a global winding flip cancels out of a centroid ratio — but if the
 * koi swims tail-first, flip KOI_NOSE_AT_FORWARD and nothing else needs to change.
 */
const KOI_FORWARD = [-0.515, 0.023, 0.857] as const;
const KOI_UP = [0.31, 0.937, 0.16] as const;
const KOI_NOSE_AT_FORWARD = true;

/**
 * The spine wave — the swimming itself.
 *
 * A real fish swims by passing a wave down its body, and with no skeleton in the asset
 * that wave is the only honest route to it: rotating the whole mesh gives a fish-shaped
 * rock gliding through water. Amplitude ramps toward the tail so the nose tracks the
 * path and the tail does the work, which is the asymmetry that reads as propulsion.
 * All of it runs per-vertex on the GPU, so the CPU cost of the animation is zero.
 */
/** Wavelength, as a share of body length. Under 1 puts more than one full bend in the
 *  body at once, which reads as an eel; a little over 1 is a carp. */
const WAVE_LENGTH = 1.35;
/** Tail beats per second, times 2π. */
const WAVE_SPEED = 3.1;
/** Peak lateral travel at the tail tip, as a share of body length. */
const WAVE_AMP = 0.075;
/** How sharply the amplitude concentrates at the tail. 1 is a linear ramp from the
 *  nose; higher keeps the front half of the body stiff, which is what a carp does. */
const TAIL_RAMP = 1.7;

/** Idle path: a closed figure, slow enough to read as cruising rather than as a loop.
 *  Only what the koi does between messages, and while it has nothing to chase. */
const PATH_R = 1.7;
const PATH_PERIOD = 26;
/** How much of the path's radius goes into depth. Kept small so the koi idles near the
 *  plane the messages live on — depth it has to climb out of is distance it has to
 *  cover, and that turns straight into speed it has to carry. */
const PATH_DEPTH = 0.35;
/**
 * Steering.
 *
 * A seek with arrival, not an exponential chase. An exponential decay never actually
 * gets there — it crawls the last stretch, which is exactly the stretch that has to
 * read as the koi *reaching* the message. Cruising at a fixed speed and then decelerating
 * inside ARRIVE_GAIN of the target arrives on a predictable clock and looks like
 * swimming, which is also what lets the message dissolve on contact rather than on a
 * timer that hopes the fish got there.
 */
/** World units per second toward a message. The frame is about 4.5 units across at this
 *  camera, so this has to cover it inside MESSAGE_EVERY with room for the dissolve. */
/**
 * World units per second toward a message — a flat, unhurried cruise.
 *
 * It used to be solved per message from the distance to cover, because a five-second
 * beat meant the koi had to arrive on a deadline; on a wide monitor that pushed it to
 * 3.3 units a second, which is a fish fleeing rather than a koi crossing a pond. Timing
 * the next message from the end of the dissolve removed the deadline, so speed is now
 * simply a choice: 0.8 is about half a body length a second, the pace of a carp with
 * nowhere to be.
 */
const CRUISE_MESSAGE = 0.8;
/** Slower toward the cursor. A koi coming to look at something is curious, not darting. */
const CRUISE_POINTER = 0.62;
/** How early the koi starts slowing down. Higher arrives harder. */
const ARRIVE_GAIN = 1.9;
/**
 * Peak yaw rate, radians per second — and the fix for the koi flipping on the spot.
 *
 * The first version derived facing from `normalize(velocity)`. Velocity smoothing makes
 * the koi overshoot a stationary target, the velocity then reverses *through zero*, and
 * normalising a vector as it passes through zero whips its direction through 180° —
 * which `lookAt` applied instantly. Sitting on a still cursor it did that forever.
 *
 * Facing is now persistent and rotates toward where the koi wants to go at no more than
 * this rate, so a reversal is a swept arc it has to commit to. 1.8 rad/s puts a full
 * about-turn at about 1.7 seconds, which is roughly what a carp does.
 */
const MAX_TURN = 2.2;
/**
 * Gain from the angle still to cover to the yaw rate the koi wants. Proportional, so
 * the turn eases off as the koi comes round rather than running at full rate up to the
 * exact frame it lines up and then stopping dead. MAX_TURN still caps it.
 */
const TURN_GAIN = 2.6;
/**
 * How fast the yaw rate itself is allowed to change, per second — angular acceleration,
 * and the fix for the koi looking jolted. Bounding the turn *rate* alone still let that
 * rate be a step function: nothing to the cap in one frame when a target moved, the cap
 * to nothing in one frame when it aligned. A turn needs to start and stop, not switch on.
 */
const TURN_ACCEL = 3.4;
/**
 * Lag on the target itself, per second. What the koi aims at changes in steps — a
 * message appears, dissolves, the cursor enters or leaves — and every one of those was
 * a new direction handed over in a single frame. Easing the target turns each switch
 * into a glide, which is the other half of the jolt.
 */
const TARGET_LAG = 3;
/** How quickly cruise speed is taken up and given up, per second. */
const SPEED_SMOOTH = 2.4;
/**
 * Nose-to-target distance at which the koi stops, and the larger distance it has to
 * exceed before it sets off again.
 *
 * The gap is hysteresis, and it is the other half of the flip fix: with a single
 * threshold the koi chatters across the boundary, stopping and starting every few
 * frames. Both are measured from the nose rather than the centre, because "the fish
 * reached it" is a fact about its mouth, not about its centre of mass.
 */
const HOVER_ENTER = 0.28;
const HOVER_EXIT = 0.55;
/** Peak roll into a turn, radians, and how fast the roll itself eases. */
const BANK_MAX = 0.42;
const BANK_SMOOTH = 4;
/**
 * How much a sharp turn costs in speed. A fish slows to turn tightly and accelerates
 * out of it; at full misalignment the koi drops to this share of cruise, which also
 * tightens its turning circle to well under a body length.
 */
const TURN_DRAG = 0.35;
/** A second stage of smoothing, on the cursor itself. Two lags in series is what makes
 *  pointer-following feel like water rather than like a leash. */
const POINTER_LAG = 3.2;
/** Depth of the plane messages live on and the koi swims to. Slightly toward the camera
 *  from the middle of the idle path, so arriving at a message brings it closer. */
const SWIM_PLANE_Z = 0.2;
/** Nose-to-message distance at which the message counts as reached, and dissolves.
 *  A shade beyond HOVER_ENTER, so it goes as the koi settles onto it rather than after. */
const ARRIVE_DIST = 0.34;

/**
 * Where a message appears, in normalised device coords — always the side the koi is
 * *not* on, with top and bottom alternating by index so ten in a row never stack in one
 * place. 0.56 puts it about 78% of the way out, far enough to read as "the other side"
 * and close enough in that the text still fits beside it.
 */
const SLOT_X = 0.44;
const SLOT_Y = 0.5;
/** Hard cap on how far from centre a slot can land, in world units. See spawnMessage.
 *  Pulled in alongside CRUISE_MESSAGE_MAX: the two are one decision, because how far
 *  the koi has to go and how fast it is allowed to go are the same constraint. */
const SLOT_MAX_X = 1.55;

/** Blur, in px, that the dissolve reaches. This is the whole "ink in water" read: the
 *  line diffuses outward as it fades instead of simply switching off. The fade-in runs
 *  the same curve backwards, so a message resolves out of the water and returns to it. */
const DISSOLVE_BLUR = 16;
const FADE_IN_BLUR = 6;
/** Beat after the pointer leaves before messages resume, so they don't snap straight
 *  back the instant the cursor crosses the edge. */
const RESUME_DELAY = 1.2;

/** Particulate and light shafts. The low counts are for phones and low-core machines. */
const MOTES_HIGH = 620;
const MOTES_LOW = 240;
const RAYS_HIGH = 7;
const RAYS_LOW = 4;

/** Shared by the koi's injected shader and by the water's own materials. */
const KOI_PRELUDE = /* glsl */ `
uniform float uTime;
uniform float uWaveAmp;
uniform float uWaveK;
uniform float uWaveSpeed;
uniform float uTailRamp;
uniform vec2  uBodyZ;
varying vec3  vKoiWorld;
varying float vKoiUp;

/** Lateral offset of the spine at body coordinate z. Nose is +Z, tail is -Z. */
float koiOffset(float z) {
  float t = clamp((z - uBodyZ.x) / (uBodyZ.y - uBodyZ.x), 0.0, 1.0);
  float ramp = pow(1.0 - t, uTailRamp);
  return sin(z * uWaveK - uTime * uWaveSpeed) * uWaveAmp * ramp;
}
`;

const KOI_NORMAL = /* glsl */ `
{
  // The deformation is a pure shear, p' = p + X * f(p.z), whose inverse-transpose is
  // I - Z Xᵀ f'(z). Applying it is not optional polish: without the correction the
  // lighting stays welded to the undeformed body and the bend reads as a texture
  // sliding over a rigid fish rather than as the fish actually flexing. The derivative
  // is taken numerically so it cannot drift out of step with koiOffset above.
  float e = 0.015;
  float dfdz = (koiOffset(position.z + e) - koiOffset(position.z - e)) / (2.0 * e);
  objectNormal.z -= dfdz * objectNormal.x;
  objectNormal = normalize(objectNormal);
  vKoiUp = normalize(mat3(modelMatrix) * objectNormal).y;
}
`;

const KOI_POSITION = /* glsl */ `
transformed.x += koiOffset(transformed.z);
vKoiWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;
`;

const KOI_FRAG_PRELUDE = /* glsl */ `
uniform float uTime;
uniform vec3  uCausticColor;
uniform float uCausticGain;
varying vec3  vKoiWorld;
varying float vKoiUp;

/** Two sine fields warping each other, raised to a power so the bright filaments are
 *  thin and the gaps broad. Cheaper than sampling a caustic texture and it never tiles. */
float seaCaustic(vec2 p, float t) {
  float a = sin(p.x * 3.1 + sin(p.y * 2.3 + t * 0.9) * 1.7);
  float b = sin(p.y * 2.7 + sin(p.x * 1.9 - t * 0.7) * 1.5);
  return pow(max(0.0, a * b), 3.0);
}
`;

const KOI_CAUSTIC = /* glsl */ `
{
  vec2 cp = vKoiWorld.xz * 1.5;
  float c = seaCaustic(cp, uTime) + seaCaustic(cp * 2.1 + 4.7, uTime * 1.3) * 0.45;
  // Caustics fall from above, so they only land where the surface faces up. Added to
  // emissive rather than to diffuse so they read as light cast onto the fish and stay
  // visible on the flanks the key light has already fallen away from.
  totalEmissiveRadiance += uCausticColor * (c * uCausticGain * clamp(vKoiUp, 0.0, 1.0));
}
`;

const RAY_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const RAY_FRAG = /* glsl */ `
precision mediump float;
varying vec2 vUv;
uniform float uTime;
uniform float uSeed;
uniform vec3  uColor;
void main() {
  // Brightest where it enters the water and fading as it goes down, with soft edges
  // across the width — a hard-edged shaft reads as a polygon, which is exactly what it
  // is. The slow breathe keeps a static quad from looking pasted on.
  float fade  = pow(clamp(vUv.y, 0.0, 1.0), 1.7);
  float edge  = smoothstep(0.0, 0.34, vUv.x) * (1.0 - smoothstep(0.66, 1.0, vUv.x));
  float pulse = 0.72 + 0.28 * sin(uTime * 0.55 + uSeed * 6.2831);
  gl_FragColor = vec4(uColor, fade * edge * pulse * 0.13);
}
`;

const SURFACE_FRAG = /* glsl */ `
precision mediump float;
varying vec2 vUv;
uniform float uTime;
uniform vec3  uColor;
float seaCaustic(vec2 p, float t) {
  float a = sin(p.x * 3.1 + sin(p.y * 2.3 + t * 0.9) * 1.7);
  float b = sin(p.y * 2.7 + sin(p.x * 1.9 - t * 0.7) * 1.5);
  return pow(max(0.0, a * b), 3.0);
}
void main() {
  vec2 p = vUv * 11.0;
  float c = seaCaustic(p, uTime) + seaCaustic(p * 1.9 + 3.1, uTime * 1.25) * 0.5;
  // Radial fade, so the plane's own edges never appear in frame.
  float r = length(vUv - 0.5) * 2.0;
  gl_FragColor = vec4(uColor, clamp(c, 0.0, 1.0) * (1.0 - smoothstep(0.5, 1.0, r)) * 0.5);
}
`;

/** Soft round sprite for the particulate. A hard square reads as a pixel, not a mote. */
function moteTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 32;
  c.height = 32;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.4, "rgba(255,255,255,0.55)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(c);
}

/**
 * Rebuilds an attribute as plain float32.
 *
 * The asset is quantized (KHR_mesh_quantization), so its attributes arrive as
 * normalized int16. `getX` denormalizes on read but `applyMatrix4` writes back through
 * `setXYZ`, and baking a transform into a normalized integer buffer is a good way to
 * quietly corrupt it. Float costs about half a megabyte more on the GPU here, against
 * an asset that is already down to 0.89 MB, and buys a geometry that can be freely
 * transformed and measured.
 */
function toFloatAttribute(attr: THREE.BufferAttribute | THREE.InterleavedBufferAttribute, items: number) {
  const out = new Float32Array(attr.count * items);
  for (let i = 0; i < attr.count; i++) {
    out[i * items] = attr.getX(i);
    if (items > 1) out[i * items + 1] = attr.getY(i);
    if (items > 2) out[i * items + 2] = attr.getZ(i);
  }
  return new THREE.BufferAttribute(out, items);
}

export function UnderwaterScene() {
  const containerRef = useRef<HTMLDivElement>(null);
  const msgRef = useRef<HTMLParagraphElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const coarse = window.matchMedia?.("(pointer: coarse)").matches ?? false;
    const cores = navigator.hardwareConcurrency ?? 4;
    const lowEnd = coarse || cores <= 4;
    const still = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    // Pointer-following is bound only where there is a real cursor. On touch the
    // messages are the whole of the interaction, which is why they never stop there.
    const canHover = window.matchMedia?.("(hover: hover) and (pointer: fine)").matches ?? false;

    /** Reused, so choosing a message slot allocates nothing. */
    const ndcSlot = new THREE.Vector2();

    let width = container.clientWidth;
    let height = container.clientHeight;

    const scene = new THREE.Scene();
    // Fog does the depth for us. Its colour matches the middle of the CSS water column
    // behind the canvas, which is what lets a transparent canvas fade into a gradient.
    scene.fog = new THREE.FogExp2(new THREE.Color(SEA.mid), FOG_DENSITY);

    const camera = new THREE.PerspectiveCamera(FOV, width / height, 0.1, 60);
    camera.position.set(0, 0.35, CAM_DIST);
    camera.lookAt(0, 0, 0);

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const renderer = new THREE.WebGLRenderer({
      // Unlike the particle stages on this page, this scene has a solid mesh with a real
      // silhouette, so its edges are worth smoothing. Only where it is affordable: at
      // dpr 2 the extra samples buy almost nothing a person can see, and cost real fill.
      antialias: dpr < 2,
      alpha: true,
      stencil: false,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(dpr);
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.appendChild(renderer.domElement);

    // ─── Light. One shaft from above for the sun through the surface, plus a hemisphere
    //     to keep the shadowed flanks in water-coloured bounce rather than black. No
    //     shadow map: underwater shadows are diffuse to the point of absence, and it
    //     would be the single most expensive thing in the scene. ───
    const sun = new THREE.DirectionalLight(new THREE.Color(SEA.sun), 2.1);
    sun.position.set(-1.6, 4.2, 1.9);
    scene.add(sun);
    scene.add(
      new THREE.HemisphereLight(new THREE.Color(SEA.shallow), new THREE.Color(SEA.deep), 1.25)
    );

    const uTime = { value: 0 };
    const disposables: { dispose: () => void }[] = [];

    // ─── The surface overhead, seen from underneath. ───
    const surfaceGeo = new THREE.PlaneGeometry(30, 30);
    const surfaceMat = new THREE.ShaderMaterial({
      vertexShader: RAY_VERT,
      fragmentShader: SURFACE_FRAG,
      uniforms: { uTime, uColor: { value: new THREE.Color(SEA.sun) } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      fog: false,
    });
    const surface = new THREE.Mesh(surfaceGeo, surfaceMat);
    surface.rotation.x = Math.PI / 2;
    surface.position.y = 3.7;
    scene.add(surface);
    disposables.push(surfaceGeo, surfaceMat);

    // ─── Light shafts. Additive quads rather than anything volumetric: a real
    //     god-ray pass is a screen-space blur and this needs to stay cheap. ───
    const rayGeo = new THREE.PlaneGeometry(1, 1);
    disposables.push(rayGeo);
    const rays = new THREE.Group();
    const rayCount = lowEnd ? RAYS_LOW : RAYS_HIGH;
    for (let i = 0; i < rayCount; i++) {
      const mat = new THREE.ShaderMaterial({
        vertexShader: RAY_VERT,
        fragmentShader: RAY_FRAG,
        uniforms: {
          uTime,
          uSeed: { value: i / rayCount },
          uColor: { value: new THREE.Color(SEA.sun) },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        fog: false,
      });
      const ray = new THREE.Mesh(rayGeo, mat);
      const t = (i + 0.5) / rayCount;
      ray.scale.set(0.5 + (i % 3) * 0.35, 8.5, 1);
      ray.position.set((t - 0.5) * 13, 1.4, -2.2 - (i % 4) * 1.5);
      ray.rotation.z = (i % 2 ? 1 : -1) * (0.1 + (i % 3) * 0.06);
      rays.add(ray);
      disposables.push(mat);
    }
    scene.add(rays);

    // ─── Suspended particulate. ───
    const moteCount = lowEnd ? MOTES_LOW : MOTES_HIGH;
    const motePos = new Float32Array(moteCount * 3);
    const moteDrift = new Float32Array(moteCount * 3);
    const MOTE_BOX = 11;
    for (let i = 0; i < moteCount; i++) {
      motePos[i * 3] = (Math.random() - 0.5) * MOTE_BOX;
      motePos[i * 3 + 1] = (Math.random() - 0.5) * MOTE_BOX * 0.7;
      motePos[i * 3 + 2] = (Math.random() - 0.5) * MOTE_BOX - 1.5;
      moteDrift[i * 3] = (Math.random() - 0.5) * 0.05;
      moteDrift[i * 3 + 1] = 0.02 + Math.random() * 0.06;
      moteDrift[i * 3 + 2] = (Math.random() - 0.5) * 0.04;
    }
    const moteGeo = new THREE.BufferGeometry();
    moteGeo.setAttribute("position", new THREE.BufferAttribute(motePos, 3));
    const moteTex = moteTexture();
    const moteMat = new THREE.PointsMaterial({
      size: 0.035,
      map: moteTex,
      color: new THREE.Color(SEA.mote),
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
    });
    const motes = new THREE.Points(moteGeo, moteMat);
    scene.add(motes);
    disposables.push(moteGeo, moteMat, moteTex);

    // ─── The koi ───
    const koi = new THREE.Group(); // steered along the path; +Z is the nose, +Y is up
    scene.add(koi);
    let koiReady = false;
    let bodyMin = -KOI_LENGTH / 2;
    let bodyMax = KOI_LENGTH / 2;

    let disposed = false;
    const loader = new GLTFLoader();
    loader.load(
      "/mesh/koi-fish.opt.glb",
      (gltf) => {
        if (disposed) return;

        let mesh: THREE.Mesh | null = null;
        gltf.scene.updateWorldMatrix(true, true);
        gltf.scene.traverse((o) => {
          if (!mesh && (o as THREE.Mesh).isMesh) mesh = o as THREE.Mesh;
        });
        if (!mesh) {
          setFailed(true);
          return;
        }
        const source = mesh as THREE.Mesh;

        // Rebuild the geometry as float, then bake the node transform and the alignment
        // into it, so the shader can work in a frame where the body simply runs along Z.
        const geo = new THREE.BufferGeometry();
        geo.setIndex(source.geometry.index);
        for (const [name, items] of [
          ["position", 3],
          ["normal", 3],
          ["uv", 2],
        ] as const) {
          const attr = source.geometry.attributes[name];
          if (attr) geo.setAttribute(name, toFloatAttribute(attr, items));
        }

        // Alignment: map the measured body axis onto +Z and the measured up onto +Y.
        const fwd = new THREE.Vector3(...KOI_FORWARD).normalize();
        if (!KOI_NOSE_AT_FORWARD) fwd.negate();
        const up = new THREE.Vector3(...KOI_UP).normalize();
        up.sub(fwd.clone().multiplyScalar(up.dot(fwd))).normalize(); // re-orthogonalise
        const right = new THREE.Vector3().crossVectors(up, fwd);
        // Columns are the koi's own axes, so the inverse takes them to X, Y, Z.
        const align = new THREE.Matrix4().makeBasis(right, up, fwd).invert();

        geo.applyMatrix4(source.matrixWorld);
        geo.applyMatrix4(align);

        // Normalise to KOI_LENGTH and centre on the origin, so the swim path and the
        // camera framing do not have to know anything about the asset's own scale.
        geo.computeBoundingBox();
        const bb = geo.boundingBox!;
        const k = KOI_LENGTH / (bb.max.z - bb.min.z);
        geo.scale(k, k, k);
        geo.computeBoundingBox();
        const centre = geo.boundingBox!.getCenter(new THREE.Vector3());
        geo.translate(-centre.x, -centre.y, -centre.z);
        geo.computeBoundingBox();
        bodyMin = geo.boundingBox!.min.z;
        bodyMax = geo.boundingBox!.max.z;

        const material = source.material as THREE.MeshStandardMaterial;
        // The asset ships KHR_materials_specular with a specularColorFactor of [2,2,2],
        // which is out of the extension's own range and comes through as a mirror-bright
        // fish. Clamp it, and settle the surface into something wet rather than metal.
        const physical = material as THREE.MeshPhysicalMaterial;
        if (physical.specularColor) physical.specularColor.setScalar(1);
        if (physical.specularIntensity !== undefined) physical.specularIntensity = 0.6;
        material.metalness = 0.08;
        material.roughness = 0.42;
        material.envMapIntensity = 0.4;

        material.onBeforeCompile = (shader) => {
          shader.uniforms.uTime = uTime;
          shader.uniforms.uWaveAmp = { value: WAVE_AMP * KOI_LENGTH };
          shader.uniforms.uWaveK = { value: (Math.PI * 2) / (WAVE_LENGTH * KOI_LENGTH) };
          shader.uniforms.uWaveSpeed = { value: WAVE_SPEED };
          shader.uniforms.uTailRamp = { value: TAIL_RAMP };
          shader.uniforms.uBodyZ = { value: new THREE.Vector2(bodyMin, bodyMax) };
          shader.uniforms.uCausticColor = { value: new THREE.Color(SEA.caustic) };
          shader.uniforms.uCausticGain = { value: 0.55 };

          shader.vertexShader = shader.vertexShader
            .replace("#include <common>", `#include <common>\n${KOI_PRELUDE}`)
            .replace("#include <beginnormal_vertex>", `#include <beginnormal_vertex>\n${KOI_NORMAL}`)
            .replace("#include <begin_vertex>", `#include <begin_vertex>\n${KOI_POSITION}`);

          shader.fragmentShader = shader.fragmentShader
            .replace("#include <common>", `#include <common>\n${KOI_FRAG_PRELUDE}`)
            .replace(
              "#include <emissivemap_fragment>",
              `#include <emissivemap_fragment>\n${KOI_CAUSTIC}`
            );
        };
        // Without this the injected program shares a cache key with an untouched
        // MeshStandardMaterial and can be handed the wrong compiled shader.
        material.customProgramCacheKey = () => "koi-swim";
        material.needsUpdate = true;

        const body = new THREE.Mesh(geo, material);
        body.frustumCulled = false; // it is displaced past its own bounds by the wave
        koi.add(body);
        koiReady = true;

        // The material and its three 1024 textures come from the loader, not from us,
        // so nothing else will release them — that is ~16 MB of GPU memory per mount if
        // this section is left to be torn down and rebuilt.
        disposables.push(geo, material);
        for (const map of [material.map, material.normalMap, material.roughnessMap, material.metalnessMap]) {
          if (map) disposables.push(map);
        }

        // Reduced motion draws one frame and stops (see the loop), so the koi arriving
        // after that frame needs to ask for another.
        if (still && !frame) frame = requestAnimationFrame(animate);
      },
      undefined,
      () => {
        if (!disposed) setFailed(true);
      }
    );

    // ─── Swim path. A closed figure, deliberately not a circle: the second and third
    //     harmonics keep it from reading as a turntable and give the bank something to
    //     do. `t` is 0 -> 1 over PATH_PERIOD seconds. ───
    const pathAt = (t: number, out: THREE.Vector3) => {
      const a = t * Math.PI * 2;
      return out.set(
        Math.sin(a) * PATH_R,
        Math.sin(a * 2 + 0.7) * 0.42 + Math.sin(a * 3) * 0.12,
        Math.cos(a) * PATH_R * PATH_DEPTH - 0.2
      );
    };

    // ─── Pointer. Coalesced to one read per frame the way usePointerParallax does — a
    //     pointer burst is sixty events, not sixty frames — and only bound where there
    //     is a real cursor to follow. ───
    const ndc = new THREE.Vector2();
    let pointerInside = false;
    let pointerSeen = false;

    const onPointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      ndc.set(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -(((e.clientY - rect.top) / rect.height) * 2 - 1)
      );
      pointerInside = true;
      pointerSeen = true;
    };
    const onPointerLeave = () => {
      pointerInside = false;
    };
    if (canHover && !still) {
      container.addEventListener("pointermove", onPointerMove);
      container.addEventListener("pointerleave", onPointerLeave);
    }

    // ─── Steering state ───
    const pos = new THREE.Vector3();
    /** Where the body points. Persistent, and the only thing position advances along —
     *  a fish swims down its own axis and cannot strafe. */
    const facing = new THREE.Vector3(0, 0, 1);
    /** Scalar, because a swimmer has a speed along its body, not a free velocity. */
    let speed = 0;
    /** Current yaw rate, rad/s. Eased rather than set, so turns have acceleration. */
    let yawRate = 0;
    let bank = 0;
    /** The target, lagged. Every switch of what the koi is chasing arrives through this. */
    const targetSmooth = new THREE.Vector3();
    let targetSeeded = false;
    /** True while parked on the target; cleared only past HOVER_EXIT. */
    let hovering = false;
    const nose = new THREE.Vector3();
    const target = new THREE.Vector3();
    const toTarget = new THREE.Vector3();
    const turnAxis = new THREE.Vector3();
    const pointerWorld = new THREE.Vector3();
    const pointerSmooth = new THREE.Vector3();
    const idlePoint = new THREE.Vector3();
    const bankedUp = new THREE.Vector3();
    const projected = new THREE.Vector3();
    const raycaster = new THREE.Raycaster();
    // Plane the messages and the cursor are both projected onto, so the koi only ever
    // has to swim in two dimensions and always arrives exactly where the text is.
    const swimPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -SWIM_PLANE_Z);
    // Seeded up front, not on the first frame: the message system runs before the koi
    // in the loop and picks its slot from where the koi is, so an unseeded origin would
    // put the very first line on whichever side a zero vector happens to project to.
    pathAt(0, pos);
    let pointerSeeded = false;

    // ─── Message state ───
    let msgIndex = -1;
    let msgBorn = -Infinity;
    /** When the last message finished dissolving. The gap is timed from here, so the
     *  first one appears a gap after the section starts rather than immediately. */
    let msgGoneAt = 0;
    let msgDissolveAt = Infinity;
    let msgAlive = false;
    const msgWorld = new THREE.Vector3();
    let msgW = 0;
    let msgH = 0;

    const hasMessages = SEA_MESSAGES.length > 0;
    /**
     * Safety net only. Nothing is waiting on the koi any more — the next message is
     * timed from the end of the dissolve — so this exists purely so a message can never
     * hang forever if the koi somehow cannot reach it. Generous on purpose: it should
     * never be what ends a message.
     */
    const latestDissolve = 14;

    /**
     * Puts the next message in the water, on the far side of the frame from the koi.
     *
     * The slot is chosen in screen space, because "the other side" is a thing about the
     * picture rather than about the world — then unprojected onto the swim plane and
     * kept as a world point. The DOM node is re-projected from that world point every
     * frame afterwards, so the text and the place the koi is swimming to cannot drift
     * apart when the camera breathes.
     */
    const spawnMessage = () => {
      const node = msgRef.current;
      if (!node || !hasMessages) return;
      msgIndex = (msgIndex + 1) % SEA_MESSAGES.length;

      projected.copy(pos).project(camera);
      const side = projected.x >= 0 ? -1 : 1; // opposite the koi
      const vert = msgIndex % 2 === 0 ? 1 : -1; // alternate top and bottom
      raycaster.setFromCamera(
        ndcSlot.set(side * SLOT_X, vert * SLOT_Y),
        camera
      );
      if (!raycaster.ray.intersectPlane(swimPlane, msgWorld)) return;
      // Cap how far out the slot can actually sit. Choosing it as a fraction of the
      // frame is what makes "the other side" mean the same thing on a phone and on a
      // monitor — but on 21:9 that fraction is 2.6 world units from centre, and a
      // crossing that long inside a five-second beat would have the koi sprinting.
      // Past this the message stops moving further out; it is still unambiguously over
      // there, and the text stays somewhere a reader's eye can follow.
      msgWorld.x = Math.max(-SLOT_MAX_X, Math.min(SLOT_MAX_X, msgWorld.x));

      node.textContent = SEA_MESSAGES[msgIndex];
      // One forced layout per message — five seconds apart, and the alternative is
      // measuring a moving element every frame.
      msgW = node.offsetWidth;
      msgH = node.offsetHeight;

      // Speed is set from the crossing it actually has to make, so arrival lands on the
      // same beat whatever shape the viewport is. The slots sit at a fixed fraction of
      // the frame, so a 21:9 monitor puts them 5.5 world units apart where a phone puts
      // them 1.5 — a fixed cruise would still be crossing the wide one when the next
      // message was already due, and the koi would never be seen to arrive.
      msgBorn = time;
      msgDissolveAt = Infinity;
      msgAlive = true;
    };

    const clock = new THREE.Timer();
    let frame = 0;
    let time = still ? PATH_PERIOD * 0.12 : 0;

    const animate = () => {
      clock.update();
      const dt = still ? 0 : Math.min(0.05, clock.getDelta());
      time += dt;
      uTime.value = time;

      const following = pointerInside && pointerSeen;

      // Where the mouth is. Everything that asks "has the koi got there yet" asks about
      // this and not about `pos`, which is the middle of the body half a length behind.
      nose.copy(facing).multiplyScalar(KOI_LENGTH * 0.5).add(pos);

      // ─── Messages. Suspended entirely while the cursor is in the section: the koi is
      //     following you then, and a line it is ignoring would read as broken. Any live
      //     message is dissolved out rather than cut. ───
      if (!still && hasMessages) {
        if (following) {
          if (msgAlive && msgDissolveAt === Infinity) msgDissolveAt = time;
          // Hold the clock just short of the next spawn, so leaving the section gives a
          // beat before the messages pick up again instead of firing instantly.
          msgGoneAt = Math.max(msgGoneAt, time - MESSAGE_GAP + RESUME_DELAY);
        } else if (!msgAlive && time - msgGoneAt >= MESSAGE_GAP) {
          spawnMessage();
        }

        if (msgAlive && msgDissolveAt === Infinity) {
          const arrived = nose.distanceTo(msgWorld) < ARRIVE_DIST;
          if (arrived || time - msgBorn >= latestDissolve) msgDissolveAt = time;
        }
        if (msgAlive && time - msgDissolveAt >= MESSAGE_DISSOLVE) {
          msgAlive = false;
          // The gap is measured from here — the water is empty from this moment.
          msgGoneAt = time;
          const node = msgRef.current;
          if (node) node.style.opacity = "0";
        }
      }

      if (koiReady) {
        // ─── Pick what the koi is swimming at. Cursor first, then a live message, then
        //     the idle path — which is also where it goes while a message dissolves,
        //     since by then there is nothing left to reach. ───
        let cruise = CRUISE_MESSAGE;
        if (following) {
          raycaster.setFromCamera(ndc, camera);
          if (raycaster.ray.intersectPlane(swimPlane, pointerWorld)) {
            // First frame of a follow starts from the koi, not from wherever the cursor
            // happens to be — otherwise the smoothing has nothing to smooth from and
            // the koi lurches on the first frame the pointer is seen.
            if (!pointerSeeded) {
              pointerSmooth.copy(pos);
              pointerSeeded = true;
            }
            pointerSmooth.lerp(pointerWorld, 1 - Math.exp(-POINTER_LAG * dt));
          }
          target.copy(pointerSmooth);
          cruise = CRUISE_POINTER;
        } else if (msgAlive && msgDissolveAt === Infinity) {
          target.copy(msgWorld);
        } else {
          pathAt((time / PATH_PERIOD) % 1, idlePoint);
          target.copy(idlePoint);
        }

        // ─── Steer. A kinematic swimmer: turn toward the target at a bounded rate, then
        //     move forward along the body. Nothing here can move the koi sideways and
        //     nothing can change where it points except an actual turn. ───
        // ─── Smooth the target, not just the response to it. Whatever the koi is aiming
        //     at changes in steps — a message appears, it dissolves, the cursor arrives
        //     or leaves — and each of those steps used to hand the steering a brand new
        //     direction in a single frame, which it then attacked at full turn rate.
        //     Easing the target means every one of those switches is a glide. ───
        const step = 1 - Math.exp(-TARGET_LAG * Math.max(dt, 1e-4));
        if (!targetSeeded) {
          targetSmooth.copy(target);
          targetSeeded = true;
        }
        targetSmooth.lerp(target, step);

        toTarget.subVectors(targetSmooth, nose);
        const dist = toTarget.length();

        // Hysteresis, so a stationary cursor cannot make it hunt across a threshold.
        if (hovering) {
          if (dist > HOVER_EXIT) hovering = false;
        } else if (dist < HOVER_ENTER) {
          hovering = true;
        }

        const yawBefore = Math.atan2(facing.x, facing.z);
        let alignment = 1;
        let wantRate = 0;
        if (!hovering && dist > 1e-4) {
          toTarget.divideScalar(dist); // now the direction it wants to face
          const facingDotWant = Math.max(-1, Math.min(1, facing.dot(toTarget)));
          alignment = Math.max(0, facingDotWant);
          const angle = Math.acos(facingDotWant);
          // Desired yaw rate from the angle still to cover, capped. Proportional rather
          // than flat-out, so the turn eases off as it comes round instead of stopping
          // dead the frame it lines up.
          wantRate = Math.min(MAX_TURN, angle * TURN_GAIN);
          if (angle > 1e-4) {
            turnAxis.crossVectors(facing, toTarget);
            // Exactly antiparallel: the cross product vanishes and there is no unique
            // axis, so pick yaw. A fish turning back on itself turns level, not by
            // rolling over the top.
            if (turnAxis.lengthSq() < 1e-9) turnAxis.set(0, 1, 0);
            turnAxis.normalize();
          }
        }

        // ─── Angular acceleration, which is the actual fix for the jerk. Before this the
        //     yaw rate was `min(angle, MAX_TURN * dt)` — a step function that jumped
        //     from nothing to the cap the instant a target moved and back to nothing the
        //     instant it aligned. Infinite angular acceleration at both ends is exactly
        //     what a jolt is. Easing the rate gives the turn a beginning and an end. ───
        //     Deliberately *not* clamped to the remaining angle. That clamp looks like
        //     the safe thing to write, and it was the last of the jolt: as the koi came
        //     round, the angle left fell below what the rate would cover and the turn
        //     was cut short in a single frame. It is also unnecessary — TURN_GAIN * dt
        //     is ~0.04, so the proportional term drives the rate to nothing long before
        //     it could overshoot. What is left is a second-order system with a damping
        //     ratio near 0.57: about a tenth of the turn overshoots and settles back,
        //     which is what a fish coming onto a heading actually does.
        yawRate += (wantRate - yawRate) * (1 - Math.exp(-TURN_ACCEL * Math.max(dt, 1e-4)));
        if (yawRate > 1e-5 && !hovering) {
          facing.applyAxisAngle(turnAxis, yawRate * dt).normalize();
        }

        // Slow into a sharp turn and accelerate out of it, which is both what a fish
        // does and what keeps the turning circle inside a body length.
        const wanted = hovering
          ? 0
          : Math.min(cruise, dist * ARRIVE_GAIN) * (TURN_DRAG + (1 - TURN_DRAG) * alignment);
        speed += (wanted - speed) * (1 - Math.exp(-SPEED_SMOOTH * Math.max(dt, 1e-4)));
        pos.addScaledVector(facing, speed * dt);

        // ─── Bank into the turn, from the signed yaw it actually performed. Taken from
        //     the change in heading rather than from the turn axis: near alignment the
        //     cross product's direction is numerically unstable, so its sign flickered
        //     and the roll twitched with it even while the turn itself was smooth. ───
        let dYaw = Math.atan2(facing.x, facing.z) - yawBefore;
        if (dYaw > Math.PI) dYaw -= Math.PI * 2;
        if (dYaw < -Math.PI) dYaw += Math.PI * 2;
        const wantBank =
          Math.max(-1, Math.min(1, dYaw / Math.max(dt, 1e-4) / MAX_TURN)) * BANK_MAX;
        bank += (wantBank - bank) * (1 - Math.exp(-BANK_SMOOTH * Math.max(dt, 1e-4)));
        bankedUp.set(0, 1, 0).applyAxisAngle(facing, -bank);
        koi.up.copy(bankedUp);

        koi.position.copy(pos);
        koi.lookAt(pos.x + facing.x, pos.y + facing.y, pos.z + facing.z);
        // The tail sweeping one way swings the head the other. Small — the wave's
        // amplitude ramp already holds the nose nearly still — but a fish whose head
        // never moves at all is the tell that its body is being pushed, not swimming.
        koi.rotateY(Math.sin(time * WAVE_SPEED) * 0.045);
      }

      // ─── The message itself: projected off its world point, faded and blurred. It
      //     resolves out of the water on the way in and diffuses back into it on the way
      //     out — the dissolve curve is squared so it accelerates, which is how ink
      //     actually goes. Written straight to the node; no re-render per frame. ───
      const node = msgRef.current;
      if (node && msgAlive) {
        projected.copy(msgWorld).project(camera);
        const px = (projected.x * 0.5 + 0.5) * width;
        const py = (-projected.y * 0.5 + 0.5) * height;
        const cx = Math.min(Math.max(px, msgW / 2 + 16), Math.max(msgW / 2 + 16, width - msgW / 2 - 16));
        const cy = Math.min(Math.max(py, msgH / 2 + 16), Math.max(msgH / 2 + 16, height - msgH / 2 - 16));

        const fadeIn = Math.min(1, (time - msgBorn) / MESSAGE_FADE_IN);
        const raw = msgDissolveAt === Infinity ? 0 : Math.min(1, (time - msgDissolveAt) / MESSAGE_DISSOLVE);
        const out = raw * raw;

        node.style.opacity = String(fadeIn * (1 - out));
        node.style.filter = `blur(${(1 - fadeIn) * FADE_IN_BLUR + out * DISSOLVE_BLUR}px)`;
        node.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%) scale(${1 + out * 0.14})`;
      }

      if (!still) {
        // Particulate drifts up and wraps, so the column never empties.
        const arr = moteGeo.attributes.position.array as Float32Array;
        const d = 0.016;
        for (let i = 0; i < moteCount; i++) {
          const o = i * 3;
          arr[o] += moteDrift[o] * d;
          arr[o + 1] += moteDrift[o + 1] * d;
          arr[o + 2] += moteDrift[o + 2] * d;
          if (arr[o + 1] > MOTE_BOX * 0.35) arr[o + 1] -= MOTE_BOX * 0.7;
        }
        moteGeo.attributes.position.needsUpdate = true;

        // A slow sway on the shafts and a breath on the camera. Both tiny: the scene
        // should feel like held breath, not a boat deck.
        rays.rotation.y = Math.sin(time * 0.06) * 0.06;
        camera.position.x = Math.sin(time * 0.11) * 0.22;
        camera.position.y = 0.35 + Math.sin(time * 0.09 + 1.3) * 0.1;
        camera.lookAt(0, 0, 0);
      }

      renderer.render(scene, camera);

      // Under `prefers-reduced-motion` the scene is a still, and a still does not need
      // sixty of itself a second — one frame with the koi in place is the whole thing.
      if (still && koiReady) {
        frame = 0;
        return;
      }
      frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);

    // ─── Park the loop while the section is off screen. ───
    const visibility = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (!frame) {
            clock.reset(); // drop the paused span so nothing jumps on resume
            frame = requestAnimationFrame(animate);
          }
        } else if (frame) {
          cancelAnimationFrame(frame);
          frame = 0;
        }
      },
      { rootMargin: "12%" }
    );
    visibility.observe(container);

    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    const handleResize = () => {
      if (!containerRef.current) return;
      width = containerRef.current.clientWidth;
      height = containerRef.current.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      if (resizeTimer) clearTimeout(resizeTimer);
      // One frame after a resize, in case the loop is parked and would otherwise leave
      // a stretched buffer on screen until the section is scrolled back into view.
      resizeTimer = setTimeout(() => !disposed && renderer.render(scene, camera), 80);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      disposed = true;
      visibility.disconnect();
      window.removeEventListener("resize", handleResize);
      if (canHover && !still) {
        container.removeEventListener("pointermove", onPointerMove);
        container.removeEventListener("pointerleave", onPointerLeave);
      }
      if (resizeTimer) clearTimeout(resizeTimer);
      cancelAnimationFrame(frame);
      for (const d of disposables) d.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 h-full w-full"
      style={{
        // The water column itself. In CSS rather than in the scene: a transparent canvas
        // over a gradient is one paint instead of a backdrop quad plus its own shader,
        // and the fog colour above is matched to the middle of it so anything receding
        // into the distance fades into the water rather than onto it.
        background: `linear-gradient(180deg, ${SEA.shallow} 0%, ${SEA.mid} 42%, ${SEA.deep} 100%)`,
      }}
      aria-hidden={!failed}
    >
      {/* The line the koi is swimming at. One node whose text is rewritten every five
          seconds rather than ten nodes toggled — position, opacity, blur and scale are
          all written straight to it from the render loop, so a fish crossing the frame
          never costs a React render. `left-0 top-0` because the transform carries the
          whole position; anything else and the two fight. */}
      <p
        ref={msgRef}
        aria-live="polite"
        className="pointer-events-none absolute left-0 top-0 max-w-[15ch] text-center font-sans text-xl font-light leading-tight tracking-tight text-white/95 [text-shadow:0_2px_18px_rgba(4,22,31,0.55)] will-change-[opacity,filter,transform] sm:max-w-[20ch] sm:text-3xl"
        style={{ opacity: 0 }}
      />

      {failed && (
        <p className="absolute inset-0 grid place-items-center px-6 text-center text-sm text-white/70">
          This scene could not be loaded.
        </p>
      )}
    </div>
  );
}

export default UnderwaterScene;
