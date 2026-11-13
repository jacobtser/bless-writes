import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/supabase/database.types";

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

function serializeResponseCookie(
  cookie: {
    name: string;
    value: string;
    path?: string;
    expires?: Date | number | string;
    maxAge?: number;
    domain?: string;
    httpOnly?: boolean;
    sameSite?: boolean | "strict" | "lax" | "none";
    secure?: boolean;
  },
): string {
  let cookieString = `${cookie.name}=${cookie.value}`;
  if (cookie.path) cookieString += `; Path=${cookie.path}`;
  if (cookie.maxAge !== undefined && cookie.maxAge >= 0) cookieString += `; Max-Age=${Math.floor(cookie.maxAge)}`;
  if (cookie.expires) {
    const expires = cookie.expires;
    cookieString += `; Expires=${
      expires instanceof Date
        ? expires.toUTCString()
        : typeof expires === "number"
          ? new Date(expires).toUTCString()
          : expires
    }`;
  }
  if (cookie.domain) cookieString += `; Domain=${cookie.domain}`;
  if (cookie.sameSite) cookieString += `; SameSite=${cookie.sameSite}`;
  if (cookie.httpOnly) cookieString += `; HttpOnly`;
  if (cookie.secure) cookieString += `; Secure`;
  return cookieString;
}

/**
 * Supabase client for Route Handlers.
 *
 * Wraps a NextResponse as a cookie accumulator so that any session cookies
 * written during the request (e.g. a token refresh triggered by getUser()) can
 * be merged onto whatever Response the handler eventually returns.
 */
export function createRouteSupabaseClient(request: NextRequest) {
  const cookieStore = new NextResponse();

  const supabase = createServerClient<Database>(
    env("NEXT_PUBLIC_SUPABASE_URL"),
    env("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.cookies.set({ name, value, ...options });
          });
        },
      },
    },
  );

  function applyCookies(response: Response): Response {
    for (const cookie of cookieStore.cookies.getAll()) {
      response.headers.append("Set-Cookie", serializeResponseCookie(cookie));
    }
    return response;
  }

  return { supabase, applyCookies };
}