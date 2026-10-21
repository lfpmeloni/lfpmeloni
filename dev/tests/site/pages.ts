import type { APIRequestContext, Page } from "@playwright/test";

/** Every public page, from the sitemap (pathnames only, since the sitemap host can differ). */
export async function getPages(request: APIRequestContext): Promise<string[]> {
  const xml = await (await request.get("/sitemap.xml")).text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
}

export const VIEWPORTS = [
  { width: 320, height: 640 },
  { width: 375, height: 667 },
  { width: 768, height: 1024 },
  { width: 1280, height: 800 },
];

/** Below this width the file tree is a burger menu (see globals.css). */
export const MOBILE_MAX = 760;

export type Theme = "dark" | "light";

/** Applies a theme the way a returning visitor has it: saved before the page loads. */
export async function useTheme(page: Page, theme: Theme) {
  await page.addInitScript((t) => {
    try {
      localStorage.setItem("theme", t);
    } catch {}
  }, theme);
}
