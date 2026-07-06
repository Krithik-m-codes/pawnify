import React from "react";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import {
  BarChart3,
  TrendingUp,
  Coins,
  Scale,
  Percent,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  PieChart,
} from "lucide-react";
import { Prisma } from "@prisma/client";

export const metadata = {
  title: "Analytics & Reports | Pawnify",
};

export default async function ReportsPage() {
  const allLoans = await prisma.loan.findMany({
    include: { items: { select: { metalType: true, assessedValue: true } } },
  });

  const allPayments = await prisma.payment.findMany();
  const allCharges = await prisma.loanCharge.findMany();

  const formatINR = (val: Prisma.Decimal | number | string) => {
    const num = typeof val === "string" ? parseFloat(val) : typeof val === "number" ? val : parseFloat(val.toString());
    if (isNaN(num)) return "₹0";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(num);
  };

  // Aggregations
  let activeCount = 0;
  let overdueCount = 0;
  let closedCount = 0;
  let totalActiveAUM = 0;

  let goldLoansCount = 0;
  let silverLoansCount = 0;
  let goldAssessedValue = 0;
  let silverAssessedValue = 0;

  let ltv85Count = 0;
  let ltv80Count = 0;
  let ltv75Count = 0;

  const today = new Date();

  for (const loan of allLoans) {
    const principal = parseFloat(loan.principalOutstanding.toString());
    const assessed = parseFloat(loan.totalAssessedValue.toString());
    const ltv = parseFloat(loan.ltvPercent.toString());

    if (loan.status === "CLOSED") {
      closedCount++;
    } else {
      totalActiveAUM += principal;
      const graceDueDate = new Date(loan.dueDate);
      graceDueDate.setDate(graceDueDate.getDate() + loan.gracePeriodDays);
      if (today > graceDueDate) overdueCount++;
      else activeCount++;
    }

    if (ltv >= 85) ltv85Count++;
    else if (ltv >= 80) ltv80Count++;
    else ltv75Count++;

    const isGold = loan.items.some((i) => i.metalType === "GOLD");
    const isSilver = loan.items.some((i) => i.metalType === "SILVER");

    if (isGold) {
      goldLoansCount++;
      goldAssessedValue += assessed;
    }
    if (isSilver && !isGold) {
      silverLoansCount++;
      silverAssessedValue += assessed;
    }
  }

  let totalCollected = 0;
  let interestCollected = 0;
  let principalCollected = 0;
  let chargesCollected = 0;

  for (const p of allPayments) {
    totalCollected += parseFloat(p.amountPaid.toString());
    interestCollected += parseFloat(p.allocatedInterest.toString());
    principalCollected += parseFloat(p.allocatedPrincipal.toString());
    chargesCollected += parseFloat(p.allocatedCharges.toString());
  }

  const totalDisbursed = allLoans.reduce(
    (sum, l) => sum + parseFloat(l.principalAmount.toString()),
    0
  );

  return (
    <div>
      <PageHeader
        title="Analytics & Regulatory Reports"
        description="RBI LTV exposure tiers, collateral composition (Gold vs Silver), and collections breakdown."
      />

      {/* Top Ledger Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="kpi-card border-amber-500/20">
          <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
            Historical Disbursed
          </div>
          <div className="text-2xl font-bold text-zinc-100">{formatINR(totalDisbursed)}</div>
          <div className="text-xs text-zinc-500 mt-1">{allLoans.length} total loan contracts</div>
        </div>

        <div className="kpi-card border-emerald-500/20">
          <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
            Total Collections
          </div>
          <div className="text-2xl font-bold text-emerald-400">{formatINR(totalCollected)}</div>
          <div className="text-xs text-zinc-500 mt-1">{allPayments.length} payment receipts</div>
        </div>

        <div className="kpi-card border-amber-500/20">
          <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
            Interest Realized
          </div>
          <div className="text-2xl font-bold text-amber-400">{formatINR(interestCollected)}</div>
          <div className="text-xs text-zinc-500 mt-1">Simple interest revenue</div>
        </div>

        <div className="kpi-card border-blue-500/20">
          <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
            Principal Recovered
          </div>
          <div className="text-2xl font-bold text-blue-400">{formatINR(principalCollected)}</div>
          <div className="text-xs text-zinc-500 mt-1">Capital repaid by customers</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* RBI LTV Slabs Distribution (§6.2) */}
        <div className="glass-card p-6 space-y-6">
          <div className="flex items-center gap-2 pb-4 border-b border-zinc-800">
            <Percent className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-zinc-100">
              RBI LTV Exposure Tiers (§6.2)
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-zinc-300">Tier 1: ≤ ₹2.5L (85% LTV Cap)</span>
                <span className="font-bold text-amber-400">{ltv85Count} loans</span>
              </div>
              <div className="w-full h-2.5 bg-zinc-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-amber-600"
                  style={{ width: `${(ltv85Count / Math.max(1, allLoans.length)) * 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-zinc-300">Tier 2: ₹2.5L - ₹5L (80% LTV Cap)</span>
                <span className="font-bold text-amber-400">{ltv80Count} loans</span>
              </div>
              <div className="w-full h-2.5 bg-zinc-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-amber-600"
                  style={{ width: `${(ltv80Count / Math.max(1, allLoans.length)) * 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-zinc-300">Tier 3: &gt; ₹5L (75% LTV Cap)</span>
                <span className="font-bold text-amber-400">{ltv75Count} loans</span>
              </div>
              <div className="w-full h-2.5 bg-zinc-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-amber-600"
                  style={{ width: `${(ltv75Count / Math.max(1, allLoans.length)) * 100}%` }}
                />
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800 text-xs text-zinc-400">
            <span className="font-semibold text-zinc-300 block mb-1">Regulatory Note:</span>
            Tiered Loan-to-Value (LTV) limits ensure higher value pledges maintain a higher equity buffer against gold/silver price volatility.
          </div>
        </div>

        {/* Collateral Metal Composition */}
        <div className="glass-card p-6 space-y-6">
          <div className="flex items-center gap-2 pb-4 border-b border-zinc-800">
            <Scale className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-zinc-100">
              Collateral Composition (Gold vs Silver)
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/15 to-amber-500/5 border border-amber-500/30 text-center space-y-1">
              <div className="text-xs font-semibold uppercase text-amber-400">Gold Pledges</div>
              <div className="text-2xl font-bold text-zinc-100">{goldLoansCount}</div>
              <div className="text-[11px] text-zinc-400">
                Assessed Val: <b className="text-amber-400">{formatINR(goldAssessedValue)}</b>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-gradient-to-br from-zinc-800/60 to-zinc-900/80 border border-zinc-700/60 text-center space-y-1">
              <div className="text-xs font-semibold uppercase text-zinc-300">Silver Pledges</div>
              <div className="text-2xl font-bold text-zinc-100">{silverLoansCount}</div>
              <div className="text-[11px] text-zinc-400">
                Assessed Val: <b className="text-zinc-300">{formatINR(silverAssessedValue)}</b>
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800 text-xs text-zinc-400">
            <span className="font-semibold text-zinc-300 block mb-1">Valuation Accuracy:</span>
            All valuations are calculated based on net weight (gross weight minus stone/wax weight) multiplied by purity percentage and current valuation rate per gram.
          </div>
        </div>
      </div>

      {/* Portfolio Health & Waterfall Summary */}
      <div className="glass-card p-6 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-zinc-800">
          <PieChart className="w-5 h-5 text-amber-400" />
          <h2 className="text-base font-bold text-zinc-100">
            Portfolio Health Breakdown
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-zinc-400 font-semibold uppercase">Active Good Standing</div>
              <div className="text-xl font-bold text-emerald-400">{activeCount} loans</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-zinc-400 font-semibold uppercase">Overdue Past Grace</div>
              <div className="text-xl font-bold text-red-400">{overdueCount} loans</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-zinc-800 text-zinc-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-zinc-400 font-semibold uppercase">Closed & Released</div>
              <div className="text-xl font-bold text-zinc-300">{closedCount} loans</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
