"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import gsap from "gsap";
import { NAV_LINKS } from "@/constants/landing.constants";
import { usePreloaderDone } from "@/hooks/usePreloaderDone";
import {
  scrollToTarget,
  setScrollLocked,
  useScrollPosition,
} from "@/components/ui/SmoothScrollProvider";

/**
 * Premium Full-Screen Navbar:
 * - Logo: /images/v.png image paired directly with "OLSA" text.
 * - Entrance: Smooth top-to-bottom slide-down reveal after preloader finishes.
 * - Hide on scroll down / reveal on scroll up, driven off the Lenis scroll
 *   callback so it moves in the same frame as the page (no one-frame lag).
 * - Menu: Full-screen overlay with staggered word/link clip-path reveals.
 */
export function Navbar() {
  const navRef = useRef<HTMLElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const linksRef = useRef<HTMLDivElement>(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Mirrored into a ref so the scroll callback can read it without
  // re-subscribing on every toggle.
  const menuOpenRef = useRef(menuOpen);
  useEffect(() => {
    menuOpenRef.current = menuOpen;
  }, [menuOpen]);

  const isPreloaderDone = usePreloaderDone();

  // 1. Entrance animation (Top to initial position after preloader completes)
  useEffect(() => {
    const el = navRef.current;
    if (!el || !isPreloaderDone) return;

    const tween = gsap.fromTo(
      el,
      { yPercent: -100, opacity: 0 },
      {
        yPercent: 0,
        opacity: 1,
        duration: 0.9,
        delay: 0.1,
        ease: "power3.out",
        clearProps: "opacity",
      }
    );

    return () => {
      tween.kill();
    };
  }, [isPreloaderDone]);

  // 2. Scroll hide / show + scrolled surface state.
  //    One reused quickTo tween, no state writes per frame.
  const lastScrollRef = useRef(0);
  const hiddenRef = useRef(false);
  const moveNavRef = useRef<((value: number) => void) | null>(null);

  useEffect(() => {
    const el = navRef.current;
    if (!el) return;

    moveNavRef.current = gsap.quickTo(el, "y", {
      duration: 0.45,
      ease: "power3.out",
    });

    return () => {
      moveNavRef.current = null;
      gsap.killTweensOf(el);
    };
  }, []);

  useScrollPosition((scrollY) => {
    setIsScrolled(scrollY > 20);

    if (menuOpenRef.current) return;

    // Header is visible ONLY when at the top of the page (scrollY <= 50).
    // Once scrolled down past 50px, it stays hidden and will NOT show on scroll up mid-page.
    const shouldHide = scrollY > 50;
    if (shouldHide !== hiddenRef.current) {
      hiddenRef.current = shouldHide;
      moveNavRef.current?.(shouldHide ? -120 : 0);
    }
  });

  // 3. Full-screen Menu GSAP Clip-Path & Stagger Animation
  useEffect(() => {
    const overlay = overlayRef.current;
    const linksContainer = linksRef.current;
    if (!overlay || !linksContainer) return;

    const linkItems = linksContainer.querySelectorAll(".menu-link-inner");

    // Lenis keeps scrolling the page behind the overlay unless we stop it —
    // `body { overflow: hidden }` alone has no effect on it.
    setScrollLocked(menuOpen);
    gsap.killTweensOf([overlay, linkItems]);

    if (menuOpen) {
      gsap
        .timeline()
        .set(overlay, {
          display: "flex",
          opacity: 0,
          clipPath: "polygon(0 0, 100% 0, 100% 0, 0 0)",
        })
        .to(overlay, {
          clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%)",
          opacity: 1,
          duration: 0.7,
          ease: "power4.out",
        })
        .fromTo(
          linkItems,
          { yPercent: 120, opacity: 0 },
          {
            yPercent: 0,
            opacity: 1,
            duration: 0.8,
            stagger: 0.07,
            ease: "power4.out",
          },
          "-=0.4"
        );
    } else {
      gsap
        .timeline({
          onComplete: () => {
            overlay.style.display = "none";
          },
        })
        .to(linkItems, {
          yPercent: 120,
          opacity: 0,
          duration: 0.4,
          stagger: 0.04,
          ease: "power3.in",
        })
        .to(
          overlay,
          {
            clipPath: "polygon(0 0, 100% 0, 100% 0, 0 0)",
            opacity: 0,
            duration: 0.6,
            ease: "power4.inOut",
          },
          "-=0.2"
        );
    }
  }, [menuOpen]);

  // Escape closes the overlay.
  useEffect(() => {
    if (!menuOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  // Never leave the page locked if the navbar unmounts while open.
  useEffect(() => () => setScrollLocked(false), []);

  function toggleMenu() {
    setMenuOpen((prev) => !prev);
  }

  function handleLinkClick(
    event: React.MouseEvent<HTMLAnchorElement>,
    href: string
  ) {
    setMenuOpen(false);

    // Drive the scroll ourselves: the overlay closes on the same click, and
    // Lenis is still stopped at the moment its anchor handler would fire.
    if (href.length > 1 && href.startsWith("#")) {
      event.preventDefault();
      scrollToTarget(href);
    }
  }

  return (
    <>
      {/* Edge-to-Edge Full Screen Header */}
      <nav
        ref={navRef}
        style={{
          opacity: isPreloaderDone ? undefined : 0,
          transform: isPreloaderDone ? undefined : "translateY(-100%)",
        }}
        className={`fixed top-0 left-0 right-0 z-50 w-full px-6 sm:px-12 py-4 flex items-center justify-between will-change-transform transition-[background-color,border-color,box-shadow,backdrop-filter] duration-500 ease-out ${
          isScrolled && !menuOpen
            ? "bg-[#f7fdf4]/80 backdrop-blur-md border-b border-brand-forest/10 shadow-[0_1px_24px_-12px_rgba(18,40,5,0.35)]"
            : "bg-transparent border-b border-transparent shadow-none"
        }`}
      >
        {/* Left Side: Brand Logo (/images/v.png as 'V' + 'OLSA' text) */}
        <a href="#" className="flex items-center group z-50">
          <Image
            src="/images/v.png"
            alt="V"
            width={1094}
            height={1024}
            className="h-7 sm:h-12 w-auto object-contain transition-transform duration-500 ease-out group-hover:scale-105"
            priority
          />
          <span
            className={`font-heading text-2xl sm:text-3xl font-semibold tracking-wider transition-colors duration-300 ${
              menuOpen ? "text-white" : "text-brand-forest"
            }`}
          >
            OLSA
          </span>
        </a>

        {/* Right Side: Get Started CTA + Menu Button */}
        <div className="flex items-center gap-3 sm:gap-4 z-50">
          <a
            href="#"
            className={`inline-flex items-center justify-center h-11 px-6 rounded-none text-xs sm:text-sm font-heading font-semibold uppercase tracking-wider leading-none transition-all duration-300 ease-out ${
              menuOpen
                ? "bg-brand-leaf text-brand-dark hover:bg-brand-lime"
                : "bg-brand-forest text-white hover:bg-brand-dark shadow-sm hover:shadow"
            }`}
          >
            Get Started
          </a>

          <button
            onClick={toggleMenu}
            className={`inline-flex items-center justify-center h-11 px-6 gap-3 rounded-none border text-xs sm:text-sm font-heading font-semibold tracking-wider uppercase leading-none transition-all duration-300 ease-out cursor-pointer ${
              menuOpen
                ? "bg-white text-brand-dark border-white hover:bg-brand-lime"
                : "bg-transparent text-brand-forest border-brand-forest/30 hover:bg-brand-forest/10"
            }`}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
          >
            <span className="leading-none pt-0.5">{menuOpen ? "Close" : "Menu"}</span>
            <span className="flex flex-col justify-center gap-[5px] w-6">
              <span
                className={`block w-6 h-[1.5px] origin-center transition-transform duration-300 ease-out ${
                  menuOpen ? "rotate-45 translate-y-[3.5px] bg-brand-dark" : "bg-brand-forest"
                }`}
              />
              <span
                className={`block w-6 h-[1.5px] origin-center transition-transform duration-300 ease-out ${
                  menuOpen ? "-rotate-45 -translate-y-[3.5px] bg-brand-dark" : "bg-brand-forest"
                }`}
              />
            </span>
          </button>
        </div>
      </nav>

      {/* Full-Screen Overlay Menu */}
      <div
        ref={overlayRef}
        style={{ display: "none" }}
        aria-hidden={!menuOpen}
        className="fixed inset-0 z-40 w-full h-full bg-[#122805]/95 backdrop-blur-2xl text-white flex flex-col justify-between pt-28 pb-12 px-6 sm:px-16 will-change-[clip-path,opacity]"
      >
        {/* Menu Links with Clip Path Masking */}
        <div
          ref={linksRef}
          className="max-w-5xl mx-auto w-full flex flex-col gap-6 sm:gap-8 my-auto"
        >
          {NAV_LINKS.map((link, idx) => (
            <div key={link.href} className="menu-link-mask overflow-hidden py-1">
              <a
                href={link.href}
                onClick={(event) => handleLinkClick(event, link.href)}
                className="menu-link-inner group flex items-baseline gap-6 font-heading text-3xl sm:text-5xl lg:text-6xl text-white/90 hover:text-brand-lime transition-colors duration-300"
              >
                <span className="text-xs sm:text-sm font-sans font-bold text-brand-leaf/60 group-hover:text-brand-lime">
                  0{idx + 1}
                </span>
                <span>{link.label}</span>
              </a>
            </div>
          ))}
        </div>

        {/* Footer info inside overlay */}
        <div className="max-w-5xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between border-t border-white/10 pt-8 gap-4 text-xs text-white/50">
          <p>© {new Date().getFullYear()} VOLSA. Web3 AI Infrastructure.</p>
          <a
            href="#"
            onClick={(event) => handleLinkClick(event, "#")}
            className="rounded-none bg-brand-leaf text-brand-dark px-6 py-2.5 font-bold hover:bg-brand-lime transition-colors"
          >
            Launch App →
          </a>
        </div>
      </div>
    </>
  );
}
