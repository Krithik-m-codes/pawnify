"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Scale, Lock, Mail, ArrowRight, ShieldCheck, UserCheck, AlertCircle, Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter both email and password");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: authError } = await authClient.signIn.email({
        email,
        password,
        callbackURL: callbackUrl,
      });

      if (authError) {
        setError(authError.message || "Invalid email or password");
        setLoading(false);
        return;
      }

      router.push(callbackUrl);
      router.refresh();
    } catch (err: unknown) {
      console.error("Login error:", err);
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  const fillDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("password123");
    setError(null);
  };

  return (
    <div className="glass-card p-8 sm:p-10 shadow-2xl border border-zinc-800 rounded-2xl relative overflow-hidden">
      {/* Top Accent Bar */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600" />

      {/* Brand Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 text-zinc-950 shadow-lg shadow-amber-500/20 mb-4">
          <Scale className="w-8 h-8 stroke-[2.5]" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
          Sign in to Pawnify
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          Gold & Silver Loan Management System (India)
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-red-400 text-sm animate-fadeIn">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="input-label flex items-center gap-1.5" htmlFor="email">
            <Mail className="w-3.5 h-3.5 text-zinc-400" />
            Email Address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@pawnify.com"
            className="input-field"
            disabled={loading}
            required
          />
        </div>

        <div>
          <label className="input-label flex items-center gap-1.5" htmlFor="password">
            <Lock className="w-3.5 h-3.5 text-zinc-400" />
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••••"
            className="input-field"
            disabled={loading}
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full py-3 mt-2 shadow-lg shadow-amber-500/10"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Signing in...
            </>
          ) : (
            <>
              Sign In
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Demo Credentials Quick-Fill Section */}
      <div className="mt-8 pt-6 border-t border-zinc-800/80">
        <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500 text-center mb-3">
          Evaluator Demo Credentials
        </p>
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => fillDemo("admin@pawnify.com")}
            className="p-2.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800/80 hover:border-amber-500/30 transition-all text-left flex items-center gap-2.5 group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-zinc-200 truncate">
                Admin Role
              </div>
              <div className="text-[10px] text-zinc-500 truncate">
                admin@pawnify.com
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => fillDemo("priya@pawnify.com")}
            className="p-2.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800/80 hover:border-blue-500/30 transition-all text-left flex items-center gap-2.5 group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <UserCheck className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-zinc-200 truncate">
                Staff Role
              </div>
              <div className="text-[10px] text-zinc-500 truncate">
                priya@pawnify.com
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-zinc-950 text-amber-400"><Loader2 className="w-8 h-8 animate-spin" /></div>}>
      <LoginForm />
    </Suspense>
  );
}

