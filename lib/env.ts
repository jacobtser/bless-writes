/**
 * Statically-referenced Supabase credentials.
 *
 * In client components, Next.js can ONLY inline `process.env.NEXT_PUBLIC_*`
 * when the property is accessed literally (e.g. `process.env.NEXT_PUBLIC_URL`).
 * Dynamic access like `process.env[name]` is not inlined and would throw
 * "process is not defined" in the browser — so this module is the one place
 * the client bundle reads them.
 */

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";