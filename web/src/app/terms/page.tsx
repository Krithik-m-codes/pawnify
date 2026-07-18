import React from "react";
import { getSession } from "@/lib/auth/session";
import { MarketingNavbar } from "@/components/marketing/navbar";
import { MarketingFooter } from "@/components/marketing/footer";

export const metadata = {
  title: "Terms of Service | Pawnify",
  description: "Institutional terms of service and licensing notice for Pawnify.",
};

export default async function TermsPage() {
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
            Terms of Service &amp; Licensing Notice
          </h1>
          <div
            className="space-y-6 text-sm leading-relaxed"
            style={{ color: "var(--text-secondary)" }}
          >
            <p>
              Last updated: {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </p>
            <h2 className="text-lg font-bold text-(--text-primary)">1. Business Source License (BSL 1.1)</h2>
            <p>
              Pawnify is distributed under the Business Source License 1.1. You may self-host and modify
              Pawnify for internal lending operations at no cost. Commercial offering of Pawnify as a
              managed cloud service by third parties requires a commercial license agreement.
            </p>
            <h2 className="text-lg font-bold text-(--text-primary)">2. Regulatory &amp; Compliance Disclaimer</h2>
            <p>
              Pawnify provides calculation, valuation, and ledger software tools. Pawnify does not offer
              legal or financial advice and makes no representations regarding compliance with specific
              local pawnbroker or lending statutes in your jurisdiction. Operators are responsible for
              configuring their loan policies in accordance with applicable local regulations.
            </p>
          </div>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
