import { NextResponse, type NextRequest } from "next/server";
import { initializeTransaction } from "@/lib/paystack";
import { createRouteSupabaseClient } from "@/lib/supabase/route";

function originFromRequest(request: NextRequest): string {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (envUrl) return envUrl.replace(/\/$/, "");
  return request.nextUrl.origin;
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, applyCookies } = createRouteSupabaseClient(request);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !user.email) {
      return applyCookies(NextResponse.json({ error: "Sign in to purchase." }, { status: 401 }));
    }

    const body = (await request.json().catch(() => ({}))) as {
      bookId?: string;
      amount?: number;
      currency?: "GHS" | "USD";
    };

    const bookId = body.bookId;
    if (!bookId) {
      return applyCookies(NextResponse.json({ error: "Missing bookId." }, { status: 400 }));
    }

    // Fetch book from DB for authoritative price/title
    const { data: book } = await supabase
      .from("books")
      .select("id, title, price_cents, currency")
      .eq("id", bookId)
      .maybeSingle();

    const amount = book ? book.price_cents / 100 : body.amount ?? 30;
    const currency = (book?.currency as "GHS" | "USD") || body.currency || "GHS";
    const title = book?.title || "Bless Writes book";

    const reference = `bless__${user.id}__${bookId}__${Date.now()}`;
    const origin = originFromRequest(request);
    const callback_url = `${origin}/api/checkout/paystack/callback?reference=${encodeURIComponent(reference)}&bookId=${encodeURIComponent(bookId)}`;

    const url = await initializeTransaction({
      amount,
      currency,
      email: user.email,
      reference,
      callback_url,
      metadata: { book_id: bookId, user_id: user.id, title },
    });

    return applyCookies(NextResponse.json({ url, reference }));
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Paystack init failed" }, { status: 500 });
  }
}