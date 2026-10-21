import { expect, test } from "@playwright/test";
import { getPages } from "./pages";

/** Set by the CI job that builds as production on the real domain; otherwise noindex is expected. */
const INDEXABLE = process.env.EXPECT_INDEXABLE === "1";

test("titles, social tags and canonical URLs", async ({ page, request }) => {
  for (const path of await getPages(request)) {
    await page.goto(path);
    const meta = await page.evaluate(() => {
      const get = (sel: string, attr = "content") => document.querySelector(sel)?.getAttribute(attr) ?? null;
      return {
        title: document.title,
        canonical: get('link[rel="canonical"]', "href"),
        robots: get('meta[name="robots"]'),
        social: [...document.querySelectorAll('meta[property^="og:"], meta[name^="twitter:"]')].map(
          (m) => [m.getAttribute("property") ?? m.getAttribute("name"), m.getAttribute("content") ?? ""] as const,
        ),
      };
    });
    const og = Object.fromEntries(meta.social);
    const where = `${path}`;

    for (const [name, value] of [["title", meta.title], ...meta.social]) {
      expect.soft(value, `${where} ${name} has an em dash`).not.toContain("—");
    }
    if (path === "/") expect.soft(meta.title, where).toBe("Felipe Meloni | AI & Software Engineer");
    else expect.soft(meta.title, where).toMatch(/^\S+ \| Felipe Meloni$/);

    for (const key of ["og:title", "og:description", "og:url", "og:image", "og:image:alt", "twitter:title", "twitter:image"]) {
      expect.soft(og[key], `${where} is missing ${key}`).toBeTruthy();
    }
    // One SITE_URL behind every absolute URL.
    const origin = new URL(meta.canonical!).origin;
    expect.soft(new URL(og["og:url"]).origin, `${where} og:url origin`).toBe(origin);
    expect.soft(new URL(og["og:image"]).origin, `${where} og:image origin`).toBe(origin);

    if (INDEXABLE) expect.soft(meta.robots ?? "", where).not.toContain("noindex");
    else expect.soft(meta.robots ?? "", `${where} must be noindex`).toContain("noindex");
  }
});

test("robots.txt matches the indexing state", async ({ request }) => {
  const body = await (await request.get("/robots.txt")).text();
  if (INDEXABLE) expect(body).not.toMatch(/Disallow: \/\s*$/m);
  else expect(body).toMatch(/Disallow: \/\s*$/m);
});

test("JSON-LD parses: one Person on home, a project type on portfolio pages", async ({ page, request }) => {
  const nodes = async () =>
    (await page.locator('script[type="application/ld+json"]').allTextContents()).flatMap((t) => {
      const data = JSON.parse(t);
      return data["@graph"] ?? [data];
    });

  await page.goto("/");
  const home = await nodes();
  expect(home.filter((n) => n["@type"] === "Person")).toHaveLength(1);
  expect(home.some((n) => n["@type"] === "ProfilePage")).toBe(true);

  for (const path of (await getPages(request)).filter((p) => p.startsWith("/PORTFOLIO/"))) {
    await page.goto(path);
    const types = (await nodes()).map((n) => n["@type"]);
    expect.soft(types.some((t) => t === "SoftwareSourceCode" || t === "CreativeWork"), path).toBe(true);
  }
});

test("the Open Graph image is a 1200x630 PNG", async ({ page, request }) => {
  await page.goto("/");
  const url = await page.locator('meta[property="og:image"]').getAttribute("content");
  // Fetch it from the server under test; the origin itself is checked above.
  const res = await request.get(new URL(url!).pathname + new URL(url!).search);
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("image/png");
  const png = await res.body();
  expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1200, 630]);
});
