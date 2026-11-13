import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/supabase/database.types";
import { isSupabaseConfigured } from "@/lib/supabase/config";

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

/**
 * Run inside proxy.ts (Next.js 16 renamed middleware to proxy) on every
 * matching request. If the access token has expired, this silently refreshes
 * the session using the refresh token and re-issues the auth cookies so that
 * Server Components, Route Handlers, and pdf.js all stay authenticated.
 */
export async function updateSession(request: NextRequest) {
  // No Supabase config (e.g. local demo preview) — nothing to refresh.
  if (!isSupabaseConfigured()) {
    return NextResponse.next({ request: { headers: request.headers } });
  }

  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient<Database>(
    env("NEXT_PUBLIC_SUPABASE_URL"),
    env("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request: { headers: request.headers } });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: use getUser(), not getSession(), so the token is validated
  // against Supabase Auth rather than blindly trusting the client cookies.
  await supabase.auth.getUser();

  return response;
}