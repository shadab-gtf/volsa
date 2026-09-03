"use client";

import React, { useRef } from "react";
import { SECTION_IDS } from "@/constants/landing.constants";
import { getSecurityPillars, type SecurityPillar } from "@/services/landing.service";
import { SecurityGlyph } from "@/components/landing/secure-flow/SecurityGlyph";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { useRevealOnScroll } from "@/hooks/useRevealOnScroll";

const pillars = getSecurityPillars();

/**
 * Security architecture — three structural facts, no adjectives.
 *
 * Same bento language as the Multi-Chain showcase (card, width, reveal), but
 * with nothing to demo: custody, consensus and destination are each already
 * proven in motion by the flow section above, so this restates them as the
 * whole of the case and stops.
 */
export function SecurityArchitectureSection() {
  const gridRef = useRef<HTMLDivElement>(null);
  useRevealOnScroll(gridRef, { selector: ".pillar-reveal", stagger: 0.1 });

  return (
    <section
      id={SECTION_IDS.securityArchitecture}
      className="relative w-full bg-surface-tint-c px-5 py-24 sm:px-8 sm:py-32"
    >
      <div className="relative z-10 max-w-384 mx-auto">
        <ScrollReveal className="max-w-2xl">
          <span className="block text-[11px] font-sans font-bold uppercase tracking-[0.24em] text-brand-leaf">
            Security
          </span>
          <h2 className="mt-5 font-heading text-4xl sm:text-5xl leading-[1.08] tracking-tight text-foreground">
            Built so nothing moves without you
          </h2>
        </ScrollReveal>

        <div
          ref={gridRef}
          className="mt-14 grid gap-6 sm:grid-cols-3 lg:gap-8"
        >
          {pillars.map((pillar) => (
            <PillarCard key={pillar.id} pillar={pillar} />
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Pillar card ─────────────────────────────────────────

function PillarCard({ pillar }: { pillar: SecurityPillar }) {
  return (
    <article className="pillar-reveal group relative flex flex-col overflow-hidden rounded-[1.75rem] border border-border/60 bg-card p-7 text-card-foreground shadow-[0_20px_40px_rgba(var(--black-rgb),0.12)] transition-transform duration-500 ease-out hover:-translate-y-1.5">
      <SecurityGlyph glyph={pillar.glyph} />
      <h3 className="mt-7 font-heading text-xl leading-snug tracking-tight text-card-foreground sm:text-2xl">
        {pillar.title}
      </h3>
      <p className="mt-3 text-sm font-light leading-relaxed text-card-foreground/65">
        {pillar.description}
      </p>
    </article>
  );
}
