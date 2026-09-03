"use client";

import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowUp, ShieldSecurity, MessageCircle, Send2, Code1, Global } from "iconsax-reactjs";
import { NAV_LINKS, SECTION_IDS } from "@/constants/landing.constants";
import { scrollToTarget } from "@/components/ui/SmoothScrollProvider";

gsap.registerPlugin(ScrollTrigger);

// Original project links preserved exactly without extra mock links
const RESOURCES_LINKS = [
  { label: "Documentation", href: "#" },
  { label: "Whitepaper", href: "#" },
  { label: "API Reference", href: "#" },
  { label: "Blog", href: "#" },
];

const LEGAL_LINKS = [
  { label: "Privacy Policy", href: "#" },
  { label: "Terms of Service", href: "#" },
  { label: "Cookie Policy", href: "#" },
];

const SOCIAL_LINKS = [
  { label: "Twitter / X", href: "#", icon: Global },
  { label: "Discord", href: "#", icon: MessageCircle },
  { label: "Telegram", href: "#", icon: Send2 },
  { label: "GitHub", href: "#", icon: Code1 },
];

/**
 * AICPA SOC 2 Certification Badge
 */
function AicpaSocBadge() {
  return (
    <div className="group relative inline-flex items-center gap-3.5 p-3 rounded-2xl bg-card/40 backdrop-blur-sm border border-border/40 hover:border-border/70 hover:bg-card/70 transition-all duration-300 shadow-xs cursor-pointer">
      <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-footer-neutral-200 via-footer-neutral-400 to-footer-neutral-700 p-[1.5px] shadow-sm group-hover:scale-105 transition-transform duration-300">
        <div className="w-full h-full rounded-full bg-gradient-to-br from-footer-neutral-100 via-footer-neutral-300 to-footer-neutral-500 flex flex-col items-center justify-center text-center p-1 border border-white/60">
          <span className="text-[6.5px] font-bold tracking-widest text-footer-neutral-800 uppercase leading-none">AICPA</span>
          <span className="text-[9px] font-black tracking-tight text-footer-neutral-900 leading-tight">SOC</span>
          <span className="text-[5.5px] font-semibold text-footer-neutral-700 leading-none">TYPE II</span>
        </div>
      </div>
      <div>
        <div className="text-xs font-semibold text-footer-neutral-900 flex items-center gap-1">
          SOC 2 Type II
          <ShieldSecurity size={14} variant="Bold" className="text-primary inline-block" />
        </div>
        <div className="text-[11px] text-footer-neutral-600 font-sans">Security Certified</div>
      </div>
    </div>
  );
}

/**
 * Pixelated VOLSA Brand Matrix Logo Mark (Matching TwelveLabs pixel aesthetic)
 */
function VolsaPixelMatrixLogo({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 320 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`w-full max-w-[220px] sm:max-w-[260px] h-auto ${className}`}
    >
      {/* Row 1 */}
      <rect className="footer-pixel-bar" x="140" y="8" width="36" height="10" rx="4" fill="var(--footer-fg)" />
      <rect className="footer-pixel-bar" x="184" y="8" width="22" height="10" rx="4" fill="var(--footer-fg)" />

      {/* Row 2 */}
      <rect className="footer-pixel-bar" x="100" y="24" width="28" height="10" rx="4" fill="var(--footer-fg)" />
      <rect className="footer-pixel-bar" x="134" y="24" width="48" height="10" rx="4" fill="var(--footer-fg)" />
      <rect className="footer-pixel-bar" x="188" y="24" width="32" height="10" rx="4" fill="var(--footer-fg)" />

      {/* Row 3 */}
      <rect className="footer-pixel-bar" x="80" y="40" width="44" height="10" rx="4" fill="var(--footer-fg)" />
      <rect className="footer-pixel-bar" x="130" y="40" width="34" height="10" rx="4" fill="var(--footer-fg)" />
      <rect className="footer-pixel-bar" x="170" y="40" width="56" height="10" rx="4" fill="var(--footer-fg)" />

      {/* Row 4 */}
      <rect className="footer-pixel-bar" x="50" y="56" width="36" height="10" rx="4" fill="var(--footer-fg)" />
      <rect className="footer-pixel-bar" x="92" y="56" width="60" height="10" rx="4" fill="var(--footer-fg)" />
      <rect className="footer-pixel-bar" x="158" y="56" width="40" height="10" rx="4" fill="var(--footer-fg)" />
      <rect className="footer-pixel-bar" x="204" y="56" width="44" height="10" rx="4" fill="var(--footer-fg)" />

      {/* Row 5 */}
      <rect className="footer-pixel-bar" x="30" y="72" width="50" height="10" rx="4" fill="var(--footer-fg)" />
      <rect className="footer-pixel-bar" x="86" y="72" width="34" height="10" rx="4" fill="var(--footer-fg)" />
      <rect className="footer-pixel-bar" x="126" y="72" width="68" height="10" rx="4" fill="var(--footer-fg)" />
      <rect className="footer-pixel-bar" x="200" y="72" width="38" height="10" rx="4" fill="var(--footer-fg)" />

      {/* Row 6 */}
      <rect className="footer-pixel-bar" x="60" y="88" width="42" height="10" rx="4" fill="var(--footer-fg)" />
      <rect className="footer-pixel-bar" x="108" y="88" width="52" height="10" rx="4" fill="var(--footer-fg)" />
      <rect className="footer-pixel-bar" x="166" y="88" width="44" height="10" rx="4" fill="var(--footer-fg)" />

      {/* Row 7 */}
      <rect className="footer-pixel-bar" x="90" y="104" width="30" height="10" rx="4" fill="var(--footer-fg)" />
      <rect className="footer-pixel-bar" x="126" y="104" width="50" height="10" rx="4" fill="var(--footer-fg)" />
      <rect className="footer-pixel-bar" x="182" y="104" width="28" height="10" rx="4" fill="var(--footer-fg)" />

      {/* Row 8 */}
      <rect className="footer-pixel-bar" x="120" y="120" width="38" height="10" rx="4" fill="var(--footer-fg)" />
      <rect className="footer-pixel-bar" x="164" y="120" width="24" height="10" rx="4" fill="var(--footer-fg)" />

      {/* Row 9 */}
      <rect className="footer-pixel-bar" x="142" y="136" width="30" height="10" rx="4" fill="var(--footer-fg)" />
    </svg>
  );
}

/**
 * GSAP Curtain Reveal Footer with Original Project Links
 */
export function FooterSection() {
  const footerRef = useRef<HTMLElement>(null);
  const footerContentRef = useRef<HTMLDivElement>(null);
  const logoMatrixRef = useRef<HTMLDivElement>(null);
  const brandTextRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const footer = footerRef.current;
    const content = footerContentRef.current;
    if (!footer || !content) return;

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    const ctx = gsap.context(() => {
      // 1. GSAP Parallax Curtain Reveal
      gsap.fromTo(
        content,
        {
          yPercent: -20,
          scale: 0.97,
          opacity: 0.7,
        },
        {
          yPercent: 0,
          scale: 1,
          opacity: 1,
          ease: "none",
          scrollTrigger: {
            trigger: footer,
            start: "top bottom",
            end: "bottom bottom",
            scrub: true,
          },
        }
      );

      // 2. Pixel matrix bars stagger animation
      if (logoMatrixRef.current) {
        const bars = logoMatrixRef.current.querySelectorAll(".footer-pixel-bar");
        gsap.fromTo(
          bars,
          { scaleX: 0, opacity: 0 },
          {
            scaleX: 1,
            opacity: 1,
            duration: 0.8,
            stagger: 0.02,
            ease: "power2.out",
            scrollTrigger: {
              trigger: footer,
              start: "top 80%",
              toggleActions: "play none none reverse",
            },
          }
        );
      }

      // 3. Stagger links reveal animation
      const linkGroups = content.querySelectorAll(".footer-col-group");
      gsap.fromTo(
        linkGroups,
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.7,
          stagger: 0.1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: footer,
            start: "top 85%",
            toggleActions: "play none none reverse",
          },
        }
      );

      // 4. Giant brand text tracking animation
      if (brandTextRef.current) {
        gsap.fromTo(
          brandTextRef.current,
          { letterSpacing: "-0.05em", opacity: 0.3 },
          {
            letterSpacing: "-0.02em",
            opacity: 1,
            scrollTrigger: {
              trigger: footer,
              start: "top 70%",
              end: "bottom bottom",
              scrub: 1,
            },
          }
        );
      }
    }, footer);

    return () => ctx.revert();
  }, []);

  return (
    <footer
      ref={footerRef}
      className="sticky bottom-0 z-0 w-full overflow-hidden bg-footer-bg text-footer-fg font-sans border-t border-footer-fg/10"
    >
      {/* Outer Content Container */}
      <div
        ref={footerContentRef}
        className="relative w-full flex flex-col justify-between py-12 sm:py-16 px-4 sm:px-8 lg:px-14 bg-footer-bg will-change-transform"
      >
        {/* Soft Ambient Background Glows */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute -bottom-20 -left-20 h-[450px] w-[450px] rounded-full blur-[100px]"
            style={{ background: "rgba(var(--primary-rgb), 0.35)" }}
          />
          <div
            className="absolute -bottom-20 -right-20 h-[450px] w-[450px] rounded-full blur-[100px]"
            style={{ background: "rgba(var(--primary-rgb), 0.2)" }}
          />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto w-full">
          {/* Top Columns Grid — Original Project Links */}
          {/* Two link columns side by side on phones rather than one long stack. The
              horizontal rules are desktop-only now: `divide-y` runs between grid items
              in DOM order, which on a two-column grid draws a rule through the middle
              of each row instead of between rows. Gap does the separating instead. */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-8 lg:gap-0 lg:divide-x divide-footer-fg/10 border-b border-footer-fg/10 pb-10 sm:pb-12">
            {/* Column 1: Product (NAV_LINKS) */}
            <div className="footer-col-group lg:pr-8">
              <h4 className="text-xs font-bold text-footer-fg mb-3 font-sans">Product</h4>
              <ul className="space-y-2">
                {NAV_LINKS.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      onClick={(e) => {
                        e.preventDefault();
                        scrollToTarget(link.href);
                      }}
                      className="text-xs sm:text-sm text-footer-neutral-700 hover:text-footer-fg transition-colors duration-150 inline-block"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 2: Resources */}
            <div className="footer-col-group lg:px-8">
              <h4 className="text-xs font-bold text-footer-fg mb-3 font-sans">Resources</h4>
              <ul className="space-y-2">
                {RESOURCES_LINKS.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-xs sm:text-sm text-footer-neutral-700 hover:text-footer-fg transition-colors duration-150 inline-block"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 3: Legal */}
            <div className="footer-col-group lg:px-8">
              <h4 className="text-xs font-bold text-footer-fg mb-3 font-sans">Legal</h4>
              <ul className="space-y-2">
                {LEGAL_LINKS.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-xs sm:text-sm text-footer-neutral-700 hover:text-footer-fg transition-colors duration-150 inline-block"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 4: Community & Security */}
            {/* Social chips and the compliance badge need the full width on phones —
                they don't fit in a half-column, so this one spans the row. */}
            <div className="footer-col-group col-span-2 lg:col-span-1 lg:pl-8 flex flex-col justify-between gap-6 border-t border-footer-fg/10 pt-8 lg:border-t-0 lg:pt-0">
              <div>
                <h4 className="text-xs font-bold text-footer-fg mb-3 font-sans">Social</h4>
                <div className="flex flex-wrap gap-2 mb-4">
                  {SOCIAL_LINKS.map((social) => {
                    const Icon = social.icon;
                    return (
                      <a
                        key={social.label}
                        href={social.href}
                        aria-label={social.label}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card/50 border border-footer-fg/10 text-xs font-medium text-footer-neutral-800 hover:bg-card hover:border-footer-fg/20 hover:text-footer-fg transition-all duration-200"
                      >
                        <Icon size={14} className="text-footer-neutral-600" />
                        <span>{social.label}</span>
                      </a>
                    );
                  })}
                </div>
              </div>

              {/* Security Compliance Badge */}
              <div>
                <AicpaSocBadge />
              </div>
            </div>
          </div>

          {/* Middle Main Brand Section */}
          <div className="py-8 sm:py-10 flex flex-col lg:flex-row items-center justify-between gap-6 border-b border-footer-fg/10">
            {/* Left Pixel Matrix SVG Icon */}
            <div ref={logoMatrixRef} className="flex-shrink-0">
              <VolsaPixelMatrixLogo />
            </div>

            {/* Right Massive Brand Name */}
            <div className="w-full lg:w-auto text-center lg:text-right">
              <h2
                ref={brandTextRef}
                className="text-5xl sm:text-7xl lg:text-8xl font-bold tracking-tight text-footer-fg leading-none select-none font-sans"
              >
                Volsa
              </h2>
            </div>
          </div>

          {/* Bottom Copyright Bar */}
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-footer-neutral-600 font-sans tracking-wide text-center sm:text-left">
              © 2023 – {new Date().getFullYear()} VOLSA, Inc. All Rights Reserved.
            </p>

            <button
              onClick={() => scrollToTarget(`#${SECTION_IDS.hero}`)}
              className="group flex items-center gap-2 text-xs font-semibold text-footer-neutral-700 hover:text-footer-fg transition-colors duration-200 py-1.5 px-3 rounded-full bg-card/40 hover:bg-card/70 border border-footer-fg/5"
            >
              <span>Back to top</span>
              <ArrowUp size={14} className="group-hover:-translate-y-0.5 transition-transform duration-200" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
