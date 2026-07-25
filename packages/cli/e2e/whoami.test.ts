import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

import { getRequiredEnv, run, type CommandError } from "./utils";

const userAccessToken = getRequiredEnv("USER_ACCESS_TOKEN");

const baseEnv: NodeJS.ProcessEnv = {
  ...process.env,
  HOME: mkdtempSync(join(tmpdir(), "argos-cli-e2e-")),
  ARGOS_API_BASE_URL: process.env.ARGOS_API_BASE_URL,
  ARGOS_TOKEN: "",
};

describe("argos whoami", () => {
  test("fails when no token is provided", () => {
    let error: CommandError | undefined;
    try {
      run(["whoami"], baseEnv);
    } catch (err) {
      error = err as CommandError;
    }
    expect(error).toBeDefined();
    expect(error?.status).not.toBe(0);
    expect(error?.stderr).toContain("No Snapvisor token found");
  });

  test("prints the authenticated user in JSON mode", () => {
    const output = run(
      ["whoami", "--token", userAccessToken, "--json"],
      baseEnv,
    );
    // The /me payload is { user: { id, name, email }, accounts: [{ slug, ... }] }
    // (api-client `Me` schema): the user id lives under `user`, and slug is an
    // account-level field. Assert against that real shape.
    const me = JSON.parse(output.stdout);
    expect(me.user.id).toBeDefined();
    expect(me.accounts[0]?.slug).toBeDefined();
  });

  test("prints human-readable user data", () => {
    const output = run(["whoami", "--token", userAccessToken], baseEnv);
    // `formatMe` prints identity + the account slugs on an "Accounts:" line
    // (there is no per-user slug — slug is account-scoped).
    expect(output.stdout).toContain("Logged in to Snapvisor as");
    expect(output.stdout).toContain("Accounts:");
  });
});
