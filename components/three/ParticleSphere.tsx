"use client";

import React, { useRef, useEffect } from "react";
import * as THREE from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const PARTICLE_COUNT = 2500;
const SPHERE_RADIUS = 3;
const COLORS = [0x66b616, 0xc6f19a, 0x22480b, 0x8fe331, 0xd8f3d1];

interface ParticleSphereProps {
  className?: string;
}

/**
 * Three.js animated particle sphere for hero background.
 * - Scroll-driven rotation and scale via GSAP ScrollTrigger
 * - requestAnimationFrame for idle float animation
 * - Responsive canvas resize
 * - Cleaned up on unmount
 */
export function ParticleSphere({ className = "" }: ParticleSphereProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const frameIdRef = useRef<number>(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // ── Scene setup ──
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    camera.position.z = 7;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // ── Particles ──
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const sizes = new Float32Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = Math.random() * Math.PI * 2;
      const r = SPHERE_RADIUS * (0.8 + Math.random() * 0.4);

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      const color = new THREE.Color(
        COLORS[Math.floor(Math.random() * COLORS.length)]
      );
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      sizes[i] = Math.random() * 3 + 1;
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 0.04,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particleMesh = new THREE.Points(geometry, material);
    scene.add(particleMesh);

    // ── Scroll-driven animation via GSAP ──
    const scrollState = { rotationX: 0, rotationY: 0, scale: 1 };

    const scrollTween = gsap.to(scrollState, {
      rotationX: Math.PI * 0.5,
      rotationY: Math.PI * 1.5,
      scale: 0.6,
      ease: "none",
      scrollTrigger: {
        trigger: container,
        start: "top top",
        end: "bottom top",
        scrub: 1.5,
      },
    });

    // ── Render loop ──
    let elapsed = 0;

    function animate() {
      elapsed += 0.003;

      particleMesh.rotation.x = scrollState.rotationX + Math.sin(elapsed) * 0.1;
      particleMesh.rotation.y =
        scrollState.rotationY + elapsed * 0.15;
      particleMesh.scale.setScalar(scrollState.scale);

      renderer.render(scene, camera);
      frameIdRef.current = requestAnimationFrame(animate);
    }

    animate();

    // ── Resize handler ──
    function handleResize() {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }

    window.addEventListener("resize", handleResize);

    // ── Cleanup ──
    return () => {
      cancelAnimationFrame(frameIdRef.current);
      scrollTween.scrollTrigger?.kill();
      scrollTween.kill();
      window.removeEventListener("resize", handleResize);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 pointer-events-none ${className}`}
      aria-hidden="true"
    />
  );
}
