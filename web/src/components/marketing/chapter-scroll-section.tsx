"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  Scale,
  RefreshCw,
  Users,
  CheckCircle2,
  ArrowRight,
  FileCheck,
  TrendingUp,
  Sliders,
  Building2,
  Smartphone,
  Award,
  DollarSign,
  AlertCircle,
  Bell,
  Check,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const chapters = [
  {
    id: 1,
    badge: "CHAPTER 01 • KYC & ONBOARDING",
    title: "Instant Multi-Document KYC & Borrower Verification",
    description:
      "Onboard borrowers in under 60 seconds without paperwork delays. Verify identity documents, validate phone numbers via instant OTP, and review historical repayment behavior before approving any loan.",
    icon: FileCheck,
    highlights: [
      "Automated ID formatting validation (PAN, Aadhaar, SSN, Passport)",
      "Instant phone number verification and automated fraud prevention",
      "Per-borrower credit grading based on past repayment velocity",
      "Secure cloud document storage with instant typeahead search",
    ],
    mockupType: "kyc",
  },
  {
    id: 2,
    badge: "CHAPTER 02 • COLLATERAL VALUATION",
    title: "Live Spot Rates & Automated LTV Safety Slabs",
    description:
      "Eliminate manual calculation errors and human guessing. Pawnify fetches live gold and silver spot rates per gram (`AU 24K`, `AG 999`) and automatically enforces Loan-to-Value (LTV) limits based on purity slabs.",
    icon: Scale,
    highlights: [
      "Precise weight assessment across Grams, Troy Ounces, and Tolas",
      "Exact item valuation: Net Weight × Purity Percentage × Spot Rate",
      "Tiered LTV safety limits (e.g., max 75% for 22K Gold, 65% for Silver)",
      "Ready for multi-asset expansion: Luxury Watches, Vehicles & Fine Art",
    ],
    mockupType: "ltv",
  },
  {
    id: 3,
    badge: "CHAPTER 03 • REPAYMENT WATERFALL",
    title: "Automated Repayment Waterfall Accounting",
    description:
      "When a customer makes a payment (`CASH`, `UPI`, `BANK_TRANSFER`), funds cascade automatically through outstanding penalty charges, daily simple interest, and principal reduction with clear audit receipts.",
    icon: RefreshCw,
    highlights: [
      "Strict ledger allocation across late charges, interest & principal",
      "Exact calendar-day interest accrual with zero rounding drift",
      "Automated receipt generation sent instantly via SMS or WhatsApp",
      "Double-entry ledger accuracy protecting your operating margins",
    ],
    mockupType: "waterfall",
  },
  {
    id: 4,
    badge: "CHAPTER 04 • NETWORK GOVERNANCE",
    title: "Multi-Branch Network Controls & Follow-Up Queues",
    description:
      "Scale seamlessly from a single storefront to a nationwide branch network. Enforce strict employee role permissions (`OWNER`, `ADMIN`, `BRANCH_MANAGER`, `STAFF`) with automated collections and follow-up queues.",
    icon: Users,
    highlights: [
      "Branch-level data segregation preventing cross-branch confusion",
      "Real-time portfolio reports: Overdue loans, daily cash flow, and LTV exposure",
      "Automated task queues for overdue reminders and interest follow-ups",
      "Complete employee audit logs tracking every loan approval and payout",
    ],
    mockupType: "network",
  },
];

export function ChapterScrollSection() {
  const [activeChapter, setActiveChapter] = useState(1);
  const current = chapters.find((c) => c.id === activeChapter) || chapters[0];

  return (
    <section className="py-24 sm:py-32 border-t border-b border-(--border-primary) bg-(--bg-secondary)/40 relative overflow-hidden">
      <div className="absolute inset-0 institutional-grid-bg opacity-70 pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="max-w-3xl mb-16 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-bold border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 mb-4 shadow-2xs">
            <Sliders className="w-3.5 h-3.5" />
            <span>THE OPERATIONAL WORKFLOW</span>
          </div>
          <h2
            className="text-3xl sm:text-5xl font-black -tracking-[0.03em] leading-tight"
            style={{ color: "var(--text-primary)" }}
          >
            How Pawnify Powers the Complete Lending Lifecycle.
          </h2>
          <p className="mt-4 text-base sm:text-lg" style={{ color: "var(--text-secondary)" }}>
            Explore the 4 foundational pillars of asset-backed lending—from instant KYC borrower screening to automated multi-branch collections.
          </p>
        </div>

        {/* Chapter Navigation Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-12">
          {chapters.map((ch) => {
            const isActive = ch.id === activeChapter;
            return (
              <button
                key={ch.id}
                onClick={() => setActiveChapter(ch.id)}
                className={`text-left p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between h-32 relative ${
                  isActive
                    ? "border-emerald-500 bg-(--bg-card) shadow-lg shadow-emerald-500/10 scale-[1.02]"
                    : "border-(--border-primary) bg-(--bg-card)/50 hover:bg-(--bg-card) hover:border-(--border-secondary)"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeChapterTab"
                    className="absolute inset-0 border-2 border-emerald-500 rounded-2xl pointer-events-none"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <div className="flex items-center justify-between w-full">
                  <span
                    className={`text-[10px] font-mono font-bold uppercase tracking-wider ${
                      isActive ? "text-emerald-400" : "text-(--text-muted)"
                    }`}
                  >
                    CHAPTER 0{ch.id}
                  </span>
                  <ch.icon
                    className={`w-4 h-4 ${
                      isActive ? "text-emerald-400 animate-pulse" : "text-(--text-tertiary)"
                    }`}
                  />
                </div>
                <div
                  className={`text-xs sm:text-sm font-bold line-clamp-2 mt-2 leading-snug ${
                    isActive ? "text-(--text-primary)" : "text-(--text-secondary)"
                  }`}
                >
                  {ch.title}
                </div>
              </button>
            );
          })}
        </div>

        {/* Active Chapter Showcase Panel with Framer Motion */}
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.35 }}
            className="shine-border-card p-6 sm:p-10 border border-(--border-primary) bg-(--bg-card) rounded-3xl shadow-xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center"
          >
            {/* Left Column: Domain & Features Breakdown */}
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/25 text-xs font-mono font-bold text-emerald-400">
                <current.icon className="w-3.5 h-3.5" />
                {current.badge}
              </div>

              <h3
                className="text-2xl sm:text-4xl font-black -tracking-[0.02em] leading-tight"
                style={{ color: "var(--text-primary)" }}
              >
                {current.title}
              </h3>

              <p className="text-sm sm:text-base leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                {current.description}
              </p>

              <div className="space-y-3 pt-2">
                {current.highlights.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3 text-sm font-medium">
                    <div className="p-1 rounded-full bg-emerald-500/15 text-emerald-400 shrink-0 mt-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                    <span style={{ color: "var(--text-primary)" }}>{item}</span>
                  </div>
                ))}
              </div>

              <div className="pt-4">
                <a
                  href="#calculator"
                  className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400 hover:text-emerald-300 transition-colors group"
                >
                  Test this inside our live LTV Simulator
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </a>
              </div>
            </div>

            {/* Right Column: Animated Interactive Business Mockups */}
            <div className="lg:col-span-6">
              <div className="rounded-2xl border border-(--border-primary) bg-[#060a14] shadow-2xl p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/05 rounded-full blur-3xl pointer-events-none" />

                {current.mockupType === "kyc" && (
                  <div className="space-y-5">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">
                          RK
                        </div>
                        <div>
                          <div className="text-sm font-bold text-white">Rajesh Kumar Sharma</div>
                          <div className="text-[11px] font-mono text-slate-400">Borrower ID: #PW-84920</div>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                        <Check className="w-3 h-3" /> VERIFIED BORROWER
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                        <div className="text-[10px] font-mono text-slate-400 uppercase">ID Document Type</div>
                        <div className="text-xs font-bold text-white mt-1">PAN Card (India RBI)</div>
                        <div className="text-[10px] font-mono text-emerald-400 mt-0.5">Format: ABCDE1234F ✓</div>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                        <div className="text-[10px] font-mono text-slate-400 uppercase">Phone OTP Status</div>
                        <div className="text-xs font-bold text-white mt-1">+91 98765 43210</div>
                        <div className="text-[10px] font-mono text-emerald-400 mt-0.5">Validated instantly ✓</div>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-transparent border border-emerald-500/20 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-white uppercase tracking-wide">Historical Credit Grade</div>
                        <div className="text-[11px] text-slate-300 mt-0.5">12 past loans repaid on time with zero default history.</div>
                      </div>
                      <div className="text-2xl font-black text-emerald-400 font-mono px-3 py-1 bg-emerald-500/20 rounded-lg border border-emerald-500/30">
                        GRADE A
                      </div>
                    </div>
                  </div>
                )}

                {current.mockupType === "ltv" && (
                  <div className="space-y-5">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                      <div>
                        <div className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wide">Live Spot Valuation Card</div>
                        <div className="text-sm font-bold text-white mt-0.5">Item: 22K Gold Antique Necklace</div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        75% LTV SLAB
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center font-mono">
                      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                        <div className="text-[10px] text-slate-400">Net Weight</div>
                        <div className="text-sm font-bold text-white mt-1">100.00 g</div>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                        <div className="text-[10px] text-slate-400">Purity Grade</div>
                        <div className="text-sm font-bold text-amber-400 mt-1">22K (91.6%)</div>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                        <div className="text-[10px] text-slate-400">Spot Rate/g</div>
                        <div className="text-sm font-bold text-emerald-400 mt-1">$91.39</div>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2 font-mono">
                      <div className="flex justify-between text-xs text-slate-300">
                        <span>Gross Market Valuation:</span>
                        <span className="font-bold text-white">$8,371.32</span>
                      </div>
                      <div className="flex justify-between text-xs text-slate-300">
                        <span>LTV Safety Slab Limit (75%):</span>
                        <span className="font-bold text-amber-400">-$2,092.83</span>
                      </div>
                      <div className="pt-2 border-t border-slate-800 flex justify-between text-sm">
                        <span className="font-bold text-emerald-400">Max Eligible Loan Cap:</span>
                        <span className="font-black text-emerald-400 text-lg">$6,278.49</span>
                      </div>
                    </div>
                  </div>
                )}

                {current.mockupType === "waterfall" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div>
                        <div className="text-xs font-mono font-bold text-emerald-400 uppercase">Payment Allocation Receipt</div>
                        <div className="text-sm font-bold text-white mt-0.5">Borrower Repayment Received: $1,500.00</div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase bg-blue-500/20 text-blue-400 border border-blue-500/30">
                        INSTANT ALLOCATION
                      </span>
                    </div>

                    <div className="space-y-2 font-mono text-xs">
                      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center text-[10px] font-bold">1</span>
                          <span className="text-white font-semibold">Priority 1: Penalty &amp; Late Charges</span>
                        </div>
                        <span className="text-rose-400 font-bold">-$50.00</span>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-[10px] font-bold">2</span>
                          <span className="text-white font-semibold">Priority 2: Accrued Daily Simple Interest</span>
                        </div>
                        <span className="text-amber-400 font-bold">-$120.00</span>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold">3</span>
                          <span className="text-white font-semibold">Priority 3: Principal Reduction</span>
                        </div>
                        <span className="text-emerald-400 font-bold">-$1,330.00</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs font-mono text-emerald-400">
                      <span>Remaining Loan Principal:</span>
                      <span className="font-bold">$4,948.49 (Updated instantly)</span>
                    </div>
                  </div>
                )}

                {current.mockupType === "network" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div>
                        <div className="text-xs font-mono font-bold text-blue-400 uppercase">Multi-Storefront Dashboard</div>
                        <div className="text-sm font-bold text-white mt-0.5">Active Storefront: Downtown Branch #02</div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        BRANCH MANAGER
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                        <div className="text-[10px] text-slate-400 uppercase font-mono">Branch Active Book</div>
                        <div className="text-base font-bold text-white mt-1">$482,900.00</div>
                        <div className="text-[10px] text-emerald-400 mt-0.5 font-mono">142 Active Collateral Loans</div>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                        <div className="text-[10px] text-slate-400 uppercase font-mono">Staff Permission Tiers</div>
                        <div className="text-xs font-bold text-amber-400 mt-1">4 Loan Officers Active</div>
                        <div className="text-[10px] text-slate-400 mt-0.5 font-mono">Strict payout limits enabled</div>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-amber-400">
                        <span className="flex items-center gap-1.5">
                          <Bell className="w-3.5 h-3.5 animate-bounce" />
                          Automated Follow-Up Queue
                        </span>
                        <span>3 Reminders Due</span>
                      </div>
                      <div className="text-[11px] text-slate-300">
                        SMS &amp; WhatsApp interest due reminders queued for sending at 10:00 AM.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
