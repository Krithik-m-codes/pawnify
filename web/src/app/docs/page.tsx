import React from "react";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { MarketingNavbar } from "@/components/marketing/navbar";
import { MarketingFooter } from "@/components/marketing/footer";
import { BookOpen, Layers, ShieldCheck, Calculator, ArrowRight } from "lucide-react";

export const metadata = {
  title: "Documentation Hub | Pawnify",
  description: "Operational documentation, API reference, and lending compliance guides for Pawnify.",
};

export default async function DocsPage() {
  const session = await getSession();
  const isAuthenticated = !!session;

  return (
    <div className="min-h-screen flex flex-col font-sans" style={{ background: "var(--bg-primary)" }}>
      <MarketingNavbar isAuthenticated={isAuthenticated} />

      <main className="flex-1 py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 mb-3">
              <BookOpen className="w-3.5 h-3.5" />
              <span>PAWNIFY DOCUMENTATION HUB</span>
            </div>
            <h1
              className="text-4xl sm:text-5xl font-black tracking-tight"
              style={{ color: "var(--text-primary)" }}
            >
              Operational &amp; Architecture Manual
            </h1>
            <p className="mt-4 text-base sm:text-lg" style={{ color: "var(--text-secondary)" }}>
              Explore comprehensive guides on setting up your jurisdiction, managing Row-Level Security,
              and working with the loan allocation waterfall.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="p-8 rounded-3xl border border-(--border-primary) bg-(--bg-card)">
              <Layers className="w-8 h-8 text-emerald-400 mb-4" />
              <h3 className="text-lg font-bold text-(--text-primary)">Multi-Tenant Policy Setup</h3>
              <p className="mt-2 text-xs text-(--text-secondary) leading-relaxed mb-4">
                Learn how to configure your organization currency, weight units (Gram / Troy Ounce / Tola),
                and purity expressions via the Onboarding Wizard.
              </p>
              <Link
                href="/onboarding"
                className="text-xs font-bold text-emerald-400 inline-flex items-center gap-1 hover:underline"
              >
                Go to Setup Wizard <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="p-8 rounded-3xl border border-(--border-primary) bg-(--bg-card)">
              <Calculator className="w-8 h-8 text-emerald-400 mb-4" />
              <h3 className="text-lg font-bold text-(--text-primary)">Valuation &amp; LTV Formulas</h3>
              <p className="mt-2 text-xs text-(--text-secondary) leading-relaxed mb-4">
                Understand how Pawnify assesses collateral value and applies tiered Loan-to-Value (LTV)
                slabs server-side during loan creation.
              </p>
              <Link
                href="/#calculator"
                className="text-xs font-bold text-emerald-400 inline-flex items-center gap-1 hover:underline"
              >
                Test Interactive Simulator <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="p-8 rounded-3xl border border-(--border-primary) bg-(--bg-card)">
              <ShieldCheck className="w-8 h-8 text-emerald-400 mb-4" />
              <h3 className="text-lg font-bold text-(--text-primary)">Postgres RLS Architecture</h3>
              <p className="mt-2 text-xs text-(--text-secondary) leading-relaxed mb-4">
                Deep dive into our SQL policies (`sql/rls_policies.sql`) and how Supabase server wrappers
                enforce strict tenant boundary separation.
              </p>
              <Link
                href="/open-source"
                className="text-xs font-bold text-emerald-400 inline-flex items-center gap-1 hover:underline"
              >
                View Architecture <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
