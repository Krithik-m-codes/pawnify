"use client";

import React, { useState } from "react";
import {
  Globe,
  Watch,
  Coins,
  Palette,
  Car,
  ShoppingBag,
  CheckCircle2,
  ShieldCheck,
  Scale,
} from "lucide-react";
import { motion } from "framer-motion";
import { formatUniversalCurrency } from "@/lib/config/jurisdictions";
import { UNIVERSAL_ASSET_CATEGORIES, AssetCategoryId } from "@/lib/config/asset-categories";

interface CurrencyOption {
  code: string;
  symbol: string;
  label: string;
  defaultSpotGold: number;
  defaultAppraisedValue: number;
}

const CURRENCIES: Record<string, CurrencyOption> = {
  USD: { code: "USD", symbol: "$", label: "USD ($) • United States", defaultSpotGold: 82, defaultAppraisedValue: 25000 },
  GBP: { code: "GBP", symbol: "£", label: "GBP (£) • United Kingdom", defaultSpotGold: 65, defaultAppraisedValue: 20000 },
  EUR: { code: "EUR", symbol: "€", label: "EUR (€) • Eurozone", defaultSpotGold: 76, defaultAppraisedValue: 23000 },
  AED: { code: "AED", symbol: "د.إ", label: "AED (د.إ) • United Arab Emirates", defaultSpotGold: 300, defaultAppraisedValue: 95000 },
  CHF: { code: "CHF", symbol: "CHF", label: "CHF • Switzerland", defaultSpotGold: 73, defaultAppraisedValue: 22000 },
  AUD: { code: "AUD", symbol: "A$", label: "AUD (A$) • Australia", defaultSpotGold: 128, defaultAppraisedValue: 38000 },
  CAD: { code: "CAD", symbol: "C$", label: "CAD (C$) • Canada", defaultSpotGold: 115, defaultAppraisedValue: 35000 },
  SGD: { code: "SGD", symbol: "S$", label: "SGD (S$) • Singapore", defaultSpotGold: 110, defaultAppraisedValue: 33000 },
  INR: { code: "INR", symbol: "₹", label: "INR (₹) • India", defaultSpotGold: 7850, defaultAppraisedValue: 1500000 },
};

export function UniversalAssetCalculator() {
  const [selectedCurrency, setSelectedCurrency] = useState("USD");
  const [selectedCategory, setSelectedCategory] = useState<AssetCategoryId>("PRECIOUS_METALS");

  const [weightGrams, setWeightGrams] = useState(100);
  const [purityPercent, setPurityPercent] = useState(0.999);

  const [appraisedValueInput, setAppraisedValueInput] = useState(25000);
  const [monthlyRatePercent, setMonthlyRatePercent] = useState(1.5);

  const cur = CURRENCIES[selectedCurrency] || CURRENCIES.USD;
  const category = UNIVERSAL_ASSET_CATEGORIES[selectedCategory];

  let assessedValue = 0;
  if (selectedCategory === "PRECIOUS_METALS") {
    assessedValue = weightGrams * purityPercent * cur.defaultSpotGold;
  } else {
    assessedValue = appraisedValueInput;
  }

  const ltvPercent = category.defaultLtvPercent;
  const eligibleLoanAmount = (assessedValue * ltvPercent) / 100;
  const monthlyInterest = (eligibleLoanAmount * monthlyRatePercent) / 100;

  const handleCurrencyChange = (code: string) => {
    setSelectedCurrency(code);
    setAppraisedValueInput(CURRENCIES[code].defaultAppraisedValue);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="rounded-3xl border border-(--border-primary) bg-(--bg-card) p-6 sm:p-10 shadow-xl overflow-hidden"
    >
      {/* Top Controls Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-8 border-b border-(--border-primary)">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 mb-3">
            <Globe className="w-3.5 h-3.5" />
            <span>INTERACTIVE COLLATERAL SIMULATOR</span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-(--text-primary)">
            Simulate Collateral &amp; Loan Terms Worldwide
          </h3>
          <p className="text-sm mt-1 text-(--text-secondary)">
            Test automated LTV safety slabs across any asset class and national currency.
          </p>
        </div>

        {/* Global Currency Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-(--text-muted)">
            Currency:
          </span>
          <select
            value={selectedCurrency}
            onChange={(e) => handleCurrencyChange(e.target.value)}
            className="text-xs font-bold rounded-xl border border-(--border-primary) bg-(--bg-primary) px-3 py-2 text-(--text-primary) cursor-pointer"
          >
            {Object.values(CURRENCIES).map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Asset Category Tabs */}
      <div className="mt-8 flex flex-wrap gap-2">
        {(
          [
            { id: "PRECIOUS_METALS", label: "Precious Metals", icon: Coins },
            { id: "LUXURY_WATCHES", label: "Luxury Watches", icon: Watch },
            { id: "FINE_ART_COLLECTIBLES", label: "Fine Art & Art", icon: Palette },
            { id: "VEHICLES_EQUIPMENT", label: "Vehicles & Exotics", icon: Car },
            { id: "LUXURY_GOODS", label: "Designer Luxury", icon: ShoppingBag },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const isActive = selectedCategory === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSelectedCategory(tab.id as AssetCategoryId)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isActive
                  ? "bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20 scale-[1.02]"
                  : "bg-(--bg-secondary) text-(--text-secondary) hover:text-(--text-primary) border border-(--border-primary)"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Interactive Grid */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Form Panel */}
        <div className="lg:col-span-7 space-y-6 rounded-2xl border border-(--border-primary) bg-(--bg-secondary)/40 p-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold tracking-wider text-amber-500 uppercase">
              {category.badge}
            </span>
            <span className="text-xs text-(--text-muted)">
              Default LTV Slab: <strong className="text-(--text-primary)">{category.defaultLtvPercent}%</strong>
            </span>
          </div>

          <p className="text-sm text-(--text-secondary)">{category.description}</p>

          {selectedCategory === "PRECIOUS_METALS" ? (
            <div className="space-y-6 pt-2">
              <div>
                <div className="flex justify-between text-xs font-bold mb-2">
                  <span className="text-(--text-secondary)">Gross Metal Weight</span>
                  <span className="font-mono text-amber-400">{weightGrams} grams</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="1000"
                  step="10"
                  value={weightGrams}
                  onChange={(e) => setWeightGrams(Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              <div>
                <span className="block text-xs font-bold text-(--text-secondary) mb-2">
                  Purity Grade / Fineness
                </span>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: "24K (99.9%)", value: 0.999 },
                    { label: "22K (91.6%)", value: 0.916 },
                    { label: "18K (75.0%)", value: 0.75 },
                    { label: "Fine Ag (999)", value: 0.999 },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setPurityPercent(preset.value)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer border ${
                        purityPercent === preset.value
                          ? "bg-amber-500/20 text-amber-400 border-amber-500"
                          : "bg-(--bg-primary) text-(--text-secondary) border-(--border-primary)"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6 pt-2">
              <div>
                <div className="flex justify-between text-xs font-bold mb-2">
                  <span className="text-(--text-secondary)">Appraised Market Valuation</span>
                  <span className="font-mono text-amber-400">
                    {formatUniversalCurrency(appraisedValueInput, cur.code)}
                  </span>
                </div>
                <input
                  type="range"
                  min={cur.defaultAppraisedValue * 0.2}
                  max={cur.defaultAppraisedValue * 5}
                  step={cur.defaultAppraisedValue * 0.05}
                  value={appraisedValueInput}
                  onChange={(e) => setAppraisedValueInput(Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              <div className="p-3 rounded-xl border border-(--border-primary) bg-(--bg-primary) text-xs flex items-center justify-between">
                <span className="text-(--text-muted)">Example Asset:</span>
                <span className="font-bold text-(--text-primary)">
                  {category.exampleItems[0]}
                </span>
              </div>
            </div>
          )}

          <div>
            <div className="flex justify-between text-xs font-bold mb-2">
              <span className="text-(--text-secondary)">Monthly Simple Interest Rate</span>
              <span className="font-mono text-(--text-primary)">{monthlyRatePercent}% / month</span>
            </div>
            <input
              type="range"
              min="0.75"
              max="3.0"
              step="0.25"
              value={monthlyRatePercent}
              onChange={(e) => setMonthlyRatePercent(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Right Calculation Display */}
        <div className="lg:col-span-5 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-(--bg-card) to-(--bg-secondary) p-6 sm:p-8 space-y-6">
          <div>
            <span className="text-xs font-mono font-bold tracking-wider text-(--text-muted) uppercase">
              Total Assessed Valuation
            </span>
            <div className="text-3xl sm:text-4xl font-black tracking-tight text-(--text-primary) mt-1">
              {formatUniversalCurrency(assessedValue, cur.code)}
            </div>
          </div>

          <div className="border-t border-(--border-primary) pt-6 space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-(--text-secondary)">Applicable LTV Safety Limit</span>
              <span className="font-mono font-bold text-emerald-400">{ltvPercent}% LTV</span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-(--text-secondary)">Max Eligible Loan Disbursal</span>
              <span className="font-mono font-bold text-amber-400 text-lg">
                {formatUniversalCurrency(eligibleLoanAmount, cur.code)}
              </span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-(--text-secondary)">Est. Monthly Simple Interest</span>
              <span className="font-mono font-bold text-(--text-primary)">
                {formatUniversalCurrency(monthlyInterest, cur.code)}
              </span>
            </div>
          </div>

          {/* Business Assurance Footer */}
          <div className="border-t border-(--border-primary) pt-6 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-xs text-(--text-secondary) leading-relaxed">
              Every loan calculation automatically locks current spot rates and creates an immutable digital audit record across your branch network.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
