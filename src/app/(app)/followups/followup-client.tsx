"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createFollowUpAction, updateFollowUpStatusAction } from "./actions";
import {
  Plus,
  CheckCircle2,
  Clock,
  Loader2,
  Calendar,
  AlertCircle,
  X,
} from "lucide-react";
import { FollowUpStatus } from "@prisma/client";

interface ActiveLoanOption {
  id: string;
  loanNumber: string;
  customerName: string;
}

export function NewFollowUpModal({ loans }: { loans: ActiveLoanOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [loanId, setLoanId] = useState(loans[0]?.id || "");
  const [note, setNote] = useState("");
  const [dueDate, setDueDate] = useState(() =>
    new Date(Date.now() + 86400000 * 3).toISOString().split("T")[0]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loanId || !note.trim()) {
      setError("Please select a loan and enter reminder note");
      return;
    }

    setLoading(true);
    setError(null);

    const res = await createFollowUpAction(loanId, note, dueDate);
    if (!res.success) {
      setError(res.error || "Failed to create reminder");
      setLoading(false);
      return;
    }

    setNote("");
    setLoading(false);
    setOpen(false);
    router.refresh();
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="btn-primary text-xs px-4 py-2.5 shadow-md shadow-amber-500/10 cursor-pointer"
      >
        <Plus className="w-4 h-4" />
        New Follow-up Task
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/35 dark:bg-black/45 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fadeIn">
      <div className="glass-card w-full max-w-md p-6 space-y-5 bg-zinc-950 border-amber-500/30">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-400" />
            <h2 className="text-base font-bold text-zinc-100">
              Schedule Reminder Task
            </h2>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-1 rounded text-zinc-400 hover:text-zinc-100"
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="input-label">Select Active Loan Contract *</label>
            <select
              value={loanId}
              onChange={(e) => setLoanId(e.target.value)}
              className="input-field bg-zinc-950 text-xs py-2.5"
              required
            >
              {loans.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.loanNumber} • {l.customerName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="input-label">Reminder Action Note *</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Call customer regarding overdue interest payment"
              className="input-field text-xs py-2.5"
              required
            />
          </div>

          <div>
            <label className="input-label">Target Follow-up Date *</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="input-field text-xs py-2.5 text-zinc-300"
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="btn-secondary text-xs px-4 py-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary text-xs px-5 py-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                "Schedule Task"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function FollowUpStatusButton({
  id,
  currentStatus,
}: {
  id: string;
  currentStatus: FollowUpStatus;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const toggleStatus = async () => {
    setLoading(true);
    const nextStatus: FollowUpStatus = currentStatus === "DONE" ? "PENDING" : "DONE";
    await updateFollowUpStatusAction(id, nextStatus);
    setLoading(false);
    router.refresh();
  };

  if (loading) {
    return <Loader2 className="w-4 h-4 animate-spin text-amber-400" />;
  }

  if (currentStatus === "DONE") {
    return (
      <button
        onClick={toggleStatus}
        title="Mark as Pending"
        className="text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold"
      >
        <CheckCircle2 className="w-4 h-4 fill-emerald-500/20" />
        Done
      </button>
    );
  }

  return (
    <button
      onClick={toggleStatus}
      title="Mark as Completed"
      className="btn-secondary text-xs px-3 py-1 hover:border-emerald-500/40 hover:text-emerald-400 transition-colors cursor-pointer flex items-center gap-1.5"
    >
      <Clock className="w-3.5 h-3.5 text-amber-400" />
      Mark Done
    </button>
  );
}

import { Trash2 } from "lucide-react";
import { deleteFollowUpAction } from "./actions";

export function DeleteFollowUpButton({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this reminder?")) return;
    setLoading(true);
    await deleteFollowUpAction(id);
    setLoading(false);
    router.refresh();
  };

  if (loading) {
    return <Loader2 className="w-4 h-4 animate-spin text-red-400" />;
  }

  return (
    <button
      onClick={handleDelete}
      title="Delete Reminder"
      className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  );
}
