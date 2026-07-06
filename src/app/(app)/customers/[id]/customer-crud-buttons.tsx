"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { updateCustomerDetailsAction, deleteCustomerAction } from "./actions";
import { Edit2, Trash2, Loader2, CheckCircle2, AlertCircle, X, Save } from "lucide-react";

interface CustomerCrudButtonsProps {
  customer: {
    id: string;
    fullName: string;
    phone: string;
    email: string | null;
    addressLine1: string;
    city: string;
    state: string;
    pincode: string;
  };
}

export function CustomerCrudButtons({ customer }: CustomerCrudButtonsProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    fullName: customer.fullName,
    phone: customer.phone,
    email: customer.email || "",
    addressLine1: customer.addressLine1,
    city: customer.city,
    state: customer.state,
    pincode: customer.pincode,
  });

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await updateCustomerDetailsAction(customer.id, formData);
    setLoading(false);

    if (res.error) {
      setError(res.error);
    } else {
      setEditOpen(false);
      router.refresh();
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    setError(null);

    const res = await deleteCustomerAction(customer.id);
    setLoading(false);

    if (res.error) {
      setError(res.error);
      setDeleteOpen(false);
    } else {
      router.push("/customers");
      router.refresh();
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => { setEditOpen(true); setError(null); }}
          className="btn-secondary text-xs px-3 py-2 flex items-center gap-1.5 cursor-pointer hover:border-emerald-500/40"
          title="Edit Customer Details"
        >
          <Edit2 className="w-3.5 h-3.5 text-emerald-400" />
          Edit Info
        </button>
        <button
          type="button"
          onClick={() => { setDeleteOpen(true); setError(null); }}
          className="btn-secondary text-xs px-3 py-2 flex items-center gap-1.5 cursor-pointer hover:border-red-500/40 text-red-400"
          title="Delete Customer Profile"
        >
          <Trash2 className="w-3.5 h-3.5 text-red-500" />
          Delete
        </button>
      </div>

      {/* Edit Modal */}
      {editOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/35 dark:bg-black/45 backdrop-blur-md animate-fadeIn">
          <div className="glass-card w-full max-w-lg p-6 space-y-4 bg-zinc-950 border-emerald-500/30">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="font-bold text-base text-zinc-100 flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-emerald-400" />
                Edit Customer Details
              </h3>
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleUpdate} className="space-y-3 text-xs">
              <div>
                <label className="input-label">Full Name *</label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="input-field py-2"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="input-label">Phone Number *</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="input-field py-2 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="input-label">Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="input-field py-2"
                  />
                </div>
              </div>

              <div>
                <label className="input-label">Address Line 1 *</label>
                <input
                  type="text"
                  value={formData.addressLine1}
                  onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                  className="input-field py-2"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="input-label">City *</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="input-field py-2"
                    required
                  />
                </div>
                <div>
                  <label className="input-label">State *</label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="input-field py-2"
                    required
                  />
                </div>
                <div>
                  <label className="input-label">Pincode *</label>
                  <input
                    type="text"
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                    className="input-field py-2 font-mono"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  className="btn-secondary px-4 py-2 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary px-5 py-2 text-xs cursor-pointer"
                >
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/35 dark:bg-black/45 backdrop-blur-md animate-fadeIn">
          <div className="glass-card w-full max-w-md p-6 space-y-4 bg-zinc-950 border-red-500/40">
            <div className="flex items-center gap-3 text-red-400 font-bold text-base">
              <Trash2 className="w-5 h-5" />
              <span>Confirm Customer Deletion</span>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Are you sure you want to permanently delete <strong className="text-white">{customer.fullName}</strong>? This action cannot be undone and will remove all KYC documents and history.
            </p>
            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteOpen(false)}
                className="btn-secondary px-4 py-2 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                Delete Forever
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
