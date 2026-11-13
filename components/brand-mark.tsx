import Link from "next/link";

interface BrandMarkProps {
  href?: string;
  tone?: "light" | "dark";
  className?: string;
  showTagline?: boolean;
}

/**
 * The single source of truth for the site wordmark. Keeping it here means the
 * storefront, login screen, and excerpt header always read as one publication.
 */
export function BrandMark({
  href = "/",
  tone = "light",
  className = "",
  showTagline = false,
}: BrandMarkProps) {
  const wordmark = tone === "dark" ? "text-paper" : "text-ink";
  const accent = tone === "dark" ? "text-brass" : "text-brass-deep";
  const tagline = tone === "dark" ? "text-paper/50" : "text-ink-faint";

  return (
    <Link href={href} className={`inline-flex items-baseline gap-2.5 ${className}`}>
      <span className={`font-display text-2xl font-semibold tracking-tight ${wordmark}`}>
        Bless <em className={`italic ${accent}`}>Writes</em>
      </span>
      {showTagline && (
        <span
          className={`hidden text-[10px] font-medium uppercase tracking-[0.2em] sm:inline ${tagline}`}
        >
          Books by Bless Laweh Koranteng
        </span>
      )}
    </Link>
  );
}
