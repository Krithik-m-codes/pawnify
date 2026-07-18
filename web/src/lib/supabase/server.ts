import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/db";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-service-role-key";

/**
 * Creates a server-side Supabase client carrying the user's accessToken
 * so PostgREST RLS policies naturally restrict reads/writes to the user's organizationId.
 */
export function createTenantSupabaseClient(accessToken?: string) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    },
  });
}

/**
 * Creates a privileged admin Supabase client (bypasses RLS).
 * Reserved for onboarding org setup and cross-tenant platform operator tasks.
 */
export function createAdminSupabaseClient() {
  return createClient(supabaseUrl, supabaseServiceRoleKey);
}

/**
 * Runs a Prisma transaction with PostgreSQL session variable set to the given organizationId.
 * This allows load-bearing RLS policies to enforce tenant isolation even on connection-pooled direct DB queries.
 */
export async function runWithTenantContext<T>(
  organizationId: string,
  callback: (tx: typeof prisma) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    // Set current organization session parameter for Postgres RLS evaluation
    await tx.$executeRawUnsafe(
      `SELECT set_config('app.current_organization_id', $1, true)`,
      organizationId
    );
    return callback(tx as unknown as typeof prisma);
  });
}
