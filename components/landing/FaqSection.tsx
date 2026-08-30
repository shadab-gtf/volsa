"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SECTION_IDS } from "@/constants/landing.constants";
import { getFaq, type FaqItem } from "@/services/landing.service";
import { SectionWrapper } from "@/components/ui/SectionWrapper";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { useRevealOnScroll } from "@/hooks/useRevealOnScroll";

gsap.registerPlugin(ScrollTrigger);

const faqItems = getFaq();

/**
 * FAQ accordion section with smooth GSAP height animation.
 */
export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const toggle = useCallback((index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  }, []);

  // Batched: one ScrollTrigger for every FAQ row instead of one per row —
  // six near-identical items don't need six independent scroll calculations.
  useRevealOnScroll(listRef, { selector: ".faq-reveal", stagger: 0.06 });

  return (
    <SectionWrapper id={SECTION_IDS.faq}>
      <ScrollReveal direction="up">
        <SectionHeading
          title="Frequently Asked Questions"
          subtitle="Got questions? We've got answers. If you need more help, reach out to our community."
        />
      </ScrollReveal>

      <div ref={listRef} className="mt-16 max-w-3xl mx-auto flex flex-col gap-3">
        {faqItems.map((item, idx) => (
          <div key={item.question} className="faq-reveal">
            <FaqAccordionItem
              item={item}
              isOpen={openIndex === idx}
              onToggle={() => toggle(idx)}
            />
          </div>
        ))}
      </div>
    </SectionWrapper>
  );
}

// ─── Accordion Item ─────────────────────────────────────

interface FaqAccordionItemProps {
  item: FaqItem;
  isOpen: boolean;
  onToggle: () => void;
}

function FaqAccordionItem({ item, isOpen, onToggle }: FaqAccordionItemProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const isFirstRun = useRef(true);

  // Height animation runs in an effect, never during render — mutating the DOM
  // while rendering fights React and double-fires under Strict Mode.
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    // Don't animate the closed panels on mount.
    if (isFirstRun.current) {
      isFirstRun.current = false;
      if (!isOpen) return;
    }

    gsap.killTweensOf(el);

    if (isOpen) {
      el.style.display = "block";
      const tween = gsap.fromTo(
        el,
        { height: 0, opacity: 0 },
        {
          height: "auto",
          opacity: 1,
          duration: 0.5,
          ease: "power3.out",
          // The page just got taller — every trigger below needs remeasuring,
          // otherwise later reveals fire at the wrong scroll positions.
          onComplete: () => ScrollTrigger.refresh(),
        }
      );
      return () => {
        tween.kill();
      };
    }

    const tween = gsap.to(el, {
      height: 0,
      opacity: 0,
      duration: 0.35,
      ease: "power3.in",
      onComplete: () => {
        el.style.display = "none";
        ScrollTrigger.refresh();
      },
    });

    return () => {
      tween.kill();
    };
  }, [isOpen]);

  return (
    <div
      className={`rounded-none border transition-colors duration-300 ${isOpen ? "border-brand-leaf/40 bg-card shadow-md" : "border-brand-leaf/20 bg-card/80 shadow-sm"}`}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-6 text-left cursor-pointer"
        aria-expanded={isOpen}
      >
        <span className="text-base font-medium text-foreground pr-4">
          {item.question}
        </span>
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          className={`flex-shrink-0 text-foreground transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
        >
          <path
            d="M5 8l5 5 5-5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <div
        ref={contentRef}
        className="overflow-hidden"
        style={{ height: 0, display: "none" }}
      >
        <p className="px-6 pb-6 text-sm leading-relaxed text-foreground/80 font-light">
          {item.answer}
        </p>
      </div>
    </div>
  );
}
