"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import confetti from "canvas-confetti";
import { recordPaymentAction, closeLoanAction, releaseItemsAction } from "./actions";
import {
  Wallet,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Unlock,
  Printer,
  X,
  TrendingDown,
  Coins,
  ShieldCheck,
  Calendar,
  FileText,
} from "lucide-react";

interface PaymentModalProps {
  loanId: string;
  principalOutstanding: number;
  accruedInterest: number;
  unsettledCharges: number;
  totalDue: number;
}

export function RecordPaymentModal({
  loanId,
  principalOutstanding,
  accruedInterest,
  unsettledCharges,
  totalDue,
}: PaymentModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [amountPaid, setAmountPaid] = useState<number>(Math.ceil(accruedInterest + unsettledCharges));
  const [mode, setMode] = useState<"CASH" | "UPI" | "BANK_TRANSFER" | "CARD">("UPI");
  const [notes, setNotes] = useState("");

  const handleOpen = () => {
    setAmountPaid(Math.ceil(totalDue > 0 ? totalDue : 100));
    setError(null);
    setSuccessMsg(null);
    setOpen(true);
  };

  // Live Waterfall Allocation Preview (§6.4)
  const computeWaterfallPreview = (amount: number) => {
    let rem = amount;
    const allocCharges = Math.min(rem, unsettledCharges);
    rem -= allocCharges;
    const allocInterest = Math.min(rem, accruedInterest);
    rem -= allocInterest;
    const allocPrincipal = Math.min(rem, principalOutstanding);
    rem -= allocPrincipal;
    return { allocCharges, allocInterest, allocPrincipal };
  };

  const preview = computeWaterfallPreview(amountPaid || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amountPaid <= 0) {
      setError("Payment amount must be greater than zero");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    const res = await recordPaymentAction({
      loanId,
      amountPaid: Number(amountPaid),
      mode,
      notes: notes.trim(),
    });

    if (!res.success) {
      setError(res.error || "Failed to record payment");
      setLoading(false);
      return;
    }

    confetti({
      particleCount: 70,
      spread: 60,
      origin: { y: 0.6 },
      colors: ["#FACC15", "#10B981", "#3B82F6"],
    });
    setSuccessMsg(`Payment recorded! Receipt No: ${res.receiptNumber}`);
    setLoading(false);
    setTimeout(() => {
      setOpen(false);
      router.refresh();
    }, 1500);
  };

  const formatINR = (num: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(num);
  };

  if (!open) {
    return (
      <button
        onClick={handleOpen}
        className="btn-primary text-xs px-4 py-2.5 shadow-md shadow-amber-500/10 cursor-pointer"
      >
        <Wallet className="w-4 h-4" />
        Record Payment
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/35 dark:bg-black/45 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fadeIn">
      <div className="glass-card w-full max-w-lg p-6 sm:p-8 space-y-6 relative border-amber-500/30 shadow-2xl bg-zinc-950">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-zinc-100">
              Record Loan Repayment
            </h2>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold">{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Total Due Breakdown */}
          <div className="p-4 rounded-xl bg-zinc-900/90 border border-zinc-800 space-y-2 text-xs">
            <div className="font-semibold text-zinc-300 uppercase tracking-wider text-[11px] mb-2">
              Current Outstanding Breakdown
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Unsettled Fees/Charges:</span>
              <span className="font-mono text-zinc-200">{formatINR(unsettledCharges)}</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Accrued Simple Interest:</span>
              <span className="font-mono text-amber-400 font-semibold">{formatINR(accruedInterest)}</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Principal Outstanding:</span>
              <span className="font-mono text-zinc-200">{formatINR(principalOutstanding)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-zinc-800 text-sm font-bold text-zinc-100">
              <span>Total Dues:</span>
              <span className="font-mono text-amber-400">{formatINR(totalDue)}</span>
            </div>
          </div>

          {/* Amount & Mode */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="input-label mb-0" htmlFor="amount">
                  Payment Amount (₹) *
                </label>
                <button
                  type="button"
                  onClick={() => setAmountPaid(Math.ceil(totalDue))}
                  className="text-[10px] text-amber-400 font-semibold hover:underline cursor-pointer"
                >
                  Pay Full (₹{Math.ceil(totalDue)})
                </button>
              </div>
              <input
                id="amount"
                type="number"
                step="0.01"
                min="1"
                value={amountPaid}
                onChange={(e) => setAmountPaid(Number(e.target.value))}
                className="input-field font-mono text-lg font-bold text-emerald-400 py-2.5"
                required
              />
            </div>

            <div>
              <label className="input-label">Payment Mode *</label>
              <select
                value={mode}
                onChange={(e) =>
                  setMode(e.target.value as "CASH" | "UPI" | "BANK_TRANSFER" | "CARD")
                }
                className="input-field bg-zinc-950 text-xs py-3"
              >
                <option value="UPI">UPI / Instant Transfer</option>
                <option value="CASH">Cash at Counter</option>
                <option value="BANK_TRANSFER">Bank NEFT / RTGS</option>
                <option value="CARD">Debit / Credit Card</option>
              </select>
            </div>
          </div>

          {/* Waterfall Allocation Preview (§6.4) */}
          <div className="p-3.5 rounded-xl bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800/80 space-y-1.5 text-xs">
            <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
              <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />
              Atomic Waterfall Allocation Preview (§6.4)
            </div>
            <div className="grid grid-cols-3 gap-2 pt-1 text-center font-mono">
              <div className="p-2 rounded bg-zinc-900/60 border border-zinc-800">
                <div className="text-[10px] text-zinc-500 font-sans">1. Charges</div>
                <div className="font-semibold text-zinc-200">{formatINR(preview.allocCharges)}</div>
              </div>
              <div className="p-2 rounded bg-zinc-900/60 border border-zinc-800">
                <div className="text-[10px] text-zinc-500 font-sans">2. Interest</div>
                <div className="font-semibold text-amber-400">{formatINR(preview.allocInterest)}</div>
              </div>
              <div className="p-2 rounded bg-zinc-900/60 border border-zinc-800">
                <div className="text-[10px] text-zinc-500 font-sans">3. Principal</div>
                <div className="font-semibold text-emerald-400">{formatINR(preview.allocPrincipal)}</div>
              </div>
            </div>
          </div>

          <div>
            <label className="input-label" htmlFor="notes">
              Reference / Notes (Optional)
            </label>
            <input
              id="notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. UPI Ref: 318920481234"
              className="input-field text-xs py-2"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="btn-secondary text-xs px-4 py-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || amountPaid <= 0}
              className="btn-primary text-xs px-6 py-2 shadow-lg shadow-emerald-500/10 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Issue Receipt & Settle"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface CloseLoanProps {
  loanId: string;
  canClose: boolean;
  reason?: string;
}

export function CloseLoanButton({ loanId, canClose, reason }: CloseLoanProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = async () => {
    if (!confirm("Are you sure you want to financially close this loan contract? This confirms all principal and interest dues are settled.")) {
      return;
    }

    setLoading(true);
    setError(null);

    const res = await closeLoanAction(loanId);
    if (!res.success) {
      setError(res.error || "Failed to close loan");
      setLoading(false);
      return;
    }

    confetti({
      particleCount: 100,
      spread: 80,
      origin: { y: 0.5 },
      colors: ["#FACC15", "#EAB308", "#10B981"],
    });
    setLoading(false);
    router.refresh();
  };

  if (!canClose) {
    return (
      <button
        disabled
        title={reason || "Settle all dues before closing"}
        className="btn-secondary text-xs px-3.5 py-2 opacity-50 cursor-not-allowed inline-flex items-center gap-1.5"
      >
        <CheckCircle2 className="w-3.5 h-3.5" />
        Close Loan Contract
      </button>
    );
  }

  return (
    <div>
      <button
        onClick={handleClose}
        disabled={loading}
        className="btn-secondary text-xs px-4 py-2 border-amber-500/40 text-amber-400 hover:bg-amber-500/10 inline-flex items-center gap-1.5 cursor-pointer"
      >
        {loading ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Closing...
          </>
        ) : (
          <>
            <CheckCircle2 className="w-3.5 h-3.5" />
            Close Loan Contract
          </>
        )}
      </button>
      {error && <div className="text-red-400 text-[11px] mt-1">{error}</div>}
    </div>
  );
}

interface ReleaseItemsProps {
  loanId: string;
  isClosed: boolean;
  isReleased: boolean;
}

export function ReleaseItemsButton({ loanId, isClosed, isReleased }: ReleaseItemsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRelease = async () => {
    if (!confirm("Confirm physical hand-back of all pledged collateral items to the customer?")) {
      return;
    }

    setLoading(true);
    setError(null);

    const res = await releaseItemsAction(loanId);
    if (!res.success) {
      setError(res.error || "Failed to release items");
      setLoading(false);
      return;
    }

    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#34D399", "#10B981", "#059669"],
    });
    setLoading(false);
    router.refresh();
  };

  if (isReleased) {
    return (
      <span className="badge-verified text-xs px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 font-semibold">
        <ShieldCheck className="w-4 h-4" />
        Collateral Released
      </span>
    );
  }

  if (!isClosed) {
    return (
      <button
        disabled
        title="Loan must be financially closed before releasing items"
        className="btn-secondary text-xs px-3.5 py-2 opacity-50 cursor-not-allowed inline-flex items-center gap-1.5"
      >
        <Unlock className="w-3.5 h-3.5" />
        Release Collateral Items
      </button>
    );
  }

  return (
    <div>
      <button
        onClick={handleRelease}
        disabled={loading}
        className="btn-primary text-xs px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 inline-flex items-center gap-1.5 shadow-md shadow-emerald-500/10 cursor-pointer"
      >
        {loading ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Releasing...
          </>
        ) : (
          <>
            <Unlock className="w-3.5 h-3.5" />
            Release Collateral Items
          </>
        )}
      </button>
      {error && <div className="text-red-400 text-[11px] mt-1">{error}</div>}
    </div>
  );
}

export function PawnTicketPrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="btn-secondary text-xs px-3.5 py-2 inline-flex items-center gap-1.5 cursor-pointer"
      title="Print Pawn Ticket / Loan Summary"
    >
      <Printer className="w-3.5 h-3.5 text-zinc-400" />
      Print Pawn Ticket
    </button>
  );
}
