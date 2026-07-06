"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { saveSettingsAction } from "./actions";
import {
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Percent,
  PercentCircle,
  ShieldAlert,
  Calendar,
} from "lucide-react";

interface SettingsFormProps {
  initialSettings: {
    ltv_tier1_max: string;
    ltv_tier2_max: string;
    ltv_tier3_max: string;
    default_interest_monthly: string;
    default_grace_days: string;
    pan_required_threshold: string;
  };
}

export function SettingsForm({ initialSettings }: SettingsFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState(initialSettings);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const formData = new FormData();
    Object.entries(form).forEach(([k, v]) => formData.append(k, v));

    const res = await saveSettingsAction(formData);
    if (!res.success) {
      setError(res.error || "Failed to save settings");
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl">
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-sm flex items-center gap-3 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="font-semibold">
            System settings updated successfully! New LTV slabs and interest rules will apply immediately.
          </span>
        </div>
      )}

      {/* RBI LTV Slabs Card */}
      <div className="glass-card p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-2 pb-4 border-b border-zinc-800">
          <PercentCircle className="w-5 h-5 text-amber-400" />
          <div>
            <h2 className="text-base font-bold text-zinc-100">
              RBI-Compliant Tiered LTV Slabs (§6.2)
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Maximum allowable Loan-to-Value percentage for gold and silver collateral based on total assessed valuation.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div>
            <label className="input-label" htmlFor="tier1">
              Tier 1: ≤ ₹2.5L LTV (%) *
            </label>
            <input
              id="tier1"
              name="ltv_tier1_max"
              type="number"
              step="0.1"
              min="50"
              max="90"
              value={form.ltv_tier1_max}
              onChange={handleChange}
              className="input-field font-mono text-base font-bold text-amber-400 py-3"
              required
            />
            <span className="text-[11px] text-zinc-500 mt-1 block">Default: 85.0%</span>
          </div>

          <div>
            <label className="input-label" htmlFor="tier2">
              Tier 2: ₹2.5L - ₹5L LTV (%) *
            </label>
            <input
              id="tier2"
              name="ltv_tier2_max"
              type="number"
              step="0.1"
              min="50"
              max="90"
              value={form.ltv_tier2_max}
              onChange={handleChange}
              className="input-field font-mono text-base font-bold text-amber-400 py-3"
              required
            />
            <span className="text-[11px] text-zinc-500 mt-1 block">Default: 80.0%</span>
          </div>

          <div>
            <label className="input-label" htmlFor="tier3">
              Tier 3: &gt; ₹5L LTV (%) *
            </label>
            <input
              id="tier3"
              name="ltv_tier3_max"
              type="number"
              step="0.1"
              min="50"
              max="90"
              value={form.ltv_tier3_max}
              onChange={handleChange}
              className="input-field font-mono text-base font-bold text-amber-400 py-3"
              required
            />
            <span className="text-[11px] text-zinc-500 mt-1 block">Default: 75.0%</span>
          </div>
        </div>
      </div>

      {/* Defaults & KYC Thresholds */}
      <div className="glass-card p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-2 pb-4 border-b border-zinc-800">
          <ShieldAlert className="w-5 h-5 text-amber-400" />
          <div>
            <h2 className="text-base font-bold text-zinc-100">
              Interest Rules & KYC Compliance Thresholds
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Set standard loan terms defaults and PAN card regulatory limits.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div>
            <label className="input-label flex items-center gap-1" htmlFor="interest">
              <Percent className="w-3.5 h-3.5 text-zinc-400" />
              Default Monthly Interest (%) *
            </label>
            <input
              id="interest"
              name="default_interest_monthly"
              type="number"
              step="0.05"
              min="0.5"
              max="5.0"
              value={form.default_interest_monthly}
              onChange={handleChange}
              className="input-field font-mono text-sm py-2.5"
              required
            />
            <span className="text-[11px] text-zinc-500 mt-1 block">Default: 1.5% per month</span>
          </div>

          <div>
            <label className="input-label flex items-center gap-1" htmlFor="grace">
              <Calendar className="w-3.5 h-3.5 text-zinc-400" />
              Default Grace Period (Days) *
            </label>
            <input
              id="grace"
              name="default_grace_days"
              type="number"
              step="1"
              min="0"
              max="30"
              value={form.default_grace_days}
              onChange={handleChange}
              className="input-field font-mono text-sm py-2.5"
              required
            />
            <span className="text-[11px] text-zinc-500 mt-1 block">Default: 7 days</span>
          </div>

          <div>
            <label className="input-label" htmlFor="pan">
              PAN Mandatory Threshold (₹) *
            </label>
            <input
              id="pan"
              name="pan_required_threshold"
              type="number"
              step="5000"
              min="10000"
              value={form.pan_required_threshold}
              onChange={handleChange}
              className="input-field font-mono text-sm py-2.5 font-bold text-zinc-200"
              required
            />
            <span className="text-[11px] text-zinc-500 mt-1 block">Default: ₹50,000 active exposure</span>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="btn-primary px-8 py-3.5 text-sm font-bold shadow-xl shadow-amber-500/20 cursor-pointer inline-flex items-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving Settings...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save System Settings
            </>
          )}
        </button>
      </div>
    </form>
  );
}
