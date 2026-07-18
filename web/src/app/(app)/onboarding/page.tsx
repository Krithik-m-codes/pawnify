import React from "react";
import { OnboardingWizardClient } from "./onboarding-wizard-client";

export const metadata = {
  title: "Organization Setup & Jurisdiction Presets | Pawnify",
  description: "Configure multi-tenant lending policy, currency, weight units, and LTV rules.",
};

export default function OnboardingPage() {
  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: "var(--text-primary)" }}>
          Organization Setup &amp; Policy Wizard
        </h1>
        <p className="text-sm mt-1.5" style={{ color: "var(--text-secondary)" }}>
          Select a jurisdiction preset or customize your loan policies, LTV limits, and compliance thresholds.
        </p>
      </div>

      <OnboardingWizardClient />
    </div>
  );
}
