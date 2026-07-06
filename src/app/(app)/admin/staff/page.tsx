import React from "react";
import { checkAuth } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { AddStaffModal, ToggleUserStatusButton, DeleteStaffUserButton } from "./staff-client";
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
    orderBy: { createdAt: "desc" },
  });

  const formatDate = (dateString: Date) => {
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(dateString));
  };

  return (
    <div>
      <PageHeader
        title="Staff & User Management"
        description="Create institutional staff credentials, assign branch vault roles, and manage active system access."
        action={<AddStaffModal />}
      />

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Staff Member</th>
                <th>Role Assignment</th>
                <th>Status</th>
                <th>Activity Stats</th>
                <th>Created Date</th>
                <th className="text-right">Access Controls</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isSelf = u.id === auth.user?.id;
                return (
                  <tr key={u.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center font-mono font-bold text-amber-400 text-xs">
                          {u.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-zinc-100 text-sm flex items-center gap-2">
                            {u.name}
                            {isSelf && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-normal">
                                You
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-zinc-500 font-mono">
                            {u.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span
                        className={`text-[10px] px-2.5 py-1 rounded-full font-bold inline-flex items-center gap-1 ${
                          u.role === "ADMIN"
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                            : "bg-blue-500/10 text-blue-400 border border-blue-500/30"
                        }`}
                      >
                        {u.role === "ADMIN" && <ShieldCheck className="w-3 h-3" />}
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
                      <div className="flex items-center justify-end gap-2">
                        <ToggleUserStatusButton
                          userId={u.id}
                          isActive={u.isActive}
                          isSelf={isSelf}
                        />
                        <DeleteStaffUserButton
                          userId={u.id}
                          isSelf={isSelf}
                          userName={u.name}
                        />
                      </div>
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
