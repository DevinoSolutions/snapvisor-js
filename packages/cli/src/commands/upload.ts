import type { Command } from "commander";
import { Option } from "commander";
import { upload } from "@snapvisor/core";
import ora from "ora";
import { createApiClient } from "../lib/api";
import { handleCliError } from "../lib/run";
import {
  DEFAULT_WAIT_TIMEOUT_SECONDS,
  parseWaitTimeout,
  prepareWait,
  waitForBuild,
} from "../lib/wait-for-build";
import {
  buildNameOption,
  parallelNonceOption,
  projectOption,
  tokenOption,
  type BuildNameOption,
  type ParallelNonceOption,
  type ProjectOption,
  type TokenOption,
} from "../options";

type UploadOptions = BuildNameOption &
  ParallelNonceOption &
  ProjectOption &
  TokenOption & {
    files?: string[] | undefined;
    ignore?: string[] | undefined;
    mode?: "ci" | "monitoring" | undefined;
    parallel?: boolean | undefined;
    parallelTotal?: number | undefined;
    parallelIndex?: number | undefined;
    referenceBranch?: string | undefined;
    referenceCommit?: string | undefined;
    threshold?: number | undefined;
    subset?: boolean | undefined;
    wait?: boolean | undefined;
    waitTimeout?: number | undefined;
  };

export function uploadCommand(program: Command) {
  program
    .command("upload")
    .argument("<directory>", "Directory to upload")
    .description("Upload screenshots to Snapvisor")
    .option(
      "-f, --files <patterns...>",
      "One or more globs matching image file paths to upload",
      "**/*.{png,jpg,jpeg}",
    )
    .option(
      "-i, --ignore <patterns...>",
      'One or more globs matching image file paths to ignore (ex: "**/*.png **/diff.jpg")',
    )
    .addOption(tokenOption)
    .addOption(projectOption)
    .addOption(buildNameOption)
    .addOption(
      new Option(
        "--mode <string>",
        "Mode of comparison applied. CI for visual regression testing, monitoring for visual monitoring.",
      )
        .default("ci")
        .choices(["ci", "monitoring"]),
    )
    .addOption(
      new Option(
        "--parallel",
        "Enable parallel mode. Run multiple Snapvisor builds and combine them at the end.\nCan also be set via the ARGOS_PARALLEL environment variable.",
      ),
    )
    .addOption(
      new Option(
        "--parallel-total <number>",
        "The number of parallel nodes being ran",
      ),
    )
    .addOption(parallelNonceOption)
    .addOption(
      new Option(
        "--parallel-index <number>",
        "The index of the parallel node being ran (must be at least 1)",
      ),
    )
    .addOption(
      new Option(
        "--reference-branch <string>",
        "Branch used as baseline for screenshot comparison",
      ),
    )
    .addOption(
      new Option(
        "--reference-commit <string>",
        "Commit used as baseline for screenshot comparison",
      ),
    )
    .addOption(
      new Option(
        "--threshold <number>",
        "Sensitivity threshold between 0 and 1. The higher the threshold, the less sensitive the diff will be. Default to 0.5",
      ),
    )
    .addOption(
      new Option(
        "--subset",
        "Whether this build contains only a subset of screenshots.\nThis is useful when a build is created from an incomplete test suite where some tests are skipped.\nCan also be set via the ARGOS_SUBSET environment variable.",
      ),
    )
    .addOption(
      new Option(
        "--wait",
        "Wait for the build to finish, then exit 0 if it is accepted or has no changes, and exit 1 if it needs review, is rejected, expired, aborted or errored, or if the wait times out.\nRequires a token (--token, ARGOS_TOKEN) and cannot be combined with --parallel.",
      ),
    )
    .addOption(
      new Option(
        "--wait-timeout <seconds>",
        `Maximum time to wait for the build when --wait is set. Defaults to ${DEFAULT_WAIT_TIMEOUT_SECONDS}.`,
      ).argParser(parseWaitTimeout),
    )
    .action(async (directory: string, options: UploadOptions) => {
      let waitToken: string | null;
      try {
        waitToken = await prepareWait({
          wait: options.wait,
          waitTimeout: options.waitTimeout,
          parallel: options.parallel,
          token: options.token,
        });
      } catch (error) {
        handleCliError(error);
      }
      const spinner = ora("Uploading screenshots").start();
      let buildUrl: string;
      try {
        const parallel = (() => {
          if (!options.parallel) {
            return undefined;
          }
          if (!options.parallelNonce) {
            spinner.fail("--parallel-nonce is required if --parallel is set");
            process.exit(1);
          }
          if (!options.parallelTotal) {
            spinner.fail("--parallel-total is required if --parallel is set");
            process.exit(1);
          }
          return {
            nonce: options.parallelNonce,
            total: options.parallelTotal,
            index: options.parallelIndex,
          };
        })();
        const result = await upload({
          token: options.token,
          project: options.project,
          root: directory,
          buildName: options.buildName,
          files: options.files,
          ignore: options.ignore,
          parallel,
          referenceBranch: options.referenceBranch,
          referenceCommit: options.referenceCommit,
          mode: options.mode,
          threshold: options.threshold,
          subset: options.subset,
        });
        buildUrl = result.build.url;
        spinner.succeed(`Build created: ${buildUrl}`);
      } catch (error) {
        if (error instanceof Error) {
          spinner.fail(`Build failed: ${error.message}`);
          console.error(error.stack);
        }
        process.exit(1);
      }

      if (waitToken === null) {
        return;
      }
      const waitSpinner = ora("Waiting for the build to finish").start();
      try {
        const outcome = await waitForBuild({
          client: createApiClient(waitToken),
          buildUrl,
          timeoutSeconds: options.waitTimeout ?? DEFAULT_WAIT_TIMEOUT_SECONDS,
          onPoll: (build) => {
            waitSpinner.text = `Waiting for the build to finish (status: ${build.status})`;
          },
        });
        if (outcome.ok) {
          waitSpinner.succeed(`${outcome.summary}: ${buildUrl}`);
        } else {
          waitSpinner.fail(`${outcome.summary}: ${buildUrl}`);
          process.exit(1);
        }
      } catch (error) {
        waitSpinner.fail("Waiting for the build failed");
        handleCliError(error);
      }
    });
}
