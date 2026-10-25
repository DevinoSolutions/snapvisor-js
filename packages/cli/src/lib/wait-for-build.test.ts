import type { ArgosAPIClient, ArgosAPISchema } from "@snapvisor/api-client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CliError } from "./cli-error";
import {
  evaluateFinalBuild,
  parseBuildUrl,
  parseWaitTimeout,
  prepareWait,
  waitForBuild,
  type WaitClock,
} from "./wait-for-build";

type Build = ArgosAPISchema.components["schemas"]["Build"];

const BUILD_URL = "https://app.snapvisor.io/acme/web/builds/42";

function makeBuild(status: Build["status"]): Build {
  return { number: 42, status, url: BUILD_URL } as unknown as Build;
}

/** A client whose build endpoint answers with the given statuses, in order. */
function makeClient(responses: Array<Build["status"] | Response>) {
  const GET = vi.fn();
  for (const response of responses) {
    if (response instanceof Response) {
      GET.mockResolvedValueOnce({ error: { error: "boom" }, response });
    } else {
      GET.mockResolvedValueOnce({
        data: makeBuild(response),
        response: new Response(null, { status: 200 }),
      });
    }
  }
  return { GET, client: { GET } as unknown as ArgosAPIClient };
}

/** A fake clock: sleeping advances `now` instantly. */
function makeClock() {
  let now = 0;
  const sleeps: number[] = [];
  const clock: WaitClock = {
    now: () => now,
    sleep: async (ms) => {
      sleeps.push(ms);
      now += ms;
    },
  };
  return { clock, sleeps };
}

describe("evaluateFinalBuild", () => {
  it.each([
    ["accepted", true],
    ["no-changes", true],
    ["changes-detected", false],
    ["rejected", false],
    ["expired", false],
    ["error", false],
    ["aborted", false],
  ] as const)("maps %s to ok=%s", (status, ok) => {
    const outcome = evaluateFinalBuild(makeBuild(status));
    expect(outcome.ok).toBe(ok);
    expect(outcome.summary).toContain("Build #42");
  });

  it("says a changes-detected build needs review", () => {
    expect(evaluateFinalBuild(makeBuild("changes-detected")).summary).toContain(
      "needs review",
    );
  });

  it.each(["pending", "progress"] as const)(
    "refuses a build that is still %s",
    (status) => {
      expect(() => evaluateFinalBuild(makeBuild(status))).toThrow(/still "/);
    },
  );
});

describe("parseBuildUrl", () => {
  it("reads owner, project and build number", () => {
    expect(parseBuildUrl(BUILD_URL)).toEqual({
      owner: "acme",
      project: "web",
      buildNumber: "42",
    });
  });

  it("works on self-hosted origins with a path prefix", () => {
    expect(
      parseBuildUrl("https://ci.example.com/snap/acme/web/builds/7"),
    ).toEqual({ owner: "acme", project: "web", buildNumber: "7" });
  });

  it("fails loudly on an unexpected URL shape", () => {
    expect(() => parseBuildUrl("https://app.snapvisor.io/acme")).toThrow(
      CliError,
    );
  });
});

describe("waitForBuild", () => {
  it("returns right away when the build is already final", async () => {
    const { client, GET } = makeClient(["no-changes"]);
    const { clock, sleeps } = makeClock();

    const outcome = await waitForBuild({
      client,
      buildUrl: BUILD_URL,
      timeoutSeconds: 60,
      clock,
    });

    expect(outcome.ok).toBe(true);
    expect(sleeps).toEqual([]);
    expect(GET).toHaveBeenCalledWith(
      "/projects/{owner}/{project}/builds/{buildNumber}",
      {
        params: { path: { owner: "acme", project: "web", buildNumber: "42" } },
      },
    );
  });

  it("polls through pending and progress until the build settles", async () => {
    const { client, GET } = makeClient([
      "pending",
      "progress",
      "changes-detected",
    ]);
    const { clock, sleeps } = makeClock();
    const onPoll = vi.fn();

    const outcome = await waitForBuild({
      client,
      buildUrl: BUILD_URL,
      timeoutSeconds: 60,
      pollIntervalMs: 1000,
      clock,
      onPoll,
    });

    expect(outcome.ok).toBe(false);
    expect(outcome.summary).toContain("needs review");
    expect(GET).toHaveBeenCalledTimes(3);
    expect(sleeps).toEqual([1000, 1000]);
    expect(onPoll).toHaveBeenCalledTimes(2);
  });

  it("reports an accepted build as ok", async () => {
    const { client } = makeClient(["progress", "accepted"]);
    const { clock } = makeClock();

    const outcome = await waitForBuild({
      client,
      buildUrl: BUILD_URL,
      timeoutSeconds: 60,
      pollIntervalMs: 1000,
      clock,
    });

    expect(outcome).toEqual({ ok: true, summary: "Build #42 accepted" });
  });

  it("throws a CliError naming the last status when the timeout elapses", async () => {
    const { client, GET } = makeClient(
      Array.from({ length: 10 }, () => "progress" as const),
    );
    const { clock } = makeClock();

    const promise = waitForBuild({
      client,
      buildUrl: BUILD_URL,
      timeoutSeconds: 3,
      pollIntervalMs: 1000,
      clock,
    });

    await expect(promise).rejects.toThrow(CliError);
    await expect(promise).rejects.toThrow(
      /Timed out after 3s .*last status: progress/,
    );
    // t=0,1,2,3 -> four polls, the last one exactly on the deadline.
    expect(GET).toHaveBeenCalledTimes(4);
  });

  it("propagates API failures instead of treating them as a green build", async () => {
    const { client } = makeClient([new Response(null, { status: 500 })]);
    const { clock } = makeClock();

    await expect(
      waitForBuild({
        client,
        buildUrl: BUILD_URL,
        timeoutSeconds: 60,
        clock,
      }),
    ).rejects.toThrow();
  });
});

describe("parseWaitTimeout", () => {
  it("accepts a positive whole number of seconds", () => {
    expect(parseWaitTimeout("90")).toBe(90);
  });

  it.each(["0", "-5", "1.5", "abc", ""])("rejects %j", (value) => {
    expect(() => parseWaitTimeout(value)).toThrow(/positive whole number/);
  });
});

describe("prepareWait", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("does nothing when --wait is not set", async () => {
    await expect(prepareWait({})).resolves.toBeNull();
  });

  it("rejects --wait-timeout without --wait", async () => {
    await expect(prepareWait({ waitTimeout: 30 })).rejects.toThrow(
      "--wait-timeout requires --wait.",
    );
  });

  it("rejects --wait with --parallel", async () => {
    await expect(
      prepareWait({ wait: true, parallel: true, token: "t" }),
    ).rejects.toThrow(/cannot be combined with --parallel/);
  });

  it("rejects --wait when ARGOS_PARALLEL is set", async () => {
    vi.stubEnv("ARGOS_PARALLEL", "true");
    await expect(prepareWait({ wait: true, token: "t" })).rejects.toThrow(
      /cannot be combined with --parallel/,
    );
  });

  it("returns the explicit token to poll with", async () => {
    await expect(prepareWait({ wait: true, token: "abc" })).resolves.toBe(
      "abc",
    );
  });

  it("falls back to ARGOS_TOKEN", async () => {
    vi.stubEnv("ARGOS_TOKEN", "from-env");
    await expect(prepareWait({ wait: true })).resolves.toBe("from-env");
  });
});
