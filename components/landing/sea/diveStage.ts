"use client";

import * as THREE from "three";
import { createSplashEffects } from "./splashEffects";

export const SURFACE_Y = 2.4;
export const SUN_DIR = new THREE.Vector3(-0.42, 0.66, 0.62).normalize();

const SKY = {
  zenith: "#087bc7",
  horizon: "#c1ecf4",
  sun: "#fff5df",
  cloud: "#f8fcff",
  ocean: "#063550",
} as const;

const NOISE = /* glsl */ `
float seaHash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float seaNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(seaHash(i), seaHash(i + vec2(1.0, 0.0)), u.x),
             mix(seaHash(i + vec2(0.0, 1.0)), seaHash(i + vec2(1.0)), u.x), u.y);
}
float cloudNoise(vec2 p) {
  float sum = 0.0;
  float weight = 0.57;
  for (int octave = 0; octave < CLOUD_OCTAVES; octave++) {
    sum += seaNoise(p) * weight;
    p = mat2(0.94, -0.34, 0.34, 0.94) * p * 2.07 + 4.3;
    weight *= 0.48;
  }
  return sum;
}
`;

// Shared with the splash foam so it follows the same water surface.
const SURFACE_WAVE = /* glsl */ `
float surfaceWave(vec2 p, float t) {
  return sin(dot(p, vec2(0.94, 0.34)) * 0.73 - t * 0.86) * 0.064
       + sin(dot(p, vec2(-0.36, 0.93)) * 1.17 - t * 1.12) * 0.038
       + sin(dot(p, vec2(0.82, -0.57)) * 2.15 + t * 1.43) * 0.015;
}
`;

const RIPPLE = /* glsl */ `
uniform vec3 uImpact;
uniform vec3 uLaunch;
uniform float uImpactAge;
uniform float uLaunchAge;

// The contact wave spreads and disperses in seconds, independently of frame rate.
vec3 contactWave(vec2 p, vec3 center, float age) {
  if (age < 0.0 || age > 5.0) return vec3(0.0);
  vec2 offset = p - center.xz;
  float distanceToCenter = length(offset);
  float radius = 0.12 + age * 1.85;
  float width = 0.16 + age * 0.14;
  float band = exp(-pow((distanceToCenter - radius) / width, 2.0));
  float fade = exp(-age * 0.88) * smoothstep(0.0, 0.07, age);
  float phase = (distanceToCenter - radius) * 17.0;
  vec2 slope = offset / max(distanceToCenter, 0.01) * cos(phase) * band * fade * 0.19;
  return vec3(slope, band * fade);
}
`;

const SKY_COLOR = /* glsl */ `
uniform vec3 uZenith, uHorizon, uSun, uCloud, uSunDir;
${NOISE}

vec3 clearSky(vec3 direction) {
  float elevation = clamp(direction.y, 0.0, 1.0);
  vec3 color = mix(uHorizon, uZenith, pow(elevation, 0.38));
  float sunlight = max(dot(direction, uSunDir), 0.0);
  color += uSun * pow(sunlight, 18.0) * 0.13;
  color += uSun * pow(sunlight, 1400.0) * 3.0;
  return color;
}

vec3 skyColor(vec3 direction, float time) {
  vec3 color = clearSky(direction);
  if (direction.y <= 0.004) return color;

  // A high, wind-stretched layer: curved wisps converge naturally at the horizon.
  vec2 projected = direction.xz / max(direction.y + 0.055, 0.06);
  vec2 p = mat2(0.87, -0.49, 0.49, 0.87) * projected;
  p += vec2(time * 0.0035, time * 0.0012);
  float curl = cloudNoise(p * 0.42 + 11.7);
  p.y += sin(p.x * 0.6) * 0.65 + curl * 1.8;
  float veil = cloudNoise(vec2(p.x * 0.42, p.y * 2.1));
  float strands = seaNoise(vec2(p.x * 1.8, p.y * 19.0) + curl * 3.0);
  float wisps = smoothstep(0.40, 0.74, veil) * mix(0.45, 1.0, strands);
  float thinCloud = smoothstep(0.44, 0.76, curl) * 0.16;
  float opacity = (wisps * 0.94 + thinCloud) * smoothstep(0.015, 0.13, direction.y);
  vec3 litCloud = mix(uCloud * 0.78, uCloud, smoothstep(0.39, 0.65, veil));
  return mix(color, litCloud, clamp(opacity, 0.0, 0.92));
}
`;

const OCEAN_COLOR = /* glsl */ `
uniform vec3 uOcean;
${RIPPLE}

vec2 swellSlope(vec2 p, float time) {
  return vec2(0.94, 0.34) * cos(dot(p, vec2(0.94, 0.34)) * 0.73 - time * 0.86) * 0.04672
       + vec2(-0.36, 0.93) * cos(dot(p, vec2(-0.36, 0.93)) * 1.17 - time * 1.12) * 0.04446
       + vec2(0.82, -0.57) * cos(dot(p, vec2(0.82, -0.57)) * 2.15 + time * 1.43) * 0.03225;
}

vec2 windWave(vec2 p, vec2 direction, float frequency, float slope, float speed, float time, float footprint) {
  float visible = 1.0 - smoothstep(0.5, 2.8, footprint * frequency);
  return direction * cos(dot(p, direction) * frequency + time * speed) * slope * visible;
}

vec3 oceanColor(vec3 world, vec3 eye, float time) {
  vec2 p = world.xz;
  // Filter the short waves as they recede, preventing sparkle and moire on phones.
  float footprint = max(length(dFdx(p)), length(dFdy(p)));
  vec2 slope = swellSlope(p, time);
  slope += windWave(p, vec2(0.96, 0.28), 4.8, 0.095, -2.17, time, footprint);
  slope += windWave(p, vec2(0.79, -0.61), 8.3, 0.087, 2.91, time, footprint);
  slope += windWave(p, vec2(-0.32, 0.95), 15.2, 0.065, -3.65, time, footprint);
  slope += windWave(p, vec2(0.97, 0.24), 28.1, 0.047, 4.72, time, footprint);
  #ifndef LOW_DETAIL
    slope += windWave(p, vec2(0.69, -0.72), 47.4, 0.032, -5.34, time, footprint);
    slope += windWave(p, vec2(0.91, 0.41), 76.3, 0.021, 6.13, time, footprint);
  #endif

  vec3 entry = contactWave(p, uImpact, uImpactAge);
  vec3 exitWave = contactWave(p, uLaunch, uLaunchAge);
  slope += entry.xy + exitWave.xy * 0.6;
  vec3 normal = normalize(vec3(-slope.x, 1.0, -slope.y));
  vec3 view = normalize(eye - world);
  vec3 reflected = reflect(-view, normal);
  reflected.y = abs(reflected.y);
  vec3 reflection = clearSky(reflected);
  float viewAngle = max(dot(view, normal), 0.0);
  float fresnel = 0.02 + 0.98 * pow(1.0 - viewAngle, 5.0);
  vec3 color = mix(uOcean, reflection * 0.72, 0.19 + fresnel * 0.76);

  vec3 halfDirection = normalize(view + uSunDir);
  float highlight = pow(max(dot(normal, halfDirection), 0.0), 210.0);
  color += uSun * highlight * 1.15;
  color += uCloud * (entry.z + exitWave.z * 0.5) * 0.10;
  color *= 0.91 + normal.y * 0.09;

  // The same shader shades the distant backdrop and near mesh, hiding the mesh edge.
  float haze = 1.0 - exp(-length(eye.xz - p) * 0.0042);
  return mix(color, uHorizon * vec3(0.43, 0.62, 0.72), haze * 0.8);
}
`;

const DOME_VERT = /* glsl */ `
varying vec3 vDirection;
void main() {
  vDirection = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const DOME_FRAG = /* glsl */ `
precision highp float;
varying vec3 vDirection;
uniform float uTime, uDepth, uSurfaceY;
uniform vec3 uEye, uShallow, uMid, uDeep;
${SKY_COLOR}
${OCEAN_COLOR}
void main() {
  vec3 direction = normalize(vDirection);
  vec3 water = mix(uDeep, uShallow, pow(clamp(direction.y * 0.5 + 0.5, 0.0, 1.0), 1.7));
  water = mix(water, uMid, 0.3);
  vec3 color = water;
  if (uDepth < 0.999) {
    vec3 air;
    if (direction.y < 0.0 && uEye.y > uSurfaceY) {
      float distanceToSea = min((uSurfaceY - uEye.y) / min(direction.y, -0.00001), 20000.0);
      vec3 hit = uEye + direction * distanceToSea;
      hit.y = uSurfaceY;
      air = oceanColor(hit, uEye, uTime);
    } else {
      air = skyColor(direction, uTime);
    }
    color = mix(air, water, uDepth);
  }
  gl_FragColor = vec4(color, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

const SURFACE_VERT = /* glsl */ `
varying vec3 vWorld;
uniform float uTime;
${SURFACE_WAVE}
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  world.y += surfaceWave(world.xz, uTime);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const SURFACE_OVER_FRAG = /* glsl */ `
precision highp float;
varying vec3 vWorld;
uniform float uTime, uDepth;
uniform vec3 uEye, uShallow;
${SKY_COLOR}
${OCEAN_COLOR}
void main() {
  vec3 color = oceanColor(vWorld, uEye, uTime);
  gl_FragColor = vec4(mix(color, uShallow, uDepth * 0.45), 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

const SURFACE_UNDER_FRAG = /* glsl */ `
precision highp float;
varying vec3 vWorld;
uniform float uTime, uDepth;
uniform vec3 uEye, uSun, uShallow;
${RIPPLE}
void main() {
  vec3 view = normalize(vWorld - uEye);
  vec2 p = vWorld.xz;
  float a = sin(p.x * 3.1 + sin(p.y * 2.3 + uTime * 0.9) * 1.7);
  float b = sin(p.y * 2.7 + sin(p.x * 1.9 - uTime * 0.7) * 1.5);
  float caustic = pow(max(a * b, 0.0), 3.0);
  float window = smoothstep(0.62, 0.76, view.y);
  float contact = contactWave(p, uImpact, uImpactAge).z;
  vec3 color = mix(uShallow * 0.7, uSun * 0.74, window);
  color += uSun * (caustic * 0.16 + contact * 0.16);
  float distanceFade = exp(-length(vWorld - uEye) * 0.055);
  gl_FragColor = vec4(color, (0.24 + window * 0.35 + caustic * 0.08) * uDepth * distanceFade);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export interface DiveStage {
  readonly group: THREE.Group;
  /** Contact ages are elapsed seconds; negative ages hide the corresponding event. */
  update: (
    time: number,
    depth: number,
    breachAge: number,
    impact: THREE.Vector3,
    cameraPos: THREE.Vector3,
    launchAge?: number,
    launchPoint?: THREE.Vector3,
  ) => void;
  dispose: () => void;
}

export function createDiveStage(opts: {
  water: { shallow: string; mid: string; deep: string };
  lowEnd: boolean;
}): DiveStage {
  const group = new THREE.Group();
  const uTime = { value: 0 };
  const uDepth = { value: 0 };
  const uEye = { value: new THREE.Vector3() };
  const uImpact = { value: new THREE.Vector3() };
  const uLaunch = { value: new THREE.Vector3() };
  const uImpactAge = { value: -1 };
  const uLaunchAge = { value: -1 };
  const uniforms = {
    uTime,
    uDepth,
    uEye,
    uImpact,
    uImpactAge,
    uLaunch,
    uLaunchAge,
    uSurfaceY: { value: SURFACE_Y },
    uSunDir: { value: SUN_DIR.clone() },
    uSun: { value: new THREE.Color(SKY.sun) },
    uZenith: { value: new THREE.Color(SKY.zenith) },
    uHorizon: { value: new THREE.Color(SKY.horizon) },
    uCloud: { value: new THREE.Color(SKY.cloud) },
    uOcean: { value: new THREE.Color(SKY.ocean) },
    uShallow: { value: new THREE.Color(opts.water.shallow) },
    uMid: { value: new THREE.Color(opts.water.mid) },
    uDeep: { value: new THREE.Color(opts.water.deep) },
  };
  const defines: Record<string, number> = { CLOUD_OCTAVES: opts.lowEnd ? 3 : 4 };
  if (opts.lowEnd) defines.LOW_DETAIL = 1;

  const domeGeometry = new THREE.SphereGeometry(40, 24, 12);
  const domeMaterial = new THREE.ShaderMaterial({
    vertexShader: DOME_VERT,
    fragmentShader: DOME_FRAG,
    uniforms,
    defines,
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: false,
    fog: false,
  });
  const dome = new THREE.Mesh(domeGeometry, domeMaterial);
  dome.renderOrder = -10;
  dome.frustumCulled = false;
  group.add(dome);

  // Concentrate vertices around the breach; the distant sea needs no dense mesh.
  const segments = opts.lowEnd ? 56 : 88;
  const surfaceGeometry = new THREE.PlaneGeometry(2, 2, segments, segments);
  const positions = surfaceGeometry.getAttribute("position");
  for (let index = 0; index < positions.count; index++) {
    const x = positions.getX(index);
    const y = positions.getY(index);
    positions.setXY(index, Math.sign(x) * x * x * 72, Math.sign(y) * y * y * 72);
  }
  positions.needsUpdate = true;
  surfaceGeometry.computeBoundingSphere();

  const overMaterial = new THREE.ShaderMaterial({
    vertexShader: SURFACE_VERT,
    fragmentShader: SURFACE_OVER_FRAG,
    uniforms,
    defines,
    side: THREE.FrontSide,
    depthWrite: true,
    fog: false,
  });
  const over = new THREE.Mesh(surfaceGeometry, overMaterial);
  over.rotation.x = -Math.PI / 2;
  over.position.y = SURFACE_Y;
  over.frustumCulled = false;
  group.add(over);

  const underMaterial = new THREE.ShaderMaterial({
    vertexShader: SURFACE_VERT,
    fragmentShader: SURFACE_UNDER_FRAG,
    uniforms,
    transparent: true,
    depthWrite: false,
    side: THREE.BackSide,
    fog: false,
  });
  const under = new THREE.Mesh(surfaceGeometry, underMaterial);
  under.rotation.copy(over.rotation);
  under.position.copy(over.position);
  under.frustumCulled = false;
  group.add(under);

  const splash = createSplashEffects({
    lowEnd: opts.lowEnd,
    surfaceY: SURFACE_Y,
    surfaceWaveGLSL: SURFACE_WAVE,
    timeUniform: uTime,
  });
  group.add(splash.group);

  return {
    group,
    update(time, depth, breachAge, impact, cameraPos, launchAge = -1, launchPoint = impact) {
      uTime.value = time;
      uDepth.value = THREE.MathUtils.clamp(depth, 0, 1);
      uEye.value.copy(cameraPos);
      uImpact.value.copy(impact);
      uLaunch.value.copy(launchPoint);
      uImpactAge.value = breachAge;
      uLaunchAge.value = launchAge;
      dome.position.copy(cameraPos);
      over.visible = cameraPos.y > SURFACE_Y - 0.14;
      under.visible = depth > 0.001;
      splash.update(breachAge, impact, depth, launchAge, launchPoint);
    },
    dispose() {
      splash.dispose();
      domeGeometry.dispose();
      domeMaterial.dispose();
      surfaceGeometry.dispose();
      overMaterial.dispose();
      underMaterial.dispose();
    },
  };
}
