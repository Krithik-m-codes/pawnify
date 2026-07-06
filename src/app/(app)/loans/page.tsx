import React from "react";
import Link from "next/link";
import { getLoans } from "@/lib/services/loans";
import { PageHeader } from "@/components/page-header";
import {
  Coins,
  Plus,
  Search,
  Filter,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Scale,
} from "lucide-react";
import { MetalType } from "@prisma/client";

export const metadata = {
  title: "Loans Directory | Pawnify",
};

interface PageProps {
  searchParams: Promise<{
    status?: string;
    search?: string;
    metalType?: string;
    page?: string;
  }>;
}

export default async function LoansListPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const statusParam = resolvedParams.status as "ACTIVE" | "OVERDUE" | "CLOSED" | undefined;
  const search = resolvedParams.search || "";
  const metalTypeParam = resolvedParams.metalType as MetalType | undefined;
  const page = parseInt(resolvedParams.page || "1", 10);

  const { loans, total, totalPages } = await getLoans({
    status: statusParam,
    search,
    metalType: metalTypeParam,
    page,
    pageSize: 15,
  });

  const formatINR = (val: string | number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(typeof val === "string" ? parseFloat(val) : val);
  };

  const formatDate = (dateString: Date) => {
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(dateString));
  };

  const statusTabs = [
    { label: "All Loans", value: undefined },
    { label: "Active", value: "ACTIVE" },
    { label: "Overdue Exposure", value: "OVERDUE" },
    { label: "Closed & Released", value: "CLOSED" },
  ];

  return (
    <div>
      <PageHeader
        title="Loan Contracts Directory"
        description="Monitor gold & silver pledges, track outstanding principal, check LTV ratios, and process repayments."
        action={
          <Link
            href="/loans/new"
            className="btn-primary text-xs px-4 py-2.5 shadow-md shadow-amber-500/10"
          >
            <Plus className="w-4 h-4" />
            Disburse New Loan
          </Link>
        }
      />

      {/* Status Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 mb-6 border-b border-zinc-800 pb-4">
        {statusTabs.map((tab) => {
          const active = statusParam === tab.value;
          return (
            <Link
              key={tab.label}
              href={`/loans?${tab.value ? `status=${tab.value}` : ""}${
                search ? `&search=${search}` : ""
              }`}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                active
                  ? "bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20"
                  : "bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* Search & Metal Filter Bar */}
      <div className="glass-card p-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <form method="get" className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          {statusParam && <input type="hidden" name="status" value={statusParam} />}
          
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              name="search"
              defaultValue={search}
              placeholder="Loan No., customer name, packet..."
              className="input-field pl-10 text-xs py-2"
            />
          </div>

          <select
            name="metalType"
            defaultValue={metalTypeParam || ""}
            className="input-field bg-zinc-950 text-xs py-2 w-full sm:w-44"
          >
            <option value="">All Collateral Types</option>
            <option value="GOLD">Gold (22K / 24K / 18K)</option>
            <option value="SILVER">Silver (Sterling / Fine)</option>
          </select>

          <button type="submit" className="btn-secondary text-xs px-3 py-2 shrink-0">
            Filter
          </button>
        </form>

        <div className="text-xs text-zinc-400 self-end sm:self-center">
          Showing <span className="font-bold text-zinc-200">{loans.length}</span> of{" "}
          <span className="font-bold text-zinc-200">{total}</span> contracts
        </div>
      </div>

      {/* Loans Table */}
      <div className="glass-card overflow-hidden">
        {loans.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-zinc-900 flex items-center justify-center text-zinc-600">
              <Coins className="w-6 h-6" />
            </div>
            <div className="text-base font-medium text-zinc-300">
              No loan contracts matched your filters
            </div>
            <p className="text-xs text-zinc-500 max-w-md">
              {search || statusParam || metalTypeParam
                ? "Try clearing your filters or search keywords to view all loans."
                : "Get started by disbursing your first loan against pledged gold or silver items."}
            </p>
            {(search || statusParam || metalTypeParam) && (
              <Link href="/loans" className="btn-secondary text-xs mt-2">
                Reset Filters
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Loan Contract</th>
                  <th>Customer Profile</th>
                  <th>Collateral & LTV</th>
                  <th>Principal Outstanding</th>
                  <th>Due Date & Tenure</th>
                  <th>Status</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {loans.map((l) => (
                  <tr key={l.id}>
                    <td>
                      <div>
                        <Link
                          href={`/loans/${l.id}`}
                          className="font-mono font-semibold text-xs text-amber-400 hover:underline"
                        >
                          {l.loanNumber}
                        </Link>
                        <div className="text-[11px] text-zinc-500 mt-0.5">
                          Disbursed: {formatDate(l.loanDate)}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div>
                        <Link
                          href={`/customers/${l.customerId}`}
                          className="font-medium text-zinc-200 hover:text-amber-400 transition-colors text-sm"
                        >
                          {l.customer.fullName}
                        </Link>
                        <div className="font-mono text-xs text-zinc-500">
                          {l.customer.phone}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5 text-xs text-zinc-300">
                        <Scale className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>
                          {l.items[0]?.metalType || "MIXED"} ({l.items.length} item{l.items.length > 1 ? "s" : ""})
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-500 mt-0.5">
                        Val: {formatINR(l.totalAssessedValue.toString())} | LTV:{" "}
                        <span className="font-bold text-amber-400">{l.ltvPercent.toString()}%</span>
                      </div>
                    </td>
                    <td>
                      <div className="font-bold text-sm text-zinc-100">
                        {formatINR(l.principalOutstanding.toString())}
                      </div>
                      <div className="text-[11px] text-zinc-500">
                        Original: {formatINR(l.principalAmount.toString())}
                      </div>
                    </td>
                    <td>
                      <div className="text-xs font-medium text-zinc-300">
                        {formatDate(l.dueDate)}
                      </div>
                      <div className="text-[11px] text-zinc-500">
                        {l.tenureMonths} mo @ {l.interestRateMonthly.toString()}% p.m.
                      </div>
                    </td>
                    <td>
                      <span
                        className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase inline-flex items-center gap-1 ${
                          l.displayStatus === "ACTIVE"
                            ? "badge-active"
                            : l.displayStatus === "OVERDUE"
                            ? "badge-overdue"
                            : "badge-closed"
                        }`}
                      >
                        {l.displayStatus === "OVERDUE" && (
                          <AlertTriangle className="w-3 h-3" />
                        )}
                        {l.displayStatus === "CLOSED" && (
                          <CheckCircle2 className="w-3 h-3" />
                        )}
                        {l.displayStatus}
                      </span>
                    </td>
                    <td className="text-right">
                      <Link
                        href={`/loans/${l.id}`}
                        className="btn-secondary text-xs px-3 py-1.5 inline-flex items-center gap-1"
                      >
                        Details
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <div className="text-xs text-zinc-400">
            Page <span className="font-bold text-zinc-200">{page}</span> of{" "}
            <span className="font-bold text-zinc-200">{totalPages}</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/loans?page=${Math.max(1, page - 1)}${
                statusParam ? `&status=${statusParam}` : ""
              }${search ? `&search=${search}` : ""}`}
              className={`btn-secondary text-xs px-3 py-1.5 ${
                page <= 1 ? "pointer-events-none opacity-40" : ""
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              Prev
            </Link>
            <Link
              href={`/loans?page=${Math.min(totalPages, page + 1)}${
                statusParam ? `&status=${statusParam}` : ""
              }${search ? `&search=${search}` : ""}`}
              className={`btn-secondary text-xs px-3 py-1.5 ${
                page >= totalPages ? "pointer-events-none opacity-40" : ""
              }`}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
