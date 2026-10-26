/**
 * Guard for `lerna publish` in independent mode.
 *
 * Lerna picks ONE baseline for the whole repo: `git describe --first-parent --match '*@*'`
 * from HEAD, which only sees ANNOTATED tags (lerna creates them with `git tag -m`). A
 * lightweight tag, e.g. one created by hand for a `from-package` release, is invisible to
 * that lookup, so lerna silently falls back to an older release and re-bumps every package
 * touched since (2026-10-26: `@snapvisor/storybook@7.0.1` was lightweight, the baseline
 * fell back to b27308a and `lerna publish` bumped all 8 public packages).
 *
 * Fails the release when a nearer lightweight release tag is hiding the real baseline.
 */
import { execFileSync } from "node:child_process";

const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();

const describeNearestTag = (...extraArgs) =>
  git(
    "describe",
    ...extraArgs,
    "--first-parent",
    "--abbrev=0",
    "--match",
    "*@*",
    "HEAD",
  );

const lernaBaseline = describeNearestTag();
const nearestAnyTag = describeNearestTag("--tags");

if (lernaBaseline !== nearestAnyTag) {
  throw new Error(
    `Release baseline mismatch: lerna would diff against ${lernaBaseline} because ` +
      `${nearestAnyTag} is a lightweight tag, which lerna ignores. Recreate it as an ` +
      `annotated tag on the same commit (git tag -f -a -m "<tag>" <tag> <commit>, then ` +
      `force-push that one tag) before running the release.`,
  );
}

console.log(`Release baseline OK: lerna will diff against ${lernaBaseline}`);
