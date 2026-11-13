import { NextResponse, type NextRequest } from "next/server";
import { createRouteSupabaseClient } from "@/lib/supabase/route";
import { getStripe } from "@/lib/stripe";
import { enforceRateLimit } from "@/lib/rate-limit";

/**
 * POST /api/checkout
 * Body: { bookId: string }
 *
 * Starts a Stripe Checkout Session for the authenticated user. The userId and
 * bookId are embedded in the session metadata (set server-side, never by the
 * client) so the webhook can grant access without trusting any user input.
 */
export async function POST(request: NextRequest) {
  // Best-effort abuse guard (per-instance; see lib/rate-limit.ts).
  const limited = enforceRateLimit(request, "checkout", { limit: 10, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const { supabase, applyCookies } = createRouteSupabaseClient(request);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return applyCookies(
        NextResponse.json({ error: "You must be logged in to buy this book." }, { status: 401 }),
      );
    }

    const body = (await request.json().catch(() => null)) as { bookId?: string } | null;
    const bookId = body?.bookId;
    if (!bookId) {
      return applyCookies(NextResponse.json({ error: "Missing bookId." }, { status: 400 }));
    }

    const { data: book } = await supabase
      .from("books")
      .select("id, title, stripe_price_id")
      .eq("id", bookId)
      .maybeSingle();
    if (!book) {
      return applyCookies(NextResponse.json({ error: "Book not found." }, { status: 404 }));
    }

    // Already purchased? Send the user straight to the reader, don't charge twice.
    const { data: existing } = await supabase
      .from("purchases")
      .select("id")
      .eq("user_id", user.id)
      .eq("book_id", bookId)
      .maybeSingle();
    if (existing) {
      return applyCookies(
        NextResponse.json({ url: `/reader/${book.id}`, alreadyOwned: true }),
      );
    }

    const origin = new URL(request.url).origin;
    const stripe = getStripe();

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: book.stripe_price_id, quantity: 1 }],
      customer_email: user.email ?? undefined,
      client_reference_id: user.id,
      metadata: {
        userId: user.id,
        bookId: book.id,
      },
      success_url: `${origin}/reader/${book.id}`,
      cancel_url: `${origin}?canceled=1`,
      allow_promotion_codes: true,
    });

    return applyCookies(NextResponse.json({ url: session.url ?? null }));
  } catch (error) {
    console.error("[checkout] error:", error);
    return NextResponse.json({ error: "Could not start checkout." }, { status: 500 });
  }
}