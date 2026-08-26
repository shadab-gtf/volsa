import type { Metadata } from "next";
import localFont from "next/font/local";
import { Alice, Google_Sans_Flex, Poppins } from "next/font/google";
import VolsaPreloader from "@/components/preloader/VolsaPreloader";
import { SmoothScrollProvider } from "@/components/ui/SmoothScrollProvider";
import "./globals.css";

const moronaFont = localFont({
  src: "../public/fonts/Morona.woff2",
  variable: "--font-morona",
  display: "swap",
});

// Self-hosted through next/font: no third-party stylesheet on the critical path,
// no preconnect round-trips, and no late swap-in flash on first paint.
const googleSans = Google_Sans_Flex({
  subsets: ["latin"],
  variable: "--font-gsans",
  display: "swap",
  // next/font has no metric overrides for this face, so it cannot synthesise a
  // size-adjusted fallback. Naming the fallback stack ourselves keeps the swap
  // sane and stops the build warning about the missing override values.
  adjustFontFallback: false,
  fallback: ["Poppins", "system-ui", "-apple-system", "sans-serif"],
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins-web",
  display: "swap",
});

const alice = Alice({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-alice-web",
  display: "swap",
});

export const metadata: Metadata = {
  title: "VOLSA — AI Agents That Work For You | Web3 AI Infrastructure",
  description:
    "Autonomous trading, yield optimization & portfolio management — all under your control. Deploy AI agents that generate revenue while you hold the keys.",
  keywords: ["Web3", "AI agents", "DeFi", "autonomous trading", "yield optimization", "crypto wallet"],
  openGraph: {
    title: "VOLSA — AI Agents That Work For You",
    description: "Web3 AI infrastructure for autonomous revenue generation.",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${moronaFont.variable} ${googleSans.variable} ${poppins.variable} ${alice.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col font-sans" suppressHydrationWarning>
        <SmoothScrollProvider>
          <VolsaPreloader />
          {children}
        </SmoothScrollProvider>
      </body>
    </html>
  );
}
