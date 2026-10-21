import { NextResponse, type NextRequest } from "next/server";

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
  if (!canonical || canonical === path) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.pathname = canonical;
  return NextResponse.redirect(url, 308);
}

export const config = {
  matcher: ["/((?!_next/|_vercel/|favicon|fonts/).*)"],
};
