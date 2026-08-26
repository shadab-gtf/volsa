"use client";

import React, { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

interface SphereItem {
  id: number;
  basePosition: [number, number, number];
  radius: number;
  speed: number;
  phase: number;
  floatScale: number;
}

interface GlossySphereSwarmProps {
  preset?: "swarm" | "shield" | "router" | "matrix" | "oracle" | "vault";
  accentColor?: string;
  isActive?: boolean;
}

/**
 * Procedural glossy dark metallic / obsidian sphere cluster.
 * Features organic breathing, rim lighting reflections, and silky float physics.
 */
export function GlossySphereSwarm({
  preset = "swarm",
  accentColor = "#66b616",
  isActive = true,
}: GlossySphereSwarmProps) {
  const groupRef = useRef<THREE.Group>(null);
  const sphereRefs = useRef<(THREE.Mesh | null)[]>([]);

  // Generate deterministic cluster layout based on preset
  const spheres = useMemo<SphereItem[]>(() => {
    const list: SphereItem[] = [];

    // Core central sphere
    list.push({
      id: 0,
      basePosition: [0, 0, 0.15],
      radius: 0.58,
      speed: 0.8,
      phase: 0,
      floatScale: 0.04,
    });

    // Outer cluster coordinates based on preset
    const count = 22;
    for (let i = 1; i <= count; i++) {
      let x = 0;
      let y = 0;
      let z = 0;
      let r = 0.12 + (i % 5) * 0.055;

      if (preset === "shield") {
        // Hexagonal / shield arrangement
        const angle = (i / count) * Math.PI * 2;
        const dist = 0.55 + (i % 3) * 0.22;
        x = Math.cos(angle) * dist;
        y = Math.sin(angle) * dist * 1.15;
        z = Math.sin(i * 1.5) * 0.25;
      } else if (preset === "router") {
        // Orbital elliptical ring
        const angle = (i / count) * Math.PI * 2;
        x = Math.cos(angle) * (0.65 + (i % 2) * 0.25);
        y = Math.sin(angle) * 0.45 + ((i % 4) - 2) * 0.12;
        z = Math.sin(angle * 2) * 0.3;
      } else if (preset === "matrix") {
        // Grid-like node cluster
        const row = Math.floor((i - 1) / 5) - 2;
        const col = ((i - 1) % 5) - 2;
        x = col * 0.28 + ((i % 2) - 0.5) * 0.08;
        y = row * 0.28 + ((i % 3) - 1) * 0.06;
        z = (Math.sin(col) + Math.cos(row)) * 0.18;
        r = 0.1 + ((i * 3) % 4) * 0.04;
      } else {
        // Organic swarm / metaball cluster (as shown in reference image)
        const phi = Math.acos(2 * ((i - 1) / (count - 1)) - 1);
        const theta = Math.sqrt(count * Math.PI) * phi;
        const dist = 0.48 + ((i * 7) % 11) * 0.038;

        x = dist * Math.sin(phi) * Math.cos(theta);
        y = dist * Math.sin(phi) * Math.sin(theta) * 0.95;
        z = dist * Math.cos(phi) * 0.65;
        r = 0.1 + ((i * 17) % 6) * 0.052;
      }

      list.push({
        id: i,
        basePosition: [x, y, z],
        radius: r,
        speed: 0.6 + ((i * 13) % 10) * 0.12,
        phase: (i * Math.PI * 2) / count,
        floatScale: 0.03 + (i % 4) * 0.015,
      });
    }

    return list;
  }, [preset]);

  // Obsidian / Emerald Pearl Material
  const sphereMaterial = useMemo(() => {
    return new THREE.MeshPhysicalMaterial({
      color: new THREE.Color("#121913"),
      emissive: new THREE.Color("#050d06"),
      emissiveIntensity: 0.35,
      roughness: 0.14,
      metalness: 0.92,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
      reflectivity: 0.98,
      ior: 1.52,
    });
  }, []);

  // Soft lime highlight material for occasional accent pearls
  const accentMaterial = useMemo(() => {
    return new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(accentColor).multiplyScalar(0.7),
      emissive: new THREE.Color(accentColor),
      emissiveIntensity: 0.25,
      roughness: 0.18,
      metalness: 0.85,
      clearcoat: 0.9,
      clearcoatRoughness: 0.1,
    });
  }, [accentColor]);

  // Frame animation for breathing & float physics
  useFrame(({ clock, pointer }) => {
    const elapsed = clock.getElapsedTime();

    if (groupRef.current) {
      // Gentle cluster rotation and pointer response
      const targetRotY = pointer.x * (isActive ? 0.35 : 0.12);
      const targetRotX = -pointer.y * (isActive ? 0.25 : 0.08);

      groupRef.current.rotation.y = THREE.MathUtils.damp(
        groupRef.current.rotation.y,
        targetRotY + Math.sin(elapsed * 0.4) * 0.08,
        4,
        0.016
      );

      groupRef.current.rotation.x = THREE.MathUtils.damp(
        groupRef.current.rotation.x,
        targetRotX + Math.cos(elapsed * 0.3) * 0.05,
        4,
        0.016
      );

      // Subtle breathing scale
      const breathe = 1 + Math.sin(elapsed * 1.4) * 0.025;
      groupRef.current.scale.set(breathe, breathe, breathe);
    }

    // Individual sphere float dynamics
    spheres.forEach((sphere, index) => {
      const mesh = sphereRefs.current[index];
      if (!mesh) return;

      const [bx, by, bz] = sphere.basePosition;
      const t = elapsed * sphere.speed + sphere.phase;

      mesh.position.x = bx + Math.sin(t) * sphere.floatScale;
      mesh.position.y = by + Math.cos(t * 1.1) * sphere.floatScale;
      mesh.position.z = bz + Math.sin(t * 0.7) * (sphere.floatScale * 0.8);
    });
  });

  return (
    <group ref={groupRef}>
      {/* Dynamic cluster point light for specular gleam */}
      <pointLight
        position={[0.8, 1.2, 1.5]}
        intensity={2.8}
        color="#ffffff"
        distance={6}
      />
      <pointLight
        position={[-1.2, -0.8, 1.0]}
        intensity={1.9}
        color={accentColor}
        distance={5}
      />

      {spheres.map((sphere, index) => {
        const isAccent = index === 3 || index === 7;
        return (
          <mesh
            key={sphere.id}
            ref={(el) => {
              sphereRefs.current[index] = el;
            }}
            position={sphere.basePosition}
            material={isAccent ? accentMaterial : sphereMaterial}
            castShadow
            receiveShadow
          >
            <sphereGeometry args={[sphere.radius, 36, 36]} />
          </mesh>
        );
      })}
    </group>
  );
}

