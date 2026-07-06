"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createStaffUserAction, updateStaffStatusAction } from "./actions";
import {
  Plus,
  ShieldCheck,
  UserCheck,
  UserX,
  Loader2,
  AlertCircle,
  X,
  Lock,
  Mail,
  User,
} from "lucide-react";

export function AddStaffModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("password123");
  const [role, setRole] = useState<"ADMIN" | "STAFF">("STAFF");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await createStaffUserAction({ name, email, password, role });
    if (!res.success) {
      setError(res.error || "Failed to create user");
      setLoading(false);
      return;
    }

    setName("");
    setEmail("");
    setPassword("password123");
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
        Add Staff Member
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div className="glass-card w-full max-w-md p-6 space-y-5 bg-zinc-950 border-amber-500/30">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <h2 className="text-base font-bold text-zinc-100">
              Create New Staff / Admin Account
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
            <label className="input-label flex items-center gap-1.5" htmlFor="name">
              <User className="w-3.5 h-3.5 text-zinc-400" />
              Full Name *
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ramesh Kumar"
              className="input-field text-xs py-2.5"
              required
            />
          </div>

          <div>
            <label className="input-label flex items-center gap-1.5" htmlFor="email">
              <Mail className="w-3.5 h-3.5 text-zinc-400" />
              Email Address *
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ramesh@pawnify.com"
              className="input-field text-xs py-2.5"
              required
            />
          </div>

          <div>
            <label className="input-label flex items-center gap-1.5" htmlFor="password">
              <Lock className="w-3.5 h-3.5 text-zinc-400" />
              Initial Password *
            </label>
            <input
              id="password"
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field font-mono text-xs py-2.5"
              required
            />
          </div>

          <div>
            <label className="input-label">Role Permissions *</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "ADMIN" | "STAFF")}
              className="input-field bg-zinc-950 text-xs py-2.5"
            >
              <option value="STAFF">STAFF — Can register customers & disburse loans</option>
              <option value="ADMIN">ADMIN — Full system access & staff management</option>
            </select>
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
                  Creating...
                </>
              ) : (
                "Create Account"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ToggleUserStatusButton({
  userId,
  isActive,
  isSelf,
}: {
  userId: string;
  isActive: boolean;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    if (isSelf) return;
    if (!confirm(`Are you sure you want to ${isActive ? "deactivate" : "reactivate"} this user account?`)) {
      return;
    }
    setLoading(true);
    await updateStaffStatusAction(userId, !isActive);
    setLoading(false);
    router.refresh();
  };

  if (isSelf) {
    return <span className="text-[10px] text-zinc-500 italic">Current user</span>;
  }

  if (loading) {
    return <Loader2 className="w-4 h-4 animate-spin text-amber-400" />;
  }

  if (isActive) {
    return (
      <button
        onClick={toggle}
        title="Deactivate Account"
        className="btn-secondary text-xs px-3 py-1 hover:border-red-500/40 hover:text-red-400 transition-colors cursor-pointer flex items-center gap-1.5"
      >
        <UserX className="w-3.5 h-3.5 text-red-400" />
        Deactivate
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      title="Reactivate Account"
      className="btn-secondary text-xs px-3 py-1 hover:border-emerald-500/40 hover:text-emerald-400 transition-colors cursor-pointer flex items-center gap-1.5 text-zinc-400"
    >
      <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
      Reactivate
    </button>
  );
}
