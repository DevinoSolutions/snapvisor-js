import { defineConfig, devices } from "@playwright/test";
import { createArgosReporterOptions } from "@snapvisor/playwright/reporter";

export default defineConfig({
  testMatch: ["**/*.spec.ts"],
  use: {
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: {
          args: ["--disable-lcd-text", "--font-render-hinting=none"],
        },
      },
    },
  ],
  reporter: [
    ["list"],
    [
      "@snapvisor/playwright/reporter",
      createArgosReporterOptions({
        buildName: `argos-playwright-e2e-node-${process.env.NODE_VERSION}-${process.env.OS}`,
        uploadToArgos: process.env.UPLOAD_TO_ARGOS === "true",
      }),
    ],
  ],
});
