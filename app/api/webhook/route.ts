import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseTxRef, verifyTransaction } from "@/lib/flutterwave";
import { grantPurchase } from "@/lib/purchases";
import { constantTimeEqual } from "@/lib/constant-time";

/**
 * POST /api/webhook
 *
 * Single endpoint for both payment providers:
 *  - Stripe      → verified by the `stripe-signature` header (HMAC)
 *  - Flutterwave → verified by the `verif-hash` header + a server-side
 *                  transaction verification call (never trusts the payload)
 *
 * Every grant is idempotent (unique user_id + book_id), so Stripe retries and
 * the Flutterwave + Stripe webhooks racing with each other are safe.
 */
export async function POST(request: NextRequest) {
  if (request.headers.has("verif-hash")) {
    return handleFlutterwaveWebhook(request);
  }
  if (request.headers.has("stripe-signature")) {
    return handleStripeWebhook(request);
  }
  return NextResponse.json({ error: "Unknown webhook provider." }, { status: 400 });
}

// ---------------------------------------------------------------------------
// Stripe
// ---------------------------------------------------------------------------
async function handleStripeWebhook(request: NextRequest): Promise<NextResponse> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!secret || !signature) {
    return NextResponse.json({ error: "Missing webhook configuration." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const rawBody = await request.text();
    event = getStripe().webhooks.constructEvent(rawBody, signature, secret);
  } catch (error) {
    console.error("[webhook:stripe] signature verification failed:", error);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.payment_status !== "paid") {
        return NextResponse.json({ received: true });
      }

      const userId = session.metadata?.userId;
      const bookId = session.metadata?.bookId;
      if (!userId || !bookId) {
        console.warn("[webhook:stripe] session missing metadata:", session.id);
        return NextResponse.json({ received: true });
      }

      if (session.client_reference_id && session.client_reference_id !== userId) {
        console.warn("[webhook:stripe] metadata mismatch — discarding event.");
        return NextResponse.json({ received: true });
      }

      // Defense-in-depth (parity with the Flutterwave branch): never grant on an
      // amount that doesn't line up with what WE stored for this book. We check
      // the pre-discount `amount_subtotal` so legitimate promo codes still work.
      const admin = createAdminClient();
      const { data: book } = await admin
        .from("books")
        .select("price_cents, currency")
        .eq("id", bookId)
        .maybeSingle();

      if (!book) {
        console.warn("[webhook:stripe] unknown book in metadata:", bookId);
        return NextResponse.json({ received: true });
      }

      const paidCents = session.amount_subtotal ?? session.amount_total;
      const amountsMatch = paidCents === book.price_cents;
      const currenciesMatch =
        (session.currency ?? "").toUpperCase() === book.currency.toUpperCase();

      if (!amountsMatch || !currenciesMatch) {
        console.warn("[webhook:stripe] amount/currency mismatch — discarding event.");
        return NextResponse.json({ received: true });
      }

      const granted = await grantPurchase(userId, bookId);
      if (!granted) {
        // Let Stripe retry this event a few times before giving up.
        return NextResponse.json({ error: "Failed to record purchase." }, { status: 500 });
      }
    }
  } catch (error) {
    console.error("[webhook:stripe] handler error:", error);
    return NextResponse.json({ error: "Webhook handler failed." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

// ---------------------------------------------------------------------------
// Flutterwave
// ---------------------------------------------------------------------------
async function handleFlutterwaveWebhook(request: NextRequest): Promise<NextResponse> {
  const expectedHash = process.env.FLW_WEBHOOK_HASH;
  const receivedHash = request.headers.get("verif-hash");
  if (!expectedHash || !receivedHash || !constantTimeEqual(receivedHash, expectedHash)) {
    return NextResponse.json({ error: "Invalid webhook hash." }, { status: 403 });
  }

  let payload: { event?: string; data?: { id?: number; tx_ref?: string; status?: string } };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  try {
    if (payload.event === "charge.completed") {
      const txRef = payload.data?.tx_ref;
      const transactionId = payload.data?.id;
      const ref = txRef ? parseTxRef(txRef) : null;

      if (ref && txRef && transactionId) {
        // Never trust the webhook body — always verify against Flutterwave.
        const verification = await verifyTransaction(transactionId, txRef);

        if (
          verification.status === "success" &&
          verification.data?.status === "successful" &&
          verification.data.id === transactionId
        ) {
          const admin = createAdminClient();
          const { data: book } = await admin
            .from("books")
            .select("price_cents, currency")
            .eq("id", ref.bookId)
            .maybeSingle();

          if (!book) {
            console.warn("[webhook:flutterwave] unknown book in tx_ref:", ref.bookId);
            return NextResponse.json({ received: true });
          }

          // Amount + currency must match what WE stored — never what anyone sent us.
          const paidCents = Math.round(Number(verification.data.amount) * 100);
          const amountsMatch = paidCents === book.price_cents;
          const currenciesMatch = verification.data.currency === book.currency;

          if (!amountsMatch || !currenciesMatch) {
            console.warn("[webhook:flutterwave] amount/currency mismatch — discarding event.");
            return NextResponse.json({ received: true });
          }

          const granted = await grantPurchase(ref.userId, ref.bookId);
          if (!granted) {
            return NextResponse.json({ error: "Failed to record purchase." }, { status: 500 });
          }
        }
      }
    }
  } catch (error) {
    console.error("[webhook:flutterwave] handler error:", error);
    return NextResponse.json({ error: "Webhook handler failed." }, { status: 500 });
  }

  // Always ACK unknown/irrelevant events to keep Flutterwave's retry queue clean.
  return NextResponse.json({ received: true });
}