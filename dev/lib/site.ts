/** Single source for site-wide constants. Set NEXT_PUBLIC_SITE_URL on Vercel when the domain changes. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://lfpmeloni.dev").replace(/\/$/, "");

export const SITE_NAME = "lfpmeloni.dev";

export const SITE_TITLE = "Felipe Meloni — Ask me to build anything";

export const SITE_DESCRIPTION =
  "Felipe Meloni — AI & Software Engineer. Full-stack product development, applied AI, ML and automation. Ask me to build anything.";

export const EMAIL = "mail@lfpmeloni.dev";

/** Only the production deployment should be indexed; previews stay out of search. */
export const INDEXABLE = process.env.VERCEL_ENV ? process.env.VERCEL_ENV === "production" : true;
