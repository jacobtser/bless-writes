import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Grants a user access to a book by inserting/upserting a purchases row.
 *
 * Uses the service-role client so it works from the Stripe and Flutterwave
 * webhooks and from the post-payment redirect verification — three contexts
 * that can race with each other. The unique (user_id, book_id) constraint +
 * ignoreDuplicates makes every call idempotent.
 */
export async function grantPurchase(userId: string, bookId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { error } = await admin.from("purchases").upsert(
    { user_id: userId, book_id: bookId },
    { onConflict: "user_id,book_id", ignoreDuplicates: true },
  );

  if (error) {
    console.error("[purchases] grantPurchase failed:", error.message);
    return false;
  }
  return true;
}