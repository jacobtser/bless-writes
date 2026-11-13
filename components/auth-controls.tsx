"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, Eye, LogOut } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function AuthControls({
  userEmail,
  displayName,
  demo = false,
}: {
  userEmail?: string | null;
  displayName?: string | null;
  demo?: boolean;
}) {
  const label = (displayName && displayName.trim()) || userEmail || null;
  const router = useRouter();

  if (demo) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-line bg-paper-soft px-4 py-2 text-sm font-medium text-ink-soft shadow-sm">
        <Eye aria-hidden className="h-4 w-4" />
        Preview
      </span>
    );
  }

  if (!label) {
    return (
      <Link
        href="/login"
        className="inline-flex items-center gap-2 rounded-full border border-line bg-paper-soft px-4 py-2 text-sm font-medium text-ink shadow-sm transition hover:border-brass hover:text-brass-deep"
      >
        Sign in
      </Link>
    );
  }

  async function signOut() {
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <Link
        href="/library"
        className="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper-soft px-3.5 py-2 text-sm font-medium text-ink shadow-sm transition hover:border-brass hover:text-brass-deep"
      >
        <BookOpen aria-hidden className="h-4 w-4" />
        <span className="hidden sm:inline">Library</span>
      </Link>
      <span className="hidden max-w-36 truncate text-sm text-ink-soft lg:inline" title={userEmail ?? undefined}>
        {label}
      </span>
      <button
        type="button"
        onClick={signOut}
        className="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper-soft px-3.5 py-2 text-sm font-medium text-ink shadow-sm transition hover:border-brass hover:text-brass-deep"
        title="Sign out"
      >
        <LogOut aria-hidden className="h-4 w-4" />
        <span className="hidden sm:inline">Sign out</span>
      </button>
    </div>
  );
}