/**
 * Length-checked, value-independent string comparison.
 *
 * Used for comparing secrets/signatures (webhook hashes, offline MACs) so the
 * check cannot be turned into a timing oracle that leaks how many leading
 * characters matched. Not a substitute for real crypto — just a safe equality.
 */
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
