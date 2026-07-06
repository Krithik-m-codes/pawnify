"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { createCustomerAction } from "./actions";
import {
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
} from "lucide-react";

export default function NewCustomerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    email: "",
    dob: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "Tamil Nadu",
    pincode: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Basic client check for Indian phone
    if (!/^[6-9]\d{9}$/.test(formData.phone)) {
      setError("Please enter a valid 10-digit Indian mobile number starting with 6-9");
      setLoading(false);
      return;
    }

    try {
      const res = await createCustomerAction(formData);
      if (!res.success) {
        setError(res.error || "Failed to create customer");
        setLoading(false);
        return;
      }

      router.push(`/customers/${res.customerId}`);
      router.refresh();
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred");
      setLoading(false);
    }
  };

  const indianStates = [
    "Andhra Pradesh", "Assam", "Bihar", "Chhattisgarh", "Delhi", "Gujarat",
    "Haryana", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
    "Maharashtra", "Odisha", "Punjab", "Rajasthan", "Tamil Nadu",
    "Telangana", "Uttar Pradesh", "West Bengal",
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-4">
        <Link
          href="/customers"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-amber-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Customers List
        </Link>
      </div>

      <PageHeader
        title="Register New Customer"
        description="Enter verified KYC and contact information to create a customer profile for loan disbursal."
      />

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-red-400 text-sm animate-fadeIn">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Details Card */}
        <div className="glass-card p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-2 pb-4 border-b border-zinc-800/80">
            <User className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-semibold text-zinc-100">
              Personal Information
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="sm:col-span-2">
              <label className="input-label flex items-center gap-1.5" htmlFor="fullName">
                Full Name (as per KYC document) *
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="e.g. Lakshmi Devi"
                className="input-field"
                required
              />
            </div>

            <div>
              <label className="input-label flex items-center gap-1.5" htmlFor="phone">
                <Phone className="w-3.5 h-3.5 text-zinc-400" />
                Mobile Number (10 digits) *
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                maxLength={10}
                value={formData.phone}
                onChange={handleChange}
                placeholder="9845012345"
                className="input-field font-mono"
                required
              />
              <span className="text-[11px] text-zinc-500 mt-1 block">
                Must start with 6, 7, 8, or 9
              </span>
            </div>

            <div>
              <label className="input-label flex items-center gap-1.5" htmlFor="email">
                <Mail className="w-3.5 h-3.5 text-zinc-400" />
                Email Address (Optional)
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="lakshmi@example.com"
                className="input-field"
              />
            </div>

            <div>
              <label className="input-label flex items-center gap-1.5" htmlFor="dob">
                <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                Date of Birth (Optional)
              </label>
              <input
                id="dob"
                name="dob"
                type="date"
                value={formData.dob}
                onChange={handleChange}
                className="input-field text-zinc-300"
              />
            </div>
          </div>
        </div>

        {/* Address Card */}
        <div className="glass-card p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-2 pb-4 border-b border-zinc-800/80">
            <MapPin className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-semibold text-zinc-100">
              Residential Address
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="sm:col-span-2">
              <label className="input-label" htmlFor="addressLine1">
                Address Line 1 (House/Flat No., Street/Area) *
              </label>
              <input
                id="addressLine1"
                name="addressLine1"
                type="text"
                value={formData.addressLine1}
                onChange={handleChange}
                placeholder="e.g. No. 12, Gandhi Nagar, 2nd Main Road"
                className="input-field"
                required
              />
            </div>

            <div className="sm:col-span-2">
              <label className="input-label" htmlFor="addressLine2">
                Address Line 2 (Landmark / Locality - Optional)
              </label>
              <input
                id="addressLine2"
                name="addressLine2"
                type="text"
                value={formData.addressLine2}
                onChange={handleChange}
                placeholder="Near Shiva Temple"
                className="input-field"
              />
            </div>

            <div>
              <label className="input-label" htmlFor="city">
                City / Town *
              </label>
              <input
                id="city"
                name="city"
                type="text"
                value={formData.city}
                onChange={handleChange}
                placeholder="Chennai"
                className="input-field"
                required
              />
            </div>

            <div>
              <label className="input-label" htmlFor="state">
                State *
              </label>
              <select
                id="state"
                name="state"
                value={formData.state}
                onChange={handleChange}
                className="input-field bg-zinc-900"
                required
              >
                {indianStates.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="input-label" htmlFor="pincode">
                Pincode (6 digits) *
              </label>
              <input
                id="pincode"
                name="pincode"
                type="text"
                maxLength={6}
                value={formData.pincode}
                onChange={handleChange}
                placeholder="600001"
                className="input-field font-mono"
                required
              />
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-4 pt-4">
          <Link
            href="/customers"
            className="btn-secondary px-6 py-2.5"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary px-8 py-2.5 shadow-lg shadow-amber-500/10 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Registering Customer...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Create Customer Profile
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
