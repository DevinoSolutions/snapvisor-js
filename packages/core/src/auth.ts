import {
  isGitHubActionsOidcAvailable,
  exchangeGitHubActionsOidcToken,
} from "./github-actions-oidc";
import {
  isGitHubActionsTokenlessAvailable,
  exchangeGitHubActionsTokenlessToken,
} from "./github-actions-tokenless";
import type { Config } from "./config";
import { debug } from "./debug";

/**
 * Resolve the Snapvisor authentication token.
 * Priority: ARGOS_TOKEN > GitHub Actions OIDC > GitHub Actions tokenless exchange.
 */
export async function resolveArgosToken(config: Config): Promise<string> {
  if (config.token) {
    debug("Authenticated with ARGOS_TOKEN.");
    return config.token;
  }

  if (isGitHubActionsOidcAvailable()) {
    const token = await exchangeGitHubActionsOidcToken({
      apiBaseUrl: config.apiBaseUrl,
      config,
    });
    debug("Authenticated with GitHub Actions OIDC.");
    debug(`Repository: ${config.originalRepository}`);
    debug(`Run: ${config.runId}`);
    return token;
  }

  if (isGitHubActionsTokenlessAvailable(config)) {
    const token = await exchangeGitHubActionsTokenlessToken({
      apiBaseUrl: config.apiBaseUrl,
      config,
    });
    debug("Authenticated with GitHub Actions tokenless exchange.");
    debug(`Repository: ${config.originalRepository}`);
    debug(`Run: ${config.runId}`);
    return token;
  }

  throw new Error("Missing Snapvisor repository token 'ARGOS_TOKEN'");
}
