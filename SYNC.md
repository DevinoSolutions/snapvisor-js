# Upstream sync — snapvisor-js

Upstream: https://github.com/argos-ci/argos-javascript (remote `upstream`).
Sync = ONE merge commit, never rebase, never detach the GitHub fork parent.

    git fetch upstream && git checkout -b sync/upstream-YYYY-MM-DD main
    git merge upstream/main    # resolve, then PR

Fork-owned (resolve OURS): package names/scope (@snapvisor/*), endpoint defaults
(core/src/config.ts apiBaseUrl, api-client createClient fallback, cli/src/lib/oauth.ts
app base), packages/api-client/src/schema.ts + its codegen URL, cli bin map,
package descriptions, LICENSE (added Devino line), README, SYNC.md,
.github/workflows/* fork adaptations, "private": true on cypress/gitlab/puppeteer/webdriverio.
Everything else: resolve THEIRS.
After every sync: regenerate api-client schema against api.snapvisor.io, run the full
gate, and check `git grep -n '@argos-ci/' -- ':!pnpm-lock.yaml' ':!**/CHANGELOG*'`
for scope reintroductions from upstream's new code.
