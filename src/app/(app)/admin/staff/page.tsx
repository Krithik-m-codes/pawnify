import React from "react";
import { checkAuth } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { AddStaffModal, ToggleUserStatusButton } from "./staff-client";
import { ShieldCheck, CheckCircle2, XCircle, Clock } from "lucide-react";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Staff & User Management | Pawnify Admin",
};

export default async function StaffManagementPage() {
  const auth = await checkAuth();
  if (!auth.authenticated || auth.user?.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const users = await prisma.user.findMany({
    include: {
      _count: {
        select: {
          loansHandled: true,
          paymentsCollected: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(date));
  };

  return (
    <div>
      <PageHeader
        title="Staff & User Accounts Management"
        description="Admin panel to provision branch staff credentials, assign role privileges, and review activity counts."
        action={<AddStaffModal />}
      />

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Staff Member</th>
                <th>Role & Access</th>
                <th>Status</th>
                <th>Activity Stats</th>
                <th>Registered Date</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isSelf = u.id === auth.user?.id;
                return (
                  <tr key={u.id} className={!u.isActive ? "opacity-60 bg-zinc-900/30" : ""}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700/60 flex items-center justify-center font-bold text-amber-400 text-sm shrink-0">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-zinc-200 flex items-center gap-1.5">
                            {u.name}
                            {isSelf && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 font-semibold border border-amber-500/20">
                                You
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-zinc-500 font-mono">
                            {u.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span
                        className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase inline-flex items-center gap-1 ${
                          u.role === "ADMIN"
                            ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                            : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                        }`}
                      >
                        <ShieldCheck className="w-3 h-3" />
                        {u.role}
                      </span>
                    </td>
                    <td>
                      {u.isActive ? (
                        <span className="badge-verified text-[10px] px-2 py-0.5 rounded-full inline-flex items-center gap-1 font-semibold">
                          <CheckCircle2 className="w-3 h-3" />
                          Active
                        </span>
                      ) : (
                        <span className="badge-rejected text-[10px] px-2 py-0.5 rounded-full inline-flex items-center gap-1 font-semibold">
                          <XCircle className="w-3 h-3" />
                          Deactivated
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="text-xs text-zinc-300 font-mono">
                        <span>Loans: <b className="text-amber-400">{u._count.loansHandled}</b></span>
                        <span className="mx-2 text-zinc-600">|</span>
                        <span>Receipts: <b className="text-emerald-400">{u._count.paymentsCollected}</b></span>
                      </div>
                    </td>
                    <td>
                      <div className="text-xs text-zinc-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-zinc-500" />
                        {formatDate(u.createdAt)}
                      </div>
                    </td>
                    <td className="text-right">
                      <ToggleUserStatusButton
                        userId={u.id}
                        isActive={u.isActive}
                        isSelf={isSelf}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
