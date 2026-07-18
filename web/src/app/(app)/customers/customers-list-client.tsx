"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Plus, Search } from "lucide-react";
import { CustomersTable, CustomerRowData } from "./customers-table";
import { useGetCustomersQuery } from "@/lib/redux/api/customersApi";

function CustomersListContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const search = searchParams.get("search") || "";

  const { data, isFetching } = useGetCustomersQuery({
    search,
    page: 1,
    pageSize: 100,
  });

  const customers = data?.customers ?? [];
  const total = data?.total ?? 0;

  const formattedCustomers: CustomerRowData[] = customers.map((c) => ({
    id: c.id,
    fullName: c.fullName,
    email: c.email,
    phone: c.phone,
    city: c.city,
    state: c.state,
    _count: {
      loans: c._count.loans,
    },
    kycDocuments: c.kycDocuments.map((d) => ({ status: d.status })),
  }));

  const handleFilterSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const params = new URLSearchParams();
    const newSearch = form.get("search")?.toString() || "";
    if (newSearch) params.set("search", newSearch);
    router.push(`/customers?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customer Profiles & KYC"
        description="Manage customer profiles, verify identity documents (Aadhaar, PAN), and check historical loan records."
        action={
          <Link
            href="/customers/new"
            className="btn-primary text-xs px-4 py-2.5 shadow-md shadow-emerald-500/10 inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Register Customer
          </Link>
        }
      />

      {/* Search & Filter Bar */}
      <div
        className="glass-card p-4 flex flex-col sm:flex-row items-center justify-between gap-4"
        style={{ borderColor: "var(--border-card)" }}
      >
        <form onSubmit={handleFilterSubmit} className="relative w-full sm:w-80">
          <Search
            className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: "var(--text-muted)" }}
          />
          <input
            name="search"
            defaultValue={search}
            placeholder="Search by name, phone or email..."
            className="input-field pl-10 text-xs py-2 w-full"
          />
        </form>
        <div className="text-xs self-end sm:self-center" style={{ color: "var(--text-tertiary)" }}>
          Showing{" "}
          <span className="font-bold" style={{ color: "var(--text-primary)" }}>
            {formattedCustomers.length}
          </span>{" "}
          of{" "}
          <span className="font-bold" style={{ color: "var(--text-primary)" }}>
            {total}
          </span>{" "}
          customers
        </div>
      </div>

      <CustomersTable data={formattedCustomers} isLoading={isFetching} />
    </div>
  );
}

export function CustomersListClient() {
  return (
    <Suspense fallback={null}>
      <CustomersListContent />
    </Suspense>
  );
}
