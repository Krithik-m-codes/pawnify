import React from "react";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { MarketingNavbar } from "@/components/marketing/navbar";
import { MarketingFooter } from "@/components/marketing/footer";
import {
  Code2,
  Database,
  Terminal,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Cpu,
} from "lucide-react";

export const metadata = {
  title: "Open Source Architecture & Self-Hosting | Pawnify",
  description:
    "Explore Pawnify's open-source architecture: Next.js 15, PostgreSQL Row-Level Security, and arbitrary precision Decimal arithmetic.",
};

export default async function OpenSourcePage() {
  const session = await getSession();
  const isAuthenticated = !!session;

  return (
    <div className="min-h-screen flex flex-col font-sans" style={{ background: "var(--bg-primary)" }}>
      <MarketingNavbar isAuthenticated={isAuthenticated} />

      <main className="flex-1 py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Hero */}
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 mb-3">
              <Code2 className="w-3.5 h-3.5" />
              <span>TRANSPARENT COLLATERAL CODEBASE</span>
            </div>
            <h1
              className="text-4xl sm:text-5xl font-black tracking-tight"
              style={{ color: "var(--text-primary)" }}
            >
              Open Source. Auditable by Design.
            </h1>
            <p className="mt-4 text-base sm:text-lg" style={{ color: "var(--text-secondary)" }}>
              Financial software demands transparency. Inspect every line of our valuation waterfall,
              verify our Row-Level Security policies, and self-host Pawnify on your own hardware.
            </p>
          </div>

          {/* Core Tech Stack Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-16">
            <div className="p-8 rounded-3xl border border-(--border-primary) bg-(--bg-card)">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4 font-bold font-mono">
                01
              </div>
              <h3 className="text-lg font-bold text-(--text-primary)">Next.js 15 App Router</h3>
              <p className="mt-2 text-xs leading-relaxed text-(--text-secondary)">
                Server Actions handle all mutating financial operations directly. Zero intermediate API
                glue layer to maintain or secure.
              </p>
            </div>

            <div className="p-8 rounded-3xl border border-(--border-primary) bg-(--bg-card)">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4 font-bold font-mono">
                02
              </div>
              <h3 className="text-lg font-bold text-(--text-primary)">PostgreSQL + Supabase RLS</h3>
              <p className="mt-2 text-xs leading-relaxed text-(--text-secondary)">
                Tenant isolation lives inside the PostgreSQL engine via session variables (`app.current_organization_id`),
                protecting data at the deepest layer.
              </p>
            </div>

            <div className="p-8 rounded-3xl border border-(--border-primary) bg-(--bg-card)">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4 font-bold font-mono">
                03
              </div>
              <h3 className="text-lg font-bold text-(--text-primary)">Prisma Decimal Engine</h3>
              <p className="mt-2 text-xs leading-relaxed text-(--text-secondary)">
                Strict avoidance of JavaScript floats (`Number`). Arbitrary-precision Decimal arithmetic
                ensures exact interest and 4-decimal weights.
              </p>
            </div>
          </div>

          {/* Self-Hosting Snippet */}
          <div className="max-w-4xl mx-auto rounded-3xl border border-(--border-primary) bg-(--bg-card) p-8 sm:p-10 mb-16">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-emerald-400" />
                <h2 className="text-lg font-bold text-(--text-primary)">Self-Hosting Quickstart</h2>
              </div>
              <span className="text-xs font-mono text-(--text-muted)">Docker / Node 20+</span>
            </div>

            <pre className="p-5 rounded-2xl bg-zinc-950 border border-white/10 text-xs font-mono text-zinc-300 overflow-x-auto leading-relaxed">
{`# 1. Clone the open-source Pawnify repository
git clone https://github.com/pawnify/pawnify.git && cd pawnify

# 2. Copy the environment variables template
cp .env.example .env

# 3. Apply database schema and seed multi-tenant presets
npx prisma migrate deploy
npm run db:seed

# 4. Start the application locally
npm run dev`}
            </pre>
          </div>

          {/* Licensing Banner */}
          <div className="max-w-3xl mx-auto text-center p-8 rounded-3xl border border-(--border-primary) bg-(--bg-secondary)">
            <h3 className="text-base font-bold text-(--text-primary)">Business Source License (BSL 1.1)</h3>
            <p className="mt-2 text-xs text-(--text-secondary) leading-relaxed">
              Pawnify is free for internal business use and self-hosting. Under BSL 1.1, the code converts
              automatically to open-source MIT after 3 years. Cloud SaaS competitors offering Pawnify as a paid
              managed service require a commercial license.
            </p>
          </div>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
