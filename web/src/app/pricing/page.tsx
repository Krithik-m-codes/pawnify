import React from "react";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { MarketingNavbar } from "@/components/marketing/navbar";
import { MarketingFooter } from "@/components/marketing/footer";
import {
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  Server,
  Cloud,
  HelpCircle,
  Code2,
} from "lucide-react";

export const metadata = {
  title: "Pricing — Open-Source Self-Hosted vs Managed Cloud | Pawnify",
  description:
    "Transparent pricing for institutional pawnbrokers. Deploy self-hosted for free forever, or choose managed cloud with SLA and automated backups.",
};

export default async function PricingPage() {
  const session = await getSession();
  const isAuthenticated = !!session;

  return (
    <div className="min-h-screen flex flex-col font-sans" style={{ background: "var(--bg-primary)" }}>
      <MarketingNavbar isAuthenticated={isAuthenticated} />

      <main className="flex-1 py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 mb-3">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>BSL 1.1 / MIT OPEN SOURCE</span>
            </div>
            <h1
              className="text-4xl sm:text-5xl font-black tracking-tight"
              style={{ color: "var(--text-primary)" }}
            >
              Deploy on your infrastructure or ours.
            </h1>
            <p className="mt-4 text-base sm:text-lg" style={{ color: "var(--text-secondary)" }}>
              Pawnify is open source. Run the entire stack self-hosted for free forever, or let us
              manage your Postgres cluster, backups, and security SLA on our cloud.
            </p>
          </div>

          {/* Tier Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto mb-20">
            {/* Card 1: Self-Hosted Community */}
            <div className="p-8 sm:p-10 rounded-3xl border border-(--border-primary) bg-(--bg-card) flex flex-col justify-between relative overflow-hidden">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-(--bg-tertiary) text-(--text-primary)">
                    <Server className="w-3.5 h-3.5" /> Self-Hosted Community
                  </span>
                  <span className="text-xs font-mono text-(--text-muted)">BSL 1.1 License</span>
                </div>

                <div className="flex items-baseline gap-2 mb-6">
                  <span className="text-5xl font-black text-(--text-primary)">$0</span>
                  <span className="text-sm text-(--text-secondary)">/ forever</span>
                </div>

                <p className="text-sm text-(--text-secondary) leading-relaxed mb-8">
                  Full access to the core lending engine, valuation waterfall, and Row-Level Security
                  policies. Deploy on Docker Compose or your own Supabase instance.
                </p>

                <ul className="space-y-3.5 text-sm text-(--text-primary) mb-10">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Unlimited loans, customers &amp; collateral items</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>PostgreSQL Row-Level Security isolation</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>4-Decimal metal weight &amp; multi-unit engine</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Worldwide jurisdiction policy presets</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Community GitHub Discussions support</span>
                  </li>
                </ul>
              </div>

              <Link
                href="/open-source"
                className="w-full inline-flex items-center justify-center gap-2 py-4 rounded-2xl border border-(--border-primary) bg-(--bg-secondary) hover:bg-(--bg-tertiary) text-xs font-bold uppercase tracking-wider transition-all text-(--text-primary)"
              >
                <Code2 className="w-4 h-4" />
                Self-Host Guide
              </Link>
            </div>

            {/* Card 2: Managed Cloud Enterprise */}
            <div className="p-8 sm:p-10 rounded-3xl border-2 border-emerald-500 bg-gradient-to-b from-emerald-500/[0.07] to-(--bg-card) flex flex-col justify-between relative overflow-hidden shadow-2xl">
              <div className="absolute top-4 right-4 bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                RECOMMENDED
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400">
                    <Cloud className="w-3.5 h-3.5" /> Managed Cloud Enterprise
                  </span>
                </div>

                <div className="flex items-baseline gap-2 mb-6">
                  <span className="text-5xl font-black text-(--text-primary)">$99</span>
                  <span className="text-sm text-(--text-secondary)">/ organization / mo</span>
                </div>

                <p className="text-sm text-(--text-secondary) leading-relaxed mb-8">
                  Zero infrastructure maintenance. Fully managed high-availability Postgres cluster,
                  daily encrypted backups, multi-branch roles, and priority institutional SLA.
                </p>

                <ul className="space-y-3.5 text-sm text-(--text-primary) mb-10">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Everything in Self-Hosted Community</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Managed Supabase PostgreSQL cluster &amp; CDN</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Automated point-in-time encrypted backups</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Multi-branch role administration &amp; audit export</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>99.95% SLA guarantee &amp; dedicated onboarding</span>
                  </li>
                </ul>
              </div>

              <Link
                href="/login?demo=true"
                className="btn-primary w-full inline-flex items-center justify-center gap-2 py-4 text-xs font-bold uppercase tracking-wider shadow-lg shadow-emerald-500/20"
              >
                Launch Cloud Account
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Comparison Table */}
          <div className="max-w-4xl mx-auto rounded-3xl border border-(--border-primary) bg-(--bg-card) p-6 sm:p-10">
            <h2 className="text-xl font-bold mb-6 text-(--text-primary)">
              Feature Comparison Matrix
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-(--border-primary) text-xs font-bold uppercase text-(--text-secondary)">
                    <th className="pb-3">Capability</th>
                    <th className="pb-3 text-center">Self-Hosted OSS</th>
                    <th className="pb-3 text-center text-emerald-400">Managed Cloud</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-(--border-primary)/60">
                  <tr>
                    <td className="py-3 font-semibold text-(--text-primary)">
                      Tiered LTV &amp; Valuation Engine
                    </td>
                    <td className="py-3 text-center text-emerald-400">✓ Included</td>
                    <td className="py-3 text-center text-emerald-400">✓ Included</td>
                  </tr>
                  <tr>
                    <td className="py-3 font-semibold text-(--text-primary)">
                      Postgres Row-Level Security
                    </td>
                    <td className="py-3 text-center text-emerald-400">✓ Included</td>
                    <td className="py-3 text-center text-emerald-400">✓ Included</td>
                  </tr>
                  <tr>
                    <td className="py-3 font-semibold text-(--text-primary)">
                      4-Decimal Metal Weight Precision
                    </td>
                    <td className="py-3 text-center text-emerald-400">✓ Included</td>
                    <td className="py-3 text-center text-emerald-400">✓ Included</td>
                  </tr>
                  <tr>
                    <td className="py-3 font-semibold text-(--text-primary)">
                      Automated Infrastructure &amp; Backups
                    </td>
                    <td className="py-3 text-center text-(--text-muted)">Self-Managed</td>
                    <td className="py-3 text-center text-emerald-400">✓ Managed Daily</td>
                  </tr>
                  <tr>
                    <td className="py-3 font-semibold text-(--text-primary)">
                      Dedicated Compliance Support &amp; SLA
                    </td>
                    <td className="py-3 text-center text-(--text-muted)">Community</td>
                    <td className="py-3 text-center text-emerald-400">✓ Dedicated Support</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
