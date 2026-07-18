"use client";

import React from "react";
import { PageHeader } from "@/components/page-header";
import {
  Percent,
  Scale,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  PieChart,
  Loader2,
} from "lucide-react";
import { useGetReportsDataQuery } from "@/lib/redux/api/reportsApi";

const formatINR = (val: number | string) => {
  const num = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(num)) return "₹0";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(num);
};

export function ReportsClient() {
  const { data, isLoading, isError } = useGetReportsDataQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-(--accent)" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-8 text-center text-sm text-(--text-muted)">
        Failed to load reports data.
      </div>
    );
  }

  const {
    totalLoansCount,
    totalPaymentsCount,
    activeCount,
    overdueCount,
    closedCount,
    goldLoansCount,
    silverLoansCount,
    goldAssessedValue,
    silverAssessedValue,
    ltv85Count,
    ltv80Count,
    ltv75Count,
    totalCollected,
    interestCollected,
    principalCollected,
    totalDisbursed,
  } = data;

  return (
    <div>
      <PageHeader
        title="Analytics & Regulatory Reports"
        description="RBI LTV exposure tiers, collateral composition (Gold vs Silver), and collections breakdown."
      />

      {/* Top Ledger Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="kpi-card border-(--accent-border)">
          <div className="text-xs font-semibold uppercase tracking-wider text-(--text-secondary) mb-2">
            Historical Disbursed
          </div>
          <div className="text-2xl font-bold text-(--text-primary)">
            {formatINR(totalDisbursed)}
          </div>
          <div className="text-xs text-(--text-muted) mt-1">
            {totalLoansCount} total loan contracts
          </div>
        </div>

        <div className="kpi-card border-(--accent-border)">
          <div className="text-xs font-semibold uppercase tracking-wider text-(--text-secondary) mb-2">
            Total Collections
          </div>
          <div className="text-2xl font-bold text-(--accent)">{formatINR(totalCollected)}</div>
          <div className="text-xs text-(--text-muted) mt-1">
            {totalPaymentsCount} payment receipts
          </div>
        </div>

        <div className="kpi-card border-(--accent-border)">
          <div className="text-xs font-semibold uppercase tracking-wider text-(--text-secondary) mb-2">
            Interest Realized
          </div>
          <div className="text-2xl font-bold text-(--accent)">{formatINR(interestCollected)}</div>
          <div className="text-xs text-(--text-muted) mt-1">Simple interest revenue</div>
        </div>

        <div className="kpi-card border-blue-500/20">
          <div className="text-xs font-semibold uppercase tracking-wider text-(--text-secondary) mb-2">
            Principal Recovered
          </div>
          <div className="text-2xl font-bold text-blue-400">{formatINR(principalCollected)}</div>
          <div className="text-xs text-(--text-muted) mt-1">Capital repaid by customers</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* RBI LTV Slabs Distribution (§6.2) */}
        <div className="glass-card p-6 space-y-6">
          <div className="flex items-center gap-2 pb-4 border-b border-(--border-primary)">
            <Percent className="w-5 h-5 text-(--accent)" />
            <h2 className="text-base font-bold text-(--text-primary)">
              RBI LTV Exposure Tiers (§6.2)
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-(--text-secondary)">
                  Tier 1: ≤ ₹2.5L (85% LTV Cap)
                </span>
                <span className="font-bold text-(--accent)">{ltv85Count} loans</span>
              </div>
              <div className="w-full h-2.5 bg-(--bg-tertiary) rounded-full overflow-hidden">
                <div
                  className="h-full bg-(--accent)"
                  style={{ width: `${(ltv85Count / Math.max(1, totalLoansCount)) * 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-(--text-secondary)">
                  Tier 2: ₹2.5L - ₹5L (80% LTV Cap)
                </span>
                <span className="font-bold text-(--accent)">{ltv80Count} loans</span>
              </div>
              <div className="w-full h-2.5 bg-(--bg-tertiary) rounded-full overflow-hidden">
                <div
                  className="h-full bg-(--accent)"
                  style={{ width: `${(ltv80Count / Math.max(1, totalLoansCount)) * 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-(--text-secondary)">
                  Tier 3: &gt; ₹5L (75% LTV Cap)
                </span>
                <span className="font-bold text-(--accent)">{ltv75Count} loans</span>
              </div>
              <div className="w-full h-2.5 bg-(--bg-tertiary) rounded-full overflow-hidden">
                <div
                  className="h-full bg-(--accent)"
                  style={{ width: `${(ltv75Count / Math.max(1, totalLoansCount)) * 100}%` }}
                />
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-(--bg-tertiary) border border-(--border-primary) text-xs text-(--text-secondary)">
            <span className="font-semibold text-(--text-primary) block mb-1">Regulatory Note:</span>
            Tiered Loan-to-Value (LTV) limits ensure higher value pledges maintain a higher equity
            buffer against gold/silver price volatility.
          </div>
        </div>

        {/* Collateral Metal Composition */}
        <div className="glass-card p-6 space-y-6">
          <div className="flex items-center gap-2 pb-4 border-b border-(--border-primary)">
            <Scale className="w-5 h-5 text-(--accent)" />
            <h2 className="text-base font-bold text-(--text-primary)">
              Collateral Composition (Gold vs Silver)
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-(--accent-bg) border border-(--accent-border) text-center space-y-1">
              <div className="text-xs font-semibold uppercase text-(--accent)">Gold Pledges</div>
              <div className="text-2xl font-bold text-(--text-primary)">{goldLoansCount}</div>
              <div className="text-[11px] text-(--text-secondary)">
                Assessed Val: <b className="text-(--accent)">{formatINR(goldAssessedValue)}</b>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-(--bg-tertiary) border border-(--border-primary) text-center space-y-1">
              <div className="text-xs font-semibold uppercase text-(--text-primary)">
                Silver Pledges
              </div>
              <div className="text-2xl font-bold text-(--text-primary)">{silverLoansCount}</div>
              <div className="text-[11px] text-(--text-secondary)">
                Assessed Val:{" "}
                <b className="text-(--text-primary)">{formatINR(silverAssessedValue)}</b>
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-(--bg-tertiary) border border-(--border-primary) text-xs text-(--text-secondary)">
            <span className="font-semibold text-(--text-primary) block mb-1">
              Valuation Accuracy:
            </span>
            All valuations are calculated based on net weight (gross weight minus stone/wax weight)
            multiplied by purity percentage and current valuation rate per gram.
          </div>
        </div>
      </div>

      {/* Portfolio Health & Waterfall Summary */}
      <div className="glass-card p-6 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-(--border-primary)">
          <PieChart className="w-5 h-5 text-(--accent)" />
          <h2 className="text-base font-bold text-(--text-primary)">Portfolio Health Breakdown</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-(--accent-bg) text-(--accent) flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-(--text-secondary) font-semibold uppercase">
                Active Good Standing
              </div>
              <div className="text-xl font-bold text-(--accent)">{activeCount} loans</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-(--text-secondary) font-semibold uppercase">
                Overdue Past Grace
              </div>
              <div className="text-xl font-bold text-red-400">{overdueCount} loans</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-(--bg-tertiary) text-(--text-secondary) flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-(--text-secondary) font-semibold uppercase">
                Closed & Released
              </div>
              <div className="text-xl font-bold text-(--text-secondary)">{closedCount} loans</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
