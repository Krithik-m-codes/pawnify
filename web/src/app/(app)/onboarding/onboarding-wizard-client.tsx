"use client";

import React, { useState } from "react";
import {
  Globe,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sliders,
  DollarSign,
  Scale,
  Calendar,
  ShieldAlert,
} from "lucide-react";
import { saveLoanPolicyAction, type SavePolicyInput } from "./actions";
import { WeightUnit, PurityExpression, DayCountConvention } from "@prisma/client";

interface JurisdictionPreset {
  id: string;
  name: string;
  flag: string;
  description: string;
  currencyCode: string;
  currencySymbol: string;
  weightUnit: WeightUnit;
  purityExpression: PurityExpression;
  dayCountConvention: DayCountConvention;
  gracePeriodDays: number;
  mandatoryIdThreshold: number;
  ltvTiers: Array<{ maxValue: number | null; ltvPercent: number }>;
}

import { WORLDWIDE_JURISDICTIONS } from "@/lib/config/jurisdictions";

const PRESETS: JurisdictionPreset[] = [
  {
    id: "us",
    name: "United States (State & UCC Lending)",
    flag: "🇺🇸",
    description: "USD ($), Gram & Troy Ounce weights, Karat purity, $10,000 FinCEN threshold.",
    currencyCode: "USD",
    currencySymbol: "$",
    weightUnit: "GRAM",
    purityExpression: "KARAT",
    dayCountConvention: "ACTUAL_360",
    gracePeriodDays: 10,
    mandatoryIdThreshold: 10000,
    ltvTiers: [
      { maxValue: 5000, ltvPercent: 80 },
      { maxValue: null, ltvPercent: 75 },
    ],
  },
  {
    id: "gb",
    name: "United Kingdom (NPA Consumer Credit)",
    flag: "🇬🇧",
    description: "GBP (£), Gram weights, Millesimal Fineness (999), £5,000 KYC limit.",
    currencyCode: "GBP",
    currencySymbol: "£",
    weightUnit: "GRAM",
    purityExpression: "MILLESIMAL_FINENESS",
    dayCountConvention: "ACTUAL_365",
    gracePeriodDays: 14,
    mandatoryIdThreshold: 5000,
    ltvTiers: [{ maxValue: null, ltvPercent: 80 }],
  },
  {
    id: "eu",
    name: "Eurozone / EU (Lombard Lending)",
    flag: "🇪🇺",
    description: "EUR (€), Gram weights, Millesimal Fineness, €10,000 AML compliance.",
    currencyCode: "EUR",
    currencySymbol: "€",
    weightUnit: "GRAM",
    purityExpression: "MILLESIMAL_FINENESS",
    dayCountConvention: "ACTUAL_360",
    gracePeriodDays: 14,
    mandatoryIdThreshold: 10000,
    ltvTiers: [{ maxValue: null, ltvPercent: 75 }],
  },
  {
    id: "ae",
    name: "United Arab Emirates / Dubai (Gold Souk)",
    flag: "🇦🇪",
    description: "AED (د.إ), Tola & Gram weights, Karat purity, AED 50,000 threshold.",
    currencyCode: "AED",
    currencySymbol: "د.إ",
    weightUnit: "GRAM",
    purityExpression: "KARAT",
    dayCountConvention: "ACTUAL_360",
    gracePeriodDays: 7,
    mandatoryIdThreshold: 50000,
    ltvTiers: [
      { maxValue: 100000, ltvPercent: 85 },
      { maxValue: null, ltvPercent: 80 },
    ],
  },
  {
    id: "ch",
    name: "Switzerland (Institutional Lombard)",
    flag: "🇨🇭",
    description: "CHF, Gram weights, Swiss Private Bank watches & bullion standards.",
    currencyCode: "CHF",
    currencySymbol: "CHF",
    weightUnit: "GRAM",
    purityExpression: "MILLESIMAL_FINENESS",
    dayCountConvention: "ACTUAL_360",
    gracePeriodDays: 10,
    mandatoryIdThreshold: 15000,
    ltvTiers: [{ maxValue: null, ltvPercent: 70 }],
  },
  {
    id: "sg",
    name: "Singapore (Registry of Pawnbrokers)",
    flag: "🇸🇬",
    description: "SGD (S$), Gram weights, Karat purity, S$20,000 verification limit.",
    currencyCode: "SGD",
    currencySymbol: "S$",
    weightUnit: "GRAM",
    purityExpression: "KARAT",
    dayCountConvention: "ACTUAL_365",
    gracePeriodDays: 14,
    mandatoryIdThreshold: 20000,
    ltvTiers: [{ maxValue: null, ltvPercent: 80 }],
  },
  {
    id: "au",
    name: "Australia (National Credit Act)",
    flag: "🇦🇺",
    description: "AUD (A$), Gram weights, Karat purity, A$10,000 ID threshold.",
    currencyCode: "AUD",
    currencySymbol: "A$",
    weightUnit: "GRAM",
    purityExpression: "KARAT",
    dayCountConvention: "ACTUAL_365",
    gracePeriodDays: 14,
    mandatoryIdThreshold: 10000,
    ltvTiers: [{ maxValue: null, ltvPercent: 75 }],
  },
  {
    id: "ca",
    name: "Canada (Provincial PPSA)",
    flag: "🇨🇦",
    description: "CAD (C$), Gram & Troy Ounce weights, Karat purity, C$10,000 FINTRAC.",
    currencyCode: "CAD",
    currencySymbol: "C$",
    weightUnit: "GRAM",
    purityExpression: "KARAT",
    dayCountConvention: "ACTUAL_365",
    gracePeriodDays: 10,
    mandatoryIdThreshold: 10000,
    ltvTiers: [{ maxValue: null, ltvPercent: 80 }],
  },
  {
    id: "india",
    name: "India (Standard Pawnbrokers Act)",
    flag: "🇮🇳",
    description: "INR (₹), Gram weights, Karat purity, 50,000 PAN threshold, tiered LTV (85%/80%/75%).",
    currencyCode: "INR",
    currencySymbol: "₹",
    weightUnit: "GRAM",
    purityExpression: "KARAT",
    dayCountConvention: "ACTUAL_365",
    gracePeriodDays: 7,
    mandatoryIdThreshold: 50000,
    ltvTiers: [
      { maxValue: 250000, ltvPercent: 85 },
      { maxValue: 500000, ltvPercent: 80 },
      { maxValue: null, ltvPercent: 75 },
    ],
  },
  {
    id: "custom",
    name: "Universal Global Custom Preset",
    flag: "🌐",
    description: "Fully customizable country, currency symbol, Day Count, and LTV rules.",
    currencyCode: "USD",
    currencySymbol: "$",
    weightUnit: "GRAM",
    purityExpression: "KARAT",
    dayCountConvention: "ACTUAL_365",
    gracePeriodDays: 7,
    mandatoryIdThreshold: 0,
    ltvTiers: [{ maxValue: null, ltvPercent: 80 }],
  },
];

export function OnboardingWizardClient() {
  const [selectedPresetId, setSelectedPresetId] = useState<string>("india");
  const [form, setForm] = useState<SavePolicyInput>({
    currencyCode: "INR",
    currencySymbol: "₹",
    weightUnit: "GRAM",
    purityExpression: "KARAT",
    dayCountConvention: "ACTUAL_365",
    gracePeriodDays: 7,
    mandatoryIdThreshold: 50000,
    ltvTiers: [
      { maxValue: 250000, ltvPercent: 85 },
      { maxValue: 500000, ltvPercent: 80 },
      { maxValue: null, ltvPercent: 75 },
    ],
  });

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyPreset = (preset: JurisdictionPreset) => {
    setSelectedPresetId(preset.id);
    setForm({
      currencyCode: preset.currencyCode,
      currencySymbol: preset.currencySymbol,
      weightUnit: preset.weightUnit,
      purityExpression: preset.purityExpression,
      dayCountConvention: preset.dayCountConvention,
      gracePeriodDays: preset.gracePeriodDays,
      mandatoryIdThreshold: preset.mandatoryIdThreshold,
      ltvTiers: [...preset.ltvTiers],
    });
    setSuccess(false);
    setError(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    setError(null);

    const res = await saveLoanPolicyAction(form);
    setSaving(false);

    if (res.success) {
      setSuccess(true);
    } else {
      setError(res.error || "Failed to save policy");
    }
  };

  return (
    <div className="space-y-8">
      {/* Jurisdiction Preset Cards */}
      <div>
        <h2 className="text-sm font-semibold tracking-wider uppercase mb-3 text-(--text-secondary) flex items-center gap-2">
          <Globe className="w-4 h-4 text-(--accent)" /> Step 1: Select Jurisdiction Preset
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PRESETS.map((preset) => {
            const isSelected = selectedPresetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset)}
                className={`p-5 rounded-2xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? "border-(--accent) bg-(--accent)/[0.06] shadow-sm"
                    : "border-(--border-primary) bg-(--bg-card) hover:border-(--text-muted)"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xl">{preset.flag}</span>
                  {isSelected && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-(--accent) bg-(--accent)/10 px-2.5 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Selected
                    </span>
                  )}
                </div>
                <h3 className="text-base font-bold text-(--text-primary)">{preset.name}</h3>
                <p className="text-xs mt-1 text-(--text-secondary) leading-relaxed">
                  {preset.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Policy Configuration Form */}
      <form onSubmit={handleSave} className="p-6 rounded-2xl border border-(--border-primary) bg-(--bg-card) space-y-6">
        <h2 className="text-sm font-semibold tracking-wider uppercase text-(--text-secondary) flex items-center gap-2">
          <Sliders className="w-4 h-4 text-(--accent)" /> Step 2: Policy &amp; Compliance Parameters
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div>
            <label className="input-label flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-(--text-muted)" /> Currency Code
            </label>
            <input
              type="text"
              value={form.currencyCode}
              onChange={(e) => setForm({ ...form, currencyCode: e.target.value.toUpperCase() })}
              className="input-field mt-1.5"
              placeholder="INR, USD, GBP..."
              required
            />
          </div>

          <div>
            <label className="input-label">Currency Symbol</label>
            <input
              type="text"
              value={form.currencySymbol}
              onChange={(e) => setForm({ ...form, currencySymbol: e.target.value })}
              className="input-field mt-1.5"
              placeholder="₹, $, £..."
              required
            />
          </div>

          <div>
            <label className="input-label flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-(--text-muted)" /> Weight Unit
            </label>
            <select
              value={form.weightUnit}
              onChange={(e) => setForm({ ...form, weightUnit: e.target.value as WeightUnit })}
              className="input-field mt-1.5"
            >
              <option value="GRAM">Gram (g)</option>
              <option value="TROY_OUNCE">Troy Ounce (oz t)</option>
              <option value="TOLA">Tola (11.66g)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div>
            <label className="input-label">Purity Expression</label>
            <select
              value={form.purityExpression}
              onChange={(e) => setForm({ ...form, purityExpression: e.target.value as PurityExpression })}
              className="input-field mt-1.5"
            >
              <option value="KARAT">Karat (e.g. 22K, 18K)</option>
              <option value="MILLESIMAL_FINENESS">Millesimal Fineness (e.g. 916, 750)</option>
              <option value="PERCENTAGE">Percentage (e.g. 91.60%)</option>
            </select>
          </div>

          <div>
            <label className="input-label flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-(--text-muted)" /> Day Count Convention
            </label>
            <select
              value={form.dayCountConvention}
              onChange={(e) =>
                setForm({ ...form, dayCountConvention: e.target.value as DayCountConvention })
              }
              className="input-field mt-1.5"
            >
              <option value="ACTUAL_365">Actual / 365 (Standard)</option>
              <option value="ACTUAL_360">Actual / 360 (US Banking)</option>
              <option value="THIRTY_360">30 / 360 (Fixed Month)</option>
            </select>
          </div>

          <div>
            <label className="input-label flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-(--text-muted)" /> Mandatory ID Threshold ({form.currencySymbol})
            </label>
            <input
              type="number"
              value={form.mandatoryIdThreshold}
              onChange={(e) => setForm({ ...form, mandatoryIdThreshold: Number(e.target.value) })}
              className="input-field mt-1.5"
              min={0}
              step={100}
            />
          </div>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Successfully updated multi-tenant lending policy for organization.</span>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary inline-flex items-center gap-2 cursor-pointer"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Saving Policy...
              </>
            ) : (
              "Save Jurisdiction Policy"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
