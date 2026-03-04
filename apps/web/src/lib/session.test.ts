import test from "node:test";
import assert from "node:assert/strict";
import { deriveBootstrapStatus } from "./session";

test("deriveBootstrapStatus keeps loading state while validating stored tokens", () => {
  const status = deriveBootstrapStatus({
    accessToken: "token",
    accessExpiresAt: "2099-01-01T00:00:00.000Z",
    refreshToken: "refresh",
    refreshExpiresAt: "2099-01-02T00:00:00.000Z"
  });

  assert.equal(status, "loading");
});

test("deriveBootstrapStatus returns unauthenticated when no stored tokens exist", () => {
  assert.equal(deriveBootstrapStatus(null), "unauthenticated");
});
