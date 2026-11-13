/**
 * Paystack integration — native fetch (no external package needed).
 */

export type PaystackCurrency = "GHS" | "USD";

function apiKey(): string {
  const k = process.env.PAYSTACK_SECRET_KEY;
  if (!k) throw new Error("PAYSTACK_SECRET_KEY missing from .env.local");
  return k.trim();
}

function headers(): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey()}`,
    "Content-Type": "application/json",
  };
}

/** Amount in smallest currency unit (pesewas/cents). */
export function toSmallestUnit(amount: number): number {
  return Math.round(amount * 100);
}

export async function initializeTransaction(params: {
  amount: number; // major units (e.g. 30 or 4)
  currency: PaystackCurrency;
  email: string;
  reference: string;
  callback_url: string;
  metadata?: Record<string, unknown>;
}): Promise<string> {
  const res = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      email: params.email,
      amount: toSmallestUnit(params.amount),
      currency: params.currency,
      reference: params.reference,
      callback_url: params.callback_url,
      metadata: params.metadata ?? {},
    }),
  });

  const json = (await res.json()) as { status?: boolean; message?: string; data?: { authorization_url?: string } };
  if (!json.status || !json.data?.authorization_url) {
    throw new Error(json.message || "Paystack initialize failed");
  }
  return json.data.authorization_url;
}

export async function verifyTransaction(reference: string): Promise<"success" | "pending" | "failed" | null> {
  const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: headers(),
  });
  const json = (await res.json()) as { status?: boolean; data?: { status?: string } };
  if (!json.status || !json.data) return null;
  const s = (json.data.status ?? "").toLowerCase();
  if (s === "success") return "success";
  if (s === "pending") return "pending";
  return "failed";
}