"use client";

import { useRouter } from "next/navigation";
import { CreditCard, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/env";

interface PurchaseActionsProps {
  bookId: string;
  bookTitle: string;
  priceCents: number;
  currency: string;
  alreadyOwned: boolean;
  prefilledPhone?: string | null;
  demo?: boolean;
}

export function PurchaseActions({
  bookId,
  priceCents,
  alreadyOwned,
  demo,
}: PurchaseActionsProps) {
  const router = useRouter();
  const [paystackLoading, setPaystackLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  const configured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY) && !demo;

  useEffect(() => {
    let mounted = true;
    async function check() {
      if (!configured) {
        setChecking(false);
        return;
      }
      try {
        const supabase = createBrowserSupabaseClient();
        const { data } = await supabase.auth.getUser();
        if (mounted) setUserEmail(data.user?.email ?? null);
      } catch {
        if (mounted) setUserEmail(null);
      } finally {
        if (mounted) setChecking(false);
      }
    }
    check();
    return () => {
      mounted = false;
    };
  }, [configured]);

  if (alreadyOwned) {
    return (
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => router.push(`/reader/${bookId}`)}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-pine px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-pine-deep"
        >
          Keep reading
        </button>
        <p className="text-center text-xs text-pine">In your library · secure reader</p>
      </div>
    );
  }

  async function payByPaystack() {
    setError(null);
    if (!configured) {
      setError("Accounts and purchases are not configured yet. Please add Supabase keys.");
      return;
    }

    try {
      const supabase = createBrowserSupabaseClient();
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) {
        router.push(`/login?next=${encodeURIComponent(`/preview/${bookId}`)}`);
        return;
      }

      setPaystackLoading(true);
      const amount = priceCents / 100;
      const res = await fetch("/api/checkout/paystack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookId,
          amount,
          currency: "GHS",
        }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.url) {
        throw new Error(payload?.error ?? "Paystack checkout failed.");
      }
      window.location.href = payload.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Paystack error.");
      setPaystackLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        disabled={paystackLoading || checking}
        onClick={payByPaystack}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#003087] px-4 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-[#002366] disabled:opacity-70"
      >
        {paystackLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard aria-hidden className="h-4 w-4" />}
        {userEmail ? `Buy — ${userEmail}` : "Buy book — Paystack"}
      </button>
      {error && <p className="text-center text-xs text-red-600">{error}</p>}
      <p className="text-center text-xs text-ink-faint">
        {userEmail
          ? `Pay GHS ${priceCents / 100}. Signed in as ${userEmail}. This purchase will be saved to your account for recovery.`
          : `Pay GHS ${priceCents / 100}. Sign in first so this book is saved to your account and can be recovered later.`}
      </p>
      {!userEmail && !checking && (
        <p className="text-center text-xs text-ink-faint">
          <button onClick={() => router.push(`/login?next=${encodeURIComponent(`/preview/${bookId}`)}`)} className="underline text-pine hover:text-pine-deep">Sign in or create an account</button> to continue.
        </p>
      )}
    </div>
  );
}