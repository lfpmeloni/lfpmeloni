/**
 * Single source for site-wide constants. Set NEXT_PUBLIC_SITE_URL (Production only) when the
 * custom domain goes live; until then every absolute URL points at the deployed Vercel host.
 */
const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? (vercelHost ? `https://${vercelHost}` : "http://localhost:3000")
).replace(/\/$/, "");

export const SITE_NAME = "lfpmeloni.dev";

export const SITE_TITLE = "Felipe Meloni | AI & Software Engineer";

export const SITE_DESCRIPTION =
  "Felipe Meloni, AI & Software Engineer. Full-stack product development, applied AI and automation. Ask me to build anything.";

export const EMAIL = "mail@lfpmeloni.dev";

/** The one social card (app/opengraph-image.tsx), described for screen readers and previews. */
export const OG_IMAGE = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: "Felipe Meloni | AI & Software Engineer. Ask me to build anything.",
};

export const LINKEDIN = "https://www.linkedin.com/in/lfpmeloni";

export const GITHUB = "https://github.com/lfpmeloni";

/** Flip to true once mail@lfpmeloni.dev sends and receives; the header then leads with email. */
export const EMAIL_LIVE = false;

/**
 * Only production on its own domain is indexed. Previews, local builds and the *.vercel.app
 * host stay noindex with `Disallow: /`, so the temporary host never competes with the domain.
 */
export const INDEXABLE =
  process.env.VERCEL_ENV === "production" && !new URL(SITE_URL).hostname.endsWith(".vercel.app") &&
  new URL(SITE_URL).hostname !== "localhost";
