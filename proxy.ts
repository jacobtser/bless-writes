import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

/**
 * Next.js 16 renamed "middleware" to "proxy".
 *
 * On every request (except static assets) we refresh the Supabase auth session
 * if the access token has expired, so that all Server Components, Route
 * Handlers, and the pdf.js reader requests stay authenticated.
 */
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Run on everything except static files, images, and the pdf.js worker.
    "/((?!_next/static|_next/image|favicon.ico|vendor/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp4|pdf|woff2)$).*)",
  ],
};