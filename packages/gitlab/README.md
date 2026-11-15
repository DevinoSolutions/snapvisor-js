# Snapvisor GitLab

GitLab utilities to report Snapvisor build statuses back to your merge requests when running Snapvisor with a self-managed GitLab instance.

[![npm version](https://img.shields.io/npm/v/@snapvisor/gitlab.svg)](https://www.npmjs.com/package/@snapvisor/gitlab)
[![npm dm](https://img.shields.io/npm/dm/@snapvisor/gitlab.svg)](https://www.npmjs.com/package/@snapvisor/gitlab)
[![npm dt](https://img.shields.io/npm/dt/@snapvisor/gitlab.svg)](https://www.npmjs.com/package/@snapvisor/gitlab)

Visit the [GitLab integration documentation](https://snapvisor.io/docs/gitlab) for the full setup guide.

## Usage

Run the `snapvisor-gitlab update-statuses` command in your GitLab CI pipeline. It waits for the Snapvisor builds of the current commit to complete and reports their status to the related merge request:

```yaml
# .gitlab-ci.yml
argos-status:
  script:
    - npx @snapvisor/gitlab update-statuses
  variables:
    SNAPVISOR_TOKEN: $SNAPVISOR_TOKEN
    SNAPVISOR_GITLAB_TOKEN: $SNAPVISOR_GITLAB_TOKEN
```

`SNAPVISOR_GITLAB_TOKEN` is a GitLab access token allowed to post commit statuses. The `CI_PROJECT_ID`, `CI_SERVER_URL`, and `CI_COMMIT_SHA` variables are provided by GitLab CI automatically.

> The Argos-named `argos-gitlab` command, `ARGOS_TOKEN` and `ARGOS_GITLAB_TOKEN` still work, and win if both names are set.

## Links

- [GitLab integration guide](https://snapvisor.io/docs/gitlab)
- [Snapvisor docs](https://snapvisor.io/docs)

## Attribution

Based on [Argos](https://github.com/argos-ci/argos-javascript) (MIT, Copyright 2022 Smooth Code). Snapvisor modifications are copyright Devino Solutions Inc. See the [LICENSE](https://github.com/DevinoSolutions/snapvisor-js/blob/main/LICENSE).
