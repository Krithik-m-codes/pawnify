"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { addKycDocumentAction, verifyKycDocumentAction } from "./actions";
import {
  Plus,
  CheckCircle,
  XCircle,
  Loader2,
  ShieldCheck,
  AlertCircle,
  FileText,
} from "lucide-react";
import { KycStatus } from "@prisma/client";

interface KycActionsProps {
  customerId: string;
}

export function AddKycForm({ customerId }: KycActionsProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [docType, setDocType] = useState<
    "AADHAAR" | "PAN" | "VOTER_ID" | "PASSPORT" | "DRIVING_LICENSE"
  >("AADHAAR");
  const [docNumber, setDocNumber] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await addKycDocumentAction(customerId, {
      docType,
      docNumber: docNumber.trim(),
    });

    if (!res.success) {
      setError(res.error || "Failed to add document");
      setLoading(false);
      return;
    }

    setDocNumber("");
    setOpen(false);
    setLoading(false);
    router.refresh();
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="btn-secondary text-xs px-3.5 py-1.5 flex items-center gap-1.5 border-amber-500/30 text-amber-400 hover:bg-amber-500/10 cursor-pointer"
      >
        <Plus className="w-3.5 h-3.5" />
        Add KYC Document
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="p-4 rounded-xl bg-zinc-900/90 border border-zinc-800 space-y-4 animate-fadeIn mt-4"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
          <FileText className="w-4 h-4 text-amber-400" />
          Add New KYC Document
        </span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-zinc-400 hover:text-zinc-200"
        >
          Cancel
        </button>
      </div>

      {error && (
        <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="input-label">Document Type</label>
          <select
            value={docType}
            onChange={(e) =>
              setDocType(
                e.target.value as
                  | "AADHAAR"
                  | "PAN"
                  | "VOTER_ID"
                  | "PASSPORT"
                  | "DRIVING_LICENSE"
              )
            }
            className="input-field bg-zinc-950 text-xs py-2"
          >
            <option value="AADHAAR">Aadhaar Card (12 digits)</option>
            <option value="PAN">PAN Card (e.g., ABCDE1234F)</option>
            <option value="VOTER_ID">Voter ID</option>
            <option value="PASSPORT">Passport</option>
            <option value="DRIVING_LICENSE">Driving License</option>
          </select>
        </div>

        <div>
          <label className="input-label">Document Number</label>
          <input
            type="text"
            value={docNumber}
            onChange={(e) => setDocNumber(e.target.value.toUpperCase())}
            placeholder={
              docType === "PAN"
                ? "ABCDE1234F"
                : docType === "AADHAAR"
                ? "123456789012"
                : "Enter ID number"
            }
            className="input-field font-mono text-xs py-2"
            required
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading || !docNumber}
          className="btn-primary text-xs px-4 py-2 cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Document"
          )}
        </button>
      </div>
    </form>
  );
}

interface VerifyButtonsProps {
  docId: string;
  customerId: string;
  currentStatus: KycStatus;
}

export function VerifyKycButtons({
  docId,
  customerId,
  currentStatus,
}: VerifyButtonsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleUpdate = async (status: KycStatus) => {
    setLoading(true);
    await verifyKycDocumentAction(docId, customerId, status);
    setLoading(false);
    router.refresh();
  };

  if (loading) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-zinc-400">
        <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
        Updating...
      </span>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      {currentStatus !== "VERIFIED" && (
        <button
          onClick={() => handleUpdate("VERIFIED")}
          title="Verify Document"
          className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-colors cursor-pointer"
        >
          <CheckCircle className="w-4 h-4" />
        </button>
      )}

      {currentStatus !== "REJECTED" && (
        <button
          onClick={() => handleUpdate("REJECTED")}
          title="Reject Document"
          className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors cursor-pointer"
        >
          <XCircle className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
