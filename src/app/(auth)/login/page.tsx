"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Scale,
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  AlertCircle,
  Loader2,
  User,
  Sparkles,
  UserPlus,
  Sun,
  Moon,
  Coins,
} from "lucide-react";
import confetti from "canvas-confetti";
import { authClient } from "@/lib/auth-client";
import { useTheme } from "@/components/theme-provider";

function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme, toggleTheme } = useTheme();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"STAFF" | "ADMIN">("STAFF");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Please fill in all required fields");
      return;
    }

    if (mode === "signup" && !name.trim()) {
      setError("Please provide your full name for registration");
      return;
    }

    try {
      setLoading(true);

      if (mode === "signin") {
        const { error: authError } = await authClient.signIn.email({
          email,
          password,
          callbackURL: callbackUrl,
        });

        if (authError) {
          setError(authError.message || "Invalid email or password");
          setLoading(false);
          return;
        }
      } else {
        const { error: signUpError } = await authClient.signUp.email({
          email,
          password,
          name: name.trim(),
          role,
          callbackURL: callbackUrl,
        } as Parameters<typeof authClient.signUp.email>[0]);

        if (signUpError) {
          setError(signUpError.message || "Failed to register account");
          setLoading(false);
          return;
        }

        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#22c55e", "#16a34a", "#4ade80", "#15803d"],
        });
      }

      router.push(callbackUrl);
      router.refresh();
    } catch (err: unknown) {
      console.error("Auth error:", err);
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  const fillDemo = (demoEmail: string) => {
    setMode("signin");
    setEmail(demoEmail);
    setPassword("password123");
    setError(null);
  };

  return (
    <div className="min-h-screen w-full flex relative overflow-hidden font-sans" style={{ background: "var(--bg-secondary)", color: "var(--text-primary)" }}>
      {/* Floating Theme Toggle */}
      <button
        onClick={toggleTheme}
        className="fixed top-6 right-6 z-50 p-3 rounded-full transition-all duration-300 hover:scale-110 cursor-pointer shadow-xl flex items-center justify-center"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-primary)",
          color: "var(--text-primary)",
        }}
        aria-label="Toggle theme"
      >
        {theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5 text-amber-400" />}
      </button>

      {/* LEFT PANEL — Exciting Brand Presentation & Background Art */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 lg:p-16 overflow-hidden bg-gradient-to-br from-zinc-950 via-[#0a140f] to-[#03180c] text-white border-r border-white/10 select-none">
        {/* Ambient Glowing Spheres (Bg Art) */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none animate-pulse-slow" />
        <div className="absolute top-1/3 -right-32 w-[450px] h-[450px] bg-green-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 left-1/4 w-80 h-80 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />
        
        {/* Cyber Geometric Grid Overlay (Bg Art) */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#22c55e0a_1px,transparent_1px),linear-gradient(to_bottom,#22c55e0a_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

        {/* Top Brand Logo Display */}
        <div className="relative z-10 flex items-center gap-3">
          <img src="/icon.png" alt="Pawnify Icon" className="w-11 h-11 object-contain drop-shadow-md" />
          <span className="text-3xl font-black tracking-tight text-white font-sans">
            PAWNIFY
          </span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 uppercase tracking-widest ml-1">
            Portal
          </span>
        </div>

        {/* Center Value Proposition */}
        <div className="relative z-10 space-y-8 max-w-lg my-auto py-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5" /> Institutional Asset Valuation & Lending
          </div>
          <h1 className="text-4xl lg:text-5xl font-black tracking-tight text-white leading-[1.15]">
            Modern Pawn Brokerage Portal.
          </h1>
          <p className="text-zinc-400 text-base leading-relaxed">
            Automate RBI LTV tier compliance, instant Aadhaar KYC verification, and dynamic compounding calculations with bank-grade vault security.
          </p>

          {/* Feature Cards */}
          <div className="space-y-3.5 pt-4">
            <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-md transition-all duration-300 hover:bg-white/[0.06] hover:border-emerald-500/30">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <Scale className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Automated LTV Compliance</h3>
                <p className="text-zinc-400 text-xs mt-0.5">Real-time 85% / 80% / 75% regulatory tier caps synced with live gold & silver market rates.</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-md transition-all duration-300 hover:bg-white/[0.06] hover:border-emerald-500/30">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Encrypted KYC & Vault Security</h3>
                <p className="text-zinc-400 text-xs mt-0.5">UIDAI identity verification, tamper-proof inventory tagging, and immutable audit logs.</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-md transition-all duration-300 hover:bg-white/[0.06] hover:border-emerald-500/30">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Dynamic Interest & Cashflow</h3>
                <p className="text-zinc-400 text-xs mt-0.5">Automated simple & compounding interest calculations with instant payment receipts.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="relative z-10 flex items-center justify-between text-xs text-zinc-500 border-t border-white/[0.08] pt-6">
          <span>© 2026 Pawnify India Pvt. Ltd. All rights reserved.</span>
          <span className="flex items-center gap-2 text-emerald-400/90 font-mono font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            RBI Master Direction Compliant
          </span>
        </div>
      </div>

      {/* RIGHT PANEL — Form Card */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 sm:p-12 lg:p-16 relative overflow-y-auto">
        {/* Mobile Brand Header */}
        <div className="flex items-center gap-2.5 mb-8 lg:hidden">
          <img src="/icon.png" alt="Pawnify" className="w-10 h-10 object-contain" />
          <span className="font-black text-3xl tracking-tight font-sans" style={{ color: "var(--text-primary)" }}>
            PAWNIFY
          </span>
        </div>

        {/* Glassmorphic Auth Card */}
        <div
          className="w-full max-w-md rounded-3xl p-8 sm:p-10 relative overflow-hidden backdrop-blur-2xl transition-all duration-300 shadow-2xl"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-primary)",
          }}
        >
          {/* Top Green Accent Bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-400" />

          {/* Header */}
          <div className="text-center mb-6">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight" style={{ color: "var(--text-primary)" }}>
              {mode === "signin" ? "Welcome back" : "Create Account"}
            </h2>
            <p className="text-sm mt-1.5 font-medium" style={{ color: "var(--text-muted)" }}>
              {mode === "signin"
                ? "Enter your credentials to access the portal"
                : "Register for institutional gold & silver lending"}
            </p>
          </div>

          {/* Tab Switcher */}
          <div
            className="grid grid-cols-2 p-1.5 rounded-2xl mb-6"
            style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border-primary)" }}
          >
            <button
              type="button"
              onClick={() => { setMode("signin"); setError(null); }}
              className="py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              style={
                mode === "signin"
                  ? { background: "var(--bg-card)", color: "var(--accent-text)", boxShadow: "var(--shadow-sm)", border: "1px solid var(--border-primary)" }
                  : { color: "var(--text-muted)", background: "transparent", border: "1px solid transparent" }
              }
            >
              <UserCheck className="w-4 h-4" />
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode("signup"); setError(null); }}
              className="py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              style={
                mode === "signup"
                  ? { background: "var(--bg-card)", color: "var(--accent-text)", boxShadow: "var(--shadow-sm)", border: "1px solid var(--border-primary)" }
                  : { color: "var(--text-muted)", background: "transparent", border: "1px solid transparent" }
              }
            >
              <UserPlus className="w-4 h-4" />
              Register
            </button>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-5 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center gap-3 text-red-500 dark:text-red-400 text-xs font-medium animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="animate-fadeIn">
                <label className="input-label flex items-center gap-1.5 font-semibold text-xs mb-1.5" htmlFor="name" style={{ color: "var(--text-secondary)" }}>
                  <User className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />
                  Full Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Vikram Sharma"
                  className="input-field w-full px-4 py-3 rounded-xl text-sm font-medium transition-all"
                  style={{
                    background: "var(--bg-input)",
                    border: "1px solid var(--border-primary)",
                    color: "var(--text-primary)",
                  }}
                  disabled={loading}
                  required={mode === "signup"}
                />
              </div>
            )}

            <div>
              <label className="input-label flex items-center gap-1.5 font-semibold text-xs mb-1.5" htmlFor="email" style={{ color: "var(--text-secondary)" }}>
                <Mail className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="input-field w-full px-4 py-3 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: "var(--bg-input)",
                  border: "1px solid var(--border-primary)",
                  color: "var(--text-primary)",
                }}
                disabled={loading}
                required
              />
            </div>

            <div>
              <label className="input-label flex items-center gap-1.5 font-semibold text-xs mb-1.5" htmlFor="password" style={{ color: "var(--text-secondary)" }}>
                <Lock className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="input-field w-full px-4 py-3 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: "var(--bg-input)",
                  border: "1px solid var(--border-primary)",
                  color: "var(--text-primary)",
                }}
                disabled={loading}
                required
                minLength={6}
              />
            </div>

            {mode === "signup" && (
              <div className="animate-fadeIn pt-1">
                <label className="input-label flex items-center gap-1.5 font-semibold text-xs mb-1.5" style={{ color: "var(--text-secondary)" }}>
                  <Sparkles className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />
                  Account Role
                </label>
                <div className="grid grid-cols-2 gap-2.5 mt-1">
                  <button
                    type="button"
                    onClick={() => setRole("STAFF")}
                    className="p-3 rounded-xl text-left flex flex-col gap-0.5 transition-all cursor-pointer"
                    style={
                      role === "STAFF"
                        ? { background: "var(--accent-bg)", border: "1.5px solid var(--accent-border)", color: "var(--accent-text)" }
                        : { background: "var(--bg-tertiary)", border: "1.5px solid var(--border-primary)", color: "var(--text-tertiary)" }
                    }
                  >
                    <span className="font-bold text-xs">Branch Staff</span>
                    <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>Loan processing & KYC</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("ADMIN")}
                    className="p-3 rounded-xl text-left flex flex-col gap-0.5 transition-all cursor-pointer"
                    style={
                      role === "ADMIN"
                        ? { background: "var(--accent-bg)", border: "1.5px solid var(--accent-border)", color: "var(--accent-text)" }
                        : { background: "var(--bg-tertiary)", border: "1.5px solid var(--border-primary)", color: "var(--text-tertiary)" }
                    }
                  >
                    <span className="font-bold text-xs">System Admin</span>
                    <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>Full RBAC & settings</span>
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl font-bold text-sm text-white shadow-lg shadow-emerald-500/25 transition-all duration-300 hover:shadow-emerald-500/40 hover:-translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer mt-4"
              style={{ background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)" }}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {mode === "signin" ? "Authenticating..." : "Creating Account..."}
                </>
              ) : (
                <>
                  {mode === "signin" ? "Sign In to Portal" : "Create Institutional Account"}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Demo Credentials Quick-Fill Section */}
          {mode === "signin" && (
            <div className="mt-8 pt-6 animate-fadeIn" style={{ borderTop: "1px solid var(--border-primary)" }}>
              <p className="text-[11px] font-bold uppercase tracking-wider text-center mb-3" style={{ color: "var(--text-muted)" }}>
                Instant Demo Credentials
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => fillDemo("admin@pawnify.com")}
                  className="p-3 rounded-2xl transition-all text-left flex items-center gap-3 group cursor-pointer hover:scale-[1.02]"
                  style={{
                    background: "var(--bg-tertiary)",
                    border: "1px solid var(--border-primary)",
                  }}
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform"
                    style={{ background: "var(--accent-bg)", color: "var(--accent-text)" }}>
                    <ShieldCheck className="w-4.5 h-4.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold truncate" style={{ color: "var(--text-primary)" }}>
                      Admin Demo
                    </div>
                    <div className="text-[10px] font-mono truncate" style={{ color: "var(--text-muted)" }}>
                      admin@pawnify
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => fillDemo("priya@pawnify.com")}
                  className="p-3 rounded-2xl transition-all text-left flex items-center gap-3 group cursor-pointer hover:scale-[1.02]"
                  style={{
                    background: "var(--bg-tertiary)",
                    border: "1px solid var(--border-primary)",
                  }}
                >
                  <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <UserCheck className="w-4.5 h-4.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold truncate" style={{ color: "var(--text-primary)" }}>
                      Staff Demo
                    </div>
                    <div className="text-[10px] font-mono truncate" style={{ color: "var(--text-muted)" }}>
                      priya@pawnify
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen w-full flex items-center justify-center" style={{ background: "var(--bg-primary)" }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--accent)" }} />
      </div>
    }>
      <AuthForm />
    </Suspense>
  );
}
