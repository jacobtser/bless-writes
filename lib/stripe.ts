import Stripe from "stripe";

// Lazy, cached Stripe client. Initialized on first use (never at module load)
// so `next build` and one-off scripts don't crash when the key is absent.
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Missing environment variable: STRIPE_SECRET_KEY");
  if (!_stripe) {
    _stripe = new Stripe(key, { apiVersion: "2026-09-30.endive" });
  }
  return _stripe;
}