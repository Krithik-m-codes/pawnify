"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createStaffUserAction, updateStaffStatusAction, updateStaffUserAction, deleteStaffUserAction } from "./actions";
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
  Edit2,
  Trash2,
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
        className="btn-primary text-xs px-4 py-2.5 shadow-md shadow-amber-500/10 cursor-pointer flex items-center gap-1.5"
      >
        <Plus className="w-4 h-4" />
        Add Staff Member
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/35 dark:bg-black/45 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fadeIn">
      <div className="glass-card w-full max-w-md p-6 space-y-5 bg-zinc-950 border-amber-500/30 text-left shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <h2 className="text-base font-bold text-zinc-100">
              Create New Staff / Admin Account
            </h2>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-1 rounded text-zinc-400 hover:text-zinc-100 cursor-pointer"
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
              className="btn-secondary text-xs px-4 py-2 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary text-xs px-5 py-2 cursor-pointer flex items-center gap-1.5"
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

export function EditStaffUserModal({
  user,
  isSelf,
}: {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
  };
  isSelf: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState<"ADMIN" | "STAFF">(user.role as "ADMIN" | "STAFF");
  const [isActive, setIsActive] = useState(user.isActive);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await updateStaffUserAction(user.id, { name, email, role, isActive });
    setLoading(false);
    if (!res.success) {
      setError(res.error || "Failed to update staff user");
    } else {
      setOpen(false);
      router.refresh();
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Edit Staff Account & Roles"
        className="btn-secondary text-xs px-3 py-1 hover:border-emerald-500/40 hover:text-emerald-400 transition-colors cursor-pointer flex items-center gap-1 text-zinc-300"
      >
        <Edit2 className="w-3.5 h-3.5 text-emerald-400" />
        Edit Role
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/35 dark:bg-black/45 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fadeIn">
          <div className="glass-card w-full max-w-md p-6 space-y-5 bg-zinc-950 border-emerald-500/30 text-left shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-emerald-400" />
                <h2 className="text-base font-bold text-zinc-100">
                  Edit Staff Details & Role
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1 rounded text-zinc-400 hover:text-zinc-100 cursor-pointer"
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

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="input-label flex items-center gap-1.5" htmlFor="edit-name">
                  <User className="w-3.5 h-3.5 text-zinc-400" />
                  Full Name *
                </label>
                <input
                  id="edit-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-field py-2.5"
                  required
                />
              </div>

              <div>
                <label className="input-label flex items-center gap-1.5" htmlFor="edit-email">
                  <Mail className="w-3.5 h-3.5 text-zinc-400" />
                  Work Email Address *
                </label>
                <input
                  id="edit-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field font-mono py-2.5"
                  required
                />
              </div>

              <div>
                <label className="input-label">Role Assignment *</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as "ADMIN" | "STAFF")}
                  disabled={isSelf}
                  className="input-field bg-zinc-950 py-2.5 disabled:opacity-50"
                >
                  <option value="STAFF">STAFF — Can register customers & disburse loans</option>
                  <option value="ADMIN">ADMIN — Full system access & staff management</option>
                </select>
                {isSelf && (
                  <p className="text-[10px] text-amber-400/80 mt-1">
                    You cannot demote your own active admin account.
                  </p>
                )}
              </div>

              <div>
                <label className="input-label">Account Status</label>
                <select
                  value={isActive ? "active" : "inactive"}
                  onChange={(e) => setIsActive(e.target.value === "active")}
                  disabled={isSelf}
                  className="input-field bg-zinc-950 py-2.5 disabled:opacity-50"
                >
                  <option value="active">Active — Account can log in and process transactions</option>
                  <option value="inactive">Inactive — Account is locked and cannot log in</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="btn-secondary px-4 py-2 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary px-5 py-2 cursor-pointer flex items-center gap-1.5"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
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

export function DeleteStaffUserButton({
  userId,
  isSelf,
  userName,
}: {
  userId: string;
  isSelf: boolean;
  userName: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (isSelf) return null;

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to permanently delete staff account (${userName})?`)) return;
    setLoading(true);
    const res = await deleteStaffUserAction(userId);
    setLoading(false);
    if (res.error) {
      alert(res.error);
    } else {
      router.refresh();
    }
  };

  if (loading) {
    return <Loader2 className="w-4 h-4 animate-spin text-red-400" />;
  }

  return (
    <button
      onClick={handleDelete}
      title="Delete Staff Account"
      className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  );
}
