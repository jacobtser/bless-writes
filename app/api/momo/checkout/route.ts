import { NextResponse, type NextRequest } from "next/server";
import { createRouteSupabaseClient } from "@/lib/supabase/route";
import { buildTxRef, createMobileMoneyPayment } from "@/lib/flutterwave";
import { enforceRateLimit } from "@/lib/rate-limit";

const GHANA_PHONE_RE = /^(\+233|0)[0-9]{9}$/;

function normalizeGhanaPhone(input: string): string | null {
  const digits = input.replace(/[\s\-().]/g, "");
  if (!GHANA_PHONE_RE.test(digits)) return null;
  return digits.startsWith("0") ? `+233${digits.slice(1)}` : digits;
}

/**
 * POST /api/momo/checkout
 * Body: { bookId: string, phone: string }
 *
 * Creates a Flutterwave hosted checkout for Mobile Money (MTN / Vodafone /
 * AirtelTigo Ghana). The payment reference ("tx_ref") encodes the userId and
 * bookId (nothing is ever taken from the client), and the amount is always the
 * one stored in the database — never a value sent by the browser.
 */
export async function POST(request: NextRequest) {
  // Best-effort abuse guard (per-instance; see lib/rate-limit.ts).
  const limited = enforceRateLimit(request, "momo-checkout", { limit: 8, windowMs: 60_000 });
  if (limited) return limited;

  const { supabase, applyCookies } = createRouteSupabaseClient(request);

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return applyCookies(
        NextResponse.json({ error: "You must be logged in to buy this book." }, { status: 401 }),
      );
    }

    const body = (await request.json().catch(() => null)) as
      | { bookId?: string; phone?: string }
      | null;
    const { bookId, phone } = body ?? {};

    if (!bookId || !phone) {
      return applyCookies(
        NextResponse.json({ error: "bookId and phone are required." }, { status: 400 }),
      );
    }

    const normalizedPhone = normalizeGhanaPhone(phone);
    if (!normalizedPhone) {
      return applyCookies(
        NextResponse.json(
          { error: "Enter a valid mobile money number, e.g. 024 000 0000." },
          { status: 400 },
        ),
      );
    }

    const { data: book } = await supabase
      .from("books")
      .select("id, title, price_cents, currency")
      .eq("id", bookId)
      .maybeSingle();
    if (!book) {
      return applyCookies(NextResponse.json({ error: "Book not found." }, { status: 404 }));
    }

    const { data: existing } = await supabase
      .from("purchases")
      .select("id")
      .eq("user_id", user.id)
      .eq("book_id", book.id)
      .maybeSingle();
    if (existing) {
      return applyCookies(NextResponse.json({ url: `/reader/${book.id}`, alreadyOwned: true }));
    }

    // Save the phone for reuse on the next purchase (best effort, RLS-scoped).
    await supabase.from("profiles").update({ phone: normalizedPhone }).eq("id", user.id);

    const txRef = buildTxRef(user.id, book.id);
    const origin = new URL(request.url).origin;
    const amount = (book.price_cents / 100).toFixed(2);

    const link = await createMobileMoneyPayment({
      txRef,
      amount,
      currency: book.currency,
      redirectUrl: `${origin}/reader/${book.id}`,
      email: user.email ?? "customer@blessingwrites.local",
      phone: normalizedPhone,
      name: user.email ?? "",
      title: "Bless Writes",
      description: book.title,
    });

    return applyCookies(NextResponse.json({ url: link }));
  } catch (error) {
    console.error("[momo/checkout] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not start mobile money checkout." },
      { status: 500 },
    );
  }
}