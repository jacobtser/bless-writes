import { NextResponse, type NextRequest } from "next/server";
import { verifyTransaction } from "@/lib/paystack";
import { grantPurchase } from "@/lib/purchases";

function parseReference(ref: string): { userId: string; bookId: string } | null {
  // format: bless__<userId>__<bookId>__<ts>
  const parts = ref.split("__");
  if (parts.length < 4 || parts[0] !== "bless") return null;
  const userId = parts[1];
  const bookId = parts[2];
  if (!userId || !bookId) return null;
  return { userId, bookId };
}

export async function GET(request: NextRequest) {
  const reference = request.nextUrl.searchParams.get("reference") || request.nextUrl.searchParams.get("trxref");
  const bookIdParam = request.nextUrl.searchParams.get("bookId");

  const origin = request.nextUrl.origin;

  if (!reference) {
    return NextResponse.redirect(new URL("/?pay=missing_reference", origin));
  }

  try {
    const status = await verifyTransaction(reference);
    if (status !== "success") {
      const parsed = parseReference(reference);
      const dest = parsed?.bookId || bookIdParam || "";
      return NextResponse.redirect(new URL(dest ? `/preview/${dest}?pay=${status ?? "failed"}` : "/?pay=failed", origin));
    }

    const parsed = parseReference(reference);
    if (!parsed) {
      return NextResponse.redirect(new URL("/?pay=invalid_reference", origin));
    }

    const granted = await grantPurchase(parsed.userId, parsed.bookId);
    if (!granted) {
      return NextResponse.redirect(new URL(`/preview/${parsed.bookId}?pay=grant_failed`, origin));
    }

    // Redirect to reader; reader will enforce auth+ownership server-side
    return NextResponse.redirect(new URL(`/reader/${parsed.bookId}?paid=1`, origin));
  } catch (e) {
    console.error("[paystack-callback]", e);
    return NextResponse.redirect(new URL("/?pay=verify_error", origin));
  }
}