import React, { Suspense } from "react";
import { requireSession } from "@/lib/auth/session";
import { PageHeader } from "@/components/page-header";
import { ProfileClient } from "./profile-client";
import { Loader2 } from "lucide-react";

export default async function ProfilePage() {
  const session = await requireSession();
  const user = session.user as unknown as {
    id: string;
    name: string;
    email: string;
    role: string;
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      <PageHeader
        title="My Profile & Security Settings"
        description="Manage your institutional account credentials, view active branch assignment, and upload staff KYC documents."
      />

      <Suspense
        fallback={
          <div className="p-12 text-center text-zinc-500">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-500" />
          </div>
        }
      >
        <ProfileClient user={user} />
      </Suspense>
    </div>
  );
}
