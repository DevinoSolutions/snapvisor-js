import { afterEach, describe, expect, it } from "vitest";
import { getAppBaseUrl } from "./oauth";

describe("getAppBaseUrl", () => {
  afterEach(() => {
    delete process.env["ARGOS_APP_BASE_URL"];
  });

  it("defaults to the Snapvisor app", () => {
    delete process.env["ARGOS_APP_BASE_URL"];
    expect(getAppBaseUrl()).toBe("https://app.snapvisor.io/");
  });

  it("reads the app base URL from the environment", () => {
    process.env["ARGOS_APP_BASE_URL"] = "https://app.example.test/";
    expect(getAppBaseUrl()).toBe("https://app.example.test/");
  });
});
