import { readConfig } from "@snapvisor/core";
import type { ArgosAPIClient, ArgosAPISchema } from "@snapvisor/api-client";
import { InvalidArgumentError } from "commander";
import { unwrap } from "./api";
import { fail } from "./cli-error";

type Build = ArgosAPISchema.components["schemas"]["Build"];
type BuildStatus = Build["status"];

/** Seconds `upload --wait` waits for a build to settle when no timeout is given. */
export const DEFAULT_WAIT_TIMEOUT_SECONDS = 600;

/** Commander argument parser for `--wait-timeout <seconds>`. */
export function parseWaitTimeout(value: string): number {
  const seconds = Number(value);
  if (!Number.isInteger(seconds) || seconds <= 0) {
    throw new InvalidArgumentError(
      "Must be a positive whole number of seconds.",
    );
  }
  return seconds;
}

/**
 * Reject option combinations `--wait` cannot honour, before anything is uploaded.
 * Returns the token used to poll the build, or `null` when not waiting.
 */
export async function prepareWait(options: {
  wait?: boolean | undefined;
  waitTimeout?: number | undefined;
  parallel?: boolean | undefined;
  token?: string | undefined;
}): Promise<string | null> {
  if (!options.wait) {
    if (options.waitTimeout !== undefined) {
      fail("--wait-timeout requires --wait.");
    }
    return null;
  }
  // Same parsing as the upload itself (convict Boolean), so `--wait` refuses
  // exactly the environments that would run a parallel build.
  if (options.parallel || (await readConfig()).parallel) {
    fail(
      "--wait cannot be combined with --parallel (or ARGOS_PARALLEL): a parallel build only finishes once every shard is uploaded and the build is finalized, so waiting on one shard would time out.",
    );
  }
  // Only the project token the upload itself uses (--token / ARGOS_TOKEN) is
  // accepted: tokenless / OIDC uploads and `argos login` sessions give us no
  // token the upload and the poll would share. Fail now, before the build is created.
  const token = options.token || process.env["ARGOS_TOKEN"];
  if (!token) {
    fail(
      "--wait needs a project token to read the build back: pass --token or set ARGOS_TOKEN (GitHub Actions OIDC / tokenless uploads and `argos login` are not supported with --wait).",
    );
  }
  return token;
}

const POLL_INTERVAL_MS = 5_000;

/** Statuses a build can still leave: it is waiting for, or being processed by, the diff engine. */
const IN_FLIGHT_STATUSES = [
  "pending",
  "progress",
] as const satisfies readonly BuildStatus[];

type FinalBuildStatus = Exclude<
  BuildStatus,
  (typeof IN_FLIGHT_STATUSES)[number]
>;

/** Result of waiting on a build: whether CI should pass, and why. */
export type BuildOutcome = {
  ok: boolean;
  /** One line, e.g. `Build #42 needs review (changes-detected)`. */
  summary: string;
};

function isFinalStatus(status: BuildStatus): status is FinalBuildStatus {
  return !(IN_FLIGHT_STATUSES as readonly BuildStatus[]).includes(status);
}

/**
 * Map a build that reached a final status to a pass/fail outcome.
 *
 * Passes: `accepted`, `no-changes`, and a `changes-detected` build whose commit
 * status is already `success` (a reference-branch build is auto-approved but
 * keeps the `changes-detected` API status). Everything else fails: a
 * `changes-detected` build with a pending status is waiting for a human review,
 * which is exactly what `--wait` exists to surface to CI, so the exit code
 * always agrees with the commit status.
 */
export function evaluateFinalBuild(build: Build): BuildOutcome {
  if (!isFinalStatus(build.status)) {
    throw new Error(
      `Invariant: build #${build.number} is still "${build.status}", not final`,
    );
  }
  const status: FinalBuildStatus = build.status;
  const label = `Build #${build.number}`;
  switch (status) {
    case "accepted":
      return { ok: true, summary: `${label} accepted` };
    case "no-changes":
      return { ok: true, summary: `${label} has no changes` };
    case "changes-detected":
      if (build.notification?.github.state === "success") {
        return {
          ok: true,
          summary: `${label} has changes but its commit status is success (auto-approved)`,
        };
      }
      return {
        ok: false,
        summary: `${label} needs review (changes-detected)`,
      };
    case "rejected":
      return { ok: false, summary: `${label} was rejected` };
    case "expired":
      return { ok: false, summary: `${label} expired` };
    case "error":
      return { ok: false, summary: `${label} failed with an error` };
    case "aborted":
      return { ok: false, summary: `${label} was aborted` };
    default: {
      const unhandled: never = status;
      throw new Error(`Unhandled build status: ${String(unhandled)}`);
    }
  }
}

/**
 * Extract `owner`, `project` and the build number from the build URL returned
 * by the API (`<app origin>/<owner>/<project>/builds/<number>`). Only the last
 * four path segments are read, so self-hosted origins work too.
 */
export function parseBuildUrl(url: string): {
  owner: string;
  project: string;
  buildNumber: string;
} {
  const segments = new URL(url).pathname
    .split("/")
    .filter(Boolean)
    .slice(-4)
    .map((segment) => {
      try {
        return decodeURIComponent(segment);
      } catch (error) {
        fail(
          `Cannot wait for build: malformed build URL "${url}" (${error instanceof Error ? error.message : String(error)}).`,
        );
      }
    });
  const [owner, project, builds, buildNumber] = segments;
  if (!owner || !project || builds !== "builds" || !buildNumber) {
    fail(
      `Cannot wait for build: unexpected build URL "${url}" (expected .../<owner>/<project>/builds/<number>).`,
    );
  }
  return { owner, project, buildNumber };
}

/** Time sources, injectable so tests do not need real delays. */
export type WaitClock = {
  now: () => number;
  sleep: (ms: number) => Promise<void>;
};

const realClock: WaitClock = {
  now: () => Date.now(),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};

const MAX_RATE_LIMIT_BACKOFF_MS = 60_000;

/**
 * How long to wait before retrying a 429: the `Retry-After` header (seconds or
 * HTTP date) when present and valid, else exponential backoff from the poll interval.
 */
export function rateLimitDelayMs(
  response: Response,
  attempt: number,
  pollIntervalMs: number,
  nowMs: number,
): number {
  const header = response.headers.get("retry-after");
  if (header) {
    const seconds = Number(header);
    if (Number.isFinite(seconds) && seconds >= 0) {
      return seconds * 1000;
    }
    const date = Date.parse(header);
    if (!Number.isNaN(date)) {
      return Math.max(0, date - nowMs);
    }
  }
  return Math.min(MAX_RATE_LIMIT_BACKOFF_MS, pollIntervalMs * 2 ** attempt);
}

/**
 * Poll a build until it reaches a final status and return its pass/fail
 * outcome. Throws a {@link CliError} when `timeoutSeconds` elapses first, and
 * lets API failures (401, 404, network errors, ...) propagate — a build we
 * cannot read must not look green. A 429 is retried (honouring `Retry-After`)
 * for as long as the deadline allows. Each request is aborted at the deadline,
 * so the wait never overshoots `timeoutSeconds` by a whole request.
 */
export async function waitForBuild(opts: {
  client: ArgosAPIClient;
  buildUrl: string;
  timeoutSeconds: number;
  pollIntervalMs?: number;
  clock?: WaitClock;
  onPoll?: (build: Build) => void;
}): Promise<BuildOutcome> {
  const {
    client,
    buildUrl,
    timeoutSeconds,
    pollIntervalMs = POLL_INTERVAL_MS,
    clock = realClock,
    onPoll,
  } = opts;
  const { owner, project, buildNumber } = parseBuildUrl(buildUrl);
  const deadline = clock.now() + timeoutSeconds * 1000;
  let lastStatus: string = "not yet read";
  let rateLimitAttempt = 0;

  const getBuild = (signal: AbortSignal) =>
    client.GET("/projects/{owner}/{project}/builds/{buildNumber}", {
      params: { path: { owner, project, buildNumber } },
      signal,
    });

  const timeout = (): never =>
    fail(
      `Timed out after ${timeoutSeconds}s waiting for build #${buildNumber} to finish (last status: ${lastStatus}). ${buildUrl}`,
    );

  for (;;) {
    const remainingMs = deadline - clock.now();
    if (remainingMs <= 0) {
      timeout();
    }
    const signal = AbortSignal.timeout(remainingMs);
    let result: Awaited<ReturnType<typeof getBuild>>;
    try {
      result = await getBuild(signal);
    } catch (error) {
      if (signal.aborted) {
        timeout();
      }
      throw error;
    }

    if (result.response.status === 429) {
      const delayMs = rateLimitDelayMs(
        result.response,
        rateLimitAttempt++,
        pollIntervalMs,
        clock.now(),
      );
      lastStatus = "rate limited by the API (HTTP 429)";
      if (delayMs >= deadline - clock.now()) {
        timeout();
      }
      await clock.sleep(delayMs);
      continue;
    }
    rateLimitAttempt = 0;

    const build = unwrap(result);
    lastStatus = build.status;
    if (isFinalStatus(build.status)) {
      return evaluateFinalBuild(build);
    }
    onPoll?.(build);
    const untilDeadlineMs = deadline - clock.now();
    if (untilDeadlineMs <= 0) {
      timeout();
    }
    // Never sleep past the deadline.
    await clock.sleep(Math.min(pollIntervalMs, untilDeadlineMs));
  }
}
