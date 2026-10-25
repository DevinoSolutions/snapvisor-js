import type { ArgosAPIClient, ArgosAPISchema } from "@snapvisor/api-client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CliError } from "./cli-error";
import { APIError } from "@snapvisor/api-client";
import {
  evaluateFinalBuild,
  parseBuildUrl,
  rateLimitDelayMs,
  parseWaitTimeout,
  prepareWait,
  waitForBuild,
  type WaitClock,
} from "./wait-for-build";

type Build = ArgosAPISchema.components["schemas"]["Build"];

const TOKEN = "t".repeat(40);
const BUILD_URL = "https://app.snapvisor.io/acme/web/builds/42";

function makeBuild(
  status: Build["status"],
  githubState?: "pending" | "success" | "failure" | "error",
): Build {
  return {
    number: 42,
    status,
    url: BUILD_URL,
    notification: githubState ? { github: { state: githubState } } : null,
  } as unknown as Build;
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

  it("passes a changes-detected build whose commit status is success (auto-approved)", () => {
    const outcome = evaluateFinalBuild(
      makeBuild("changes-detected", "success"),
    );
    expect(outcome.ok).toBe(true);
    expect(outcome.summary).toContain("auto-approved");
  });

  it.each(["pending", "failure", "error"] as const)(
    "fails a changes-detected build whose commit status is %s",
    (state) => {
      expect(evaluateFinalBuild(makeBuild("changes-detected", state)).ok).toBe(
        false,
      );
    },
  );

  it("does not let a success commit status rescue a rejected build", () => {
    expect(evaluateFinalBuild(makeBuild("rejected", "success")).ok).toBe(false);
  });

  it("throws loudly on a status the CLI does not know", () => {
    expect(() =>
      evaluateFinalBuild(makeBuild("archived" as unknown as Build["status"])),
    ).toThrow("Unhandled build status: archived");
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

  it("decodes percent-encoded segments", () => {
    expect(
      parseBuildUrl("https://app.snapvisor.io/acme%20co/web%2Fui/builds/9"),
    ).toEqual({ owner: "acme co", project: "web/ui", buildNumber: "9" });
  });

  it("fails loudly on a malformed percent-encoding", () => {
    expect(() =>
      parseBuildUrl("https://app.snapvisor.io/acme/%E0%A4%A/builds/9"),
    ).toThrow(/malformed build URL/);
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
        signal: expect.any(AbortSignal),
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
    // Polls at t=0,1,2; at t=3 the deadline has passed.
    expect(GET).toHaveBeenCalledTimes(3);
  });

  it("waits for the Retry-After of a 429 and keeps polling", async () => {
    const { client, GET } = makeClient([
      new Response(null, { status: 429, headers: { "retry-after": "7" } }),
      "accepted",
    ]);
    const { clock, sleeps } = makeClock();

    const outcome = await waitForBuild({
      client,
      buildUrl: BUILD_URL,
      timeoutSeconds: 60,
      pollIntervalMs: 1000,
      clock,
    });

    expect(outcome.ok).toBe(true);
    expect(sleeps).toEqual([7000]);
    expect(GET).toHaveBeenCalledTimes(2);
  });

  it("backs off exponentially on repeated 429s without Retry-After", async () => {
    const { client } = makeClient([
      new Response(null, { status: 429 }),
      new Response(null, { status: 429 }),
      "accepted",
    ]);
    const { clock, sleeps } = makeClock();

    await waitForBuild({
      client,
      buildUrl: BUILD_URL,
      timeoutSeconds: 60,
      pollIntervalMs: 1000,
      clock,
    });

    expect(sleeps).toEqual([1000, 2000]);
  });

  it("times out loudly, naming the rate limit, when 429s outlast the deadline", async () => {
    const { client } = makeClient(
      Array.from({ length: 10 }, () => new Response(null, { status: 429 })),
    );
    const { clock } = makeClock();

    await expect(
      waitForBuild({
        client,
        buildUrl: BUILD_URL,
        timeoutSeconds: 3,
        pollIntervalMs: 1000,
        clock,
      }),
    ).rejects.toThrow(/Timed out after 3s .*HTTP 429/);
  });

  it("bounds every request by the time left", async () => {
    const { client, GET } = makeClient(["accepted"]);
    const { clock } = makeClock();

    await waitForBuild({
      client,
      buildUrl: BUILD_URL,
      timeoutSeconds: 60,
      clock,
    });

    const init = GET.mock.calls[0]?.[1] as { signal: AbortSignal };
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(init.signal.aborted).toBe(false);
  });

  it("reports a timeout when the deadline aborts a request", async () => {
    const GET = vi.fn(
      (_path: string, init: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          init.signal.addEventListener("abort", () =>
            reject(init.signal.reason),
          );
        }),
    );
    const client = { GET } as unknown as ArgosAPIClient;
    // Deadline at 1000ms; the request starts with 1ms left, so it aborts at once.
    const times = [0, 999];
    await expect(
      waitForBuild({
        client,
        buildUrl: BUILD_URL,
        timeoutSeconds: 1,
        clock: {
          now: () => times.shift() ?? 1000,
          sleep: async () => undefined,
        },
      }),
    ).rejects.toThrow(CliError);
  });

  it.each([401, 404])("propagates a %s as an APIError", async (status) => {
    const { client } = makeClient([new Response(null, { status })]);
    const { clock } = makeClock();

    const error = await waitForBuild({
      client,
      buildUrl: BUILD_URL,
      timeoutSeconds: 60,
      clock,
    }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(APIError);
    expect((error as APIError).status).toBe(status);
  });

  it("propagates a network error", async () => {
    const GET = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
    const client = { GET } as unknown as ArgosAPIClient;
    const { clock } = makeClock();

    await expect(
      waitForBuild({
        client,
        buildUrl: BUILD_URL,
        timeoutSeconds: 60,
        clock,
      }),
    ).rejects.toThrow("fetch failed");
  });

  it("fails on an unknown status instead of passing it", async () => {
    const { client } = makeClient(["archived" as unknown as Build["status"]]);
    const { clock } = makeClock();

    await expect(
      waitForBuild({
        client,
        buildUrl: BUILD_URL,
        timeoutSeconds: 60,
        clock,
      }),
    ).rejects.toThrow("Unhandled build status: archived");
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
      prepareWait({ wait: true, parallel: true, token: TOKEN }),
    ).rejects.toThrow(/cannot be combined with --parallel/);
  });

  // Same parsing as the upload (convict Boolean): only unset, "" and "false" are off.
  it.each(["true", "1", "0", "yes"])(
    "rejects --wait when ARGOS_PARALLEL=%j",
    async (value) => {
      vi.stubEnv("ARGOS_PARALLEL", value);
      await expect(prepareWait({ wait: true, token: TOKEN })).rejects.toThrow(
        /cannot be combined with --parallel/,
      );
    },
  );

  it.each(["false", ""])(
    "allows --wait when ARGOS_PARALLEL=%j",
    async (value) => {
      vi.stubEnv("ARGOS_PARALLEL", value);
      await expect(prepareWait({ wait: true, token: TOKEN })).resolves.toBe(
        TOKEN,
      );
    },
  );

  it("returns the explicit token to poll with", async () => {
    await expect(prepareWait({ wait: true, token: "abc" })).resolves.toBe(
      "abc",
    );
  });

  it("falls back to ARGOS_TOKEN", async () => {
    const token = "e".repeat(40);
    vi.stubEnv("ARGOS_TOKEN", token);
    await expect(prepareWait({ wait: true })).resolves.toBe(token);
  });

  it("fails before uploading when no token can be shared with the upload", async () => {
    vi.stubEnv("ARGOS_TOKEN", "");
    await expect(prepareWait({ wait: true })).rejects.toThrow(
      /--token or set ARGOS_TOKEN/,
    );
  });
});

describe("rateLimitDelayMs", () => {
  const withHeader = (value?: string) =>
    new Response(null, {
      status: 429,
      headers: value === undefined ? {} : { "retry-after": value },
    });

  it("reads Retry-After seconds", () => {
    expect(rateLimitDelayMs(withHeader("12"), 0, 1000, 0)).toBe(12_000);
  });

  it("reads a Retry-After HTTP date", () => {
    const now = Date.parse("2026-01-01T00:00:00Z");
    expect(
      rateLimitDelayMs(
        withHeader("Thu, 01 Jan 2026 00:00:30 GMT"),
        0,
        1000,
        now,
      ),
    ).toBe(30_000);
  });

  it("ignores a garbage header and backs off, capped at 60s", () => {
    expect(rateLimitDelayMs(withHeader("soon"), 0, 1000, 0)).toBe(1000);
    expect(rateLimitDelayMs(withHeader(), 3, 1000, 0)).toBe(8000);
    expect(rateLimitDelayMs(withHeader(), 10, 1000, 0)).toBe(60_000);
  });
});
