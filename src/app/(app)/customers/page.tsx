import React from "react";
import Link from "next/link";
import { getCustomers } from "@/lib/services/customers";
import { PageHeader } from "@/components/page-header";
import {
  Users,
  Plus,
  Search,
  Phone,
  MapPin,
  ShieldCheck,
  ShieldAlert,
  Clock,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
} from "lucide-react";

export const metadata = {
  title: "Customers Directory | Pawnify",
};

interface PageProps {
  searchParams: Promise<{
    search?: string;
    page?: string;
  }>;
}

export default async function CustomersListPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const search = resolvedParams.search || "";
  const page = parseInt(resolvedParams.page || "1", 10);

  const { customers, total, totalPages } = await getCustomers({
    search,
    page,
    pageSize: 15,
  });

  const getKycBadge = (docs: Array<{ status: string }>) => {
    if (docs.length === 0) {
      return (
        <span className="badge-pending text-[10px] px-2 py-0.5 rounded-full inline-flex items-center gap-1 font-medium">
          <Clock className="w-3 h-3" />
          No KYC Docs
        </span>
      );
    }
    const hasVerified = docs.some((d) => d.status === "VERIFIED");
    const hasRejected = docs.some((d) => d.status === "REJECTED");

    if (hasVerified) {
      return (
        <span className="badge-verified text-[10px] px-2 py-0.5 rounded-full inline-flex items-center gap-1 font-semibold">
          <ShieldCheck className="w-3 h-3" />
          Verified KYC
        </span>
      );
    }
    if (hasRejected) {
      return (
        <span className="badge-rejected text-[10px] px-2 py-0.5 rounded-full inline-flex items-center gap-1 font-semibold">
          <ShieldAlert className="w-3 h-3" />
          Rejected
        </span>
      );
    }
    return (
      <span className="badge-pending text-[10px] px-2 py-0.5 rounded-full inline-flex items-center gap-1 font-medium">
        <Clock className="w-3 h-3" />
        Pending Review
      </span>
    );
  };

  return (
    <div>
      <PageHeader
        title="Customer Profiles & KYC"
        description="Manage customer profiles, verify identity documents (Aadhaar, PAN), and check historical loan records."
        action={
          <Link
            href="/customers/new"
            className="btn-primary text-xs px-4 py-2.5 shadow-md shadow-amber-500/10"
          >
            <Plus className="w-4 h-4" />
            Register Customer
          </Link>
        }
      />

      {/* Search & Filter Bar */}
      <div className="glass-card p-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <form method="get" className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            name="search"
            defaultValue={search}
            placeholder="Search by name, phone or email..."
            className="input-field pl-10 text-xs py-2"
          />
        </form>
        <div className="text-xs text-zinc-400 self-end sm:self-center">
          Showing <span className="font-bold text-zinc-200">{customers.length}</span> of{" "}
          <span className="font-bold text-zinc-200">{total}</span> customers
        </div>
      </div>

      {/* Customers Table */}
      <div className="glass-card overflow-hidden">
        {customers.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-zinc-900 flex items-center justify-center text-zinc-600">
              <Users className="w-6 h-6" />
            </div>
            <div className="text-base font-medium text-zinc-300">
              No customers found
            </div>
            <p className="text-xs text-zinc-500 max-w-md">
              {search
                ? `No results matching "${search}". Try searching with a different phone number or name.`
                : "Get started by registering your very first customer profile."}
            </p>
            {search && (
              <Link href="/customers" className="btn-secondary text-xs mt-2">
                Clear Search
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Customer Profile</th>
                  <th>Contact Info</th>
                  <th>Location</th>
                  <th>Active Loans</th>
                  <th>KYC Status</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700/60 flex items-center justify-center font-bold text-amber-400 text-sm shrink-0">
                          {c.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <Link
                            href={`/customers/${c.id}`}
                            className="font-semibold text-zinc-200 hover:text-amber-400 transition-colors"
                          >
                            {c.fullName}
                          </Link>
                          {c.email && (
                            <div className="text-[11px] text-zinc-500 truncate max-w-[180px]">
                              {c.email}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5 font-mono text-xs text-zinc-300">
                        <Phone className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                        {c.phone}
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                        <MapPin className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                        <span>{c.city}, {c.state}</span>
                      </div>
                    </td>
                    <td>
                      <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-bold text-zinc-200">
                        {c._count.loans}
                      </span>
                    </td>
                    <td>{getKycBadge(c.kycDocuments)}</td>
                    <td className="text-right">
                      <Link
                        href={`/customers/${c.id}`}
                        className="btn-secondary text-xs px-3 py-1.5 inline-flex items-center gap-1"
                      >
                        View Profile
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <div className="text-xs text-zinc-400">
            Page <span className="font-bold text-zinc-200">{page}</span> of{" "}
            <span className="font-bold text-zinc-200">{totalPages}</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/customers?page=${Math.max(1, page - 1)}${
                search ? `&search=${search}` : ""
              }`}
              className={`btn-secondary text-xs px-3 py-1.5 ${
                page <= 1 ? "pointer-events-none opacity-40" : ""
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              Prev
            </Link>
            <Link
              href={`/customers?page=${Math.min(totalPages, page + 1)}${
                search ? `&search=${search}` : ""
              }`}
              className={`btn-secondary text-xs px-3 py-1.5 ${
                page >= totalPages ? "pointer-events-none opacity-40" : ""
              }`}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
