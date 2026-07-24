import { readVersionFromPackage } from "@snapvisor/util";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

/**
 * Get the version of the @snapvisor/core package.
 */
export async function getArgosCoreSDKIdentifier(): Promise<string> {
  const pkgPath = require.resolve("@snapvisor/core/package.json");
  const version = await readVersionFromPackage(pkgPath);
  return `@snapvisor/core@${version}`;
}
