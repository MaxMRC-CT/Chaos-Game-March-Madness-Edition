import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: "ui-audit.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  outputDir: "test-results/ui-audit",
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:3000",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "Desktop Chrome",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1200 },
      },
    },
    {
      name: "iPhone 14",
      use: { ...devices["iPhone 14"] },
    },
    {
      name: "Pixel 7",
      use: { ...devices["Pixel 7"] },
    },
  ],
});
