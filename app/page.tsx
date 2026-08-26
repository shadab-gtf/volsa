import { Navbar } from "@/components/landing/Navbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { StatementSection } from "@/components/landing/StatementSection";
import { EnginesShowcaseSection } from "@/components/landing/EnginesShowcaseSection";
import { SecureFlowSection } from "@/components/landing/secure-flow/SecureFlowSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { StatsSection } from "@/components/landing/StatsSection";
// import { TokenomicsSection } from "@/components/landing/TokenomicsSection";
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
      <main className="relative z-10 bg-[#f7fdf4] shadow-[0_20px_50px_rgba(0,0,0,0.2)]">
        <HeroSection />
        <StatementSection />
        <EnginesShowcaseSection />
        <SecureFlowSection />
        <FeaturesSection />
        <HowItWorksSection />
        <StatsSection />
        {/* <TokenomicsSection /> */}
        <FaqSection />
        <CtaSection />
      </main>
      <FooterSection />
    </>
  );
}
