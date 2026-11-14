# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [0.5.0](https://github.com/DevinoSolutions/snapvisor-js/compare/%40snapvisor%2Fvitest%400.4.2...%40snapvisor%2Fvitest%400.5.0) (2026-11-14)

### Bug Fixes

* declare captureIndex on the Vitest browser commands ([d7e8669](https://github.com/DevinoSolutions/snapvisor-js/commit/d7e86699532fb15f1d6d6173567902217bdac2ef))
* point package bugs and homepage links at snapvisor-js ([#25](https://github.com/DevinoSolutions/snapvisor-js/issues/25)) ([a1f9002](https://github.com/DevinoSolutions/snapvisor-js/commit/a1f900261674dae30a611eea8f67f2a00f77105d))
* **vitest:** harden the detection of Storybook stories ([38c9bd4](https://github.com/DevinoSolutions/snapvisor-js/commit/38c9bd4b048282dd63c5e230f4af7d99257e7611))
* **vitest:** make argosScreenshot and auto-naming work on Vitest 4.0 ([#390](https://github.com/DevinoSolutions/snapvisor-js/issues/390)) ([ad112ad](https://github.com/DevinoSolutions/snapvisor-js/commit/ad112ad4d3200da38d7efd7ac88cbe8fafc91aaa))
* **vitest:** report object retry options as a retry count ([#391](https://github.com/DevinoSolutions/snapvisor-js/issues/391)) ([921c141](https://github.com/DevinoSolutions/snapvisor-js/commit/921c141b3688cf87a75a73db53a8897d0413e4d7))
* **vitest:** size the Vitest iframe from the settled layout ([ef30244](https://github.com/DevinoSolutions/snapvisor-js/commit/ef302441ba8934a00295bfad9711f7f719b6d0cd))

### Features

* accept selectors in the Playwright and Vitest `mask` option ([586e091](https://github.com/DevinoSolutions/snapvisor-js/commit/586e091b6541cc3883ae86315fe478597ae6dc5b))
* add `hide` and `remove` screenshot options ([971e056](https://github.com/DevinoSolutions/snapvisor-js/commit/971e056c57596d4927d8be5e6b3d2e5367af6cf8))
* expose a baseName option to set fallback baselines ([ab26668](https://github.com/DevinoSolutions/snapvisor-js/commit/ab26668e3a40ba405e7ca9143c5df9398d47fb73))
* record the capture order of screenshots ([47127b0](https://github.com/DevinoSolutions/snapvisor-js/commit/47127b059426956de250ebc2cf49aaeccb836542))
* **storybook:** support Storybook 11 ([#381](https://github.com/DevinoSolutions/snapvisor-js/issues/381)) ([f05b974](https://github.com/DevinoSolutions/snapvisor-js/commit/f05b974cd2dc924cc8d57f0bf4686938a228fad7))
* **vitest:** report screenshots of Storybook stories as Storybook ([6d2f477](https://github.com/DevinoSolutions/snapvisor-js/commit/6d2f477b724471bd1a5c3e199a3af81593e94447))
* **vitest:** support Vitest 5 alongside Vitest 4 ([#373](https://github.com/DevinoSolutions/snapvisor-js/issues/373)) ([971234f](https://github.com/DevinoSolutions/snapvisor-js/commit/971234f8d7835d5b892a8cba774b88b03be96b2d))


## [0.4.2](https://github.com/DevinoSolutions/snapvisor-js/compare/@snapvisor/vitest@0.4.1...@snapvisor/vitest@0.4.2) (2026-10-29)

**Note:** Version bump only for package @snapvisor/vitest





## [0.4.1](https://github.com/DevinoSolutions/snapvisor-js/compare/@snapvisor/vitest@0.4.0...@snapvisor/vitest@0.4.1) (2026-10-25)

**Note:** Version bump only for package @snapvisor/vitest





# 0.4.0 (2026-07-24)


### Bug Fixes

* rebrand user-facing prose to Snapvisor ([5b2a25e](https://github.com/DevinoSolutions/snapvisor-js/commit/5b2a25ebe90bbd56fe7c581230b54a75f829655d))
* **vitest:** fail the run instead of exiting 0 when the upload fails ([ce16b7f](https://github.com/DevinoSolutions/snapvisor-js/commit/ce16b7f5f785a62365756bd20c77a9e42c20fa02))
* **vitest:** upload ARIA snapshots to Argos ([8b4c563](https://github.com/DevinoSolutions/snapvisor-js/commit/8b4c5637719574b8f14df1c8fc941e7e77799ed4))


* feat(vitest)!: default output directory to `snapshots` ([b1d6162](https://github.com/DevinoSolutions/snapvisor-js/commit/b1d6162591769096a139ee7bafbc4fbf6dc63930))


### Features

* **playwright:** warn when recommended Chromium launch options are missing ([a8f6c55](https://github.com/DevinoSolutions/snapvisor-js/commit/a8f6c556362962da57eb0e6d21f18ee2bf622a09))
* **vitest:** add argosSnapshot for value snapshots anywhere ([0a6201f](https://github.com/DevinoSolutions/snapvisor-js/commit/0a6201f7e3ad8f26045c50130978a1aacc8fe6c6))
* **vitest:** add automatic naming for screenshots and snapshots ([fe878d6](https://github.com/DevinoSolutions/snapvisor-js/commit/fe878d6d4096fae39cdbfc9ad0205e49e78ab348))
* **vitest:** add standalone @argos-ci/vitest package ([e27f7d2](https://github.com/DevinoSolutions/snapvisor-js/commit/e27f7d2823ea8e60f50ae54977434cb5aa93448a))
* **vitest:** attach test metadata to screenshots and snapshots ([720d3e5](https://github.com/DevinoSolutions/snapvisor-js/commit/720d3e5db7e4b80c3f003d4aad9c3300363bd508))
* **vitest:** auto-detect sharding for parallel builds (ARG-458) ([69db44d](https://github.com/DevinoSolutions/snapvisor-js/commit/69db44d1deb0b7292d71a9f6a4e4d13b2b34a08e))
* **vitest:** report `vitest` as the screenshot automation library ([05cf218](https://github.com/DevinoSolutions/snapvisor-js/commit/05cf2185e6d87212359df398b9cdd5d612d8df2b))
* **vitest:** scope auto names to the test file and cap filename length ([ab6ff2f](https://github.com/DevinoSolutions/snapvisor-js/commit/ab6ff2f7aab9e8cfdb2ff31c03864df2da1f01c8))


### BREAKING CHANGES

* `@argos-ci/vitest` now writes to `./snapshots` by default.
Pass `root: "./screenshots"` to the plugin (and `argosSnapshot`'s `root`
option) to keep the previous location.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
* **vitest:** `argosSnapshot(name, content, options)` is now
`argosSnapshot(content, { name, ...options })`.

Closes ARG-460

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>





## [0.3.2](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/vitest@0.3.1...@argos-ci/vitest@0.3.2) (2026-07-23)


### Bug Fixes

* **vitest:** fail the run instead of exiting 0 when the upload fails ([ce16b7f](https://github.com/argos-ci/argos-javascript/commit/ce16b7f5f785a62365756bd20c77a9e42c20fa02))





## [0.3.1](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/vitest@0.3.0...@argos-ci/vitest@0.3.1) (2026-07-12)

**Note:** Version bump only for package @argos-ci/vitest





# [0.3.0](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/vitest@0.2.4...@argos-ci/vitest@0.3.0) (2026-07-11)


* feat(vitest)!: default output directory to `snapshots` ([b1d6162](https://github.com/argos-ci/argos-javascript/commit/b1d6162591769096a139ee7bafbc4fbf6dc63930))


### Features

* **vitest:** add automatic naming for screenshots and snapshots ([fe878d6](https://github.com/argos-ci/argos-javascript/commit/fe878d6d4096fae39cdbfc9ad0205e49e78ab348))
* **vitest:** attach test metadata to screenshots and snapshots ([720d3e5](https://github.com/argos-ci/argos-javascript/commit/720d3e5db7e4b80c3f003d4aad9c3300363bd508))
* **vitest:** auto-detect sharding for parallel builds (ARG-458) ([69db44d](https://github.com/argos-ci/argos-javascript/commit/69db44d1deb0b7292d71a9f6a4e4d13b2b34a08e))
* **vitest:** report `vitest` as the screenshot automation library ([05cf218](https://github.com/argos-ci/argos-javascript/commit/05cf2185e6d87212359df398b9cdd5d612d8df2b))
* **vitest:** scope auto names to the test file and cap filename length ([ab6ff2f](https://github.com/argos-ci/argos-javascript/commit/ab6ff2f7aab9e8cfdb2ff31c03864df2da1f01c8))


### BREAKING CHANGES

* `@argos-ci/vitest` now writes to `./snapshots` by default.
Pass `root: "./screenshots"` to the plugin (and `argosSnapshot`'s `root`
option) to keep the previous location.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
* **vitest:** `argosSnapshot(name, content, options)` is now
`argosSnapshot(content, { name, ...options })`.

Closes ARG-460

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>





## [0.2.4](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/vitest@0.2.3...@argos-ci/vitest@0.2.4) (2026-07-10)

**Note:** Version bump only for package @argos-ci/vitest





## [0.2.3](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/vitest@0.2.2...@argos-ci/vitest@0.2.3) (2026-07-09)

**Note:** Version bump only for package @argos-ci/vitest





## [0.2.2](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/vitest@0.2.1...@argos-ci/vitest@0.2.2) (2026-07-09)

**Note:** Version bump only for package @argos-ci/vitest





## [0.2.1](https://github.com/argos-ci/argos-javascript/compare/@argos-ci/vitest@0.2.0...@argos-ci/vitest@0.2.1) (2026-07-09)

**Note:** Version bump only for package @argos-ci/vitest





# 0.2.0 (2026-07-09)


### Bug Fixes

* **vitest:** upload ARIA snapshots to Argos ([8b4c563](https://github.com/argos-ci/argos-javascript/commit/8b4c5637719574b8f14df1c8fc941e7e77799ed4))


### Features

* **vitest:** add argosSnapshot for value snapshots anywhere ([0a6201f](https://github.com/argos-ci/argos-javascript/commit/0a6201f7e3ad8f26045c50130978a1aacc8fe6c6))
* **vitest:** add standalone @argos-ci/vitest package ([e27f7d2](https://github.com/argos-ci/argos-javascript/commit/e27f7d2823ea8e60f50ae54977434cb5aa93448a))
