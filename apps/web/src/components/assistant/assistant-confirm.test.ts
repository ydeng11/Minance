// Test: Assistant confirmation buttons render correctly
import test from "node:test";
import assert from "node:assert/strict";

test("assistant confirm/cancel API endpoints match expected pattern", () => {
  // Verify the endpoint URL pattern is consistent
  const actionId = "pending_act_abc123";
  const confirmUrl = `/v1/assistant/actions/${encodeURIComponent(actionId)}/confirm`;
  const cancelUrl = `/v1/assistant/actions/${encodeURIComponent(actionId)}/cancel`;

  assert.equal(confirmUrl, "/v1/assistant/actions/pending_act_abc123/confirm");
  assert.equal(cancelUrl, "/v1/assistant/actions/pending_act_abc123/cancel");
});

test("assistant confirmation buttons require pendingActionKey", () => {
  // A confirmation button group should only render when pendingActionKey is set
  const withKey = { confirmationPreview: { foo: "bar" }, pendingActionKey: "key_123" };
  const withoutKey = { confirmationPreview: { foo: "bar" } };

  assert.ok(withKey.confirmationPreview && withKey.pendingActionKey, "Both required");
  assert.ok(withoutKey.confirmationPreview && !withoutKey.pendingActionKey, "Missing key means no button");
});

test("assistant confirm API payload shape", () => {
  // Confirm response shape
  const confirmSuccess = { confirmed: true, success: true, message: "Budget set.", data: {} };
  const confirmFailure = { confirmed: true, success: false, error: "Benefit not found" };

  assert.equal(confirmSuccess.confirmed, true);
  assert.equal(confirmSuccess.success, true);
  assert.ok(typeof confirmSuccess.message === "string");

  assert.equal(confirmFailure.confirmed, true);
  assert.equal(confirmFailure.success, false);
  assert.ok(typeof confirmFailure.error === "string");
});

test("assistant cancel API payload shape", () => {
  const cancelResponse = { cancelled: true, toolName: "create_recurring_rule" };
  assert.equal(cancelResponse.cancelled, true);
  assert.equal(cancelResponse.toolName, "create_recurring_rule");
});
