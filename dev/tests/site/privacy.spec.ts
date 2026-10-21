import { expect, test } from "@playwright/test";
import { getPages } from "./pages";

/** Vercel Web Analytics and Speed Insights; everything else must come from the site itself. */
const ALLOWED_THIRD_PARTIES = ["va.vercel-scripts.com", "vitals.vercel-insights.com"];

test("no cookies, no tracking storage, no unexpected third parties", async ({ page, context, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  const foreign = new Set<string>();
  page.on("request", (req) => {
    const url = new URL(req.url());
    if (url.protocol.startsWith("http") && url.origin !== origin && !ALLOWED_THIRD_PARTIES.includes(url.hostname)) {
      foreign.add(url.host);
    }
  });
  // Outbound pages open in new tabs; don't load them, they are the visitor's choice, not ours.
  context.on("page", (p) => p !== page && p.close());

  for (const path of await getPages(page.request)) await page.goto(path);
  await page.goto("/CONTACT.md");
  await page.locator('a[href^="https://github.com"]').first().click();

  expect(await context.cookies()).toEqual([]);
  const keys = await page.evaluate(() => Object.keys(localStorage));
  expect(keys.filter((k) => k !== "theme")).toEqual([]);
  expect([...foreign]).toEqual([]);
});
