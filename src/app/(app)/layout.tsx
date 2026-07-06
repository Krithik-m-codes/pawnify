import React from "react";
import { requireSession } from "@/lib/auth/session";
import { Sidebar } from "@/components/sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();
  const user = session.user as unknown as {
    name: string;
    email: string;
    role: string;
  };

  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-100">
      <Sidebar user={user} />
      <main className="flex-1 min-w-0 overflow-x-hidden">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 pt-16 lg:pt-8 animate-fadeIn">
          {children}
        </div>
      </main>
    </div>
  );
}
