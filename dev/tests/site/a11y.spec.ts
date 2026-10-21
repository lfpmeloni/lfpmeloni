import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { getPages, useTheme, type Theme } from "./pages";

const THEMES: Theme[] = ["dark", "light"];

/** Describes the focused element and whether its focus ring is actually visible. */
async function focused(page: Page) {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el || el === document.body) return null;
    const s = getComputedStyle(el);
    const ring =
      (s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0) || (s.boxShadow && s.boxShadow !== "none");
    return {
      tag: el.tagName.toLowerCase(),
      href: el.getAttribute("href"),
      label: el.getAttribute("aria-label"),
      cls: el.className,
      ring: Boolean(ring),
    };
  });
}

for (const theme of THEMES) {
  test.describe(`${theme} theme`, () => {
    test.beforeEach(async ({ page }) => useTheme(page, theme));

    test("axe finds no serious or critical violations on any page", async ({ page, request }) => {
      for (const path of await getPages(request)) {
        await page.goto(path);
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
        const { violations } = await new AxeBuilder({ page }).analyze();
        const severe = violations
          .filter((v) => v.impact === "serious" || v.impact === "critical")
          .map((v) => `${v.id}: ${[...new Set(v.nodes.map((n) => n.target.join(" ").replace(/:nth-child\(\d+\)/g, "")))].join(", ")}`);
        expect.soft(severe, `${path} in ${theme}`).toEqual([]);
      }
    });

    test("tab reaches every control, each with a visible focus ring", async ({ page, request }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      const files = (await getPages(request)).filter((p) => p.endsWith(".md"));
      await page.goto("/RESUME.md");
      const seen: NonNullable<Awaited<ReturnType<typeof focused>>>[] = [];
      for (let i = 0; i < 60; i++) {
        await page.keyboard.press("Tab");
        const f = await focused(page);
        if (f) seen.push(f);
      }
      for (const f of seen) expect.soft(f.ring, `no focus ring on ${f.tag} ${f.href ?? f.label ?? f.cls}`).toBe(true);
      const hrefs = new Set(seen.map((f) => f.href));
      for (const p of files) expect.soft(hrefs.has(p), `tab never reaches ${p}`).toBe(true);
      expect(seen.some((f) => f.cls.includes("theme-toggle")), "tab reaches the theme toggle").toBe(true);
    });
  });
}

test("Enter follows a file link and Space flips the theme", async ({ page }) => {
  await useTheme(page, "dark");
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/RESUME.md");
  await page.locator('aside.sidebar a[href="/STACK.md"]').focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/STACK\.md$/);
  await page.locator(".theme-toggle").focus();
  await page.keyboard.press("Space");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.keyboard.press("Enter");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("the mobile menu works from the keyboard and Escape returns focus", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/RESUME.md");
  const burger = page.getByRole("button", { name: "Toggle file browser" });
  for (let i = 0; i < 5 && !(await burger.evaluate((b) => b === document.activeElement)); i++) {
    await page.keyboard.press("Tab");
  }
  await expect(burger).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(burger).toHaveAttribute("aria-expanded", "true");
  // The open menu's links are in the tab order (the header controls come first).
  const inMenu = page.locator("aside.sidebar a:focus");
  for (let i = 0; i < 10 && (await inMenu.count()) === 0; i++) await page.keyboard.press("Tab");
  await expect(inMenu).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(burger).toHaveAttribute("aria-expanded", "false");
  await expect(burger).toBeFocused();
  await page.keyboard.press("Space");
  await expect(burger).toHaveAttribute("aria-expanded", "true");
});

test("icon-only controls and footnote links have accessible names", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/PORTFOLIO/veterinary-marketplace.md");
  for (const el of await page.locator(".top-links a, .theme-toggle").all()) {
    expect.soft(await el.getAttribute("aria-label")).toBeTruthy();
    for (const g of await el.locator(".glyph").all()) await expect.soft(g).toHaveAttribute("aria-hidden", "true");
  }
  const backs = page.locator("a.t-fnback");
  expect(await backs.count()).toBeGreaterThan(0);
  for (const label of await backs.evaluateAll((as) => as.map((a) => a.getAttribute("aria-label")))) {
    expect.soft(label).toMatch(/^Back to reference \d+$/);
  }
  for (const label of await page.locator("a.t-fnref").evaluateAll((as) => as.map((a) => a.getAttribute("aria-label")))) {
    expect.soft(label).toMatch(/^Footnote \d+$/);
  }
});
