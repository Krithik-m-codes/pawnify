import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  phone: string | null;
  isActive: boolean;
};

/**
 * Get the current session. Returns null if not authenticated.
 */
export async function getSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
}

/**
 * Require an authenticated session. Redirects to /login if not authenticated.
 */
export async function requireSession() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}

/**
 * Require an admin session. Redirects appropriately if not admin.
 */
export async function requireAdmin() {
  const session = await requireSession();
  if ((session.user as unknown as SessionUser).role !== "ADMIN") {
    redirect("/dashboard");
  }
  return session;
}

/**
 * Check role inside a Server Action (does not redirect, returns result).
 * Use this in Server Actions where you need to return an error, not redirect.
 */
export async function checkAuth(): Promise<
  | { authenticated: true; user: SessionUser; sessionId: string }
  | { authenticated: false; error: string }
> {
  const session = await getSession();
  if (!session) {
    return { authenticated: false, error: "Not authenticated" };
  }
  return {
    authenticated: true,
    user: session.user as unknown as SessionUser,
    sessionId: session.session.id,
  };
}

/**
 * Check admin role inside a Server Action.
 */
export async function checkAdmin(): Promise<
  | { authenticated: true; user: SessionUser; sessionId: string }
  | { authenticated: false; error: string }
> {
  const result = await checkAuth();
  if (!result.authenticated) return result;
  if (result.user.role !== "ADMIN") {
    return { authenticated: false, error: "Admin access required" };
  }
  return result;
}
