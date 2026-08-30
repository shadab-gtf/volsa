"use client";

import React, { useRef } from "react";
import { SECTION_IDS } from "@/constants/landing.constants";
import { getPlatform, type PlatformComponent } from "@/services/landing.service";
import { SectionWrapper } from "@/components/ui/SectionWrapper";
import { MaskedHeading } from "@/components/ui/MaskedHeading";
import { useRevealOnScroll } from "@/hooks/useRevealOnScroll";
import { usePointerField } from "@/hooks/usePointerField";
import { PlatformGlyph } from "./platform/PlatformGlyph";

const platform = getPlatform();

/**
 * One cell per system.
 *
 * There is no card here — no fill, no blur, no corner radius. The hairline lattice the
 * cells form is the structure; anything drawn on top of it would be decoration.
 *
 * The mark tilts in real perspective from the section's shared `--px`/`--py`. Each cell
 * scales that rotation by its own `--depth`, so the six do not swing as one flat sheet,
 * and the transition turns those per-frame variable updates into eased motion without a
 * single line of interpolation in JavaScript.
 */
function Cell({ item, depth }: { item: PlatformComponent; depth: number }) {
  return (
    <article className="group relative flex min-h-[340px] flex-col justify-between border-b border-r border-white/10 p-8 transition-colors duration-500 hover:bg-white/[0.05] lg:min-h-[420px] lg:p-10">
      <div className="perspective-[720px]">
        <span
          className="inline-block text-brand-leaf transition-all duration-500 ease-out group-hover:scale-110 group-hover:text-brand-glow"
          style={
            {
              "--depth": depth,
              transform:
                "rotateX(calc(var(--py, 0) * var(--depth) * -13deg)) rotateY(calc(var(--px, 0) * var(--depth) * 17deg))",
            } as React.CSSProperties
          }
        >
          <PlatformGlyph id={item.id} className="h-24 w-24 lg:h-28 lg:w-28" />
        </span>
      </div>

      <div>
        <h3 className="reveal font-heading text-xl leading-snug tracking-tight text-brand-leaf transition-transform duration-500 ease-out group-hover:-translate-y-1 lg:text-2xl">
          {item.title}
        </h3>

        <p className="reveal mt-3 max-w-xs font-sans text-sm font-light leading-relaxed text-white/50 transition-colors duration-500 group-hover:text-white/70">
          {item.description}
        </p>

        {/* The accent thread draws in on hover rather than sitting there —
            interaction lives in the lattice's own hairline language, not a
            card fill bolted on top of it. */}
        <span
          className="mt-6 block h-px w-full origin-left scale-x-0 bg-brand-leaf transition-transform duration-500 ease-out group-hover:scale-x-100"
          aria-hidden="true"
        />
      </div>
    </article>
  );
}

/**
 * Platform — the six core systems, laid out as a system.
 *
 * The grid is the design: a modular lattice of hairlines, one accent, and nothing that
 * does not carry information. Such movement as there is comes from the marks themselves,
 * which are projections of three-dimensional forms and so are given real perspective to
 * turn in.
 *
 * Two batched ScrollTriggers and one pointer listener drive the whole section.
 */
export function PlatformSection() {
  const sectionRef = useRef<HTMLDivElement>(null);

  usePointerField(sectionRef);
  useRevealOnScroll(sectionRef, { from: { y: 28, opacity: 0 }, duration: 0.85 });
  useRevealOnScroll(sectionRef, {
    selector: ".platform-glyph > *",
    from: { strokeDasharray: 1, strokeDashoffset: 1 },
    to: { strokeDashoffset: 0 },
    duration: 1.3,
    start: "top 88%",
  });

  const count = platform.components.length;

  return (
    <SectionWrapper id={SECTION_IDS.platform} wide dark className="bg-surface-platform">
      <div ref={sectionRef}>
        {/* Header. The heading and its qualifier share a baseline, closed by the same
            hairline that runs through the lattice below. */}
        <header className="grid gap-10 border-b border-white/10 pb-14 lg:grid-cols-[1fr_22rem] lg:items-end lg:gap-16">
          <div>
            <div className="reveal flex items-center gap-4">
              <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.28em] text-brand-leaf/70 sm:text-xs">
                {platform.eyebrow}
              </p>
              {/* <span aria-hidden className="h-px w-10 bg-white/15" /> */}
              
            </div>

            <MaskedHeading
              lines={platform.title}
              dark
              className="mt-6 text-[clamp(1.9rem,4vw,3.4rem)]"
            />
          </div>

          <p className="reveal font-sans text-sm font-light leading-relaxed text-white/50 lg:pb-2">
            {platform.subhead}
          </p>
        </header>

        {/* The lattice. The container carries the top and left rules and each cell the
            bottom and right, so the box closes at any column count. */}
        <div className="grid border-l border-t border-white/10 sm:grid-cols-2 lg:grid-cols-3">
          {platform.components.map((item, index) => (
            <Cell key={item.id} item={item} depth={0.7 + (index % 3) * 0.18} />
          ))}
        </div>
      </div>
    </SectionWrapper>
  );
}

export default PlatformSection;
