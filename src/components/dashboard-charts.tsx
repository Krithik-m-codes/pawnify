"use client";

import React, { useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { motion } from "framer-motion";
import { Coins, ShieldAlert, Sparkles, PieChart as PieIcon, BarChart3 } from "lucide-react";

interface DashboardChartsProps {
  data: {
    metalBreakdown: Array<{ name: string; count: number; value: number; fill: string }>;
    statusBreakdown: Array<{ name: string; count: number; value: number; fill: string }>;
    monthlyTrend: Array<{ month: string; disbursed: number; collected: number }>;
  };
}

interface TooltipPayloadItem {
  name: string;
  value: number;
  color?: string;
  fill?: string;
  payload: {
    count?: number;
    fill?: string;
  };
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}

const formatINR = (val: number) => {
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
  if (val >= 1000) return `₹${(val / 1000).toFixed(1)}k`;
  return `₹${val}`;
};

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#10121D]/95 backdrop-blur-xl border border-white/15 p-3 rounded-xl shadow-2xl text-xs space-y-1.5 min-w-[160px]">
        <p className="font-bold text-zinc-200 border-b border-white/10 pb-1 mb-1">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 font-medium text-zinc-400">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              {entry.name}:
            </span>
            <span className="font-bold text-zinc-100">
              {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(entry.value)}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const CustomPieTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const entry = payload[0];
    return (
      <div className="bg-[#10121D]/95 backdrop-blur-xl border border-white/15 p-3 rounded-xl shadow-2xl text-xs space-y-1 min-w-[140px]">
        <div className="flex items-center gap-2 font-bold text-zinc-200">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.payload.fill || entry.fill }} />
          {entry.name}
        </div>
        <p className="text-zinc-400">
          Valuation: <span className="font-bold text-amber-400">{new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(entry.value)}</span>
        </p>
        <p className="text-zinc-400">
          Accounts: <span className="font-bold text-zinc-100">{entry.payload.count} loans</span>
        </p>
      </div>
    );
  }
  return null;
};

export function DashboardCharts({ data }: DashboardChartsProps) {
  const [activeTab, setActiveTab] = useState<"trend" | "portfolio">("trend");

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass-card p-6 mb-8 border border-white/10"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              Portfolio Analytics & Trends
            </h3>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Visualizing disbursement volume, collection velocity, and metal collateral valuation.
          </p>
        </div>

        <div className="flex items-center bg-[#10121D] p-1 rounded-xl border border-white/10">
          <button
            onClick={() => setActiveTab("trend")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "trend"
                ? "bg-gradient-to-r from-amber-500/20 to-amber-500/10 text-amber-400 border border-amber-500/30 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Cashflow Trends
          </button>
          <button
            onClick={() => setActiveTab("portfolio")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "portfolio"
                ? "bg-gradient-to-r from-amber-500/20 to-amber-500/10 text-amber-400 border border-amber-500/30 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <PieIcon className="w-3.5 h-3.5" />
            Collateral & Status
          </button>
        </div>
      </div>

      {activeTab === "trend" ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-zinc-400 px-2">
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-amber-500 inline-block" /> Disbursed Principal
            </span>
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-emerald-500 inline-block" /> Collected Payments
            </span>
          </div>
          <div className="h-[300px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.monthlyTrend} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorDisbursed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FACC15" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#FACC15" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorCollected" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" stroke="#6E789F" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#6E789F" fontSize={11} tickFormatter={formatINR} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="disbursed" name="Disbursed" stroke="#FACC15" strokeWidth={2.5} fillOpacity={1} fill="url(#colorDisbursed)" />
                <Area type="monotone" dataKey="collected" name="Collected" stroke="#10B981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCollected)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Metal Breakdown */}
          <div className="bg-[#10121D]/60 p-4 rounded-xl border border-white/5 flex flex-col items-center">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2 self-start flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              Collateral Value by Metal Type
            </h4>
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.metalBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {data.metalBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} stroke="rgba(255,255,255,0.1)" strokeWidth={1} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center gap-6 text-xs mt-2 w-full justify-center">
              {data.metalBreakdown.map((m) => (
                <div key={m.name} className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: m.fill }} />
                  <span className="text-zinc-300 font-medium">{m.name}:</span>
                  <span className="font-bold text-white">{m.count} ({formatINR(m.value)})</span>
                </div>
              ))}
            </div>
          </div>

          {/* Status Breakdown */}
          <div className="bg-[#10121D]/60 p-4 rounded-xl border border-white/5 flex flex-col items-center">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2 self-start flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-emerald-400" />
              Loan Account Status Distribution
            </h4>
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.statusBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {data.statusBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} stroke="rgba(255,255,255,0.1)" strokeWidth={1} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs mt-2 w-full justify-center">
              {data.statusBreakdown.map((s) => (
                <div key={s.name} className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: s.fill }} />
                  <span className="text-zinc-300 font-medium">{s.name}:</span>
                  <span className="font-bold text-white">{s.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
