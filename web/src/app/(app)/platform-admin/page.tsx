import React from "react";
import { checkAuth } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { ShieldCheck, Building2, Server, Cloud, Layers } from "lucide-react";
import { PlanSelectorClient } from "./client";

export const metadata = {
  title: "Platform Operator Control Plane | Pawnify",
  description: "Multi-tenant organization & SaaS billing administration portal.",
};

export default async function PlatformAdminPage() {
  const auth = await checkAuth();

  const organizations = await prisma.organization.findMany({
    include: {
      _count: {
        select: {
          branches: true,
          loans: true,
          users: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-8 p-6 sm:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-(--border-primary) pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-semibold border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>PLATFORM OPERATOR CONTROL PLANE</span>
          </div>
          <h1
            className="text-2xl sm:text-3xl font-black tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            Multi-Tenant Administration
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Monitor active tenant organizations, inspect RLS boundaries, and manage SaaS subscription plans.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl border border-(--border-primary) bg-(--bg-card) flex items-center gap-2.5 text-xs">
            <Building2 className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-(--text-primary)">
              {organizations.length} Active Organizations
            </span>
          </div>
        </div>
      </div>

      {/* Organizations Table */}
      <div className="rounded-3xl border border-(--border-primary) bg-(--bg-card) overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-(--border-primary) bg-(--bg-secondary) text-xs font-bold uppercase text-(--text-secondary)">
                <th className="px-6 py-4">Organization &amp; Slug</th>
                <th className="px-6 py-4">SaaS Billing Plan</th>
                <th className="px-6 py-4 text-center">Active Loans</th>
                <th className="px-6 py-4 text-center">Branches</th>
                <th className="px-6 py-4 text-center">Staff Users</th>
                <th className="px-6 py-4 text-right">Plan Control</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-(--border-primary)/60">
              {organizations.map((org) => {
                const isSelfHosted = !org.billingPlan;
                return (
                  <tr key={org.id} className="hover:bg-(--bg-secondary)/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-(--text-primary)">{org.name}</div>
                      <div className="text-xs font-mono text-(--text-muted)">
                        id: {org.id.slice(0, 10)}... • slug: {org.slug}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {isSelfHosted ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-(--bg-tertiary) text-(--text-secondary)">
                          <Server className="w-3 h-3" /> Self-Hosted OSS
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 uppercase">
                          <Cloud className="w-3 h-3" /> {org.billingPlan}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center font-mono font-bold text-(--text-primary)">
                      {org._count.loans}
                    </td>
                    <td className="px-6 py-4 text-center font-mono font-bold text-(--text-primary)">
                      {org._count.branches}
                    </td>
                    <td className="px-6 py-4 text-center font-mono font-bold text-(--text-primary)">
                      {org._count.users}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <PlanSelectorClient
                        organizationId={org.id}
                        currentPlan={org.billingPlan || ""}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
