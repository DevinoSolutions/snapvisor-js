/**
 * Get the configuration from the environment variables.
 */
export function getConfig() {
  if (!process.env.CI_PROJECT_ID) {
    throw new Error("CI_PROJECT_ID is not set");
  }
  if (!process.env.CI_SERVER_URL) {
    throw new Error("CI_SERVER_URL is not set");
  }
  if (!process.env.CI_COMMIT_SHA) {
    throw new Error("CI_COMMIT_SHA is not set");
  }
  // The Snapvisor-named variables are aliases; the Argos-named ones win.
  const gitlabToken =
    process.env.ARGOS_GITLAB_TOKEN || process.env.SNAPVISOR_GITLAB_TOKEN;
  const snapvisorToken = process.env.ARGOS_TOKEN || process.env.SNAPVISOR_TOKEN;
  if (!gitlabToken) {
    throw new Error(
      "ARGOS_GITLAB_TOKEN (or SNAPVISOR_GITLAB_TOKEN) is not set",
    );
  }
  if (!snapvisorToken) {
    throw new Error("ARGOS_TOKEN (or SNAPVISOR_TOKEN) is not set");
  }
  return {
    commit: process.env.CI_COMMIT_SHA,
    argosToken: snapvisorToken,
    gitlab: {
      projectId: process.env.CI_PROJECT_ID,
      authToken: gitlabToken,
      baseUrl: process.env.CI_SERVER_URL,
    },
  };
}
