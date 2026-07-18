"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  ArrowRight,
  TrendingUp,
  Coins,
  Code2,
  CheckCircle2,
  Lock,
  Sparkles,
  Scale,
  Award,
  Building2,
  Users,
  FileText,
  RefreshCw,
} from "lucide-react";
import { motion } from "framer-motion";

export function LandingHero() {
  const [collateralCounter, setCollateralCounter] = useState(14842910);

  useEffect(() => {
    const interval = setInterval(() => {
      setCollateralCounter((prev) => prev + Math.floor(Math.random() * 450) + 50);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative overflow-hidden pt-14 pb-24 sm:pt-20 sm:pb-32 institutional-grid-bg">
      {/* Ambient Radial Vault Light */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-gradient-to-b from-emerald-500/12 via-emerald-500/05 to-transparent rounded-full blur-[140px] pointer-events-none animate-floatGlow" />
      <div className="absolute top-20 left-1/3 w-[400px] h-[300px] bg-amber-500/08 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Top Assurance Pill */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-3 p-1.5 pl-3 pr-4 rounded-full border border-(--border-primary) bg-(--bg-card)/90 backdrop-blur-xl mb-8 shadow-md hover:border-emerald-500/40 transition-all cursor-default"
        >
          <span className="flex items-center gap-1.5 text-xs font-mono font-bold text-amber-500">
            <Award className="w-3.5 h-3.5" />
            INSTITUTIONAL LENDING STANDARD
          </span>
          <span className="w-1 h-1 rounded-full bg-(--text-muted)" />
          <span className="text-xs font-mono font-semibold text-(--text-secondary)">
            PRECIOUS METALS &amp; LUXURY ASSETS
          </span>
          <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            FREE SELF-HOST OR CLOUD
          </span>
        </motion.div>

        {/* Institutional Hero Headline with Editorial Typography */}
        <motion.h1
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl sm:text-6xl lg:text-7xl font-black -tracking-[0.03em] max-w-5xl mx-auto leading-[1.06] sm:leading-[1.08]"
          style={{ color: "var(--text-primary)" }}
        >
          The Modern Operating System for{" "}
          <span className="bg-gradient-to-r from-emerald-400 via-green-500 to-teal-400 bg-clip-text text-transparent underline decoration-emerald-500/30 decoration-wavy decoration-2 underline-offset-8">
            Asset-Backed Lending.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-7 text-base sm:text-xl max-w-3xl mx-auto leading-relaxed font-normal tracking-tight"
          style={{ color: "var(--text-secondary)" }}
        >
          Engineered for compliance, exact multi-currency valuations, and complete physical collateral tracking. Issue loans against{" "}
          <strong className="font-semibold text-(--text-primary)">24K Gold, 999 Silver, Luxury Horology, and Fine Art</strong> with live market feeds, automated LTV safety capping, and zero calculation errors.
        </motion.p>

        {/* Live Ticking Collateral Auditing Counter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-8 inline-flex flex-col sm:flex-row items-center justify-center gap-3 py-3 px-6 rounded-2xl border border-(--border-primary) bg-(--bg-secondary)/80 backdrop-blur-md shadow-xs"
        >
          <span className="text-xs font-mono font-semibold uppercase tracking-wider text-(--text-tertiary) flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Active Collateral Valued Daily Across Our Network:
          </span>
          <span className="text-xl sm:text-2xl font-mono font-black text-emerald-500 tracking-tight">
            ${collateralCounter.toLocaleString("en-US")}.00
          </span>
          <span className="text-xs font-mono font-medium text-(--text-muted)">
            (Over 12+ Worldwide Currency Regimes)
          </span>
        </motion.div>

        {/* Hero Call to Action Group */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-11 flex flex-col sm:flex-row items-center justify-center gap-4 max-w-2xl mx-auto"
        >
          <Link
            href="/login?demo=true"
            className="btn-primary w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4.5 text-sm font-bold tracking-wider uppercase shadow-xl shadow-emerald-500/30 hover:scale-[1.02] transition-all"
          >
            <Sparkles className="w-4 h-4" />
            Launch Instant Sandbox
            <ArrowRight className="w-4 h-4" />
          </Link>

          <a
            href="#calculator"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4.5 rounded-2xl border border-(--border-primary) bg-(--bg-card) hover:border-(--accent) text-sm font-bold tracking-wider uppercase transition-all shadow-sm hover:shadow-md cursor-pointer"
            style={{ color: "var(--text-primary)" }}
          >
            <Scale className="w-4 h-4 text-(--accent)" />
            Test Live LTV Simulator
          </a>

          <Link
            href="/open-source"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4.5 rounded-2xl border border-(--border-primary) bg-(--bg-secondary) hover:bg-(--bg-tertiary) text-xs font-semibold uppercase tracking-wider transition-all"
            style={{ color: "var(--text-secondary)" }}
          >
            <Code2 className="w-4 h-4" />
            Self-Host Open Source
          </Link>
        </motion.div>

        {/* Business Assurance Strip (Inspired by Fin.ai & Cleantab) */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="mt-16 pt-12 border-t border-(--border-primary)/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto text-left"
        >
          <div className="p-5 rounded-2xl border border-(--border-primary)/50 bg-(--bg-card)/60 backdrop-blur-xs flex items-start gap-3.5 hover:border-emerald-500/40 transition-all">
            <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 shrink-0 border border-emerald-500/20">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-(--text-primary) uppercase tracking-wide">Multi-Branch Network</div>
              <div className="text-[11px] text-(--text-muted) leading-snug mt-1">
                Scale across branches with strict staff permission tiers and isolated storefront ledgers.
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl border border-(--border-primary)/50 bg-(--bg-card)/60 backdrop-blur-xs flex items-start gap-3.5 hover:border-emerald-500/40 transition-all">
            <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-500 shrink-0 border border-amber-500/20">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-(--text-primary) uppercase tracking-wide">Live Spot Valuation</div>
              <div className="text-[11px] text-(--text-muted) leading-snug mt-1">
                Automated per-gram pricing against live gold &amp; silver rates with strict LTV safety slabs.
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl border border-(--border-primary)/50 bg-(--bg-card)/60 backdrop-blur-xs flex items-start gap-3.5 hover:border-emerald-500/40 transition-all">
            <div className="p-2.5 rounded-xl bg-blue-500/15 text-blue-400 shrink-0 border border-blue-500/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-(--text-primary) uppercase tracking-wide">60-Second KYC Onboarding</div>
              <div className="text-[11px] text-(--text-muted) leading-snug mt-1">
                Instant customer document validation, phone OTP verification, and risk credit histories.
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl border border-(--border-primary)/50 bg-(--bg-card)/60 backdrop-blur-xs flex items-start gap-3.5 hover:border-emerald-500/40 transition-all">
            <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 shrink-0 border border-emerald-500/20">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-(--text-primary) uppercase tracking-wide">Automated Payment Waterfall</div>
              <div className="text-[11px] text-(--text-muted) leading-snug mt-1">
                Clear allocation across penalty charges, simple daily interest, and principal paydowns.
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
