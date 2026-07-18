"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Calculator,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Percent,
  Coins,
  DollarSign,
  TrendingUp,
} from "lucide-react";

type CurrencyMode = "INR" | "USD" | "GBP";

const CURRENCY_CONFIG: Record<
  CurrencyMode,
  {
    symbol: string;
    code: string;
    goldSpotRatePerGram: number;
    silverSpotRatePerGram: number;
    tier1Limit: number;
    tier2Limit: number;
  }
> = {
  INR: {
    symbol: "₹",
    code: "INR",
    goldSpotRatePerGram: 7850,
    silverSpotRatePerGram: 92,
    tier1Limit: 250000,
    tier2Limit: 500000,
  },
  USD: {
    symbol: "$",
    code: "USD",
    goldSpotRatePerGram: 88,
    silverSpotRatePerGram: 1.1,
    tier1Limit: 3000,
    tier2Limit: 6000,
  },
  GBP: {
    symbol: "£",
    code: "GBP",
    goldSpotRatePerGram: 68,
    silverSpotRatePerGram: 0.85,
    tier1Limit: 2500,
    tier2Limit: 5000,
  },
};

export function InteractiveLtvCalculator() {
  const [currency, setCurrency] = useState<CurrencyMode>("INR");
  const [metalType, setMetalType] = useState<"GOLD" | "SILVER">("GOLD");
  const [purityKarat, setPurityKarat] = useState<number>(22);
  const [weightGrams, setWeightGrams] = useState<number>(45);
  const [monthlyInterestRate, setMonthlyInterestRate] = useState<number>(1.5);

  const cfg = CURRENCY_CONFIG[currency];

  // Purity factor
  const purityPercent = metalType === "GOLD" ? purityKarat / 24 : 0.999;
  const baseRate = metalType === "GOLD" ? cfg.goldSpotRatePerGram : cfg.silverSpotRatePerGram;
  const effectiveRatePerGram = baseRate * purityPercent;

  // Assessed Value
  const assessedValue = weightGrams * effectiveRatePerGram;

  // Tiered LTV calculation
  let ltvPercent = 75;
  let tierLabel = "Tier 3 (> Cap @ 75% LTV)";
  if (assessedValue <= cfg.tier1Limit) {
    ltvPercent = 85;
    tierLabel = `Tier 1 (≤ ${cfg.symbol}${cfg.tier1Limit.toLocaleString()} @ 85% LTV)`;
  } else if (assessedValue <= cfg.tier2Limit) {
    ltvPercent = 80;
    tierLabel = `Tier 2 (${cfg.symbol}${cfg.tier1Limit.toLocaleString()} - ${cfg.symbol}${cfg.tier2Limit.toLocaleString()} @ 80% LTV)`;
  }

  const maxEligibleAmount = (assessedValue * ltvPercent) / 100;
  const monthlyInterest = (maxEligibleAmount * monthlyInterestRate) / 100;
  const dailyInterest = monthlyInterest / 30;

  return (
    <div
      id="calculator"
      className="relative rounded-3xl border border-(--border-primary) bg-gradient-to-br from-(--bg-card) via-(--bg-secondary) to-(--bg-card) p-6 sm:p-10 shadow-2xl overflow-hidden"
    >
      {/* Decorative Assay Watermark */}
      <div className="absolute -right-16 -top-16 w-64 h-64 bg-emerald-500/[0.05] rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-semibold border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 mb-2">
            <Calculator className="w-3.5 h-3.5" />
            <span>REAL-TIME LTV &amp; WATERFALL ENGINE</span>
          </div>
          <h2
            className="text-2xl sm:text-3xl font-extrabold tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            Interactive Collateral Valuation Simulator
          </h2>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Test Pawnify’s tiered LTV policies and interest accrual in real time without signing up.
          </p>
        </div>

        {/* Jurisdiction Currency Selector */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl border border-(--border-primary) bg-(--bg-primary) shrink-0">
          {(["INR", "USD", "GBP"] as CurrencyMode[]).map((curr) => (
            <button
              key={curr}
              type="button"
              onClick={() => setCurrency(curr)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                currency === curr
                  ? "bg-emerald-500 text-white shadow-sm"
                  : "text-(--text-secondary) hover:text-(--text-primary)"
              }`}
            >
              {curr} ({CURRENCY_CONFIG[curr].symbol})
            </button>
          ))}
        </div>
      </div>

      {/* Simulator Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Interactive Inputs (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Metal & Purity Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="input-label mb-1.5 block">Collateral Metal Type</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMetalType("GOLD");
                    setPurityKarat(22);
                  }}
                  className={`p-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    metalType === "GOLD"
                      ? "border-amber-500 bg-amber-500/10 text-amber-400"
                      : "border-(--border-primary) bg-(--bg-primary) text-(--text-secondary)"
                  }`}
                >
                  <Coins className="w-4 h-4" />
                  Gold (Au)
                </button>
                <button
                  type="button"
                  onClick={() => setMetalType("SILVER")}
                  className={`p-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    metalType === "SILVER"
                      ? "border-zinc-400 bg-zinc-400/10 text-zinc-300"
                      : "border-(--border-primary) bg-(--bg-primary) text-(--text-secondary)"
                  }`}
                >
                  <Coins className="w-4 h-4" />
                  Silver (Ag)
                </button>
              </div>
            </div>

            <div>
              <label className="input-label mb-1.5 block">
                {metalType === "GOLD" ? "Gold Purity Grade" : "Silver Fineness Grade"}
              </label>
              {metalType === "GOLD" ? (
                <div className="grid grid-cols-3 gap-2">
                  {[24, 22, 18].map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setPurityKarat(k)}
                      className={`p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        purityKarat === k
                          ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                          : "border-(--border-primary) bg-(--bg-primary) text-(--text-secondary)"
                      }`}
                    >
                      {k}K ({( (k / 24) * 100 ).toFixed(1)}%)
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-3 rounded-xl border border-zinc-500/30 bg-zinc-500/10 text-xs font-semibold text-zinc-300 text-center">
                  999 Fine Silver (99.9% Pure)
                </div>
              )}
            </div>
          </div>

          {/* Weight Slider & Input */}
          <div className="p-5 rounded-2xl border border-(--border-primary) bg-(--bg-primary)/60 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-(--text-primary)">
                Gross Weight (Grams)
              </label>
              <span className="text-lg font-black font-mono text-emerald-400">
                {weightGrams} g
              </span>
            </div>
            <input
              type="range"
              min={5}
              max={300}
              step={1}
              value={weightGrams}
              onChange={(e) => setWeightGrams(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-(--text-muted) font-mono">
              <span>5g (Ring/Coin)</span>
              <span>100g (Necklace Set)</span>
              <span>300g (Bullion Bar)</span>
            </div>
          </div>

          {/* Monthly Interest Rate Slider */}
          <div className="p-5 rounded-2xl border border-(--border-primary) bg-(--bg-primary)/60 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-(--text-primary)">
                Monthly Interest Rate
              </label>
              <span className="text-lg font-black font-mono text-emerald-400">
                {monthlyInterestRate.toFixed(1)}% / mo
              </span>
            </div>
            <input
              type="range"
              min={0.8}
              max={3.0}
              step={0.1}
              value={monthlyInterestRate}
              onChange={(e) => setMonthlyInterestRate(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-(--text-muted) font-mono">
              <span>0.8% (Institutional)</span>
              <span>1.5% (Standard Act)</span>
              <span>3.0% (Short-term)</span>
            </div>
          </div>
        </div>

        {/* Right Column: Real-Time Valuation Summary Card (5 cols) */}
        <div className="lg:col-span-5 p-6 sm:p-7 rounded-3xl border border-emerald-500/30 bg-gradient-to-b from-emerald-500/[0.08] to-(--bg-primary) space-y-6">
          <div className="flex items-center justify-between border-b border-(--border-primary) pb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-(--text-secondary)">
              Real-Time Valuation Output
            </span>
            <span className="text-xs font-mono text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded">
              LTV: {ltvPercent}%
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <div className="text-xs text-(--text-secondary)">Total Assessed Value</div>
              <div className="text-2xl sm:text-3xl font-black font-mono mt-0.5 text-(--text-primary)">
                {cfg.symbol}
                {assessedValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
              <div className="text-[11px] text-(--text-muted) font-mono mt-0.5">
                Valuation Rate: {cfg.symbol}
                {effectiveRatePerGram.toFixed(2)}/g
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06]">
              <div className="text-xs font-semibold text-emerald-400">
                Applied Policy Slab: {tierLabel}
              </div>
            </div>

            <div className="pt-2 border-t border-(--border-primary)">
              <div className="text-xs font-bold uppercase tracking-wider text-(--text-primary)">
                Max Eligible Disbursal Amount
              </div>
              <div className="text-3xl sm:text-4xl font-black font-mono text-emerald-400 mt-1">
                {cfg.symbol}
                {maxEligibleAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3 rounded-xl border border-(--border-primary) bg-(--bg-card)">
                <div className="text-[11px] text-(--text-secondary)">Daily Simple Interest</div>
                <div className="text-sm font-bold font-mono text-(--text-primary) mt-0.5">
                  {cfg.symbol}
                  {dailyInterest.toFixed(2)}/day
                </div>
              </div>
              <div className="p-3 rounded-xl border border-(--border-primary) bg-(--bg-card)">
                <div className="text-[11px] text-(--text-secondary)">Monthly Interest</div>
                <div className="text-sm font-bold font-mono text-(--text-primary) mt-0.5">
                  {cfg.symbol}
                  {monthlyInterest.toFixed(2)}/mo
                </div>
              </div>
            </div>
          </div>

          <Link
            href="/login?demo=true"
            className="btn-primary w-full flex items-center justify-center gap-2 py-3.5 text-xs font-bold uppercase tracking-wider cursor-pointer shadow-lg shadow-emerald-500/20"
          >
            Launch Instant Demo Account
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
