import React from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getLoanById } from "@/lib/services/loans";
import { PageHeader } from "@/components/page-header";
import {
  RecordPaymentModal,
  CloseLoanButton,
  ReleaseItemsButton,
  PawnTicketPrintButton,
} from "./loan-actions-client";
import {
  Coins,
  AlertTriangle,
  User,
  Scale,
  Calendar,
  Wallet,
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  FileText,
  Clock,
  TrendingDown,
  Lock,
} from "lucide-react";

export const metadata = {
  title: "Loan Contract Details | Pawnify",
};

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function LoanDetailPage({ params }: PageProps) {
  const resolvedParams = await params;
  const loan = await getLoanById(resolvedParams.id);

  if (!loan) {
    notFound();
  }

  const formatINR = (val: string | number) => {
    const num = typeof val === "string" ? parseFloat(val) : val;
    if (isNaN(num)) return "₹0";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(num);
  };

  const formatDate = (dateString: Date) => {
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(dateString));
  };

  const isReleased = loan.items.every((i) => i.releasedAt !== null);
  const unsettledCharges = loan.charges
    .filter((c) => !c.isSettled)
    .reduce((acc, c) => acc + parseFloat(c.amount.toString()), 0);

  const principalOutstanding = parseFloat(loan.principalOutstanding.toString());
  const accruedInterest = parseFloat(loan.interestSummary.accruedInterest.toString());
  const totalDue = parseFloat(loan.totalDue.toString());

  const canClose = loan.status === "ACTIVE" && principalOutstanding === 0 && unsettledCharges === 0 && accruedInterest < 0.1;
  let closeReason = "";
  if (principalOutstanding > 0) closeReason = `₹${principalOutstanding} principal still outstanding`;
  else if (unsettledCharges > 0) closeReason = `₹${unsettledCharges} unsettled charges remain`;
  else if (accruedInterest >= 0.1) closeReason = `₹${accruedInterest.toFixed(2)} accrued interest remaining`;

  return (
    <div>
      <div className="mb-4 print:hidden">
        <Link
          href="/loans"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-amber-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Loans Directory
        </Link>
      </div>

      {/* Header with Print & Action Buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-zinc-100 flex items-center gap-2">
              {loan.loanNumber}
            </h1>
            <span
              className={`text-xs px-3 py-1 rounded-full font-bold uppercase inline-flex items-center gap-1 ${
                loan.displayStatus === "ACTIVE"
                  ? "badge-active"
                  : loan.displayStatus === "OVERDUE"
                  ? "badge-overdue"
                  : "badge-closed"
              }`}
            >
              {loan.displayStatus === "OVERDUE" && <AlertTriangle className="w-3.5 h-3.5" />}
              {loan.displayStatus === "CLOSED" && <CheckCircle2 className="w-3.5 h-3.5" />}
              {loan.displayStatus}
            </span>
          </div>
          <p className="mt-1 text-sm text-zinc-400">
            Disbursed on {formatDate(loan.loanDate)} by {loan.handledBy.name} • Maturity: {formatDate(loan.dueDate)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 print:hidden shrink-0">
          <PawnTicketPrintButton />
          
          <ReleaseItemsButton
            loanId={loan.id}
            isClosed={loan.status === "CLOSED"}
            isReleased={isReleased}
          />

          {loan.status === "ACTIVE" && (
            <>
              <CloseLoanButton
                loanId={loan.id}
                canClose={canClose}
                reason={closeReason}
              />

              <RecordPaymentModal
                loanId={loan.id}
                principalOutstanding={principalOutstanding}
                accruedInterest={accruedInterest}
                unsettledCharges={unsettledCharges}
                totalDue={totalDue}
              />
            </>
          )}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Left 2 Cols: Customer Profile & Collateral Items */}
        <div className="lg:col-span-2 space-y-8">
          {/* Customer Summary Bar */}
          <div className="glass-card p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-500/5 border border-amber-500/30 flex items-center justify-center font-bold text-amber-400 text-base shrink-0">
                <User className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Pledging Customer Profile
                </div>
                <Link
                  href={`/customers/${loan.customerId}`}
                  className="font-bold text-base text-zinc-100 hover:text-amber-400 transition-colors"
                >
                  {loan.customer.fullName}
                </Link>
                <div className="text-xs text-zinc-500 font-mono">
                  {loan.customer.phone}
                </div>
              </div>
            </div>
            <Link
              href={`/customers/${loan.customerId}`}
              className="btn-secondary text-xs px-3.5 py-1.5 print:hidden"
            >
              View KYC & Profile
            </Link>
          </div>

          {/* Pledged Collateral Items Table */}
          <div className="glass-card p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-amber-400" />
                <h2 className="text-base font-bold text-zinc-100">
                  Pledged Collateral Items ({loan.items.length})
                </h2>
              </div>
              <div className="text-xs font-semibold text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                Total Assessed: {formatINR(loan.totalAssessedValue.toString())}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Item & Tag</th>
                    <th>Purity</th>
                    <th>Gross / Net / Fine Wt.</th>
                    <th>Rate / g</th>
                    <th>Assessed Val</th>
                    <th>Storage Location</th>
                    <th>Release Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loan.items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="font-semibold text-zinc-200 text-sm">
                          {item.description}
                        </div>
                        <div className="font-mono text-xs text-amber-400 mt-0.5">
                          {item.packetNumber}
                        </div>
                      </td>
                      <td>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
                          {item.purityLabel} ({item.purityPercent.toString()}%)
                        </span>
                      </td>
                      <td>
                        <div className="font-mono text-xs text-zinc-300">
                          Gross: <b>{item.grossWeightGrams.toString()}g</b>
                        </div>
                        <div className="font-mono text-xs text-zinc-400">
                          Net: {item.netWeightGrams.toString()}g | Fine:{" "}
                          <span className="text-amber-400 font-semibold">{item.fineWeightGrams.toString()}g</span>
                        </div>
                      </td>
                      <td className="font-mono text-xs text-zinc-300">
                        ₹{item.valuationRatePerGram.toString()}
                      </td>
                      <td className="font-bold text-sm text-emerald-400">
                        {formatINR(item.assessedValue.toString())}
                      </td>
                      <td className="text-xs text-zinc-400 font-sans max-w-[150px]">
                        {item.storageLocation}
                      </td>
                      <td>
                        {item.releasedAt ? (
                          <span className="badge-verified text-[10px] px-2 py-0.5 rounded-full inline-flex items-center gap-1 font-semibold">
                            <ShieldCheck className="w-3 h-3" />
                            Released
                          </span>
                        ) : (
                          <span className="badge-pending text-[10px] px-2 py-0.5 rounded-full inline-flex items-center gap-1 font-medium">
                            <Lock className="w-3 h-3" />
                            In Vault
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Repayment Receipts & Ledger History */}
          <div className="glass-card p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-400" />
                <h2 className="text-base font-bold text-zinc-100">
                  Repayment Receipts & Ledger History ({loan.payments.length})
                </h2>
              </div>
            </div>

            {loan.payments.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-500 bg-zinc-900/50 rounded-xl border border-dashed border-zinc-800">
                No repayments recorded yet for this loan contract.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Receipt No. & Date</th>
                      <th>Mode</th>
                      <th>Amount Paid</th>
                      <th>Alloc: Charges</th>
                      <th>Alloc: Interest</th>
                      <th>Alloc: Principal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loan.payments.map((pmt) => (
                      <tr key={pmt.id}>
                        <td>
                          <div className="font-mono font-bold text-xs text-amber-400">
                            {pmt.receiptNumber}
                          </div>
                          <div className="text-[11px] text-zinc-500">
                            {formatDate(pmt.paymentDate)}
                          </div>
                        </td>
                        <td>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 font-semibold uppercase text-zinc-300">
                            {pmt.mode}
                          </span>
                        </td>
                        <td className="font-bold text-sm text-emerald-400">
                          {formatINR(pmt.amountPaid.toString())}
                        </td>
                        <td className="font-mono text-xs text-zinc-400">
                          {formatINR(pmt.allocatedCharges.toString())}
                        </td>
                        <td className="font-mono text-xs text-amber-400 font-semibold">
                          {formatINR(pmt.allocatedInterest.toString())}
                        </td>
                        <td className="font-mono text-xs text-emerald-400 font-bold">
                          {formatINR(pmt.allocatedPrincipal.toString())}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Financial Summary Card */}
        <div className="space-y-6">
          <div className="kpi-card border-amber-500/30 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Wallet className="w-4 h-4" />
                Financial Summary & Dues
              </span>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400 text-xs">Original Principal Disbursed</span>
                <span className="font-semibold text-zinc-200">{formatINR(loan.principalAmount.toString())}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-zinc-400 text-xs">Monthly Simple Interest</span>
                <span className="font-bold text-amber-400">{loan.interestRateMonthly.toString()}% p.m.</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-zinc-400 text-xs">RBI LTV Slab Applied</span>
                <span className="font-bold text-zinc-200">{loan.ltvPercent.toString()}%</span>
              </div>

              <div className="pt-3 border-t border-zinc-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400 text-xs">Unsettled Charges / Fees</span>
                  <span className="font-mono text-zinc-300">{formatINR(unsettledCharges)}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-zinc-400 text-xs">
                    Accrued Simple Interest
                    <span className="block text-[10px] text-zinc-500">Since {formatDate(loan.lastSettledDate)}</span>
                  </span>
                  <span className="font-mono font-bold text-amber-400">{formatINR(accruedInterest)}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-zinc-300 font-medium text-xs">Principal Outstanding</span>
                  <span className="font-mono font-bold text-zinc-100">{formatINR(principalOutstanding)}</span>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-zinc-800 text-base font-bold text-zinc-100">
                  <span>Total Payable Due:</span>
                  <span className="font-mono text-amber-400 text-lg">{formatINR(totalDue)}</span>
                </div>
              </div>
            </div>

            {/* Interest Calculation Info */}
            <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 text-xs text-zinc-400 space-y-1">
              <div className="font-semibold text-zinc-300 flex items-center gap-1">
                <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />
                On-Read Interest Computation (§6.3)
              </div>
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                Interest is computed dynamically on read using Actual/365 simple interest formula. Repayments follow atomic waterfall: Charges → Interest → Principal (§6.4).
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
