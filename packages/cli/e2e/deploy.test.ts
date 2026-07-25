import { expect, test } from "vitest";

import { getRequiredEnv, run } from "./utils";

getRequiredEnv("ARGOS_TOKEN");

// TODO(fork): re-enable when Snapvisor provisions the deployments product —
// prod has no DEPLOYMENTS_BUCKET_NAME (upstream default bucket doesn't exist on
// our B2) and no preview base domain/edge worker; `snapvisor deploy` against
// prod times out at the upload step (proven in PR #8 CI, 2026-07-25).
// eslint-disable-next-line vitest/no-disabled-tests
test.skip("deploys a static site with HTML and CSS assets", () => {
  const deployResult = run(["deploy", "../../__fixtures__/deploy"]);

  console.log(deployResult.stdout);
  console.error(deployResult.stderr);

  expect(deployResult.combined).toContain("Deployed:");
  expect(deployResult.combined).toMatch(/https?:\/\/\S+/);
}, 10000);
