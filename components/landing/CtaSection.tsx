"use client";

import React from "react";
import { SECTION_IDS } from "@/constants/landing.constants";
import { Button } from "@/components/ui/Button";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

/**
 * Final CTA banner with gradient background and dot pattern.
 */
export function CtaSection() {
  return (
    <section
      id={SECTION_IDS.cta}
      className="relative w-full overflow-hidden py-24 sm:py-32 px-5 sm:px-8"
      style={{ background: "var(--cta-gradient)" }}
    >
      {/* Dot pattern background */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "radial-gradient(circle, var(--white) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-3xl mx-auto text-center">
        <ScrollReveal direction="up">
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl text-white leading-tight mb-6">
            Ready to Let AI Work for You?
          </h2>
        </ScrollReveal>

        <ScrollReveal direction="up" delay={0.15}>
          <p className="text-base sm:text-lg text-white/60 max-w-xl mx-auto mb-10">
            Join thousands of users already earning passive revenue through
            autonomous AI agents. Connect your wallet and get started in
            minutes.
          </p>
        </ScrollReveal>

        <ScrollReveal direction="up" delay={0.3}>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              variant="primary"
              size="lg"
              href="#"
              className="!bg-brand-leaf !text-brand-dark hover:!bg-brand-lime"
            >
              Launch App
            </Button>
            <Button
              variant="outline"
              size="lg"
              href="#"
              className="!border-white/30 !text-white hover:!bg-white/10 hover:!border-white/50"
            >
              Join Community
            </Button>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
