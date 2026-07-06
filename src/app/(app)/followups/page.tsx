import React from "react";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { NewFollowUpModal, FollowUpStatusButton, DeleteFollowUpButton } from "./followup-client";
import {
  CalendarCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  User,
  Phone,
  ArrowRight,
} from "lucide-react";

export const metadata = {
  title: "Follow-up Tasks & Reminders | Pawnify",
};

interface PageProps {
  searchParams: Promise<{
    tab?: string;
  }>;
}

export default async function FollowUpsPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const tab = resolvedParams.tab || "PENDING";

  const [followUps, activeLoans] = await Promise.all([
    prisma.followUp.findMany({
      where: tab === "DONE" ? { status: "DONE" } : { status: "PENDING" },
      include: {
        loan: {
          select: {
            id: true,
            loanNumber: true,
            principalOutstanding: true,
            dueDate: true,
            customer: { select: { fullName: true, phone: true } },
          },
        },
        assignedTo: { select: { name: true } },
      },
      orderBy: { dueDate: "asc" },
    }),
    prisma.loan.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        loanNumber: true,
        customer: { select: { fullName: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const activeLoanOptions = activeLoans.map((l) => ({
    id: l.id,
    loanNumber: l.loanNumber,
    customerName: l.customer.fullName,
  }));

  const formatDate = (dateString: Date) => {
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(dateString));
  };

  const formatINR = (val: string | number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(typeof val === "string" ? parseFloat(val) : val);
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div>
      <PageHeader
        title="Follow-up Tasks & Reminders"
        description="Track customer communications, overdue interest recovery calls, and maturity notices."
        action={<NewFollowUpModal loans={activeLoanOptions} />}
      />

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-6 border-b border-zinc-800 pb-4">
        <Link
          href="/followups?tab=PENDING"
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            tab === "PENDING"
              ? "bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20"
              : "bg-zinc-900 text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Pending Action Items
        </Link>
        <Link
          href="/followups?tab=DONE"
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            tab === "DONE"
              ? "bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20"
              : "bg-zinc-900 text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Completed Reminders
        </Link>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {followUps.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-zinc-900 flex items-center justify-center text-zinc-600">
              <CalendarCheck className="w-6 h-6" />
            </div>
            <div className="text-base font-medium text-zinc-300">
              No {tab.toLowerCase()} tasks found
            </div>
            <p className="text-xs text-zinc-500 max-w-md">
              {tab === "PENDING"
                ? "All caught up! No pending reminder follow-ups currently scheduled."
                : "No completed follow-up records yet."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Target Date</th>
                  <th>Loan Contract</th>
                  <th>Customer Profile</th>
                  <th>Reminder Action Note</th>
                  <th>Assigned Staff</th>
                  <th className="text-right">Status Action</th>
                </tr>
              </thead>
              <tbody>
                {followUps.map((f) => {
                  const isOverdueTask = tab === "PENDING" && new Date(f.dueDate) < today;
                  return (
                    <tr key={f.id} className={isOverdueTask ? "bg-red-500/5" : ""}>
                      <td>
                        <div className={`font-semibold text-xs flex items-center gap-1.5 ${
                          isOverdueTask ? "text-red-400" : "text-zinc-200"
                        }`}>
                          {isOverdueTask && <AlertTriangle className="w-3.5 h-3.5" />}
                          {formatDate(f.dueDate)}
                        </div>
                        {isOverdueTask && (
                          <div className="text-[10px] text-red-400 font-medium">Overdue task</div>
                        )}
                      </td>
                      <td>
                        <Link
                          href={`/loans/${f.loanId}`}
                          className="font-mono text-xs font-semibold text-amber-400 hover:underline"
                        >
                          {f.loan.loanNumber}
                        </Link>
                        <div className="text-[11px] text-zinc-500 font-mono">
                          Due: {formatINR(f.loan.principalOutstanding.toString())}
                        </div>
                      </td>
                      <td>
                        <div className="font-medium text-zinc-200 text-sm">
                          {f.loan.customer.fullName}
                        </div>
                        <div className="font-mono text-xs text-zinc-500 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-zinc-600" />
                          {f.loan.customer.phone}
                        </div>
                      </td>
                      <td>
                        <div className="text-xs text-zinc-200 max-w-md font-sans">
                          {f.note}
                        </div>
                      </td>
                      <td>
                        <span className="text-xs text-zinc-400 font-medium">
                          {f.assignedTo?.name || "Unassigned"}
                        </span>
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <FollowUpStatusButton id={f.id} currentStatus={f.status} />
                          <DeleteFollowUpButton id={f.id} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
