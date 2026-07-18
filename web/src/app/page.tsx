import React from "react";
import { getSession } from "@/lib/auth/session";
import { MarketingNavbar } from "@/components/marketing/navbar";
import { MarketingFooter } from "@/components/marketing/footer";
import { LandingHero } from "@/components/marketing/landing-hero";
import { UniversalAssetCalculator } from "@/components/marketing/universal-asset-calculator";
import { ChapterScrollSection } from "@/components/marketing/chapter-scroll-section";
import { FeaturesSection } from "@/components/marketing/features-section";
import { OpenSourceValueSection } from "@/components/marketing/open-source-value-section";

export const metadata = {
  title: "Pawnify — The Modern Cloud & Open-Source Asset Lending Platform",
  description:
    "Open-source and cloud operating system for pawn broking networks, physical collateral valuation, and asset-backed lending. Issue loans against 24K Gold, Silver, Watches, and Fine Art with live spot rates and automated LTV capping.",
};

export default async function RootPage() {
  const session = await getSession();
  const isAuthenticated = !!session;

  return (
    <div className="min-h-screen flex flex-col font-sans" style={{ background: "var(--bg-primary)" }}>
      <MarketingNavbar isAuthenticated={isAuthenticated} />

      <main className="flex-1">
        <LandingHero />

        <div id="calculator" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <UniversalAssetCalculator />
        </div>

        <ChapterScrollSection />

        <FeaturesSection />

        <OpenSourceValueSection />
      </main>

      <MarketingFooter />
    </div>
  );
}
