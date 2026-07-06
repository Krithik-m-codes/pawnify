"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { updateProfileNameAction } from "./actions";
import { DocumentUploader } from "@/components/document-uploader";
import {
  User,
  Mail,
  ShieldCheck,
  Building2,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
  Key,
} from "lucide-react";

interface ProfileClientProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export function ProfileClient({ user }: ProfileClientProps) {
  const router = useRouter();
  const [name, setName] = useState(user.name);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdSuccess, setPwdSuccess] = useState(false);

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const formData = new FormData();
    formData.append("name", name);

    const res = await updateProfileNameAction(formData);
    setLoading(false);

    if (res?.error) {
      setError(res.error);
    } else {
      setSuccess(true);
      router.refresh();
    }
  };

  const handleSimulatedPwdChange = (e: React.FormEvent) => {
    e.preventDefault();
    setPwdLoading(true);
    setPwdSuccess(false);
    setTimeout(() => {
      setPwdLoading(false);
      setPwdSuccess(true);
    }, 800);
  };

  return (
    <div className="space-y-8 w-full max-w-4xl mx-auto font-sans">
      {/* Profile Header Card */}
      <div className="glass-card p-6 sm:p-8 flex flex-col sm:flex-row items-center sm:items-start gap-6 border-emerald-500/30 bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-900">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-white text-3xl font-black shadow-lg shadow-emerald-500/20 shrink-0">
          {name.charAt(0).toUpperCase()}
        </div>
        <div className="text-center sm:text-left flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <h1 className="text-2xl font-black text-white truncate">{name}</h1>
            <span
              className="inline-flex items-center gap-1 text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full w-fit mx-auto sm:mx-0"
              style={
                user.role === "ADMIN"
                  ? { background: "rgba(34, 197, 94, 0.15)", color: "#4ade80", border: "1px solid rgba(34, 197, 94, 0.3)" }
                  : { background: "rgba(59, 130, 246, 0.15)", color: "#60a5fa", border: "1px solid rgba(59, 130, 246, 0.3)" }
              }
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              {user.role} Account
            </span>
          </div>
          <p className="text-sm text-zinc-400 mt-1 font-mono">{user.email}</p>
          <div className="flex items-center justify-center sm:justify-start gap-4 mt-3 text-xs text-zinc-400 font-medium">
            <span className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-emerald-400" />
              Branch: Mumbai Main Vault (#HQ-01)
            </span>
            <span className="text-emerald-400 font-mono">● Active Session</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Profile information updated successfully!</span>
        </div>
      )}

      {/* Edit Profile Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="glass-card p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-2 pb-3 border-b border-zinc-800">
            <User className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-zinc-100">Basic Information</h2>
          </div>

          <form onSubmit={handleUpdateName} className="space-y-4">
            <div>
              <label className="input-label" htmlFor="name">
                Full Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-field w-full"
                required
              />
            </div>

            <div>
              <label className="input-label" htmlFor="email">
                Email Address (Read-Only)
              </label>
              <input
                id="email"
                type="email"
                value={user.email}
                disabled
                className="input-field w-full opacity-60 cursor-not-allowed bg-zinc-900/50"
              />
              <span className="text-[11px] text-zinc-500 mt-1 block">
                Contact your System Administrator to change institutional email.
              </span>
            </div>

            <div>
              <label className="input-label">Assigned Role & RBAC Tier</label>
              <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs font-semibold text-zinc-300 flex items-center justify-between">
                <span>{user.role} — {user.role === "ADMIN" ? "Full System & LTV Access" : "Loan & KYC Processing Access"}</span>
                <span className="text-emerald-400 font-mono">Verified</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || name === user.name}
              className="btn-primary w-full py-2.5 text-xs font-bold cursor-pointer disabled:opacity-50 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          </form>
        </div>

        {/* Change Password Card */}
        <div className="glass-card p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-2 pb-3 border-b border-zinc-800">
            <Key className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-zinc-100">Security & Credentials</h2>
          </div>

          {pwdSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Password updated successfully!</span>
            </div>
          )}

          <form onSubmit={handleSimulatedPwdChange} className="space-y-4">
            <div>
              <label className="input-label" htmlFor="curPwd">
                Current Password
              </label>
              <input
                id="curPwd"
                type="password"
                placeholder="••••••••••••"
                className="input-field w-full"
                required
              />
            </div>

            <div>
              <label className="input-label" htmlFor="newPwd">
                New Password
              </label>
              <input
                id="newPwd"
                type="password"
                placeholder="••••••••••••"
                className="input-field w-full"
                required
                minLength={6}
              />
            </div>

            <div>
              <label className="input-label" htmlFor="confPwd">
                Confirm New Password
              </label>
              <input
                id="confPwd"
                type="password"
                placeholder="••••••••••••"
                className="input-field w-full"
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={pwdLoading}
              className="w-full py-2.5 rounded-xl font-bold text-xs bg-zinc-800 hover:bg-zinc-700 text-white transition-all flex items-center justify-center gap-2 cursor-pointer border border-zinc-700 mt-2"
            >
              {pwdLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  Update Password
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Supabase Storage Card for Staff Documents */}
      <div className="glass-card p-6 sm:p-8 space-y-4 border-emerald-500/30">
        <DocumentUploader
          label="Upload Official Staff Documents & Profile Attachments (ID Proof / Digital Signature)"
          bucket="pawnify-staff-docs"
        />
      </div>
    </div>
  );
}
