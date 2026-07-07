"use client";

import React, { useState } from "react";
import { RefreshCw, Sparkles, Clock, ShieldCheck } from "lucide-react";
import { MarketRates } from "@/lib/services/market-rates";
import { useGetMarketRatesQuery } from "@/lib/redux/api/marketRatesApi";

const DEFAULT_RATES: MarketRates = {
  goldRatePerGram: 7850.0,
  silverRatePerGram: 98.5,
  lastUpdated: "Loading live spot...",
  safetyMarginPercent: 0,
  source: "Checking API...",
  ltvTier1Percent: 85,
  ltvTier2Percent: 80,
  ltvTier3Percent: 75,
  ltvTier1Max: 250000,
  ltvTier2Max: 500000,
  defaultInterestMonthly: 1.5,
  defaultGraceDays: 7,
  panThreshold: 50000,
};

export function LiveMarketTicker() {
  const { data, refetch } = useGetMarketRatesQuery(undefined, {
    pollingInterval: 15 * 60 * 1000,
  });
  const rates: MarketRates = data ?? DEFAULT_RATES;

  const [loading, setLoading] = useState(false);
  const [justUpdated, setJustUpdated] = useState(false);

  const triggerLiveUpdate = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/cron/update-rates", { method: "POST" });
      if (res.ok) {
        await refetch();
        setJustUpdated(true);
        setTimeout(() => setJustUpdated(false), 4000);
      }
    } catch (err) {
      console.error("Live update trigger error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="w-full px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-3 relative overflow-hidden"
      style={{
        background: "var(--bg-secondary)",
        borderBottom: "1px solid var(--border-primary)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div className="flex items-center gap-4 flex-wrap z-10">
        <div
          className="flex items-center gap-1.5 font-bold"
          style={{ color: "var(--accent-text)" }}
        >
          <Sparkles className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: "8s" }} />
          <span className="uppercase tracking-wider text-[11px]">Live Market Spot:</span>
        </div>

        <div
          className="flex items-center gap-2 px-2.5 py-1 rounded-md"
          style={{
            background: "var(--accent-bg)",
            border: "1px solid var(--accent-border)",
          }}
        >
          <span className="font-medium" style={{ color: "var(--text-secondary)" }}>
            Gold (24K):
          </span>
          <span className="font-mono font-bold" style={{ color: "var(--accent-text)" }}>
            ₹{rates.goldRatePerGram.toLocaleString("en-IN")}/g
          </span>
        </div>

        <div
          className="flex items-center gap-2 px-2.5 py-1 rounded-md"
          style={{
            background: "var(--bg-tertiary)",
            border: "1px solid var(--border-primary)",
          }}
        >
          <span className="font-medium" style={{ color: "var(--text-secondary)" }}>
            Silver (Fine):
          </span>
          <span className="font-mono font-bold" style={{ color: "var(--text-primary)" }}>
            ₹{rates.silverRatePerGram.toLocaleString("en-IN")}/g
          </span>
        </div>

        {rates.safetyMarginPercent > 0 && (
          <div
            className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px]"
            style={{
              background: "var(--accent-bg)",
              border: "1px solid var(--accent-border)",
              color: "var(--accent-text)",
            }}
          >
            <ShieldCheck className="w-3 h-3" />
            <span>
              Valuation Safety Haircut: <strong>-{rates.safetyMarginPercent}%</strong>
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 z-10">
        <div
          className="flex items-center gap-1.5 text-[11px]"
          style={{ color: "var(--text-muted)" }}
        >
          <Clock className="w-3 h-3" />
          <span className="hidden sm:inline">Updated:</span>
          <span
            className="font-mono truncate max-w-[160px] sm:max-w-none"
            style={{ color: "var(--text-tertiary)" }}
          >
            {rates.lastUpdated}
          </span>
        </div>

        <button
          type="button"
          onClick={triggerLiveUpdate}
          disabled={loading}
          className="btn-secondary text-[11px] px-2.5 py-1 inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          title="Force refresh from free public market API"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
          <span>{loading ? "Fetching..." : justUpdated ? "Updated!" : "Refresh Spot"}</span>
        </button>
      </div>
    </div>
  );
}
