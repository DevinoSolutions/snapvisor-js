import type { ArgosAPIClient, ArgosAPISchema } from "@snapvisor/api-client";
import { InvalidArgumentError } from "commander";
import { unwrap } from "./api";
import { fail } from "./cli-error";
import { resolveToken } from "./target";

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
  const parallelFromEnv = ["true", "1"].includes(
    (process.env["ARGOS_PARALLEL"] ?? "").toLowerCase(),
  );
  if (options.parallel || parallelFromEnv) {
    fail(
      "--wait cannot be combined with --parallel (or ARGOS_PARALLEL): a parallel build only finishes once every shard is uploaded and the build is finalized, so waiting on one shard would time out.",
    );
  }
  // Tokenless / OIDC uploads authenticate inside the upload and expose no token
  // to poll with, so fail now rather than after the build was created.
  return resolveToken({ token: options.token });
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
 * Passes: `accepted` (reviewed or auto-approved) and `no-changes`. Everything
 * else fails, `changes-detected` included — that build is waiting for a human
 * review, which is exactly what `--wait` exists to surface to CI.
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
  const segments = new URL(url).pathname.split("/").filter(Boolean).slice(-4);
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

/**
 * Poll a build until it reaches a final status and return its pass/fail
 * outcome. Throws a {@link CliError} when `timeoutSeconds` elapses first, and
 * lets API failures propagate — a build we cannot read must not look green.
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

  for (;;) {
    const build = unwrap(
      await client.GET("/projects/{owner}/{project}/builds/{buildNumber}", {
        params: { path: { owner, project, buildNumber } },
      }),
    );
    if (isFinalStatus(build.status)) {
      return evaluateFinalBuild(build);
    }
    onPoll?.(build);
    const remainingMs = deadline - clock.now();
    if (remainingMs <= 0) {
      fail(
        `Timed out after ${timeoutSeconds}s waiting for build #${build.number} to finish (last status: ${build.status}). ${buildUrl}`,
      );
    }
    // Never sleep past the deadline, so the last poll lands right on it.
    await clock.sleep(Math.min(pollIntervalMs, remainingMs));
  }
}
