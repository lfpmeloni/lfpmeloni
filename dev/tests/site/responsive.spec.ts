import { expect, test } from "@playwright/test";
import { getPages, MOBILE_MAX, VIEWPORTS } from "./pages";

for (const viewport of VIEWPORTS) {
  test.describe(`${viewport.width}x${viewport.height}`, () => {
    test.use({ viewport });

    test("no page scrolls sideways, and fences and tables scroll on their own", async ({ page, request }) => {
      for (const path of await getPages(request)) {
        await page.goto(path);
        const { scrollWidth, clientWidth } = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        }));
        expect.soft(scrollWidth, `${path} scrolls sideways`).toBeLessThanOrEqual(clientWidth);

        const blocks = await page.locator(".fence").evaluateAll((els) =>
          els.map((el) => ({
            overflowX: getComputedStyle(el).overflowX,
            // A fence line that wraps is taller than one line of text.
            wrapped: [...el.querySelectorAll<HTMLElement>(".line .code")].filter(
              (c) => c.getBoundingClientRect().height > parseFloat(getComputedStyle(c).lineHeight) * 1.5,
            ).length,
          })),
        );
        for (const b of blocks) {
          expect.soft(b.overflowX, `${path}: fence or table must scroll`).toBe("auto");
          expect.soft(b.wrapped, `${path}: lines wrapped inside a fence or table`).toBe(0);
        }
      }
    });

    if (viewport.width <= MOBILE_MAX) {
      test("the burger menu opens, lists every file and closes", async ({ page, request }) => {
        const pages = (await getPages(request)).filter((p) => p.endsWith(".md") && p !== "/");
        await page.goto("/RESUME.md");
        const burger = page.getByRole("button", { name: "Toggle file browser" });
        const sidebar = page.locator("aside.sidebar");
        await expect(sidebar).toBeHidden();
        await burger.click();
        await expect(burger).toHaveAttribute("aria-expanded", "true");
        await expect(sidebar).toBeInViewport();
        for (const p of pages) {
          await expect.soft(sidebar.locator(`a[href="${p}"]`), `menu lists ${p}`).toBeVisible();
        }
        await burger.click();
        await expect(burger).toHaveAttribute("aria-expanded", "false");
        await expect(sidebar).toBeHidden();
      });
    } else if (viewport.width >= 1280) {
      test("section links scroll to their heading", async ({ page }) => {
        await page.goto("/PORTFOLIO/veterinary-marketplace.md");
        const links = page.locator("aside.outline a");
        const count = await links.count();
        expect(count).toBeGreaterThan(3);
        for (const i of [1, Math.floor(count / 2), count - 1]) {
          const link = links.nth(i);
          const id = (await link.getAttribute("href"))!.slice(1);
          await link.click();
          await expect(page.locator(`[id="${id}"]`)).toBeInViewport();
        }
      });
    }
  });
}
