"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, LogIn, UserPlus } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

function safePath(value: string): string {
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return "/";
  }
  try {
    const resolved = new URL(value, "https://local.invalid");
    if (resolved.origin !== "https://local.invalid") return "/";
    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return "/";
  }
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safePath(searchParams.get("next") ?? "/library");

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);

    try {
      const supabase = createBrowserSupabaseClient();

      if (mode === "signup") {
        const name = fullName.trim();
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name },
            emailRedirectTo: typeof window !== "undefined" ? `${window.location.origin}${next}` : undefined,
          },
        });
        if (error) {
          setError(error.message);
          setLoading(false);
          return;
        }

        // Best-effort: ensure profile has name if trigger/schema supports it
        if (data.user && name) {
          await supabase.from("profiles").upsert(
            { id: data.user.id, email, full_name: name },
            { onConflict: "id" },
          );
        }

        // If email confirmation is disabled, Supabase returns a session and user is signed in.
        if (data.session) {
          router.push(next);
          router.refresh();
          return;
        }
        setInfo("Account created. Check your email to confirm, then sign in.");
        setMode("signin");
        setLoading(false);
        return;
      }

      const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
      if (signInErr) {
        setError(signInErr.message);
        setLoading(false);
        return;
      }

      router.push(next);
      router.refresh();
    } catch (e: any) {
      setError(e?.message ?? "Authentication is not configured. Add Supabase keys to enable accounts.");
      setLoading(false);
    }
  }

  const inputClasses =
    "w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-ink-faint focus:border-pine focus:ring-2 focus:ring-pine/30";

  return (
    <div className="w-full max-w-sm">
      <div className="overflow-hidden rounded-3xl border border-line bg-paper-soft shadow-xl">
        <div className="border-b border-line bg-pine px-6 py-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-pine-wash">
            {mode === "signin" ? "Your library" : "New reader"}
          </p>
          <h2 className="mt-1 font-display text-2xl font-semibold text-white">
            {mode === "signin" ? "Sign in to your account" : "Create your account"}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-6">
          {mode === "signup" && (
            <div>
              <label htmlFor="fullName" className="mb-1.5 block text-xs font-medium text-ink">
                Full name
              </label>
              <input
                id="fullName"
                type="text"
                required
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your name"
                className={inputClasses}
              />
            </div>
          )}
          <div>
            <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-ink">
              Email address
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={inputClasses}
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-ink">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              className={inputClasses}
            />
          </div>

          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
              {error}
            </p>
          )}
          {info && (
            <p className="rounded-xl border border-pine/20 bg-pine-wash px-3 py-2 text-xs font-medium text-pine-deep">
              {info}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-pine px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-pine-deep disabled:cursor-wait disabled:opacity-60"
          >
            {loading ? (
              <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
            ) : mode === "signin" ? (
              <LogIn aria-hidden className="h-4 w-4" />
            ) : (
              <UserPlus aria-hidden className="h-4 w-4" />
            )}
            {mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <div className="border-t border-line bg-paper-deep/60 px-6 py-4">
          <button
            type="button"
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setError(null);
              setInfo(null);
            }}
            className="w-full text-center text-xs font-medium text-brass-deep underline-offset-2 hover:underline"
          >
            {mode === "signin"
              ? "New here? Create an account"
              : "Already have an account? Sign in"}
          </button>
        </div>
      </div>

      <p className="mt-4 text-center text-xs leading-relaxed text-ink-faint">
        One account keeps your purchases and saved books together. Sign in anytime to recover your library.
      </p>
    </div>
  );
}