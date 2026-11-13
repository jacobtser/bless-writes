import { createHmac } from "node:crypto";

/**
 * Server-issued passphrase for the offline encryption engine. SERVER-ONLY.
 *
 * The offline reader derives its AES/HMAC keys from this value, so it is
 * deliberately NOT the user id (which appears in sessions, URLs, and database
 * rows). Instead it is an HMAC of the user id under a server-held secret:
 * deterministic per user (so a book saved on one visit decrypts on the next),
 * but impossible to compute without `OFFLINE_KEY_SECRET`.
 *
 * If the secret is not configured the caller falls back to the user id so local
 * development keeps working — with a loud warning, because that fallback is
 * materially weaker.
 */
export function deriveOfflinePassphrase(userId: string): string {
  const secret = process.env.OFFLINE_KEY_SECRET;
  if (!secret) {
    console.warn(
      "[offline-key] OFFLINE_KEY_SECRET is not set — falling back to the user id. " +
        "Set OFFLINE_KEY_SECRET in production to use a server-issued key.",
    );
    return userId;
  }
  return createHmac("sha256", secret).update(`bless-books:offline:${userId}`).digest("base64");
}
