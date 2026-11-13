import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

/**
 * Service-role Supabase client. Server-side ONLY.
 *
 * Bypasses Row Level Security, so it is used exclusively where the request is
 * already trusted:
 *  - the Stripe webhook (inserting purchase rows),
 *  - generating short-lived signed URLs to private files (never sent to the
 *    client — the server streams the bytes itself).
 *
 * Never import this module into a client component or expose the key.
 */
export function createAdminClient() {
  const url = env("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = env("SUPABASE_SERVICE_ROLE_KEY");

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}