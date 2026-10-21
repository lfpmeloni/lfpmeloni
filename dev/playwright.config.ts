import { defineConfig, devices } from "@playwright/test";

/**
 * Site suite. Against a fresh local build by default (`npm run build` first); set BASE_URL to
 * check a deployment instead. Fails closed: `.only` is an error and nothing may be skipped.
 */
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "tests/site",
  forbidOnly: true,
  retries: 0,
  fullyParallel: true,
  workers: process.env.CI ? 2 : undefined,
  timeout: 120_000,
  reporter: [["list"], ["json", { outputFile: "test-results/report.json" }]],
  use: { baseURL: BASE_URL, ...devices["Desktop Chrome"] },
  webServer: process.env.BASE_URL
    ? undefined
    : { command: "npx next start -p 3000", url: BASE_URL, reuseExistingServer: !process.env.CI },
});
