import { NextResponse, type NextRequest } from "next/server";
import { INDEXABLE, SITE_URL } from "@/lib/site";

const SITE_HOST = new URL(SITE_URL).host;

/** Lowercased path -> canonical path, e.g. "/recruiters.md" -> "/RECRUITERS.md". */
const CANONICAL = new Map<string, string>(
  (JSON.parse(process.env.CANONICAL_ROUTES ?? "[]") as string[]).map((r) => [r.toLowerCase(), r]),
);

/**
 * Lookups are case-insensitive, so /recruiters.md would otherwise serve a second copy of
 * /RECRUITERS.md. Every other spelling gets a permanent redirect to the canonical one.
 */
export function middleware(request: NextRequest) {
  const path = decodeURIComponent(request.nextUrl.pathname).replace(/(.)\/$/, "$1");
  const canonical = CANONICAL.get(path.toLowerCase());
  if (!canonical || canonical === path) {
    const response = NextResponse.next();
    // A production build reached through a *.vercel.app alias: keep that host out of the index.
    if (INDEXABLE && request.headers.get("host") !== SITE_HOST) {
      response.headers.set("X-Robots-Tag", "noindex, nofollow");
    }
    return response;
  }
  const url = request.nextUrl.clone();
  url.pathname = canonical;
  return NextResponse.redirect(url, 308);
}

export const config = {
  matcher: ["/((?!_next/|_vercel/|favicon|fonts/).*)"],
};
