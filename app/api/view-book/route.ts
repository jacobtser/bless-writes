import { NextResponse, type NextRequest, connection } from "next/server";
import { createRouteSupabaseClient } from "@/lib/supabase/route";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 60;

// Each request signs a fresh, short-lived URL. The client never sees it.
const SIGNED_URL_TTL_SECONDS = 120;

// A malformed Referer should fail closed (403), not throw into a 500.
function isReaderReferer(referer: string): boolean {
  try {
    return new URL(referer).pathname.startsWith("/reader/");
  } catch {
    return false;
  }
}

/**
 * GET /api/view-book?bookId=<uuid>
 *
 * THE content-protection choke point. The reader ONLY ever talks to this route
 * and therefore never learns where the file actually lives:
 *
 *   1. Authenticates the caller from the Supabase session cookies.
 *   2. Verifies (under RLS, as the logged-in user) that a purchase exists.
 *   3. Signs a short-lived URL server-side and streams the bytes back as a
 *      plain `application/pdf` response, forwarding HTTP Range requests so
 *      pdf.js can load page-by-page instead of downloading the whole file.
 *
 * It additionally refuses requests that are not coming from the reader framer
 * (Referer check) and any top-level navigation (sec-fetch-dest: document), so
 * a purchaser cannot just paste this URL into a browser tab to get the file.
 */
export async function GET(request: NextRequest) {
  // Must run per-request; never prerender (Cache Components).
  await connection();

  const { supabase, applyCookies } = createRouteSupabaseClient(request);

  // 1. Authenticate
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return applyCookies(NextResponse.json({ error: "Unauthorized." }, { status: 401 }));
  }

  const bookId = request.nextUrl.searchParams.get("bookId");
  if (!bookId) {
    return NextResponse.json({ error: "Missing bookId." }, { status: 400 });
  }

  // 2. Verify entitlement
  const { data: book } = await supabase
    .from("books")
    .select("id, title, file_path")
    .eq("id", bookId)
    .maybeSingle();
  if (!book) {
    return NextResponse.json({ error: "Book not found." }, { status: 404 });
  }

  const { data: purchase } = await supabase
    .from("purchases")
    .select("id")
    .eq("user_id", user.id)
    .eq("book_id", bookId)
    .maybeSingle();
  if (!purchase) {
    return NextResponse.json({ error: "Purchase required." }, { status: 403 });
  }

  // Refuse anything that isn't our own reader frame: not a top-level
  // navigation, not a cross-site caller. Prefer a Referer under /reader/,
  // but allow same-origin fetches without Referer as a fallback.
  const referer = request.headers.get("referer");
  const refererMatches = referer ? isReaderReferer(referer) : false;
  const fetchDestination = request.headers.get("sec-fetch-dest");
  const fetchSite = request.headers.get("sec-fetch-site");
  const isTopLevelNavigation = fetchDestination === "document";
  const isCrossSite = fetchDestination === "cross-site" || fetchSite === "cross-site";
  const isSameOriginFetch = fetchSite === "same-origin" && !isTopLevelNavigation;

  if (isTopLevelNavigation || isCrossSite || !(refererMatches || isSameOriginFetch)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  // 3. Sign a fresh URL server-side (never transmitted to the client).
  const admin = createAdminClient();
  const { data: signedUrl, error: signError } = await admin.storage
    .from("ebooks")
    .createSignedUrl(book.file_path, SIGNED_URL_TTL_SECONDS, { download: false });

  if (signError || !signedUrl) {
    console.error("[view-book] sign error:", signError?.message);
    return NextResponse.json({ error: "Could not open the file." }, { status: 500 });
  }

  // 4. Proxy the bytes, honoring Range requests from pdf.js.
  const range = request.headers.get("range");
  try {
    const upstream = await fetch(signedUrl.signedUrl, {
      headers: {
        Accept: "application/pdf",
        ...(range ? { Range: range } : {}),
      },
      cache: "no-store",
    });

    if (!upstream.ok && upstream.status !== 206) {
      console.error("[view-book] upstream error:", upstream.status);
      return NextResponse.json({ error: "File unavailable." }, { status: 502 });
    }

    const headers = new Headers();
    headers.set("Content-Type", "application/pdf");
    headers.set("Content-Disposition", 'inline; filename="reader.pdf"');
    headers.set("Cache-Control", "private, no-store, no-transform");
    headers.set("Pragma", "no-cache");
    headers.set("Expires", "0");
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("X-Frame-Options", "DENY");
    headers.set("Accept-Ranges", "bytes");

    const contentLength = upstream.headers.get("content-length");
    if (contentLength) headers.set("Content-Length", contentLength);

    const contentRange = upstream.headers.get("content-range");
    if (contentRange) headers.set("Content-Range", contentRange);

    const response = new Response(upstream.body, {
      status: upstream.status,
      headers,
    });

    return applyCookies(response);
  } catch (error) {
    console.error("[view-book] proxy error:", error);
    return NextResponse.json({ error: "Could not stream the file." }, { status: 502 });
  }
}