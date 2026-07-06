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
 * Require an authenticated session. Redirects to /login if not authenticated or missing role.
 */
export async function requireSession() {
  const session = await getSession();
  if (!session || !session.user) {
    redirect("/login");
  }
  const user = session.user as unknown as SessionUser;
  if (!user.role || !user.isActive) {
    redirect("/login?error=unauthorized_role");
  }
  return session;
}

/**
 * Require an admin session. Redirects to /login if not admin.
 */
export async function requireAdmin() {
  const session = await requireSession();
  const user = session.user as unknown as SessionUser;
  if (user.role !== "ADMIN") {
    redirect("/login?error=unauthorized_admin");
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
  if (!session || !session.user) {
    return { authenticated: false, error: "Not authenticated. Please sign in." };
  }
  const user = session.user as unknown as SessionUser;
  if (!user.role || !user.isActive) {
    return { authenticated: false, error: "Access denied: User account inactive or missing role." };
  }
  return {
    authenticated: true,
    user,
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
    return { authenticated: false, error: "Access denied: Admin privileges required." };
  }
  return result;
}
