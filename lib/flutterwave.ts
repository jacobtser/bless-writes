/**
 * Flutterwave (v3 REST API) wrapper for Mobile Money payments.
 *
 * We talk to Flutterwave directly over fetch() instead of adding the
 * flutterwave-node-v3 SDK — same API, zero extra dependencies, fully
 * self-contained.
 *
 * Test mode is enabled simply by using a `FLWSECK_TEST-...` secret key.
 */

const FLW_BASE_URL = "https://api.flutterwave.com/v3";

function flwEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

function authHeaders(extra?: Record<string, string>): Record<string, string> {
  return {
    Authorization: `Bearer ${flwEnv("FLW_SECRET_KEY")}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

// The tx_ref is the single source of truth linking a payment back to
// (user, book). Shape: "bless|<userId>|<bookId>|<millis>"
export function buildTxRef(userId: string, bookId: string): string {
  return `bless|${userId}|${bookId}|${Date.now()}`;
}

export interface ParsedTxRef {
  userId: string;
  bookId: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseTxRef(txRef: string): ParsedTxRef | null {
  if (!txRef) return null;
  const [prefix, userId, bookId] = txRef.split("|");
  if (prefix !== "bless" || !UUID_RE.test(userId ?? "") || !UUID_RE.test(bookId ?? "")) {
    return null;
  }
  return { userId, bookId };
}

export interface FlutterwavePaymentData {
  id: number;
  tx_ref: string;
  link?: string;
}

interface FlutterwaveGenericData {
  status: string;
  message: string;
  data: FlutterwavePaymentData;
}

/** Creates a hosted checkout for Mobile Money (Ghana: MTN / Vodafone / AirtelTigo). */
export async function createMobileMoneyPayment(params: {
  txRef: string;
  amount: string; // "8.99" (major units)
  currency: string; // "GHS"
  redirectUrl: string;
  email: string;
  phone: string;
  name: string;
  title: string;
  description: string;
}): Promise<string> {
  const response = await fetch(`${FLW_BASE_URL}/payments`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      tx_ref: params.txRef,
      amount: params.amount,
      currency: params.currency,
      redirect_url: params.redirectUrl,
      payment_options: "mobilemoneygh",
      customer: {
        email: params.email,
        phonenumber: params.phone,
        name: params.name,
      },
      customizations: {
        title: params.title,
        description: params.description,
      },
    }),
  });

  const body = (await response.json().catch(() => null)) as FlutterwaveGenericData | null;

  if (!response.ok || !body || body.status !== "success" || !body.data?.link) {
    const message = body?.message ?? `Flutterwave returned HTTP ${response.status}`;
    console.error("[flutterwave] create payment failed:", message);
    throw new Error(`Mobile money checkout could not be started: ${message}`);
  }

  return body.data.link;
}

export interface FlutterwaveVerify {
  status: string; // outer "success"/"error"
  message: string;
  data?: {
    id: number;
    tx_ref: string;
    amount: number;
    currency: string;
    status: string; // "successful" | "pending" | "failed"
    payment_type?: string;
    customer?: { email?: string }; // paged
    created_at?: string;
  };
}

/**
 * Verifies a transaction the way Flutterwave recommends (always verify
 * server-side before granting access). Passing tx_ref binds the check to the
 * reference we generated, so a forged webhook cannot be used to buy anything.
 */
export async function verifyTransaction(
  transactionId: string | number,
  txRef: string,
): Promise<FlutterwaveVerify> {
  const response = await fetch(
    `${FLW_BASE_URL}/transactions/${encodeURIComponent(String(transactionId))}/verify?tx_ref=${encodeURIComponent(txRef)}`,
    { headers: authHeaders() },
  );
  const body = (await response.json().catch(() => null)) as FlutterwaveVerify | null;
  if (!body) throw new Error("Flutterwave verification returned an empty response");
  return body;
}