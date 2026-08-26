"use client";

import React from "react";
import { SECTION_IDS } from "@/constants/landing.constants";
import { getStats } from "@/services/landing.service";
import { SectionWrapper } from "@/components/ui/SectionWrapper";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

const stats = getStats();

/**
 * Stats section with animated counters.
 */
export function StatsSection() {
  return (
    <SectionWrapper id={SECTION_IDS.stats} dark>
      <ScrollReveal
        direction="up"
        stagger={0.15}
        className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12"
      >
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="text-center flex flex-col items-center gap-3"
          >
            <AnimatedCounter
              value={stat.value}
              prefix={stat.prefix}
              suffix={stat.suffix}
              className="text-4xl sm:text-5xl lg:text-6xl font-heading text-brand-leaf"
            />
            <span className="text-sm sm:text-base text-white/60 tracking-wide uppercase">
              {stat.label}
            </span>
          </div>
        ))}
      </ScrollReveal>
    </SectionWrapper>
  );
}
