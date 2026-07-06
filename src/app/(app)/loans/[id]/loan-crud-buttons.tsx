"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteLoanAction, updateLoanNotesAction } from "./actions";
import { Trash2, Edit2, Loader2, AlertCircle, X, Save, FileText } from "lucide-react";

interface LoanCrudButtonsProps {
  loanId: string;
  loanNumber: string;
  initialNotes: string | null;
}

export function LoanCrudButtons({ loanId, loanNumber, initialNotes }: LoanCrudButtonsProps) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [notes, setNotes] = useState(initialNotes || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setLoading(true);
    setError(null);
    const res = await deleteLoanAction(loanId);
    setLoading(false);
    if (res.error) {
      setError(res.error);
    } else {
      router.push("/loans");
      router.refresh();
    }
  };

  const handleUpdateNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await updateLoanNotesAction(loanId, notes);
    setLoading(false);
    if (res.error) {
      setError(res.error);
    } else {
      setEditOpen(false);
      router.refresh();
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => { setEditOpen(true); setError(null); }}
          className="btn-secondary text-xs px-3 py-2 flex items-center gap-1.5 cursor-pointer hover:border-emerald-500/40"
          title="Edit Loan Notes"
        >
          <Edit2 className="w-3.5 h-3.5 text-emerald-400" />
          Edit Notes
        </button>
        <button
          type="button"
          onClick={() => { setDeleteOpen(true); setError(null); }}
          className="btn-secondary text-xs px-3 py-2 flex items-center gap-1.5 cursor-pointer hover:border-red-500/40 text-red-400"
          title="Delete Loan Record"
        >
          <Trash2 className="w-3.5 h-3.5 text-red-500" />
          Delete Loan
        </button>
      </div>

      {/* Edit Notes Modal */}
      {editOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/35 dark:bg-black/45 backdrop-blur-md animate-fadeIn">
          <div className="glass-card w-full max-w-md p-6 space-y-4 bg-zinc-950 border-emerald-500/30">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="font-bold text-base text-zinc-100 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                Edit Loan Notes ({loanNumber})
              </h3>
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white cursor-pointer"
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

            <form onSubmit={handleUpdateNotes} className="space-y-4 text-xs">
              <div>
                <label className="input-label">Internal Appraisal / Loan Notes</label>
                <textarea
                  rows={4}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Enter confidential remarks, item condition details, or repayment reminders..."
                  className="input-field py-2 w-full"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  className="btn-secondary px-4 py-2 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary px-5 py-2 text-xs cursor-pointer"
                >
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Save Notes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/35 dark:bg-black/45 backdrop-blur-md animate-fadeIn">
          <div className="glass-card w-full max-w-md p-6 space-y-4 bg-zinc-950 border-red-500/40">
            <div className="flex items-center gap-3 text-red-400 font-bold text-base">
              <Trash2 className="w-5 h-5" />
              <span>Confirm Loan Deletion</span>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Are you sure you want to permanently delete loan <strong className="text-white">{loanNumber}</strong>? This action will remove all recorded payments, charges, collateral items, and ledger entries associated with this loan.
            </p>
            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteOpen(false)}
                className="btn-secondary px-4 py-2 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                Delete Forever
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
