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
import { createDiveStage, SUN_DIR, SURFACE_Y } from "./diveStage";

/**
 * A koi breaches from the water, follows a ballistic arc, and returns to the sea.
 *
 * Two stages sharing one camera and one fish. The descent is **scrubbed by scroll** and
 * on rails: the koi clears the surface, the camera follows after impact, and the crossing is
 * driven entirely by how deep the lens is — so scrolling back up runs the whole thing
 * backwards, splash included. Everything after it is **live**: the koi steers, chases
 * the lines in seaMessages.data, and comes to the cursor. See DIVE_END for where one
 * hands over to the other, and solveDiveCurve for why the handover has no kink in it.
 *
 * The sky, the surface and the breach live in diveStage. There is no compositing seam at
 * the waterline because sky and sea are the same dome with one crossfade uniform.
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
/** Haze above the water. Nearly nothing — air is not water, and fog up there mostly
 *  serves to keep the far end of the surface from ending in a hard line. */
const FOG_DENSITY_AIR = 0.012;

/**
 * The dive, as a share of the section's scroll.
 *
 * Ends well before the section does: the rest is the koi underwater, which is where the
 * messages and the cursor-following live and where a reader is expected to stop. The
 * whole sequence is scrubbed rather than played, so scrolling back up runs it backwards
 * — which is why the splash and the surface ripple are written as functions of position
 * in the dive rather than as timers.
 */
const DIVE_END = 0.45;
const DIVE_SECONDS = 5.6;
const FLIGHT_START = 0.28;
const FLIGHT_DURATION = 2;
const FLIGHT_SPEED_Y = 6.05;
const FLIGHT_GRAVITY = 5.8;
const WATER_DRAG = 2;
const SCROLL_RESPONSE = 8;
/** Camera above the water at the start of the dive, and where it is looking. */
const CAM_AIR = new THREE.Vector3(0, SURFACE_Y + 1.3, 8.8);
const LOOK_AIR = new THREE.Vector3(0, SURFACE_Y + 1.65, 0);
/**
 * Launch and landing fit the visible width, including portrait screens. Gravity
 * determines the airborne motion; a tangent-matched curve takes over underwater.
 *
 * The horizontal offsets are **fractions of the visible half-width at their own depth**,
 * not world units, and that is not a detail. Written as world x, the entry point sat
 * 105% of a frame off the left edge of a portrait phone — the koi simply was not in the
 * picture for most of the dive. The same mistake the message slots made, and the same
 * fix: place it in the frame and let the frame decide what that is in world units.
 *
 * The last two points are solved rather than written — see solveDiveCurve — so the curve
 * arrives exactly where the idle path begins, pointing exactly the way the idle path
 * leaves. That is what makes the handover from a scrubbed dive to a live swimmer
 * invisible rather than a kink.
 */
const DIVE_ENTRY_X = -0.45;
const DIVE_ENTRY_Y = SURFACE_Y - 1.45;
const DIVE_ENTRY_Z = 0.45;
const DIVE_EXIT_X = 0.38;
/** How far back from the handover point the third control point sits. Longer means the
 *  koi levels out more gradually as it comes out of the plunge. */
const DIVE_TANGENT = 1.3;

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
uniform float uFade;
uniform vec3  uColor;
void main() {
  // Brightest where it enters the water and fading as it goes down, with soft edges
  // across the width — a hard-edged shaft reads as a polygon, which is exactly what it
  // is. The slow breathe keeps a static quad from looking pasted on.
  float fade  = pow(clamp(vUv.y, 0.0, 1.0), 1.7);
  float edge  = smoothstep(0.0, 0.34, vUv.x) * (1.0 - smoothstep(0.66, 1.0, vUv.x));
  float pulse = 0.72 + 0.28 * sin(uTime * 0.55 + uSeed * 6.2831);
  gl_FragColor = vec4(uColor, fade * edge * pulse * 0.13 * uFade);
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

function disposeLoadedModel(root: THREE.Object3D) {
  const resources = new Set<{ dispose: () => void }>();
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    resources.add(object.geometry);
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      resources.add(material);
      for (const value of Object.values(material)) {
        if (value instanceof THREE.Texture) resources.add(value);
      }
    }
  });
  for (const resource of resources) resource.dispose();
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
    /**
     * One fog object whose density and colour are re-driven each frame from how deep the
     * camera is, rather than two fogs swapped at the waterline. Air is nearly clear;
     * water is not. Crossing between them is a lerp on two numbers, which is why there
     * is no moment where the atmosphere changes over.
     */
    const fog = new THREE.FogExp2(new THREE.Color(SEA.mid), FOG_DENSITY);
    scene.fog = fog;
    const airFog = new THREE.Color(0xbcd3e0);
    const waterFog = new THREE.Color(SEA.mid);

    /** Where the camera ends up once the dive is over — the framing this scene has
     *  always used, and the anchor the descent eases into. */
    const UNDERWATER_CAM = new THREE.Vector3(0, 0.35, CAM_DIST);
    const UNDERWATER_LOOK = new THREE.Vector3(0, 0, 0);

    const camera = new THREE.PerspectiveCamera(FOV, width / height, 0.1, 90);
    // Under reduced motion the dive is skipped outright — a scrubbed descent is exactly
    // the kind of motion that setting exists to refuse — so the camera starts where the
    // dive would have left it rather than stranded in the air with nothing to move it.
    camera.position.copy(still ? UNDERWATER_CAM : CAM_AIR);
    camera.lookAt(still ? UNDERWATER_LOOK : LOOK_AIR);

    const dpr = Math.min(window.devicePixelRatio || 1, lowEnd ? 1.25 : 1.75);
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !lowEnd,
        alpha: true,
        stencil: false,
        powerPreference: "high-performance",
      });
    } catch {
      setFailed(true);
      return;
    }
    renderer.setPixelRatio(dpr);
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.appendChild(renderer.domElement);

    // ─── Light. One shaft from above for the sun through the surface, plus a hemisphere
    //     to keep the shadowed flanks in water-coloured bounce rather than black. No
    //     shadow map: underwater shadows are diffuse to the point of absence, and it
    //     would be the single most expensive thing in the scene. ───
    // The key light sits where the dome draws the sun, so the disk in the sky, the
    // glint on the swell and the lit side of the koi all agree about the light source.
    const sunAir = new THREE.Color(0xfff4dc);
    const sunWater = new THREE.Color(SEA.sun);
    const sun = new THREE.DirectionalLight(sunAir.clone(), 3.1);
    sun.position.copy(SUN_DIR).multiplyScalar(6);
    scene.add(sun);
    scene.add(
      new THREE.HemisphereLight(new THREE.Color(SEA.shallow), new THREE.Color(SEA.deep), 1.25)
    );

    const uTime = { value: 0 };
    const uWaveAmp = { value: WAVE_AMP * KOI_LENGTH };
    const uCausticGain = { value: 0 };
    const disposables: { dispose: () => void }[] = [];

    // The surface itself now belongs to diveStage, which draws it from both sides and
    // displaces it — this scene used to own a flat one-sided plane, which was fine while
    // the camera could only ever be underneath it.

    // ─── Light shafts. Additive quads rather than anything volumetric: a real
    //     god-ray pass is a screen-space blur and this needs to stay cheap. They hang
    //     from the surface, so they move with it rather than from a fixed height. ───
    const rayGeo = new THREE.PlaneGeometry(1, 1);
    disposables.push(rayGeo);
    const rays = new THREE.Group();
    const rayMaterials: THREE.ShaderMaterial[] = [];
    const rayCount = lowEnd ? RAYS_LOW : RAYS_HIGH;
    for (let i = 0; i < rayCount; i++) {
      const mat = new THREE.ShaderMaterial({
        vertexShader: RAY_VERT,
        fragmentShader: RAY_FRAG,
        uniforms: {
          uTime,
          uSeed: { value: i / rayCount },
          uColor: { value: new THREE.Color(SEA.sun) },
          // Shafts are a thing you see from inside the water looking up. Above it there
          // is nothing for the light to scatter through, so they fade out with depth.
          uFade: { value: 0 },
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
      ray.position.set((t - 0.5) * 13, SURFACE_Y - 4.1, -2.2 - (i % 4) * 1.5);
      ray.rotation.z = (i % 2 ? 1 : -1) * (0.1 + (i % 3) * 0.06);
      rays.add(ray);
      rayMaterials.push(mat);
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
        if (disposed) {
          disposeLoadedModel(gltf.scene);
          return;
        }

        let mesh: THREE.Mesh | null = null;
        gltf.scene.updateWorldMatrix(true, true);
        gltf.scene.traverse((o) => {
          if (!mesh && (o as THREE.Mesh).isMesh) mesh = o as THREE.Mesh;
        });
        if (!mesh) {
          disposeLoadedModel(gltf.scene);
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
          shader.uniforms.uWaveAmp = uWaveAmp;
          shader.uniforms.uWaveK = { value: (Math.PI * 2) / (WAVE_LENGTH * KOI_LENGTH) };
          shader.uniforms.uWaveSpeed = { value: WAVE_SPEED };
          shader.uniforms.uTailRamp = { value: TAIL_RAMP };
          shader.uniforms.uBodyZ = { value: new THREE.Vector2(bodyMin, bodyMax) };
          shader.uniforms.uCausticColor = { value: new THREE.Color(SEA.caustic) };
          shader.uniforms.uCausticGain = uCausticGain;

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
        source.geometry.dispose();

        // The material and its three 1024 textures come from the loader, not from us,
        // so nothing else will release them — that is ~16 MB of GPU memory per mount if
        // this section is left to be torn down and rebuilt.
        disposables.push(geo, material);
        const textures = new Set<THREE.Texture>();
        for (const value of Object.values(material)) {
          if (value instanceof THREE.Texture) textures.add(value);
        }
        disposables.push(...textures);

        // Reduced motion draws one frame and stops (see the loop), so the koi arriving
        // after that frame needs to ask for another.
        if (still && !frame && !document.hidden) frame = requestAnimationFrame(animate);
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

    // Gravity controls the breach; water drag slows the return into the idle path.
    const diveEnd = pathAt(0, new THREE.Vector3());
    const diveEndDir = (() => {
      const a = pathAt(0.001, new THREE.Vector3());
      return a.sub(diveEnd).normalize();
    })();
    const diveP2 = diveEnd.clone().addScaledVector(diveEndDir, -DIVE_TANGENT);

    const diveCurve = new THREE.CubicBezierCurve3(
      new THREE.Vector3(),
      new THREE.Vector3(),
      diveP2,
      diveEnd
    );
    const flightOrigin = new THREE.Vector3();
    const flightVelocity = new THREE.Vector3();
    const waterDuration = DIVE_SECONDS - FLIGHT_START - FLIGHT_DURATION;
    const dragNormalization = 1 - Math.exp(-WATER_DRAG * waterDuration);
    let breachAt = 2;
    let launchAt = 0.4;
    const impactPoint = new THREE.Vector3();
    const launchPoint = new THREE.Vector3();
    const probe = new THREE.Vector3();
    const probeDirection = new THREE.Vector3();

    const sampleDive = (seconds: number, point: THREE.Vector3, direction: THREE.Vector3) => {
      const flightTime = Math.max(0, seconds - FLIGHT_START);
      if (flightTime <= FLIGHT_DURATION) {
        point.copy(flightOrigin).addScaledVector(flightVelocity, flightTime);
        point.y -= 0.5 * FLIGHT_GRAVITY * flightTime * flightTime;
        direction.copy(flightVelocity);
        direction.y -= FLIGHT_GRAVITY * flightTime;
        direction.normalize();
        return;
      }
      const waterTime = Math.min(waterDuration, flightTime - FLIGHT_DURATION);
      const u = (1 - Math.exp(-WATER_DRAG * waterTime)) / dragNormalization;
      diveCurve.getPoint(u, point);
      diveCurve.getTangent(u, direction);
    };

    const solveDiveCurve = () => {
      const halfWidth = Math.min(
        2.5,
        (CAM_AIR.z - DIVE_ENTRY_Z) * Math.tan((FOV * Math.PI) / 360) * camera.aspect
      );
      flightOrigin.set(DIVE_ENTRY_X * halfWidth, DIVE_ENTRY_Y, DIVE_ENTRY_Z);
      flightVelocity.set(
        ((DIVE_EXIT_X - DIVE_ENTRY_X) * halfWidth) / FLIGHT_DURATION,
        FLIGHT_SPEED_Y,
        -0.25
      );
      sampleDive(FLIGHT_START + FLIGHT_DURATION, diveCurve.v0, probeDirection);
      probeDirection.copy(flightVelocity);
      probeDirection.y -= FLIGHT_GRAVITY * FLIGHT_DURATION;
      // Match velocity at water entry while exponential drag eases the swimmer down.
      diveCurve.v1.copy(diveCurve.v0).addScaledVector(
        probeDirection,
        dragNormalization / (3 * WATER_DRAG)
      );

      const noseY = (seconds: number) => {
        sampleDive(seconds, probe, probeDirection);
        return probe.y + probeDirection.y * KOI_LENGTH * 0.5 - SURFACE_Y;
      };
      const apex = FLIGHT_START + FLIGHT_SPEED_Y / FLIGHT_GRAVITY;
      const crossing = (start: number, end: number, ascending: boolean, out: THREE.Vector3) => {
        let lo = start;
        let hi = end;
        for (let i = 0; i < 28; i++) {
          const mid = (lo + hi) / 2;
          if ((noseY(mid) < 0) === ascending) lo = mid;
          else hi = mid;
        }
        const seconds = (lo + hi) / 2;
        sampleDive(seconds, out, probeDirection);
        out.addScaledVector(probeDirection, KOI_LENGTH * 0.5);
        out.y = SURFACE_Y;
        return seconds;
      };
      launchAt = crossing(FLIGHT_START, apex, true, launchPoint);
      breachAt = crossing(apex, FLIGHT_START + FLIGHT_DURATION, false, impactPoint);
    };
    solveDiveCurve();

    const diveStage = createDiveStage({
      water: { shallow: SEA.shallow, mid: SEA.mid, deep: SEA.deep },
      lowEnd,
    });
    scene.add(diveStage.group);
    disposables.push(diveStage);

    const divePos = new THREE.Vector3();
    const diveDir = new THREE.Vector3();
    const camAim = new THREE.Vector3();
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

      msgBorn = time;
      msgDissolveAt = Infinity;
      msgAlive = true;
    };

    /**
     * How far through the section the page has scrolled, 0 -> 1.
     *
     * Read off the outer `<section>` rather than off this canvas, because the canvas is
     * stuck to the viewport and so never moves — its own rect says nothing about scroll
     * position. One `getBoundingClientRect` per frame: nothing in this loop writes to
     * layout, so the read never forces a synchronous reflow, and it saves owning a
     * scroll subscription that would then have to be torn down.
     */
    const scrollHost = container.closest("section") ?? container;
    const sectionProgress = () => {
      const rect = scrollHost.getBoundingClientRect();
      const travel = rect.height - (window.innerHeight || 1);
      if (travel <= 0) return rect.top <= 0 ? 1 : 0;
      return Math.min(1, Math.max(0, -rect.top / travel));
    };

    const clock = new THREE.Timer();
    let frame = 0;
    let time = still ? PATH_PERIOD * 0.12 : 0;
    let smoothDive = still ? 1 : Math.min(1, sectionProgress() / DIVE_END);
    let wasDiving = smoothDive < 1;
    let reversingFromLive = false;
    const returnPosition = new THREE.Vector3();
    const returnFacing = new THREE.Vector3();

    const animate = () => {
      if (disposed || document.hidden) {
        frame = 0;
        return;
      }
      clock.update();
      const dt = still ? 0 : Math.min(0.05, clock.getDelta());
      time += dt;
      uTime.value = time;

      // ─── The dive, scrubbed by scroll. `dive` runs 0 -> 1 across DIVE_END of the
      //     section and then stays at 1 for the rest of it, which is the underwater
      //     stretch. Everything above the waterline is a function of this and of nothing
      //     else — no timers — so scrolling back up runs the whole thing in reverse. ───
      const targetDive = still ? 1 : Math.min(1, sectionProgress() / DIVE_END);
      smoothDive += (targetDive - smoothDive) * (1 - Math.exp(-SCROLL_RESPONSE * dt));
      if (Math.abs(targetDive - smoothDive) < 0.0002) smoothDive = targetDive;
      const dive = smoothDive;
      const diveSeconds = dive * DIVE_SECONDS;
      const diving = dive < 1;
      if (diving && !wasDiving) {
        returnPosition.copy(pos);
        returnFacing.copy(facing);
        reversingFromLive = true;
      }
      if (!diving) reversingFromLive = false;
      wasDiving = diving;

      // Hold the horizon through the airborne arc and crown splash before descending.
      if (diving) {
        const cameraStart = breachAt + 0.65;
        const cameraT = THREE.MathUtils.clamp((diveSeconds - cameraStart) / (DIVE_SECONDS - cameraStart), 0, 1);
        const cameraEase = cameraT * cameraT * (3 - 2 * cameraT);
        camera.position.lerpVectors(CAM_AIR, UNDERWATER_CAM, cameraEase);
        camAim.lerpVectors(LOOK_AIR, UNDERWATER_LOOK, cameraEase);
        camera.lookAt(camAim);
      }

      // How submerged the camera is. This single number decides whether the dome is a
      // sky or a sea, which of the two surface faces is drawn, and how the fog reads —
      // driven off the camera's own depth rather than off `dive`, so the change happens
      // exactly as the lens crosses the water and not a moment either side of it.
      const depth = Math.min(1, Math.max(0, (SURFACE_Y - camera.position.y) / 0.9));
      const submerged = depth * depth * (3 - 2 * depth);

      fog.density = FOG_DENSITY_AIR + (FOG_DENSITY - FOG_DENSITY_AIR) * submerged;
      fog.color.copy(airFog).lerp(waterFog, submerged);

      // Light dims and cools going under; the shafts and the particulate only exist down
      // there at all, so they come up with it.
      sun.intensity = 3.1 - 1.0 * submerged;
      sun.color.copy(sunAir).lerp(sunWater, submerged);
      rays.visible = submerged > 0.02;
      motes.visible = submerged > 0.02;
      moteMat.opacity = 0.5 * submerged;
      for (const m of rayMaterials) m.uniforms.uFade.value = submerged;

      // Negative before the koi has gone through, which is how the splash and the
      // surface ripple know they have not happened yet.
      diveStage.update(
        time,
        submerged,
        diveSeconds - breachAt,
        impactPoint,
        camera.position,
        diveSeconds - launchAt,
        launchPoint
      );

      // The cursor and the messages belong to the underwater scene. During the descent
      // the koi is on rails and there is nothing to follow or to read.
      const settled = !diving;
      const following = settled && pointerInside && pointerSeen;

      // Where the mouth is. Everything that asks "has the koi got there yet" asks about
      // this and not about `pos`, which is the middle of the body half a length behind.
      nose.copy(facing).multiplyScalar(KOI_LENGTH * 0.5).add(pos);

      // ─── Messages. Suspended entirely while the cursor is in the section: the koi is
      //     following you then, and a line it is ignoring would read as broken. Any live
      //     message is dissolved out rather than cut. ───
      if (diving) {
        msgAlive = false;
        msgGoneAt = time;
        if (msgRef.current) msgRef.current.style.opacity = "0";
      }
      if (!still && settled && hasMessages) {
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

      if (koiReady && diving) {
        // ─── On rails. Position and facing follow the same virtual clock as the splash.
        //     is identical every time and scrubs cleanly in both directions — steering
        //     it would make it depend on where the koi happened to be when you arrived.
        //     The steering state is kept in step as it goes, so the frame the dive ends
        //     the swimmer takes over from exactly here rather than from wherever it was
        //     left standing. ───
        sampleDive(diveSeconds, divePos, diveDir);
        pos.copy(divePos);
        facing.copy(diveDir).normalize();
        if (reversingFromLive) {
          const returnT = THREE.MathUtils.clamp((1 - dive) / 0.08, 0, 1);
          const returnEase = returnT * returnT * (3 - 2 * returnT);
          pos.lerpVectors(returnPosition, divePos, returnEase);
          facing.lerpVectors(returnFacing, diveDir, returnEase).normalize();
          if (returnT === 1) reversingFromLive = false;
        }
        speed = 0;
        yawRate = 0;
        targetSeeded = false;
        pointerSeeded = false;
        hovering = false;

        // Rolls into the plunge and levels out coming up, taken from how steeply it is
        // heading down — a fish going over the top banks; one levelling off does not.
        const flightT = THREE.MathUtils.clamp((diveSeconds - FLIGHT_START) / FLIGHT_DURATION, 0, 1);
        bank = Math.sin(flightT * Math.PI) * 0.22;
        bankedUp.set(0, 1, 0).applyAxisAngle(facing, -bank);
        koi.up.copy(bankedUp);
        koi.position.copy(pos);
        koi.lookAt(pos.x + facing.x, pos.y + facing.y, pos.z + facing.z);
      } else if (koiReady) {
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

      const fishDepth = THREE.MathUtils.clamp((SURFACE_Y - pos.y + 0.2) / 0.9, 0, 1);
      uWaveAmp.value = KOI_LENGTH * WAVE_AMP * (0.24 + fishDepth * 0.76);
      uCausticGain.value = 0.4 * fishDepth;

      if (!still) {
        // Particulate drifts up and wraps, so the column never empties.
        const arr = moteGeo.attributes.position.array as Float32Array;
        const d = dt;
        for (let i = 0; i < moteCount; i++) {
          const o = i * 3;
          arr[o] += moteDrift[o] * d;
          arr[o + 1] += moteDrift[o + 1] * d;
          arr[o + 2] += moteDrift[o + 2] * d;
          if (arr[o + 1] > MOTE_BOX * 0.35) arr[o + 1] -= MOTE_BOX * 0.7;
        }
        moteGeo.attributes.position.needsUpdate = true;

        // A slow sway on the shafts and a breath on the camera. Both tiny: the scene
        // should feel like held breath, not a boat deck. Only once the dive is over —
        // the descent owns the camera while it runs, and a wobble on top of a scrubbed
        // move reads as the two fighting.
        rays.rotation.y = Math.sin(time * 0.06) * 0.06;
        if (settled) {
          camera.position.x = Math.sin(time * 0.11) * 0.22;
          camera.position.y = UNDERWATER_CAM.y + Math.sin(time * 0.09 + 1.3) * 0.1;
          camera.position.z = UNDERWATER_CAM.z;
          camera.lookAt(UNDERWATER_LOOK);
        }
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

    // Park both when offscreen and when the browser tab is hidden.
    let inView = false;
    let contextLost = false;
    const syncPlayback = () => {
      const shouldRun = inView && !document.hidden && !contextLost && !disposed;
      if (shouldRun && !frame) {
        clock.reset();
        frame = requestAnimationFrame(animate);
      } else if (!shouldRun && frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    };
    const visibility = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        syncPlayback();
      },
      { rootMargin: "12%" }
    );
    visibility.observe(container);
    const onContextLost = (event: Event) => {
      event.preventDefault();
      contextLost = true;
      syncPlayback();
      renderer.domElement.style.opacity = "0";
      setFailed(true);
    };
    const onContextRestored = () => {
      contextLost = false;
      renderer.domElement.style.opacity = "1";
      setFailed(false);
      syncPlayback();
    };
    document.addEventListener("visibilitychange", syncPlayback);
    renderer.domElement.addEventListener("webglcontextlost", onContextLost);
    renderer.domElement.addEventListener("webglcontextrestored", onContextRestored);

    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    const handleResize = () => {
      if (!containerRef.current) return;
      width = containerRef.current.clientWidth;
      height = containerRef.current.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      // The dive's entry point is placed in the frame, so a new frame shape means a new
      // entry point — and a new breach, which the splash and the ripple hang off.
      solveDiveCurve();
      if (resizeTimer) clearTimeout(resizeTimer);
      // One frame after a resize, in case the loop is parked and would otherwise leave
      // a stretched buffer on screen until the section is scrolled back into view.
      resizeTimer = setTimeout(() => !disposed && renderer.render(scene, camera), 80);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      disposed = true;
      visibility.disconnect();
      document.removeEventListener("visibilitychange", syncPlayback);
      renderer.domElement.removeEventListener("webglcontextlost", onContextLost);
      renderer.domElement.removeEventListener("webglcontextrestored", onContextRestored);
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
        // Only ever seen before the first frame renders, or if WebGL is unavailable —
        // the sky-and-sea dome covers the whole frame once the scene is up. Sky at the
        // top and water below, so the placeholder matches where the sequence starts
        // rather than where it ends.
        background: failed ? "transparent" : "linear-gradient(180deg, #1686c9 0%, #95dcec 58%, #2885a5 58.4%, #075173 100%)",
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

    </div>
  );
}

export default UnderwaterScene;
