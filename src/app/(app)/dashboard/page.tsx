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
              className="btn-primary text-xs px-3.5 py-2"
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
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Total Active AUM
            </span>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform"
              style={{ background: "var(--accent-bg)", color: "var(--accent-text)" }}>
              <Coins className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
            {formatINR(stats.totalAUM)}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
            <span className="font-medium" style={{ color: "var(--accent-text)" }}>{stats.activeCount}</span>
            <span>active loan contracts</span>
          </div>
        </div>

        {/* Overdue */}
        <div className="kpi-card relative overflow-hidden group" style={{ borderColor: "rgba(239, 68, 68, 0.2)" }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-red-500">
              Overdue Exposure
            </span>
            <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center group-hover:scale-110 transition-transform">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold tracking-tight text-red-500">
            {formatINR(stats.overdueAmount)}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
            <span className="text-red-500 font-bold">{stats.overdueCount}</span>
            <span>loans past grace period</span>
          </div>
        </div>

        {/* Collections Today */}
        <div className="kpi-card relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Collections Today
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold tracking-tight text-emerald-600">
            {formatINR(stats.collectionsToday.amount)}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
            <span className="text-emerald-600 font-medium">
              {stats.collectionsToday.count}
            </span>
            <span>receipts issued today</span>
          </div>
        </div>

        {/* Customers */}
        <div className="kpi-card relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Total Customers
            </span>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
            {stats.customerCount}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
            <span className="font-medium" style={{ color: "var(--text-secondary)" }}>{stats.closedCount}</span>
            <span>historical closed loans</span>
          </div>
        </div>
      </div>

      {/* Interactive Recharts Analytics Component */}
      <DashboardCharts data={chartData} />

      {/* Secondary Metrics & Quick Status */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="glass-card p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "var(--accent-bg)", color: "var(--accent-text)" }}>
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Disbursed Today</div>
            <div className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
              {formatINR(stats.disbursedToday.amount)}
            </div>
            <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              {stats.disbursedToday.count} loan(s)
            </div>
          </div>
        </div>

        <div className="glass-card p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "rgba(245, 158, 11, 0.1)", color: "#d97706" }}>
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Due in 7 Days</div>
            <div className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
              {stats.dueIn7Days} loans
            </div>
            <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>Immediate follow-up target</div>
          </div>
        </div>

        <div className="glass-card p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "rgba(59, 130, 246, 0.1)", color: "#2563eb" }}>
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Due in 30 Days</div>
            <div className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
              {stats.dueIn30Days} loans
            </div>
            <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>Upcoming maturity window</div>
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
              <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
                Action Required: Overdue Accounts
              </h2>
            </div>
            <Link
              href="/loans?status=OVERDUE"
              className="text-xs font-medium flex items-center gap-1 transition-colors"
              style={{ color: "var(--accent-text)" }}
            >
              View all ({stats.overdueCount})
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="glass-card overflow-hidden">
            {stats.overdueLoans.length === 0 ? (
              <div className="p-8 text-center text-sm flex flex-col items-center gap-2" style={{ color: "var(--text-muted)" }}>
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
                        <td className="font-mono text-xs font-medium" style={{ color: "var(--accent-text)" }}>
                          <Link
                            href={`/loans/${loan.id}`}
                            className="hover:underline"
                          >
                            {loan.loanNumber}
                          </Link>
                        </td>
                        <td>
                          <div className="font-medium" style={{ color: "var(--text-primary)" }}>
                            {loan.customer.fullName}
                          </div>
                          <div className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
                            {loan.customer.phone}
                          </div>
                        </td>
                        <td className="font-semibold text-red-500">
                          {formatINR(loan.principalOutstanding.toString())}
                        </td>
                        <td className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                          {formatDate(loan.dueDate)}
                          <div className="text-[10px] text-red-500 font-medium">
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
            <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
              Recent Disbursals
            </h2>
            <Link
              href="/loans"
              className="text-xs font-medium flex items-center gap-1 transition-colors"
              style={{ color: "var(--accent-text)" }}
            >
              All Loans
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="glass-card overflow-hidden" style={{ borderColor: "var(--border-card)" }}>
            {stats.recentLoans.map((loan, i) => (
              <Link
                key={loan.id}
                href={`/loans/${loan.id}`}
                className="block p-4 transition-colors"
                style={{
                  borderBottom: i < stats.recentLoans.length - 1 ? "1px solid var(--border-secondary)" : "none",
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-xs font-medium" style={{ color: "var(--accent-text)" }}>
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
                <div className="font-medium text-sm truncate" style={{ color: "var(--text-primary)" }}>
                  {loan.customer.fullName}
                </div>
                <div className="flex items-center justify-between mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
                  <span>Disbursed: {formatDate(loan.loanDate)}</span>
                  <span className="font-bold" style={{ color: "var(--text-primary)" }}>
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
