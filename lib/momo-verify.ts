import { createAdminClient } from "@/lib/supabase/admin";
import { parseTxRef, verifyTransaction } from "@/lib/flutterwave";
import { grantPurchase } from "@/lib/purchases";

interface VerifyRedirectParams {
  status: string | string[] | undefined;
  txRef: string | string[] | undefined;
  transactionId: string | string[] | undefined;
  userId: string;
  bookId: string;
}

const first = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

/**
 * Runs when Flutterwave redirects the buyer back to /reader/<bookId>.
 *
 * The webhook is the primary grant mechanism; this is a safety net so that if
 * the webhook is ever delayed or lost, the buyer still gets instant access.
 * Every check mirrors the webhook: parse tx_ref (must reference THIS user and
 * THIS book), verify the transaction against Flutterwave, confirm the amount
 * and currency match the database, then grant idempotently.
 */
export async function verifyPaymentRedirect({
  status,
  txRef,
  transactionId,
  userId,
  bookId,
}: VerifyRedirectParams): Promise<boolean> {
  const statusValue = first(status);
  const txRefValue = first(txRef);
  const transactionIdValue = first(transactionId);

  if (statusValue !== "successful" || !txRefValue || !transactionIdValue) {
    return false;
  }

  const ref = parseTxRef(txRefValue);
  if (!ref || ref.userId !== userId || ref.bookId !== bookId) {
    return false;
  }

  try {
    const verification = await verifyTransaction(transactionIdValue, txRefValue);
    const data = verification.data;

    if (verification.status !== "success" || data?.status !== "successful") {
      return false;
    }
    if (data.id !== Number(transactionIdValue)) {
      return false;
    }

    const admin = createAdminClient();
    const { data: book } = await admin
      .from("books")
      .select("price_cents, currency")
      .eq("id", ref.bookId)
      .maybeSingle();
    if (!book) return false;

    const paidCents = Math.round(Number(data.amount) * 100);
    if (paidCents !== book.price_cents || data.currency !== book.currency) {
      return false;
    }

    return await grantPurchase(ref.userId, ref.bookId);
  } catch (error) {
    console.error("[momo-verify] redirect verification failed:", error);
    return false;
  }
}