/**
 * Whether the app has enough Supabase configuration to run for real.
 *
 * When false, the storefront falls back to a local demo catalog (see
 * `lib/demo.ts`) so the UI can be previewed without any backend. In production
 * these variables are always set, so the fallback never activates.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
