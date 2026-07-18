import React from "react";
import { getSession } from "@/lib/auth/session";
import { MarketingNavbar } from "@/components/marketing/navbar";
import { MarketingFooter } from "@/components/marketing/footer";

export const metadata = {
  title: "Privacy Policy | Pawnify",
  description: "Institutional privacy and data protection notice for Pawnify.",
};

export default async function PrivacyPage() {
  const session = await getSession();
  const isAuthenticated = !!session;

  return (
    <div className="min-h-screen flex flex-col font-sans" style={{ background: "var(--bg-primary)" }}>
      <MarketingNavbar isAuthenticated={isAuthenticated} />

      <main className="flex-1 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1
            className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-6"
            style={{ color: "var(--text-primary)" }}
          >
            Institutional Privacy Notice
          </h1>
          <div
            className="space-y-6 text-sm leading-relaxed"
            style={{ color: "var(--text-secondary)" }}
          >
            <p>
              Last updated: {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </p>
            <p>
              Pawnify Cloud Inc. (&ldquo;Pawnify&rdquo;) is committed to maintaining institutional-grade
              data privacy and tenant isolation across our multi-tenant SaaS infrastructure.
            </p>
            <h2 className="text-lg font-bold text-(--text-primary)">1. Row-Level Tenant Data Isolation</h2>
            <p>
              All customer identity documents (KYC), loan ledgers, and transaction records are isolated
              at the database layer using PostgreSQL Row-Level Security (RLS). Tenant records cannot be
              queried or accessed across organization boundaries.
            </p>
            <h2 className="text-lg font-bold text-(--text-primary)">2. Self-Hosted Deployments</h2>
            <p>
              If you deploy Pawnify on your own self-hosted infrastructure under our BSL 1.1 / MIT license,
              your data remains entirely on your servers. Pawnify Cloud does not collect telemetry or loan
              data from self-hosted instances.
            </p>
          </div>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
