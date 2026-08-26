"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/** One orbiting node per council agent. */
export interface CoreNode {
  /** Bright, connected node when the agent votes to enter. */
  active: boolean;
}

interface ConsensusCoreProps {
  nodes: CoreNode[];
  className?: string;
}

const SHELL_PARTICLES = 1100;
const ORBIT_RADIUS = 2.45;

const COLOR_LEAF = 0x66b616;
const COLOR_LIME = 0xc6f19a;
const COLOR_PALE = 0x4a6b32;

/**
 * The Agent Council's decision core.
 *
 * A wireframe nucleus wrapped in a particle shell, ringed by one node per agent:
 * voting agents sit bright with a live spoke into the core, abstaining agents sit
 * dim and unconnected. Scroll drives the orbit; an idle drift keeps it alive.
 *
 * Performance shape:
 * - `MeshBasicMaterial` / `Points` only — no lights, no shadow maps, no passes.
 * - Rendered on the shared GSAP ticker, the same clock as Lenis and ScrollTrigger.
 * - Ticker callback is attached only while the canvas is on screen, so the scene
 *   costs literally nothing for the rest of the page.
 */
export function ConsensusCore({ nodes, className = "" }: ConsensusCoreProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  // Read inside the render loop without restarting the scene on prop identity.
  const nodesRef = useRef(nodes);
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const agents = nodesRef.current;

    const width = mount.clientWidth || 480;
    const height = mount.clientHeight || 480;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 0.55, 8.2);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    const world = new THREE.Group();
    world.rotation.x = 0.32;
    scene.add(world);

    // ── Nucleus: wireframe icosahedron + a tighter inner cage ──────────
    const nucleusGeo = new THREE.IcosahedronGeometry(1.15, 1);
    const nucleus = new THREE.LineSegments(
      new THREE.WireframeGeometry(nucleusGeo),
      new THREE.LineBasicMaterial({
        color: COLOR_LEAF,
        transparent: true,
        opacity: 0.55,
      })
    );
    world.add(nucleus);

    const innerGeo = new THREE.IcosahedronGeometry(0.62, 0);
    const innerCore = new THREE.Mesh(
      innerGeo,
      new THREE.MeshBasicMaterial({
        color: COLOR_LIME,
        transparent: true,
        opacity: 0.16,
      })
    );
    world.add(innerCore);

    // ── Particle shell ────────────────────────────────────────────────
    const shellPositions = new Float32Array(SHELL_PARTICLES * 3);
    const shellColors = new Float32Array(SHELL_PARTICLES * 3);
    const shellPalette = [
      new THREE.Color(COLOR_LEAF),
      new THREE.Color(COLOR_LIME),
      new THREE.Color(0xffffff),
    ];

    for (let i = 0; i < SHELL_PARTICLES; i++) {
      const idx = i * 3;
      // Even distribution over a sphere: uniform in cos(phi), not in phi.
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = Math.random() * Math.PI * 2;
      const radius = 1.5 + Math.random() * 0.55;

      shellPositions[idx] = radius * Math.sin(phi) * Math.cos(theta);
      shellPositions[idx + 1] = radius * Math.sin(phi) * Math.sin(theta);
      shellPositions[idx + 2] = radius * Math.cos(phi);

      const color = shellPalette[i % shellPalette.length];
      shellColors[idx] = color.r;
      shellColors[idx + 1] = color.g;
      shellColors[idx + 2] = color.b;
    }

    const shellGeo = new THREE.BufferGeometry();
    shellGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(shellPositions, 3)
    );
    shellGeo.setAttribute("color", new THREE.BufferAttribute(shellColors, 3));

    // Soft round sprite — a single 64px canvas, reused by every particle.
    const sprite = document.createElement("canvas");
    sprite.width = 64;
    sprite.height = 64;
    const spriteCtx = sprite.getContext("2d");
    if (spriteCtx) {
      const grad = spriteCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, "rgba(255,255,255,1)");
      grad.addColorStop(0.4, "rgba(198,241,154,0.75)");
      grad.addColorStop(1, "rgba(0,0,0,0)");
      spriteCtx.fillStyle = grad;
      spriteCtx.fillRect(0, 0, 64, 64);
    }
    const spriteTexture = new THREE.CanvasTexture(sprite);

    const shellMaterial = new THREE.PointsMaterial({
      size: 0.055,
      map: spriteTexture,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const shell = new THREE.Points(shellGeo, shellMaterial);
    world.add(shell);

    // ── Orbit ring ────────────────────────────────────────────────────
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(ORBIT_RADIUS, 0.008, 6, 160),
      new THREE.MeshBasicMaterial({
        color: COLOR_LEAF,
        transparent: true,
        opacity: 0.35,
      })
    );
    ring.rotation.x = Math.PI / 2;
    world.add(ring);

    // ── One node per agent, plus a spoke for the voting ones ──────────
    const nodeGeo = new THREE.IcosahedronGeometry(0.115, 1);
    const spokeGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 0),
    ]);

    const nodeMeshes: THREE.Mesh[] = [];
    const spokes: THREE.Line[] = [];
    const nodeBase: number[] = [];

    agents.forEach((agent, index) => {
      const angle = (index / agents.length) * Math.PI * 2;
      const x = Math.cos(angle) * ORBIT_RADIUS;
      const z = Math.sin(angle) * ORBIT_RADIUS;
      // Slight vertical scatter so the ring reads as a council, not a clock face.
      const y = Math.sin(angle * 2) * 0.22;

      const material = new THREE.MeshBasicMaterial({
        color: agent.active ? COLOR_LIME : COLOR_PALE,
        transparent: true,
        opacity: agent.active ? 1 : 0.5,
      });

      const node = new THREE.Mesh(nodeGeo, material);
      node.position.set(x, y, z);
      node.scale.setScalar(agent.active ? 1 : 0.72);
      world.add(node);
      nodeMeshes.push(node);
      nodeBase.push(agent.active ? 1 : 0.72);

      // Abstaining agents stay unwired — the missing spokes are the point.
      if (!agent.active) return;

      const spoke = new THREE.Line(
        spokeGeo.clone(),
        new THREE.LineBasicMaterial({
          color: COLOR_LEAF,
          transparent: true,
          opacity: 0.4,
        })
      );
      const positions = spoke.geometry.attributes
        .position as THREE.BufferAttribute;
      positions.setXYZ(0, 0, 0, 0);
      positions.setXYZ(1, x, y, z);
      positions.needsUpdate = true;
      world.add(spoke);
      spokes.push(spoke);
    });

    // ── Scroll-linked orbit ───────────────────────────────────────────
    const drive = { spin: 0, tilt: 0.32 };
    let scrollTrigger: ScrollTrigger | null = null;

    if (!prefersReduced) {
      const tween = gsap.to(drive, {
        spin: Math.PI * 0.9,
        tilt: 0.06,
        ease: "none",
        scrollTrigger: {
          trigger: mount,
          start: "top bottom",
          end: "bottom top",
          scrub: 1,
        },
      });
      scrollTrigger = tween.scrollTrigger ?? null;
    }

    // ── Render loop, only while visible ───────────────────────────────
    const clock = new THREE.Clock();
    let running = false;

    function render() {
      const elapsed = clock.getElapsedTime();

      world.rotation.y = drive.spin + elapsed * 0.07;
      world.rotation.x = drive.tilt + Math.sin(elapsed * 0.35) * 0.04;

      nucleus.rotation.y = -elapsed * 0.22;
      nucleus.rotation.x = elapsed * 0.13;
      shell.rotation.y = elapsed * 0.045;

      // Voting nodes breathe in a travelling wave; the core answers in sync.
      nodeMeshes.forEach((node, index) => {
        const pulse = 1 + Math.sin(elapsed * 1.6 - index * 0.7) * 0.14;
        node.scale.setScalar(nodeBase[index] * pulse);
      });

      const coreMaterial = innerCore.material as THREE.MeshBasicMaterial;
      coreMaterial.opacity = 0.13 + Math.sin(elapsed * 1.6) * 0.05;

      renderer.render(scene, camera);
    }

    function start() {
      if (running) return;
      running = true;
      gsap.ticker.add(render);
    }

    function stop() {
      if (!running) return;
      running = false;
      gsap.ticker.remove(render);
    }

    // Draw one frame immediately so the canvas is never blank.
    render();

    if (prefersReduced) {
      // Static composition: one frame is the whole animation.
    } else {
      const observer = new IntersectionObserver(
        ([entry]) => (entry.isIntersecting ? start() : stop()),
        { rootMargin: "200px 0px" }
      );
      observer.observe(mount);

      const onResize = () => {
        const w = mount.clientWidth;
        const h = mount.clientHeight;
        if (!w || !h) return;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
        render();
      };
      window.addEventListener("resize", onResize);

      return () => {
        observer.disconnect();
        window.removeEventListener("resize", onResize);
        stop();
        scrollTrigger?.kill();
        disposeAll();
      };
    }

    const onResizeStatic = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      if (!w || !h) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      render();
    };
    window.addEventListener("resize", onResizeStatic);

    return () => {
      window.removeEventListener("resize", onResizeStatic);
      stop();
      scrollTrigger?.kill();
      disposeAll();
    };

    function disposeAll() {
      nucleusGeo.dispose();
      innerGeo.dispose();
      nodeGeo.dispose();
      spokeGeo.dispose();
      shellGeo.dispose();
      shellMaterial.dispose();
      spriteTexture.dispose();
      nucleus.geometry.dispose();
      (nucleus.material as THREE.Material).dispose();
      (innerCore.material as THREE.Material).dispose();
      ring.geometry.dispose();
      (ring.material as THREE.Material).dispose();
      nodeMeshes.forEach((node) =>
        (node.material as THREE.Material).dispose()
      );
      spokes.forEach((spoke) => {
        spoke.geometry.dispose();
        (spoke.material as THREE.Material).dispose();
      });
      renderer.dispose();
      if (mount?.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    }
  }, []);

  return (
    <div
      ref={mountRef}
      className={`pointer-events-none ${className}`}
      aria-hidden="true"
    />
  );
}
