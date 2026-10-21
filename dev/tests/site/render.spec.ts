import { expect, test } from "@playwright/test";
import { getPages } from "./pages";

test("links are never double-wrapped", async ({ page, request }) => {
  // The site shows `[text](url)` on purpose, so `](` is always visible text. A double-wrapped
  // link shows up instead as an anchor inside an anchor, or an anchor whose own text has `](`.
  for (const path of await getPages(request)) {
    await page.goto(path);
    expect.soft(await page.locator("a a").count(), `${path}: nested links`).toBe(0);
    const bad = await page.locator("a").evaluateAll((as) =>
      as.map((a) => a.textContent ?? "").filter((t) => t.includes("](")),
    );
    expect.soft(bad, `${path}: link text containing "]("`).toEqual([]);
  }
});

test("non-canonical casing redirects permanently", async ({ request }) => {
  for (const [from, to] of [
    ["/recruiters.md", "/RECRUITERS.md"],
    ["/Resume.md", "/RESUME.md"],
    ["/portfolio/real-estate-mcp.md", "/PORTFOLIO/real-estate-mcp.md"],
    ["/portfolio", "/PORTFOLIO"],
  ]) {
    const res = await request.get(from, { maxRedirects: 0 });
    expect.soft(res.status(), from).toBe(308);
    expect.soft(new URL(res.headers()["location"] ?? "", "http://x").pathname, from).toBe(to);
  }
  const canonical = await request.get("/RECRUITERS.md", { maxRedirects: 0 });
  expect(canonical.status()).toBe(200);
});
