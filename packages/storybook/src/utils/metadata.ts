import { readVersionFromPackage } from "@snapvisor/util";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

/**
 * Get the version of the Argos Playwright SDK.
 */
export async function getArgosStorybookVersion(): Promise<string> {
  const pkgPath = require.resolve("@snapvisor/storybook/package.json");
  return readVersionFromPackage(pkgPath);
}
