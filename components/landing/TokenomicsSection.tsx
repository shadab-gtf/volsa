"use client";

import React, { useRef, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SECTION_IDS } from "@/constants/landing.constants";
import { getTokenomics } from "@/services/landing.service";
import { SectionWrapper } from "@/components/ui/SectionWrapper";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

gsap.registerPlugin(ScrollTrigger);

const allocations = getTokenomics();
const RADIUS = 90;
const STROKE_WIDTH = 28;
const CENTER = RADIUS + STROKE_WIDTH / 2 + 4;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * Tokenomics section with animated SVG donut chart.
 * Each segment animates in via GSAP ScrollTrigger.
 */
export function TokenomicsSection() {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const circles = svg.querySelectorAll<SVGCircleElement>("[data-segment]");

    const ctx = gsap.context(() => {
      circles.forEach((circle) => {
        const target = parseFloat(circle.dataset.target ?? "0");
        gsap.fromTo(
          circle,
          { strokeDasharray: `0 ${CIRCUMFERENCE}` },
          {
            strokeDasharray: `${target} ${CIRCUMFERENCE - target}`,
            duration: 1.2,
            ease: "power3.out",
            scrollTrigger: {
              trigger: svg,
              start: "top 75%",
              toggleActions: "play none none none",
            },
          }
        );
      });
    }, svg);

    return () => ctx.revert();
  }, []);

  // Segment offsets, accumulated without mutating anything across renders.
  const segments = allocations.reduce<
    Array<(typeof allocations)[number] & { length: number; offset: number }>
  >((acc, alloc) => {
    const previous = acc[acc.length - 1];
    const offset = previous ? previous.offset + previous.length : 0;
    const length = (alloc.percentage / 100) * CIRCUMFERENCE;
    acc.push({ ...alloc, length, offset });
    return acc;
  }, []);

  return (
    <SectionWrapper id={SECTION_IDS.tokenomics}>
      <ScrollReveal direction="up">
        <SectionHeading
          title="Fair & Transparent Distribution"
          subtitle="Designed for long-term sustainability with community-first allocation."
        />
      </ScrollReveal>

      <div className="mt-16 flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-20">
        {/* Donut Chart */}
        <ScrollReveal direction="left" className="flex-shrink-0">
          <svg
            ref={svgRef}
            width={CENTER * 2}
            height={CENTER * 2}
            viewBox={`0 0 ${CENTER * 2} ${CENTER * 2}`}
            className="w-56 h-56 sm:w-64 sm:h-64"
          >
            {segments.map((seg) => (
              <circle
                key={seg.label}
                data-segment
                data-target={seg.length}
                cx={CENTER}
                cy={CENTER}
                r={RADIUS}
                fill="none"
                stroke={seg.color}
                strokeWidth={STROKE_WIDTH}
                strokeDasharray={`0 ${CIRCUMFERENCE}`}
                strokeDashoffset={-seg.offset}
                strokeLinecap="round"
                transform={`rotate(-90 ${CENTER} ${CENTER})`}
                className="transition-opacity duration-300"
              />
            ))}
            {/* Center text */}
            <text
              x={CENTER}
              y={CENTER - 6}
              textAnchor="middle"
              className="fill-brand-forest text-2xl font-heading"
              fontSize="22"
              fontWeight="700"
            >
              {/* `$` in the sans stack — the heading subset has no glyph for it. */}
              <tspan className="font-sans">$</tspan>
              VOLSA
            </text>
            <text
              x={CENTER}
              y={CENTER + 14}
              textAnchor="middle"
              className="fill-muted-foreground text-xs"
              fontSize="11"
            >
              Token
            </text>
          </svg>
        </ScrollReveal>

        {/* Legend */}
        <ScrollReveal
          direction="right"
          stagger={0.08}
          className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-md"
        >
          {allocations.map((alloc) => (
            <div key={alloc.label} className="flex items-center gap-3">
              <span
                className="w-4 h-4 rounded-full flex-shrink-0"
                style={{ backgroundColor: alloc.color }}
              />
              <div>
                <span className="text-sm font-semibold text-brand-forest">
                  {alloc.percentage}%
                </span>
                <span className="text-sm text-muted-foreground ml-2">
                  {alloc.label}
                </span>
              </div>
            </div>
          ))}
        </ScrollReveal>
      </div>
    </SectionWrapper>
  );
}
