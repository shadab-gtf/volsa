import * as THREE from "three";

export interface SplashEffects {
  readonly group: THREE.Group;
  /** Seconds relative to contact. A negative age hides that event. */
  update: (
    ageSeconds: number,
    impact: THREE.Vector3,
    submerged: number,
    launchAgeSeconds?: number,
    launchPoint?: THREE.Vector3,
  ) => void;
  dispose: () => void;
}

interface SplashOptions {
  readonly lowEnd: boolean;
  readonly surfaceY: number;
  /** Shared with the ocean so foam follows the same displaced surface. */
  readonly surfaceWaveGLSL?: string;
  readonly timeUniform?: THREE.IUniform<number>;
}

interface Burst {
  readonly group: THREE.Group;
  readonly crown: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
  readonly spray: THREE.Mesh<THREE.InstancedBufferGeometry, THREE.ShaderMaterial>;
  readonly foam: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  readonly age: THREE.IUniform<number>;
  readonly opacity: THREE.IUniform<number>;
  dispose: () => void;
}

const NOISE = /* glsl */ `
float splashHash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float splashNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 w = f * f * (3.0 - 2.0 * f);
  return mix(mix(splashHash(i), splashHash(i + vec2(1.0, 0.0)), w.x),
             mix(splashHash(i + vec2(0.0, 1.0)), splashHash(i + 1.0), w.x), w.y);
}
`;

const CROWN_VERTEX = /* glsl */ `
uniform float uAge;
varying vec2 vUv;
varying vec3 vWorld;
varying float vRim;
void main() {
  vUv = uv;
  float angle = uv.x * 6.2831853;
  float t = max(uAge, 0.0);
  // An ejecta sheet lifts from a narrow contact patch, opens, then falls.
  // Different angular harmonics give the lip unequal fingers and torn edges.
  float irregular = sin(angle * 7.0 + 0.8) * 0.16
                  + sin(angle * 11.0 - 1.7) * 0.09
                  + sin(angle * 19.0 + 2.4) * 0.055;
  float lift = max(0.0, 3.8 * t - 5.6 * t * t);
  float rim = 0.14 + t * 1.32 + irregular * min(t * 1.9, 0.46);
  float foot = 0.12 + t * 0.24;
  float radius = mix(foot, rim, pow(uv.y, 0.8));
  vec3 p = vec3(cos(angle) * radius, lift * pow(uv.y, 1.15), sin(angle) * radius);
  p.y *= 0.8 + irregular;
  p.x += uv.y * t * 0.18;
  p.z -= uv.y * t * 0.06;
  vRim = irregular;
  vec4 world = modelMatrix * vec4(p, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const CROWN_FRAGMENT = /* glsl */ `
uniform float uAge;
uniform float uOpacity;
varying vec2 vUv;
varying vec3 vWorld;
varying float vRim;
${NOISE}
void main() {
  float t = max(uAge, 0.0);
  float grain = splashNoise(vec2(vUv.x * 83.0, vUv.y * 17.0));
  float erosion = smoothstep(0.17, 0.58, t);
  float tear = smoothstep(erosion * vUv.y * 0.8, erosion * vUv.y * 0.8 + 0.18, grain);
  float fade = smoothstep(0.0, 0.035, t) * (1.0 - smoothstep(0.37, 0.72, t));
  float lip = smoothstep(0.8 + vRim * 0.12, 0.99, vUv.y);
  float foot = 1.0 - smoothstep(0.0, 0.25, vUv.y);
  vec3 normal = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
  vec3 eye = normalize(cameraPosition - vWorld);
  float fresnel = pow(1.0 - abs(dot(normal, eye)), 3.0);
  float sunlight = pow(max(dot(reflect(-normalize(vec3(-0.42, 0.66, 0.62)), normal), eye), 0.0), 36.0);
  vec3 color = mix(vec3(0.10, 0.36, 0.47), vec3(0.71, 0.86, 0.91), fresnel * 0.66 + lip * 0.28);
  color = mix(color, vec3(0.94, 0.98, 0.98), lip * grain * 0.55 + sunlight * 0.3);
  float alpha = (0.24 + fresnel * 0.30 + lip * 0.27 + foot * 0.12) * tear * fade * uOpacity;
  if (alpha < 0.012) discard;
  gl_FragColor = vec4(color, alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

const SPRAY_VERTEX = /* glsl */ `
attribute vec3 aOrigin;
attribute vec3 aVelocity;
attribute vec4 aLife;
attribute vec2 aShape;
uniform float uAge;
varying vec2 vUv;
varying float vAlpha;
varying float vMist;
varying float vSeed;
void main() {
  vUv = uv;
  vMist = aShape.x;
  vSeed = aShape.y;
  float age = uAge - aLife.x;
  float t = max(age, 0.0);
  float mist = aShape.x;
  float drag = mix(0.32, 2.3, mist);
  float travel = (1.0 - exp(-drag * t)) / drag;
  vec3 center = aOrigin + aVelocity * travel;
  // Larger drops follow ballistic arcs. Fine spray loses momentum to air.
  center.y -= mix(4.9, 1.65, mist) * t * t;
  center.x += mist * t * t * 0.19;
  vec3 velocity = aVelocity * exp(-drag * t);
  velocity.y -= mix(9.8, 3.3, mist) * t;
  vec4 viewCenter = modelViewMatrix * vec4(center, 1.0);
  vec2 viewVelocity = (mat3(modelViewMatrix) * velocity).xy;
  vec2 along = viewVelocity / max(length(viewVelocity), 0.001);
  vec2 across = vec2(-along.y, along.x);
  float stretch = mix(1.0 + min(length(velocity) * 0.1, 0.85), 1.0, mist);
  float size = aLife.z * mix(1.0, 1.0 + t * 2.4, mist);
  viewCenter.xy += (across * position.x + along * position.y * stretch) * size;
  float lifeFade = 1.0 - smoothstep(aLife.y * 0.6, aLife.y, t);
  float groundFade = smoothstep(-0.015, 0.065, center.y);
  vAlpha = step(0.0, age) * smoothstep(0.0, 0.012, t) * lifeFade * groundFade * aLife.w;
  gl_Position = projectionMatrix * viewCenter;
}
`;

const SPRAY_FRAGMENT = /* glsl */ `
uniform float uOpacity;
varying vec2 vUv;
varying float vAlpha;
varying float vMist;
varying float vSeed;
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r2 = dot(p, p);
  if (r2 > 1.0 || vAlpha < 0.005) discard;
  float edge = 1.0 - smoothstep(0.58, 1.0, r2);
  // A drop has a refractive dark body and a small off-centre sky reflection.
  // Normal alpha blending keeps the spray from reading as glowing confetti.
  float highlight = exp(-dot(p - vec2(-0.27, 0.33), p - vec2(-0.27, 0.33)) * 20.0);
  float rim = smoothstep(0.33, 0.75, r2) * 0.27;
  vec3 color = mix(vec3(0.20, 0.43, 0.55), vec3(0.87, 0.95, 0.98), highlight * 0.82 + rim);
  float mistShape = exp(-r2 * 3.8) * (0.78 + sin(p.x * 11.0 + vSeed) * sin(p.y * 13.0 - vSeed) * 0.22);
  color = mix(color, vec3(0.80, 0.90, 0.94), vMist);
  float alpha = mix(edge * (0.55 + highlight * 0.35), mistShape * 0.32, vMist) * vAlpha * uOpacity;
  if (alpha < 0.008) discard;
  gl_FragColor = vec4(color, alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

const foamVertex = (surfaceWaveGLSL: string): string => /* glsl */ `
uniform float uTime;
varying vec2 vLocal;
${surfaceWaveGLSL}
void main() {
  vLocal = position.xy;
  vec4 world = modelMatrix * vec4(position, 1.0);
  world.y += surfaceWave(world.xz, uTime);
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const FOAM_FRAGMENT = /* glsl */ `
uniform float uAge;
uniform float uOpacity;
varying vec2 vLocal;
${NOISE}
void main() {
  float t = max(uAge, 0.0);
  float r = length(vLocal);
  float angle = atan(vLocal.y, vLocal.x);
  float distort = sin(angle * 5.0 + 0.7) * 0.03 + sin(angle * 9.0 - 1.3) * 0.022;
  float radius = 0.13 + t * 0.85;
  float width = 0.055 + t * 0.045;
  float ring = 1.0 - smoothstep(width * 0.25, width, abs(r - radius - distort));
  // Returning water makes a second, weaker front, following the initial impact.
  float returnTime = max(t - 0.51, 0.0);
  float secondaryRadius = 0.28 + returnTime * 0.92;
  float secondary = (1.0 - smoothstep(0.018, 0.073, abs(r - secondaryRadius - distort * 1.4)))
                  * smoothstep(0.51, 0.69, t) * 0.5;
  float foamPatch = (1.0 - smoothstep(0.11, 0.41 + t * 0.14, r))
              * smoothstep(0.03, 0.14, t) * exp(-t * 2.3);
  if (max(max(ring, secondary), foamPatch) < 0.006) discard;
  float coarse = splashNoise(vLocal * 16.0 + vec2(t * 0.07, -t * 0.11));
  float fine = splashNoise(vLocal * 65.0 + 8.7);
  float breakup = smoothstep(0.28 + t * 0.11, 0.70, coarse * 0.65 + fine * 0.35);
  float alpha = (max(ring, secondary) * breakup + foamPatch * fine * 0.55)
              * exp(-t * 0.88) * smoothstep(0.0, 0.035, t)
              * (1.0 - smoothstep(2.0, 2.6, t)) * uOpacity;
  if (alpha < 0.012) discard;
  gl_FragColor = vec4(mix(vec3(0.46, 0.67, 0.74), vec3(0.88, 0.95, 0.95), fine), alpha * 0.84);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

/** Seeded once: a scroll reversal and a remount produce the same splash. */
function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function createCrownGeometry(lowEnd: boolean): THREE.BufferGeometry {
  const segments = lowEnd ? 48 : 80;
  const rows = 5;
  const vertices = (segments + 1) * rows;
  const positions = new Float32Array(vertices * 3);
  const uvs = new Float32Array(vertices * 2);
  const indices: number[] = [];

  for (let row = 0; row < rows; row++) {
    for (let segment = 0; segment <= segments; segment++) {
      const vertex = row * (segments + 1) + segment;
      uvs[vertex * 2] = segment / segments;
      uvs[vertex * 2 + 1] = row / (rows - 1);
      if (row < rows - 1 && segment < segments) {
        const nextRow = vertex + segments + 1;
        indices.push(vertex, nextRow, vertex + 1, vertex + 1, nextRow, nextRow + 1);
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  return geometry;
}

function createSprayGeometry(count: number, seed: number): THREE.InstancedBufferGeometry {
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute([
    -0.5, -0.5, 0, 0.5, -0.5, 0, -0.5, 0.5, 0, 0.5, 0.5, 0,
  ], 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 1, 1], 2));
  geometry.setIndex([0, 1, 2, 2, 1, 3]);
  geometry.instanceCount = count;

  const origins = new Float32Array(count * 3);
  const velocities = new Float32Array(count * 3);
  const lives = new Float32Array(count * 4);
  const shapes = new Float32Array(count * 2);
  const random = createRandom(seed);

  for (let index = 0; index < count; index++) {
    const mist = index % 5 === 0;
    const angle = random() * Math.PI * 2;
    const radius = 0.10 + random() * 0.09;
    const outward = 0.48 + Math.pow(random(), 0.6) * (mist ? 1.6 : 2.1);
    const lift = (mist ? 0.8 : 1.45) + Math.pow(random(), 0.65) * (mist ? 1.65 : 3.1);
    const birth = random() * (mist ? 0.25 : 0.14);
    const offset = index * 3;
    origins[offset] = Math.cos(angle) * radius;
    origins[offset + 1] = 0.02 + birth * 1.25;
    origins[offset + 2] = Math.sin(angle) * radius;
    velocities[offset] = Math.cos(angle) * outward + 0.22;
    velocities[offset + 1] = lift;
    velocities[offset + 2] = Math.sin(angle) * outward - 0.08;
    lives[index * 4] = birth;
    lives[index * 4 + 1] = mist ? 0.55 + random() * 0.65 : 0.75 + random() * 0.55;
    lives[index * 4 + 2] = mist ? 0.07 + random() * 0.09 : 0.007 + Math.pow(random(), 2.2) * 0.027;
    lives[index * 4 + 3] = mist ? 0.33 + random() * 0.3 : 0.5 + random() * 0.45;
    shapes[index * 2] = mist ? 1 : 0;
    shapes[index * 2 + 1] = random() * 6.28;
  }

  geometry.setAttribute("aOrigin", new THREE.InstancedBufferAttribute(origins, 3));
  geometry.setAttribute("aVelocity", new THREE.InstancedBufferAttribute(velocities, 3));
  geometry.setAttribute("aLife", new THREE.InstancedBufferAttribute(lives, 4));
  geometry.setAttribute("aShape", new THREE.InstancedBufferAttribute(shapes, 2));
  return geometry;
}

function createBurst(
  lowEnd: boolean,
  scale: number,
  seed: number,
  surfaceWaveGLSL: string,
  timeUniform: THREE.IUniform<number>,
): Burst {
  const group = new THREE.Group();
  group.visible = false;
  group.scale.setScalar(scale);
  const age: THREE.IUniform<number> = { value: -1 };
  const opacity: THREE.IUniform<number> = { value: 1 };
  const uniforms = { uAge: age, uOpacity: opacity, uTime: timeUniform };
  const materialOptions = {
    uniforms,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.NormalBlending,
    fog: false,
  } as const;

  const crown = new THREE.Mesh(createCrownGeometry(lowEnd), new THREE.ShaderMaterial({
    ...materialOptions,
    vertexShader: CROWN_VERTEX,
    fragmentShader: CROWN_FRAGMENT,
    side: THREE.DoubleSide,
    forceSinglePass: true,
  }));
  crown.frustumCulled = false;
  crown.renderOrder = 3;

  const sprayCount = lowEnd ? 125 : 300;
  const spray = new THREE.Mesh(createSprayGeometry(Math.round(sprayCount * scale), seed), new THREE.ShaderMaterial({
    ...materialOptions,
    vertexShader: SPRAY_VERTEX,
    fragmentShader: SPRAY_FRAGMENT,
  }));
  spray.frustumCulled = false;
  spray.renderOrder = 4;

  const foamSegments = lowEnd ? 12 : 20;
  const foam = new THREE.Mesh(new THREE.PlaneGeometry(5.8, 5.8, foamSegments, foamSegments), new THREE.ShaderMaterial({
    ...materialOptions,
    vertexShader: foamVertex(surfaceWaveGLSL),
    fragmentShader: FOAM_FRAGMENT,
    side: THREE.DoubleSide,
    forceSinglePass: true,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  }));
  foam.rotation.x = -Math.PI / 2;
  foam.position.y = 0.012;
  // Shader displacement is outside the flat plane's CPU bounds at the waterline.
  foam.frustumCulled = false;
  foam.renderOrder = 2;
  group.add(foam, crown, spray);

  return {
    group,
    crown,
    spray,
    foam,
    age,
    opacity,
    dispose() {
      crown.geometry.dispose();
      crown.material.dispose();
      spray.geometry.dispose();
      spray.material.dispose();
      foam.geometry.dispose();
      foam.material.dispose();
    },
  };
}

/** Three inexpensive draws per active contact; all particles move on the GPU. */
export function createSplashEffects({
  lowEnd,
  surfaceY,
  surfaceWaveGLSL = "float surfaceWave(vec2 p, float t) { return 0.0; }",
  timeUniform = { value: 0 },
}: SplashOptions): SplashEffects {
  const group = new THREE.Group();
  const impactBurst = createBurst(lowEnd, 1, 0x15401, surfaceWaveGLSL, timeUniform);
  const launchBurst = createBurst(lowEnd, 0.64, 0x39117, surfaceWaveGLSL, timeUniform);
  group.add(impactBurst.group, launchBurst.group);

  function updateBurst(burst: Burst, seconds: number, point: THREE.Vector3, visibility: number): void {
    const active = seconds >= 0 && seconds < 2.6 && visibility > 0.005;
    burst.group.visible = active;
    if (!active) return;
    burst.group.position.set(point.x, surfaceY + 0.035, point.z);
    burst.age.value = seconds;
    burst.opacity.value = visibility;
    burst.crown.visible = seconds < 0.72;
    burst.spray.visible = seconds < 1.6;
  }

  return {
    group,
    update(ageSeconds, impact, submerged, launchAgeSeconds = -1, launchPoint = impact) {
      const visibility = 1 - THREE.MathUtils.smoothstep(submerged, 0.05, 0.7);
      updateBurst(impactBurst, ageSeconds, impact, visibility);
      updateBurst(launchBurst, launchAgeSeconds, launchPoint, visibility);
    },
    dispose() {
      impactBurst.dispose();
      launchBurst.dispose();
      group.clear();
    },
  };
}
