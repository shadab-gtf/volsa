import { Navbar } from "@/components/landing/Navbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { PlatformSection } from "@/components/landing/PlatformSection";
import { AiEngineSection } from "@/components/landing/AiEngineSection";
import { TradingModesSection } from "@/components/landing/TradingModesSection";
import { EnginesShowcaseSection } from "@/components/landing/EnginesShowcaseSection";
import { SecurityArchitectureSection } from "@/components/landing/SecurityArchitectureSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { FaqSection } from "@/components/landing/FaqSection";
import { CtaSection } from "@/components/landing/CtaSection";
import { FooterSection } from "@/components/landing/FooterSection";

/**
 * VOLSA Landing Page — Server Component.
 * Pure layout assembly. All data comes from services, all UI from components.
 */
export default function Home() {
  return (
    <>
      <Navbar />
      <main className="relative z-10 bg-surface shadow-[0_20px_50px_rgba(var(--black-rgb),0.2)]">
        <HeroSection />
        <PlatformSection />
        <AiEngineSection />
        <TradingModesSection />
        <EnginesShowcaseSection />
        <SecurityArchitectureSection />
        <HowItWorksSection />
        <FaqSection />
        <CtaSection />
      </main>
      <FooterSection />
    </>
  );
}
