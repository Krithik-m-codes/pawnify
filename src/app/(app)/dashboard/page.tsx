import React from "react";
import Link from "next/link";
import { getDashboardStats, getDashboardChartData } from "@/lib/services/dashboard";
import { PageHeader } from "@/components/page-header";
import { DashboardCharts } from "@/components/dashboard-charts";
import {
  Coins,
  AlertTriangle,
  TrendingUp,
  Users,
  ArrowUpRight,
  Plus,
  Clock,
  CheckCircle2,
  Calendar,
  Wallet,
  ArrowRight,
} from "lucide-react";

export const metadata = {
  title: "Dashboard | Pawnify",
};

export default async function DashboardPage() {
  const [stats, chartData] = await Promise.all([getDashboardStats(), getDashboardChartData()]);

  const formatINR = (val: string | number) => {
    const num = typeof val === "string" ? parseFloat(val) : val;
    if (isNaN(num)) return "₹0";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(num);
  };

  const formatDate = (dateString: Date) => {
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(dateString));
  };

  return (
    <div>
      <PageHeader
        title="Operational Dashboard"
        description="Real-time overview of active pawn loans, collections, LTV metrics, and overdue accounts."
        action={
          <div className="flex items-center gap-2.5">
            <Link
              href="/customers/new"
              className="btn-secondary text-xs px-3.5 py-2"
            >
              <Plus className="w-3.5 h-3.5" />
              New Customer
            </Link>
            <Link
              href="/loans/new"
              className="btn-primary text-xs px-3.5 py-2 shadow-md shadow-amber-500/10"
            >
              <Plus className="w-3.5 h-3.5" />
              New Loan Disbursal
            </Link>
          </div>
        }
      />

      {/* Primary KPIs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* AUM */}
        <div className="kpi-card relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Total Active AUM
            </span>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Coins className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100">
            {formatINR(stats.totalAUM)}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-zinc-400">
            <span className="text-amber-400 font-medium">{stats.activeCount}</span>
            <span>active loan contracts</span>
          </div>
        </div>

        {/* Overdue */}
        <div className="kpi-card relative overflow-hidden group border-red-500/20 hover:border-red-500/40">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-red-400">
              Overdue Exposure
            </span>
            <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold tracking-tight text-red-400">
            {formatINR(stats.overdueAmount)}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-zinc-400">
            <span className="text-red-400 font-bold">{stats.overdueCount}</span>
            <span>loans past grace period</span>
          </div>
        </div>

        {/* Collections Today */}
        <div className="kpi-card relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Collections Today
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold tracking-tight text-emerald-400">
            {formatINR(stats.collectionsToday.amount)}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-zinc-400">
            <span className="text-emerald-400 font-medium">
              {stats.collectionsToday.count}
            </span>
            <span>receipts issued today</span>
          </div>
        </div>

        {/* Customers */}
        <div className="kpi-card relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Total Customers
            </span>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100">
            {stats.customerCount}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-zinc-400">
            <span className="text-zinc-300 font-medium">{stats.closedCount}</span>
            <span>historical closed loans</span>
          </div>
        </div>
      </div>

      {/* Interactive Recharts Analytics Component */}
      <DashboardCharts data={chartData} />

      {/* Secondary Metrics & Quick Status */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="glass-card p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-medium text-zinc-400">Disbursed Today</div>
            <div className="text-lg font-bold text-zinc-100">
              {formatINR(stats.disbursedToday.amount)}
            </div>
            <div className="text-[11px] text-zinc-500">
              {stats.disbursedToday.count} loan(s)
            </div>
          </div>
        </div>

        <div className="glass-card p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-medium text-zinc-400">Due in 7 Days</div>
            <div className="text-lg font-bold text-zinc-100">
              {stats.dueIn7Days} loans
            </div>
            <div className="text-[11px] text-zinc-500">Immediate follow-up target</div>
          </div>
        </div>

        <div className="glass-card p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-medium text-zinc-400">Due in 30 Days</div>
            <div className="text-lg font-bold text-zinc-100">
              {stats.dueIn30Days} loans
            </div>
            <div className="text-[11px] text-zinc-500">Upcoming maturity window</div>
          </div>
        </div>
      </div>

      {/* Main Content Grid: Overdue Attention Table + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Overdue Loans requiring immediate attention */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              <h2 className="text-base font-semibold text-zinc-100">
                Action Required: Overdue Accounts
              </h2>
            </div>
            <Link
              href="/loans?status=OVERDUE"
              className="text-xs font-medium text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
            >
              View all ({stats.overdueCount})
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="glass-card overflow-hidden">
            {stats.overdueLoans.length === 0 ? (
              <div className="p-8 text-center text-sm text-zinc-500 flex flex-col items-center gap-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500/50" />
                <span>No overdue loans currently! All accounts are in good standing.</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Loan No.</th>
                      <th>Customer</th>
                      <th>Principal Due</th>
                      <th>Due Date</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.overdueLoans.map((loan) => (
                      <tr key={loan.id}>
                        <td className="font-mono text-xs font-medium text-amber-400">
                          <Link
                            href={`/loans/${loan.id}`}
                            className="hover:underline"
                          >
                            {loan.loanNumber}
                          </Link>
                        </td>
                        <td>
                          <div className="font-medium text-zinc-200">
                            {loan.customer.fullName}
                          </div>
                          <div className="text-xs text-zinc-500 font-mono">
                            {loan.customer.phone}
                          </div>
                        </td>
                        <td className="font-semibold text-red-400">
                          {formatINR(loan.principalOutstanding.toString())}
                        </td>
                        <td className="text-xs text-zinc-400">
                          {formatDate(loan.dueDate)}
                          <div className="text-[10px] text-red-400 font-medium">
                            +{loan.gracePeriodDays}d grace passed
                          </div>
                        </td>
                        <td>
                          <Link
                            href={`/loans/${loan.id}`}
                            className="btn-secondary text-xs px-2.5 py-1"
                          >
                            Collect
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Recent Disbursals */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-zinc-100">
              Recent Disbursals
            </h2>
            <Link
              href="/loans"
              className="text-xs font-medium text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
            >
              All Loans
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="glass-card divide-y divide-zinc-800/80">
            {stats.recentLoans.map((loan) => (
              <Link
                key={loan.id}
                href={`/loans/${loan.id}`}
                className="block p-4 hover:bg-zinc-900/60 transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-xs font-medium text-amber-400">
                    {loan.loanNumber}
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase ${
                      loan.displayStatus === "ACTIVE"
                        ? "badge-active"
                        : loan.displayStatus === "OVERDUE"
                        ? "badge-overdue"
                        : "badge-closed"
                    }`}
                  >
                    {loan.displayStatus}
                  </span>
                </div>
                <div className="font-medium text-sm text-zinc-200 truncate">
                  {loan.customer.fullName}
                </div>
                <div className="flex items-center justify-between mt-2 text-xs text-zinc-400">
                  <span>Disbursed: {formatDate(loan.loanDate)}</span>
                  <span className="font-bold text-zinc-100">
                    {formatINR(loan.principalAmount.toString())}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
