import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

/**
 * Public browser/client-side Supabase client.
 * Automatically attaches authenticated user sessions so RLS policies apply.
 */
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
