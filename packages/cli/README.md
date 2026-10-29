<p align="center">
  <a href="https://argos-ci.com/?utm_source=github&utm_medium=logo" target="_blank">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/argos-ci/argos/main/resources/logos/github-readme-logo-dark.png">
    <img alt="Argos" src="https://raw.githubusercontent.com/argos-ci/argos/main/resources/logos/github-readme-logo-light.png" width="360" height="70">
  </picture>
  </a>
</p>

<p align="center"><strong>The open source visual testing platform for teams and AI agents.</strong></p>

# Argos Command Line Interface

Interact with and upload screenshots to [argos-ci.com](https://argos-ci.com) from the command line.

[![npm version](https://img.shields.io/npm/v/@snapvisor/cli.svg)](https://www.npmjs.com/package/@snapvisor/cli)
[![npm dm](https://img.shields.io/npm/dm/@snapvisor/cli.svg)](https://www.npmjs.com/package/@snapvisor/cli)
[![npm dt](https://img.shields.io/npm/dt/@snapvisor/cli.svg)](https://www.npmjs.com/package/@snapvisor/cli)

Visit the [Argos CLI documentation](https://argos-ci.com/docs/reference/argos-command-line-interface-cli) for the full command reference and more.

## Installation

```sh
npm install --save-dev @snapvisor/cli
```

## Usage

Upload a directory of screenshots to Argos. Authenticate with your project token via the `ARGOS_TOKEN` environment variable:

```sh
ARGOS_TOKEN="<your-argos-token>" npx @snapvisor/cli upload ./screenshots
```

### Failing CI when a build needs review

By default `upload` exits right after the build is created, so a build with unreviewed changes does not fail the job (the commit status does). Pass `--wait` to make the command wait for the build to finish and report the result through its exit code:

```sh
ARGOS_TOKEN="<your-argos-token>" npx @snapvisor/cli upload ./screenshots --wait --wait-timeout 300
```

| Build state                                                | Exit code |
| ---------------------------------------------------------- | --------- |
| `accepted` / `no-changes`                                  | `0`       |
| `changes-detected` on a reference build (auto-approved)    | `0`       |
| `changes-detected` awaiting review                         | `1`       |
| `rejected`, `expired`, `aborted`, `error`                  | `1`       |
| Still running after `--wait-timeout` seconds (default 600) | `1`       |

The exit code always agrees with the build's commit status: success is exit 0, pending review or failure is exit 1. A `429` from the API is retried until the timeout. The build URL and final state are printed either way. `--wait` polls the Snapvisor API, so it needs a token it can read the build with (`--token` or `ARGOS_TOKEN`): GitHub Actions OIDC and tokenless uploads, and `argos login` sessions, are not supported. It cannot be combined with `--parallel`, because a parallel build only finishes once it is finalized.

The CLI also exposes commands to `deploy` a static build, inspect and `review` builds, post a `comment`, and more. List them all with:

```sh
npx @snapvisor/cli --help
```

## Links

- [Official CLI Docs](https://argos-ci.com/docs/reference/argos-command-line-interface-cli)
- [Discord](https://argos-ci.com/discord)
