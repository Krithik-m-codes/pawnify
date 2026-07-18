"use client";

import React, { useState } from "react";
import {
  Layers,
  Scale,
  RefreshCw,
  CheckCircle2,
  Globe,
  Coins,
  ShieldCheck,
  Building2,
  Users,
  Bell,
  Smartphone,
} from "lucide-react";
import { motion } from "framer-motion";

export function FeaturesSection() {
  const [selectedUnit, setSelectedUnit] = useState<"g" | "oz" | "tola">("g");

  const weightEx = {
    g: { label: "Grams (g)", val: "100.0000 g", goldPrice: "$9,139.00", silverPrice: "$105.00" },
    oz: { label: "Troy Ounces (oz)", val: "3.2151 oz", goldPrice: "$9,139.00", silverPrice: "$105.00" },
    tola: { label: "Indian Tola (11.66g)", val: "8.5735 tola", goldPrice: "$9,139.00", silverPrice: "$105.00" },
  };

  return (
    <section id="features" className="py-24 sm:py-32 border-t border-(--border-primary) relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mb-16 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-bold border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 mb-4 shadow-2xs">
            <Layers className="w-3.5 h-3.5" />
            <span>THE INSTITUTIONAL ADVANTAGE</span>
          </div>
          <h2
            className="text-3xl sm:text-5xl font-black -tracking-[0.03em] leading-tight"
            style={{ color: "var(--text-primary)" }}
          >
            Built for total operational control and financial accuracy.
          </h2>
          <p className="mt-4 text-base sm:text-lg" style={{ color: "var(--text-secondary)" }}>
            Unlike generic CRM software, Pawnify is engineered specifically for physical collateral and precious metals lending with zero calculation errors and strict multi-branch employee controls.
          </p>
        </div>

        {/* Institutional Bento Grid Layout with Framer Motion */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* Card 1 (Large Span 8): Multi-Branch Network Security */}
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="md:col-span-8 shine-border-card p-8 sm:p-10 border border-(--border-primary) bg-(--bg-card) flex flex-col justify-between hover:border-emerald-500/40 transition-all shadow-lg"
          >
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Building2 className="w-6 h-6" />
                </div>
                <span className="text-xs font-mono font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  Multi-Storefront Protection
                </span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-black -tracking-[0.02em] text-(--text-primary)">
                Multi-Branch Network Security &amp; Staff Tiers
              </h3>
              <p className="mt-3 text-sm sm:text-base leading-relaxed text-(--text-secondary) max-w-2xl">
                Whether you manage one pawn shop or fifty locations across the country, Pawnify enforces strict data segregation between branches. Staff members only view their assigned storefronts, while branch managers and owners retain complete oversight over payouts, interest rates, and loan approvals.
              </p>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-xl bg-(--bg-secondary) border border-(--border-primary)">
                  <div className="text-xs font-bold text-emerald-400 uppercase font-mono">Owner &amp; Auditor</div>
                  <div className="text-sm font-bold text-(--text-primary) mt-1">Full Portfolio Control</div>
                  <div className="text-[11px] text-(--text-muted) mt-0.5">Configure LTV slabs &amp; quotas</div>
                </div>

                <div className="p-4 rounded-xl bg-(--bg-secondary) border border-(--border-primary)">
                  <div className="text-xs font-bold text-amber-400 uppercase font-mono">Branch Manager</div>
                  <div className="text-sm font-bold text-(--text-primary) mt-1">Storefront Oversight</div>
                  <div className="text-[11px] text-(--text-muted) mt-0.5">Approve high-value disbursals</div>
                </div>

                <div className="p-4 rounded-xl bg-(--bg-secondary) border border-(--border-primary)">
                  <div className="text-xs font-bold text-blue-400 uppercase font-mono">Loan Officer / Staff</div>
                  <div className="text-sm font-bold text-(--text-primary) mt-1">Daily Operations</div>
                  <div className="text-[11px] text-(--text-muted) mt-0.5">Screen KYC &amp; record payments</div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-(--border-primary) text-xs font-mono text-(--text-muted) flex items-center justify-between">
              <span className="flex items-center gap-2 text-emerald-400 font-bold">
                <CheckCircle2 className="w-4 h-4" />
                Complete Employee Audit Logs
              </span>
              <span>Prevent Unauthorized Payouts</span>
            </div>
          </motion.div>

          {/* Card 2 (Span 4): Precision Micro-Weight & Purity Engine */}
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="md:col-span-4 shine-border-card p-8 border border-(--border-primary) bg-(--bg-card) flex flex-col justify-between hover:border-emerald-500/40 transition-all shadow-lg"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 mb-6">
                <Scale className="w-6 h-6" />
              </div>

              <h3 className="text-xl font-black -tracking-[0.01em] text-(--text-primary)">
                Precision Weight &amp; Multi-Unit Conversion
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-(--text-secondary)">
                Never lose money on inaccurate weight conversions. Track collateral weights precisely across international jewelry units.
              </p>

              {/* Interactive Unit Switcher */}
              <div className="mt-5 p-4 rounded-2xl bg-(--bg-secondary) border border-(--border-primary) space-y-3">
                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-(--bg-primary) border border-(--border-primary)">
                  {(["g", "oz", "tola"] as const).map((unit) => (
                    <button
                      key={unit}
                      onClick={() => setSelectedUnit(unit)}
                      className={`flex-1 py-1 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer ${
                        selectedUnit === unit
                          ? "bg-emerald-500 text-black shadow-2xs"
                          : "text-(--text-tertiary) hover:text-(--text-primary)"
                      }`}
                    >
                      {unit.toUpperCase()}
                    </button>
                  ))}
                </div>

                <div className="text-center py-2 font-mono">
                  <div className="text-xs text-(--text-muted) uppercase">Equivalent Weight:</div>
                  <div className="text-lg font-black text-emerald-400">{weightEx[selectedUnit].val}</div>
                  <div className="text-[11px] text-(--text-tertiary) mt-1">
                    Valuation: <span className="font-bold text-(--text-primary)">{weightEx[selectedUnit].goldPrice}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-(--border-primary) text-xs font-mono text-(--text-muted) flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-amber-500" />
              <span>Grams, Troy Ounces &amp; Tolas Supported</span>
            </div>
          </motion.div>

          {/* Card 3 (Span 4): Worldwide Presets & Jurisdictions */}
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="md:col-span-4 shine-border-card p-8 border border-(--border-primary) bg-(--bg-card) flex flex-col justify-between hover:border-emerald-500/40 transition-all shadow-lg"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-6">
                <Globe className="w-6 h-6" />
              </div>

              <h3 className="text-xl font-black -tracking-[0.01em] text-(--text-primary)">
                Worldwide Jurisdiction &amp; Currency Regimes
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-(--text-secondary)">
                Configurable for any lending market. Native defaults for India (`PAN`, `₹`, `RBI slabs`), USA (`$`, `SSN`), UK, and UAE with customizable interest cycles.
              </p>

              <div className="mt-5 grid grid-cols-3 gap-2 text-center font-mono text-xs">
                <div className="p-2.5 rounded-xl bg-(--bg-secondary) border border-(--border-primary)">
                  <div className="font-bold text-emerald-400">₹ INR</div>
                  <div className="text-[10px] text-(--text-muted)">India (RBI)</div>
                </div>
                <div className="p-2.5 rounded-xl bg-(--bg-secondary) border border-(--border-primary)">
                  <div className="font-bold text-blue-400">$ USD</div>
                  <div className="text-[10px] text-(--text-muted)">United States</div>
                </div>
                <div className="p-2.5 rounded-xl bg-(--bg-secondary) border border-(--border-primary)">
                  <div className="font-bold text-amber-400">£ GBP</div>
                  <div className="text-[10px] text-(--text-muted)">United Kingdom</div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-(--border-primary) text-xs font-mono text-(--text-muted) flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
              <span>Multi-Currency &amp; Regional Compliance</span>
            </div>
          </motion.div>

          {/* Card 4 (Span 8): Automated Interest Calculation & Collections */}
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="md:col-span-8 shine-border-card p-8 sm:p-10 border border-(--border-primary) bg-(--bg-card) flex flex-col justify-between hover:border-emerald-500/40 transition-all shadow-lg"
          >
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <RefreshCw className="w-6 h-6" />
                </div>
                <span className="text-xs font-mono font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5" />
                  Automated Collections Engine
                </span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-black -tracking-[0.02em] text-(--text-primary)">
                Automated Simple Daily Interest &amp; Reminders
              </h3>
              <p className="mt-3 text-sm sm:text-base leading-relaxed text-(--text-secondary) max-w-2xl">
                Say goodbye to complicated spreadsheet formulas. Pawnify calculates simple daily interest exactly from the date of disbursal. When a loan approaches its grace period deadline, automated SMS and WhatsApp reminders notify customers before late fees apply.
              </p>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-(--bg-secondary) border border-(--border-primary) flex flex-col justify-between">
                  <div className="text-[10px] font-mono text-emerald-400 font-bold uppercase">Accrual Engine</div>
                  <div className="text-sm font-bold text-(--text-primary) mt-1">Exact Calendar Days</div>
                  <div className="text-[11px] text-(--text-muted) mt-0.5">Calculates daily down to the cent</div>
                </div>

                <div className="p-3.5 rounded-xl bg-(--bg-secondary) border border-(--border-primary) flex flex-col justify-between">
                  <div className="text-[10px] font-mono text-amber-400 font-bold uppercase">Overdue Reminders</div>
                  <div className="text-sm font-bold text-(--text-primary) mt-1">Automated SMS / WhatsApp</div>
                  <div className="text-[11px] text-(--text-muted) mt-0.5">Reduce default rates by up to 40%</div>
                </div>

                <div className="p-3.5 rounded-xl bg-(--bg-secondary) border border-(--border-primary) flex flex-col justify-between">
                  <div className="text-[10px] font-mono text-blue-400 font-bold uppercase">Payoff Receipts</div>
                  <div className="text-sm font-bold text-(--text-primary) mt-1">Instant Audit Trails</div>
                  <div className="text-[11px] text-(--text-muted) mt-0.5">Printable &amp; verifiable digital receipts</div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-(--border-primary) text-xs font-mono text-(--text-muted) flex items-center justify-between">
              <span className="flex items-center gap-2 text-emerald-400 font-bold">
                <CheckCircle2 className="w-4 h-4" />
                Zero Calculation Drift or Manual Errors
              </span>
              <span>Protect Operating Margins</span>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
