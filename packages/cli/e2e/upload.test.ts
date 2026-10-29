import { expect, test } from "vitest";

import { CommandError, getRequiredEnv, run } from "./utils";

getRequiredEnv("ARGOS_TOKEN");

// This test uploads the full __fixtures__ directory, which includes a 10MB PNG
// stress fixture. That file is sharp-optimized, hashed, and uploaded to S3 over
// a real network connection. It relies on the generous e2e timeout configured
// in vitest.config.ts.
test("upload returns a full build URL", () => {
  const buildName = `argos-cli-e2e-node-${process.env.NODE_VERSION}-${process.env.OS}`;
  const uploadResult = run([
    "upload",
    "../../__fixtures__",
    "--build-name",
    buildName,
  ]);

  console.log(uploadResult.stdout);
  console.error(uploadResult.stderr);

  expect(uploadResult.combined).toMatch(/https?:\/\/\S+\/builds\/\d+/);
});

// Polls the production API, which rate-limits per edge IP, so run it on a
// single matrix leg only. The build state depends on the shared project's
// baseline, so both outcomes are valid: what this proves is that `--wait`
// polls to a final state and reports it. 120s keeps it inside the job's 5 min.
const runsWaitTest =
  process.env.NODE_VERSION === "24" && process.env.OS === "ubuntu-latest";

test.runIf(runsWaitTest)(
  "upload --wait reports the final build state",
  { timeout: 180_000 },
  () => {
    const buildName = `argos-cli-e2e-wait-node-${process.env.NODE_VERSION}-${process.env.OS}`;
    const args = [
      "upload",
      "../../__fixtures__",
      "--build-name",
      buildName,
      "--wait",
      "--wait-timeout",
      "120",
    ];

    let combined: string;
    try {
      combined = run(args).combined;
    } catch (error) {
      // Exit 1 is expected when the build needs review.
      if (!(error instanceof CommandError) || error.status !== 1) {
        throw error;
      }
      combined = `${error.stdout}${error.stderr}`;
    }

    console.log(combined);
    expect(combined).toMatch(
      /Build #\d+ (accepted|has no changes|needs review|has changes)/,
    );
  },
);
