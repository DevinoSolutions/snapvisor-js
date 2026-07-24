# Snapvisor SDKs & CLI for JavaScript

Official [Snapvisor](https://app.snapvisor.io) JavaScript SDKs and CLI for visual
regression testing. This monorepo centralizes every Snapvisor JavaScript package
under the `@snapvisor/` namespace, providing a consistent interface across
JavaScript environments.

## Links

- App: https://app.snapvisor.io
- Docs: https://snapvisor.io/docs

## Packages

Pick the high-level SDK for your test framework, then follow that package's README:

- [`@snapvisor/playwright`](packages/playwright) — capture screenshots from your [Playwright](https://playwright.dev/) tests: `npm i @snapvisor/playwright`
- [`@snapvisor/storybook`](packages/storybook) — capture screenshots of your [Storybook](https://storybook.js.org/) stories: `npm i @snapvisor/storybook`
- [`@snapvisor/vitest`](packages/vitest) — capture screenshots from your [Vitest](https://vitest.dev/) browser tests: `npm i @snapvisor/vitest`
- [`@snapvisor/cli`](packages/cli) — interact with and upload screenshots to Snapvisor from the command line: `npm i -D @snapvisor/cli`
- [`@snapvisor/core`](packages/core) — Node.js SDK, the base for building other integrations: `npm i @snapvisor/core`
- [`@snapvisor/api-client`](packages/api-client) — typed client for the Snapvisor API: `npm i @snapvisor/api-client`
- [`@snapvisor/browser`](packages/browser) — browser utilities to stabilize visual testing: `npm i @snapvisor/browser`
- [`@snapvisor/util`](packages/util) — shared utilities used across the SDKs: `npm i @snapvisor/util`

## Attribution

Snapvisor-JS is a fork of [argos-ci/argos-javascript](https://github.com/argos-ci/argos-javascript)
(MIT, Copyright 2022 Smooth Code). We track upstream — see SYNC.md.
