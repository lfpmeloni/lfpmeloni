import type { Metadata } from "next";
import { getDescription, isHidden, type Doc } from "./content";
import { OG_IMAGE, SITE_DESCRIPTION, SITE_NAME, SITE_TITLE } from "./site";

/** English and German versions of the same page, linked for search engines (hreflang). */
const TRANSLATIONS: Record<string, { en: string; de: string }> = {
  "/SERVICES.md": { en: "/SERVICES.md", de: "/LEISTUNGEN.md" },
  "/LEISTUNGEN.md": { en: "/SERVICES.md", de: "/LEISTUNGEN.md" },
};

/** Per-page title, description, canonical and Open Graph, all derived from the doc itself. */
export function docMetadata(doc: Doc, { home = false } = {}): Metadata {
  const title = home ? SITE_TITLE : doc.name;
  // What the layout's title template produces, spelled out for social cards.
  const fullTitle = home ? SITE_TITLE : `${doc.name} | Felipe Meloni`;
  const homepage = home || doc.route === "/README.md";
  const description = homepage ? SITE_DESCRIPTION : (getDescription(doc.source) ?? SITE_DESCRIPTION);
  // README.md is the homepage; point both URLs at "/" so they are one page to search engines.
  // Next.js drops trailing slashes, so folder pages are canonical without one.
  const url = homepage ? "/" : doc.route.replace(/(.)\/$/, "$1");
  return {
    title: home ? { absolute: title } : title,
    description,
    alternates: {
      canonical: url,
      ...(TRANSLATIONS[doc.route] ? { languages: TRANSLATIONS[doc.route] } : {}),
    },
    ...(isHidden(doc) ? { robots: { index: false, follow: false } } : {}),
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName: SITE_NAME,
      type: homepage ? "website" : "article",
      locale: doc.name === "LEISTUNGEN.md" ? "de" : "en",
      // A page-level openGraph replaces the inherited one, image included, so name it here.
      images: [OG_IMAGE],
    },
    twitter: { card: "summary_large_image", title: fullTitle, description, images: [OG_IMAGE] },
  };
}
