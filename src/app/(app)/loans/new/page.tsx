"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { createLoanAction } from "./actions";
import {
  Coins,
  Search,
  Plus,
  Trash2,
  AlertCircle,
  Loader2,
  CheckCircle2,
  ArrowLeft,
  User,
  Scale,
  Calculator,
  ShieldCheck,
  Calendar,
  Percent,
} from "lucide-react";

interface CustomerSearchResult {
  id: string;
  fullName: string;
  phone: string;
  city: string;
}

interface LoanItemForm {
  metalType: "GOLD" | "SILVER";
  description: string;
  purityLabel: string;
  purityPercent: number;
  grossWeightGrams: number;
  stoneWeightGrams: number;
  valuationRatePerGram: number;
  packetNumber: string;
  storageLocation: string;
}

function NewLoanForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCustomerId = searchParams.get("customerId") || "";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Customer Search State
  const [customerQuery, setCustomerQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CustomerSearchResult[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSearchResult | null>(null);
  const [searching, setSearching] = useState(false);

  // Initial Customer Fetch if URL param exists
  useEffect(() => {
    if (initialCustomerId && !selectedCustomer) {
      fetch(`/api/customers/search?q=${initialCustomerId}`)
        .then((res) => res.json())
        .then((data: CustomerSearchResult[]) => {
          if (data && data.length > 0) {
            setSelectedCustomer(data[0]);
          }
        })
        .catch(console.error);
    }
  }, [initialCustomerId, selectedCustomer]);

  // Customer Typeahead
  useEffect(() => {
    if (customerQuery.length < 2) {
      const t = setTimeout(() => setSearchResults([]), 0);
      return () => clearTimeout(t);
    }
    const timer = setTimeout(() => {
      setSearching(true);
      fetch(`/api/customers/search?q=${encodeURIComponent(customerQuery)}`)
        .then((res) => res.json())
        .then((data) => {
          setSearchResults(Array.isArray(data) ? data : []);
          setSearching(false);
        })
        .catch(() => setSearching(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [customerQuery]);

  // Collateral Items State
  const [items, setItems] = useState<LoanItemForm[]>(() => [
    {
      metalType: "GOLD",
      description: "22K Gold Chain",
      purityLabel: "22K",
      purityPercent: 91.6,
      grossWeightGrams: 20,
      stoneWeightGrams: 0,
      valuationRatePerGram: 7500,
      packetNumber: `PKT-${Date.now().toString().slice(-4)}`,
      storageLocation: "Vault A / Rack 1 / Shelf 1",
    },
  ]);

  // Loan Terms State
  const [tenureMonths, setTenureMonths] = useState(6);
  const [interestRateMonthly, setInterestRateMonthly] = useState(1.5);
  const [principalAmount, setPrincipalAmount] = useState(100000);
  const [processingFee, setProcessingFee] = useState(500);
  const [gracePeriodDays, setGracePeriodDays] = useState(7);

  // Purity presets helper
  const handlePurityChange = (index: number, label: string) => {
    const updated = [...items];
    updated[index].purityLabel = label;
    if (label === "24K") updated[index].purityPercent = 99.9;
    else if (label === "22K") updated[index].purityPercent = 91.6;
    else if (label === "18K") updated[index].purityPercent = 75.0;
    else if (label === "14K") updated[index].purityPercent = 58.5;
    else if (label === "Fine Silver") updated[index].purityPercent = 99.9;
    else if (label === "Sterling Silver") updated[index].purityPercent = 92.5;
    setItems(updated);
  };

  const handleItemChange = (index: number, field: keyof LoanItemForm, val: string | number) => {
    const updated = [...items];
    if (field === "metalType") {
      const metal = val as "GOLD" | "SILVER";
      updated[index].metalType = metal;
      if (metal === "GOLD") {
        updated[index].purityLabel = "22K";
        updated[index].purityPercent = 91.6;
        updated[index].valuationRatePerGram = 7500;
      } else {
        updated[index].purityLabel = "Sterling Silver";
        updated[index].purityPercent = 92.5;
        updated[index].valuationRatePerGram = 95;
      }
    } else {
      // @ts-expect-error dynamic field update
      updated[index][field] = val;
    }
    setItems(updated);
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        metalType: "GOLD",
        description: "22K Gold Bangle",
        purityLabel: "22K",
        purityPercent: 91.6,
        grossWeightGrams: 15,
        stoneWeightGrams: 0,
        valuationRatePerGram: 7500,
        packetNumber: `PKT-${Math.floor(1000 + Math.random() * 9000)}`,
        storageLocation: "Vault A / Rack 1 / Shelf 2",
      },
    ]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  // Live Valuation & LTV Slabs Calculation (§6.1 / §6.2)
  const computeTotals = () => {
    let totalAssessed = 0;
    for (const item of items) {
      const netWeight = Math.max(0, item.grossWeightGrams - item.stoneWeightGrams);
      const fineWeight = (netWeight * item.purityPercent) / 100;
      const assessed = fineWeight * item.valuationRatePerGram;
      totalAssessed += assessed;
    }

    let ltvPercent = 85;
    if (totalAssessed > 500000) {
      ltvPercent = 75;
    } else if (totalAssessed > 250000) {
      ltvPercent = 80;
    }

    const eligibleAmount = Math.floor((totalAssessed * ltvPercent) / 100);
    return { totalAssessed, ltvPercent, eligibleAmount };
  };

  const { totalAssessed, ltvPercent, eligibleAmount } = computeTotals();

  // Auto-set principal to eligible amount when items change if principal exceeds eligible
  useEffect(() => {
    if (principalAmount > eligibleAmount && eligibleAmount > 0) {
      const t = setTimeout(() => setPrincipalAmount(eligibleAmount), 0);
      return () => clearTimeout(t);
    }
  }, [eligibleAmount, principalAmount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) {
      setError("Please select a registered customer profile");
      return;
    }
    if (principalAmount > eligibleAmount) {
      setError(`Principal cannot exceed eligible amount (₹${eligibleAmount.toLocaleString("en-IN")})`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await createLoanAction({
        customerId: selectedCustomer.id,
        items,
        tenureMonths: Number(tenureMonths),
        interestRateMonthly: Number(interestRateMonthly),
        principalAmount: Number(principalAmount),
        processingFee: Number(processingFee),
        gracePeriodDays: Number(gracePeriodDays),
      });

      if (!res.success) {
        setError(res.error || "Failed to disburse loan");
        setLoading(false);
        return;
      }

      router.push(`/loans/${res.loanId}`);
      router.refresh();
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred");
      setLoading(false);
    }
  };

  const formatINR = (num: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(num);
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-4">
        <Link
          href="/loans"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-amber-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Loans Directory
        </Link>
      </div>

      <PageHeader
        title="Disburse New Loan Contract"
        description="Select customer, record pledged gold/silver items, check RBI-compliant LTV slabs, and issue disbursal."
      />

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-red-400 text-sm animate-fadeIn">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Step 1: Customer Selection */}
        <div className="glass-card p-6 sm:p-8 space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-zinc-800/80">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-amber-400" />
              <h2 className="text-base font-semibold text-zinc-100">
                Step 1: Customer Selection
              </h2>
            </div>
            <Link
              href="/customers/new"
              className="text-xs font-medium text-amber-400 hover:underline"
            >
              + Register New Customer
            </Link>
          </div>

          {selectedCustomer ? (
            <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/15 to-amber-500/5 border border-amber-500/30 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-base shrink-0">
                  {selectedCustomer.fullName.charAt(0)}
                </div>
                <div>
                  <div className="font-bold text-sm text-zinc-100">
                    {selectedCustomer.fullName}
                  </div>
                  <div className="text-xs text-zinc-400 font-mono">
                    {selectedCustomer.phone} • {selectedCustomer.city}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="btn-secondary text-xs px-3 py-1.5"
              >
                Change
              </button>
            </div>
          ) : (
            <div className="relative">
              <div className="relative">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={customerQuery}
                  onChange={(e) => setCustomerQuery(e.target.value)}
                  placeholder="Type customer name or phone number to search..."
                  className="input-field pl-10 text-sm py-3"
                />
              </div>

              {searching && (
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-zinc-500">
                  Searching...
                </div>
              )}

              {searchResults.length > 0 && (
                <div className="absolute left-0 right-0 mt-1 p-2 rounded-xl bg-zinc-900 border border-zinc-800 shadow-2xl z-20 max-h-60 overflow-y-auto space-y-1">
                  {searchResults.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setSelectedCustomer(c);
                        setCustomerQuery("");
                        setSearchResults([]);
                      }}
                      className="w-full p-2.5 rounded-lg hover:bg-zinc-800 text-left flex items-center justify-between transition-colors"
                    >
                      <div>
                        <div className="font-semibold text-xs text-zinc-200">
                          {c.fullName}
                        </div>
                        <div className="text-[11px] text-zinc-500 font-mono">
                          {c.phone} • {c.city}
                        </div>
                      </div>
                      <span className="text-[10px] text-amber-400 font-semibold px-2 py-0.5 rounded bg-amber-500/10">
                        Select
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Step 2: Collateral Items Builder */}
        <div className="glass-card p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-zinc-800/80">
            <div className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-amber-400" />
              <h2 className="text-base font-semibold text-zinc-100">
                Step 2: Pledged Collateral Items ({items.length})
              </h2>
            </div>
            <button
              type="button"
              onClick={addItem}
              className="btn-secondary text-xs px-3.5 py-1.5 flex items-center gap-1.5 text-amber-400 border-amber-500/30"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Another Item
            </button>
          </div>

          <div className="space-y-6">
            {items.map((item, idx) => {
              const netWeight = Math.max(0, item.grossWeightGrams - item.stoneWeightGrams);
              const fineWeight = (netWeight * item.purityPercent) / 100;
              const assessed = fineWeight * item.valuationRatePerGram;

              return (
                <div
                  key={idx}
                  className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800/80 space-y-4 relative group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-bold text-xs flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                        Item #{idx + 1} • Valued at{" "}
                        <span className="text-amber-400 font-bold">
                          {formatINR(assessed)}
                        </span>
                      </span>
                    </div>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div>
                      <label className="input-label">Metal Type</label>
                      <select
                        value={item.metalType}
                        onChange={(e) => handleItemChange(idx, "metalType", e.target.value)}
                        className="input-field bg-zinc-950 text-xs py-2"
                      >
                        <option value="GOLD">Gold</option>
                        <option value="SILVER">Silver</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="input-label">Description</label>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => handleItemChange(idx, "description", e.target.value)}
                        placeholder="e.g. 22K Gold Necklace"
                        className="input-field text-xs py-2"
                        required
                      />
                    </div>

                    <div>
                      <label className="input-label">Purity Label</label>
                      <select
                        value={item.purityLabel}
                        onChange={(e) => handlePurityChange(idx, e.target.value)}
                        className="input-field bg-zinc-950 text-xs py-2"
                      >
                        {item.metalType === "GOLD" ? (
                          <>
                            <option value="24K">24K (99.9%)</option>
                            <option value="22K">22K (91.6%)</option>
                            <option value="18K">18K (75.0%)</option>
                            <option value="14K">14K (58.5%)</option>
                          </>
                        ) : (
                          <>
                            <option value="Fine Silver">Fine Silver (99.9%)</option>
                            <option value="Sterling Silver">Sterling Silver (92.5%)</option>
                          </>
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="input-label">Gross Weight (g) *</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.1"
                        value={item.grossWeightGrams}
                        onChange={(e) => handleItemChange(idx, "grossWeightGrams", Number(e.target.value))}
                        className="input-field font-mono text-xs py-2"
                        required
                      />
                    </div>

                    <div>
                      <label className="input-label">Stone/Wax Weight (g)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.stoneWeightGrams}
                        onChange={(e) => handleItemChange(idx, "stoneWeightGrams", Number(e.target.value))}
                        className="input-field font-mono text-xs py-2"
                      />
                    </div>

                    <div>
                      <label className="input-label">Rate per Gram (₹) *</label>
                      <input
                        type="number"
                        step="1"
                        min="1"
                        value={item.valuationRatePerGram}
                        onChange={(e) => handleItemChange(idx, "valuationRatePerGram", Number(e.target.value))}
                        className="input-field font-mono text-xs py-2"
                        required
                      />
                    </div>

                    <div>
                      <label className="input-label">Net & Fine Weight</label>
                      <div className="p-2 rounded-lg bg-zinc-950 border border-zinc-800 text-[11px] font-mono text-zinc-400 flex items-center justify-between">
                        <span>Net: <b className="text-zinc-200">{netWeight.toFixed(2)}g</b></span>
                        <span>Fine: <b className="text-amber-400">{fineWeight.toFixed(2)}g</b></span>
                      </div>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="input-label">Packet No. (Secure Tag) *</label>
                      <input
                        type="text"
                        value={item.packetNumber}
                        onChange={(e) => handleItemChange(idx, "packetNumber", e.target.value)}
                        placeholder="PKT-001"
                        className="input-field font-mono text-xs py-2"
                        required
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="input-label">Storage Location in Vault *</label>
                      <input
                        type="text"
                        value={item.storageLocation}
                        onChange={(e) => handleItemChange(idx, "storageLocation", e.target.value)}
                        placeholder="Vault A / Rack 1 / Shelf 2"
                        className="input-field text-xs py-2"
                        required
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step 3: LTV Eligibility & Loan Terms */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left 2 Cols: Loan Terms */}
          <div className="lg:col-span-2 glass-card p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-2 pb-4 border-b border-zinc-800/80">
              <Coins className="w-5 h-5 text-amber-400" />
              <h2 className="text-base font-semibold text-zinc-100">
                Step 3: Loan Terms & Disbursal
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="input-label mb-0" htmlFor="principalAmount">
                    Principal Disbursal Amount (₹) *
                  </label>
                  <button
                    type="button"
                    onClick={() => setPrincipalAmount(eligibleAmount)}
                    className="text-xs font-semibold text-amber-400 hover:underline cursor-pointer"
                  >
                    Set Max Eligible (₹{eligibleAmount.toLocaleString("en-IN")})
                  </button>
                </div>
                <input
                  id="principalAmount"
                  type="number"
                  step="100"
                  min="1000"
                  max={eligibleAmount}
                  value={principalAmount}
                  onChange={(e) => setPrincipalAmount(Number(e.target.value))}
                  className="input-field font-mono text-lg font-bold text-amber-400 py-3"
                  required
                />
                <span className="text-[11px] text-zinc-500 mt-1 block">
                  Cannot exceed eligible amount based on {ltvPercent}% RBI LTV slab.
                </span>
              </div>

              <div>
                <label className="input-label flex items-center gap-1" htmlFor="tenureMonths">
                  <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                  Tenure (Months) *
                </label>
                <select
                  id="tenureMonths"
                  value={tenureMonths}
                  onChange={(e) => setTenureMonths(Number(e.target.value))}
                  className="input-field bg-zinc-950 text-sm py-2.5"
                >
                  <option value={1}>1 Month</option>
                  <option value={3}>3 Months</option>
                  <option value={6}>6 Months (Recommended)</option>
                  <option value={9}>9 Months</option>
                  <option value={12}>12 Months (Max RBI Cap)</option>
                </select>
              </div>

              <div>
                <label className="input-label flex items-center gap-1" htmlFor="interestRate">
                  <Percent className="w-3.5 h-3.5 text-zinc-400" />
                  Monthly Interest Rate (%) *
                </label>
                <input
                  id="interestRate"
                  type="number"
                  step="0.05"
                  min="0.5"
                  max="5"
                  value={interestRateMonthly}
                  onChange={(e) => setInterestRateMonthly(Number(e.target.value))}
                  className="input-field font-mono text-sm py-2.5"
                  required
                />
                <span className="text-[11px] text-zinc-500 mt-0.5 block">
                  Simple interest, Actual/365 convention
                </span>
              </div>

              <div>
                <label className="input-label" htmlFor="fee">
                  Processing Fee (₹)
                </label>
                <input
                  id="fee"
                  type="number"
                  step="50"
                  min="0"
                  value={processingFee}
                  onChange={(e) => setProcessingFee(Number(e.target.value))}
                  className="input-field font-mono text-sm py-2.5"
                />
              </div>

              <div>
                <label className="input-label" htmlFor="grace">
                  Grace Period (Days)
                </label>
                <input
                  id="grace"
                  type="number"
                  step="1"
                  min="0"
                  max="30"
                  value={gracePeriodDays}
                  onChange={(e) => setGracePeriodDays(Number(e.target.value))}
                  className="input-field font-mono text-sm py-2.5"
                />
              </div>
            </div>
          </div>

          {/* Right 1 Col: Live LTV & Summary Card */}
          <div className="space-y-6">
            <div className="kpi-card border-amber-500/30 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Calculator className="w-4 h-4" />
                  RBI LTV Valuation Slab
                </span>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400 text-xs">Total Assessed Value</span>
                  <span className="font-bold text-zinc-100">{formatINR(totalAssessed)}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-zinc-400 text-xs">Applicable LTV Slab</span>
                  <span className="font-bold text-amber-400 px-2 py-0.5 rounded bg-amber-500/10 text-xs">
                    {ltvPercent}%
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                  <span className="text-zinc-300 font-semibold text-xs">Max Eligible Loan</span>
                  <span className="font-bold text-base text-emerald-400">{formatINR(eligibleAmount)}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-zinc-300 font-semibold text-xs">Requested Disbursal</span>
                  <span className="font-bold text-base text-amber-400">{formatINR(principalAmount)}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 text-[11px] text-zinc-400 space-y-1">
                <div className="font-semibold text-zinc-300 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Tiered LTV Rules Applied (§6.2)
                </div>
                <div>• ≤ ₹2,50,000 : 85% LTV Cap</div>
                <div>• ₹2,50,001 - ₹5,00,000 : 80% LTV Cap</div>
                <div>• &gt; ₹5,00,000 : 75% LTV Cap</div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !selectedCustomer || principalAmount > eligibleAmount || principalAmount <= 0}
              className="btn-primary w-full py-4 text-base font-bold shadow-xl shadow-amber-500/20 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Disbursing Loan...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  Confirm & Disburse Loan
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default function NewLoanPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-zinc-500"><Loader2 className="w-8 h-8 animate-spin mx-auto text-amber-400" /></div>}>
      <NewLoanForm />
    </Suspense>
  );
}

