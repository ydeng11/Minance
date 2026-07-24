// services/api/test/ai.test.ts
// Tests for AI credential management (ai.ts)

import test from "node:test";
import assert from "node:assert/strict";
import { resetStoreForTests } from "../src/store.ts";

// Import all functions from ai.ts
const {
  validateProviderKey,
  addCredential,
  updateCredentialMeta,
  rotateCredential,
  deleteCredential,
  getPreferences,
  activateProfile,
  resolveProviderForFeature,
  requireAiFeature,
  listCredentials,
  ensureDevOpenRouterCredential,
  getProviderCatalog
} = await import("../src/ai.ts");

// ============================================================================
// validateProviderKey
// ============================================================================

test("validateProviderKey accepts valid OpenAI key", () => {
  assert.deepEqual(validateProviderKey("openai", "sk-proj-test-key"), { ok: true });
});

test("validateProviderKey rejects OpenAI key that doesn't start with sk-", () => {
  const result = validateProviderKey("openai", "invalid-key");
  assert.equal(result.ok, false);
  assert.ok(result.reason?.includes("sk-"));
});

test("validateProviderKey accepts valid OpenRouter key", () => {
  assert.deepEqual(validateProviderKey("openrouter", "sk-or-v1-test-key"), { ok: true });
});

test("validateProviderKey rejects OpenRouter key that doesn't start with sk-or-v1-", () => {
  const result = validateProviderKey("openrouter", "sk-test");
  assert.equal(result.ok, false);
  assert.ok(result.reason?.includes("sk-or-v1-"));
});

test("validateProviderKey accepts valid Anthropic key", () => {
  assert.deepEqual(validateProviderKey("anthropic", "sk-ant-test-key"), { ok: true });
});

test("validateProviderKey rejects Anthropic key that doesn't start with sk-ant-", () => {
  const result = validateProviderKey("anthropic", "sk-test");
  assert.equal(result.ok, false);
  assert.ok(result.reason?.includes("sk-ant-"));
});

test("validateProviderKey accepts valid Google key (length >= 20)", () => {
  assert.deepEqual(validateProviderKey("google", "a".repeat(20)), { ok: true });
});

test("validateProviderKey rejects short Google key", () => {
  const result = validateProviderKey("google", "short");
  assert.equal(result.ok, false);
  assert.ok(result.reason?.includes("invalid"));
});

test("validateProviderKey rejects unsupported provider", () => {
  const result = validateProviderKey("nonexistent", "sk-test");
  assert.equal(result.ok, false);
  assert.equal(result.reason, "Unsupported provider");
});

test("validateProviderKey rejects empty/missing key", () => {
  const result = validateProviderKey("openai", "");
  assert.equal(result.ok, false);
  assert.equal(result.reason, "API key required");
});

// ============================================================================
// Credential CRUD with encrypted storage
// ============================================================================

function makeEmptyStore() {
  return {
    users: [{ id: "user_1", email: "user@example.com", createdAt: "2026-01-01", updatedAt: "2026-01-01" }],
    sessions: [],
    accounts: [],
    transactions: [],
    categories: [],
    categoryRules: [],
    categoryStrategies: [],
    imports: [],
    importRowsRaw: [],
    importRowDiagnostics: [],
    aiProviderCredentials: [],
    aiProviderPreferences: [],
    assistantQueries: [],
    savedViews: [],
    auditEvents: []
  };
}

test("addCredential creates credential with encrypted key", () => {
  resetStoreForTests(makeEmptyStore());

  const profile = addCredential("user_1", "openai", "sk-proj-test-key-12345", "My OpenAI Key");

  assert.ok(profile.id, "Should have an ID");
  assert.ok(profile.id.startsWith("cred_"), "ID should start with cred_");
  assert.equal(profile.provider, "openai");
  assert.equal(profile.label, "My OpenAI Key");
  assert.ok(profile.maskedKey, "Should have masked key");
  // Masked key should show only last 4 characters
  assert.ok(profile.maskedKey.includes("2345") || profile.maskedKey.endsWith("***"), "Key should be masked");
  assert.equal(profile.status, "active");
  assert.ok(profile.createdAt);
  assert.ok(profile.updatedAt);
  assert.ok(profile.lastValidatedAt);
});

test("addCredential auto-activates first profile", () => {
  resetStoreForTests(makeEmptyStore());

  const profile = addCredential("user_1", "openai", "sk-proj-test-key-12345");
  const prefs = getPreferences("user_1");

  assert.equal(prefs.activeProfileId, profile.id);
});

test("addCredential does not auto-activate if a profile already exists", () => {
  resetStoreForTests(makeEmptyStore());

  const first = addCredential("user_1", "openai", "sk-proj-test-key-12345");
  const second = addCredential("user_1", "anthropic", "sk-ant-test-key-67890");

  const prefs = getPreferences("user_1");
  // Should still be the first one
  assert.equal(prefs.activeProfileId, first.id);
});

test("addCredential rejects invalid key", () => {
  resetStoreForTests(makeEmptyStore());

  assert.throws(() => {
    addCredential("user_1", "openai", "bad-key");
  }, /sk-/);
});

test("encryption round-trip: added key can be decrypted via resolve", () => {
  resetStoreForTests(makeEmptyStore());

  addCredential("user_1", "openai", "sk-proj-my-secret-key-99999");
  const resolved = resolveProviderForFeature("user_1");

  assert.equal(resolved.ok, true);
  assert.equal(resolved.apiKey, "sk-proj-my-secret-key-99999");
});

test("listCredentials returns only current user's credentials", () => {
  resetStoreForTests(makeEmptyStore());

  addCredential("user_1", "openai", "sk-proj-test-111");
  addCredential("user_1", "anthropic", "sk-ant-test-222");
  addCredential("user_2", "openai", "sk-proj-test-333");

  const user1Creds = listCredentials("user_1");
  assert.equal(user1Creds.length, 2);

  const user2Creds = listCredentials("user_2");
  assert.equal(user2Creds.length, 1);
});

test("updateCredentialMeta updates label and model", () => {
  resetStoreForTests(makeEmptyStore());

  const profile = addCredential("user_1", "openai", "sk-proj-test-key");

  const updated = updateCredentialMeta("user_1", profile.id, {
    label: "Updated Label",
    model: "gpt-4"
  });

  assert.equal(updated.label, "Updated Label");
  assert.equal(updated.model, "gpt-4");
});

test("updateCredentialMeta throws for non-existent credential", () => {
  resetStoreForTests(makeEmptyStore());

  assert.throws(() => {
    updateCredentialMeta("user_1", "cred_nonexistent", { label: "Test" });
  }, /not found/);
});

test("rotateCredential re-encrypts with new key", () => {
  resetStoreForTests(makeEmptyStore());

  addCredential("user_1", "openai", "sk-proj-old-key-11111");
  const profile = listCredentials("user_1")[0];

  const rotated = rotateCredential("user_1", profile.id, "sk-proj-new-key-22222");

  assert.ok(rotated.updatedAt >= profile.updatedAt);
  assert.ok(rotated.lastValidatedAt >= profile.lastValidatedAt);

  // Verify decryption returns new key
  const resolved = resolveProviderForFeature("user_1");
  assert.equal(resolved.apiKey, "sk-proj-new-key-22222");
});

test("rotateCredential throws for invalid new key", () => {
  resetStoreForTests(makeEmptyStore());

  addCredential("user_1", "openai", "sk-proj-old-key");
  const profile = listCredentials("user_1")[0];

  assert.throws(() => {
    rotateCredential("user_1", profile.id, "invalid");
  }, /sk-/);
});

test("deleteCredential removes credential", () => {
  resetStoreForTests(makeEmptyStore());

  addCredential("user_1", "openai", "sk-proj-test-key");
  const profile = listCredentials("user_1")[0];

  const deleted = deleteCredential("user_1", profile.id);
  assert.equal(deleted, true);

  assert.equal(listCredentials("user_1").length, 0);
});

test("deleteCredential switches active profile to next remaining", () => {
  resetStoreForTests(makeEmptyStore());

  const first = addCredential("user_1", "openai", "sk-proj-first");
  const second = addCredential("user_1", "anthropic", "sk-ant-second");

  deleteCredential("user_1", first.id);

  const prefs = getPreferences("user_1");
  assert.equal(prefs.activeProfileId, second.id);
});

test("deleteCredential sets activeProfileId to null when none remaining", () => {
  resetStoreForTests(makeEmptyStore());

  const profile = addCredential("user_1", "openai", "sk-proj-only");
  deleteCredential("user_1", profile.id);

  const prefs = getPreferences("user_1");
  assert.equal(prefs.activeProfileId, null);
});

test("deleteCredential enforces user isolation", () => {
  resetStoreForTests(makeEmptyStore());

  addCredential("user_1", "openai", "sk-proj-user1");
  const user2Profile = addCredential("user_2", "openai", "sk-proj-user2");

  assert.throws(() => {
    deleteCredential("user_1", user2Profile.id);
  }, /not found/);
});

// ============================================================================
// Profile Management
// ============================================================================

test("activateProfile sets active profile", () => {
  resetStoreForTests(makeEmptyStore());

  const profile = addCredential("user_1", "openai", "sk-proj-test");
  const result = activateProfile("user_1", profile.id);

  assert.equal(result.activeProfileId, profile.id);

  const prefs = getPreferences("user_1");
  assert.equal(prefs.activeProfileId, profile.id);
});

test("activateProfile throws for non-existent profile", () => {
  resetStoreForTests(makeEmptyStore());

  assert.throws(() => {
    activateProfile("user_1", "cred_nonexistent");
  }, /not found/);
});

test("getPreferences returns default preferences when none exist", () => {
  resetStoreForTests(makeEmptyStore());

  const prefs = getPreferences("user_new");
  assert.equal(prefs.activeProfileId, null);
  assert.equal(prefs.updatedAt, null);
});

// ============================================================================
// resolveProviderForFeature
// ============================================================================

test("resolveProviderForFeature returns active profile", () => {
  resetStoreForTests(makeEmptyStore());

  addCredential("user_1", "openai", "sk-proj-active-key");
  const profile = listCredentials("user_1")[0];
  activateProfile("user_1", profile.id);

  const resolved = resolveProviderForFeature("user_1");
  assert.equal(resolved.ok, true);
  assert.equal(resolved.provider, "openai");
  assert.ok(resolved.apiKey);
  assert.ok(resolved.credentialId);
  assert.ok(resolved.model);
});

test("resolveProviderForFeature falls back to first available credential", () => {
  resetStoreForTests(makeEmptyStore());

  addCredential("user_1", "anthropic", "sk-ant-fallback-key");

  const resolved = resolveProviderForFeature("user_1");
  assert.equal(resolved.ok, true);
  assert.equal(resolved.provider, "anthropic");
});

test("resolveProviderForFeature returns {ok:false} when no credentials", () => {
  resetStoreForTests(makeEmptyStore());

  const resolved = resolveProviderForFeature("user_no_creds");
  assert.equal(resolved.ok, false);
  assert.equal(resolved.reason, "No AI credential configured");
});

// ============================================================================
// requireAiFeature
// ============================================================================

test("requireAiFeature returns resolved when configured", () => {
  resetStoreForTests(makeEmptyStore());

  addCredential("user_1", "openai", "sk-proj-test-key");

  const result = requireAiFeature("user_1", "assistant");
  assert.equal(result.ok, true);
  assert.equal(result.provider, "openai");
});

test("requireAiFeature throws AI_SETUP_REQUIRED when not configured", () => {
  resetStoreForTests(makeEmptyStore());

  try {
    requireAiFeature("user_no_creds", "assistant");
    assert.fail("Should have thrown");
  } catch (error: any) {
    assert.equal(error.code, "AI_SETUP_REQUIRED");
    assert.ok(error.message.includes("AI"));
  }
});

// ============================================================================
// ensureDevOpenRouterCredential
// ============================================================================

test("ensureDevOpenRouterCredential is disabled in production", () => {
  const origNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  try {
    const result = ensureDevOpenRouterCredential("user_1");
    assert.equal(result.enabled, false);
    assert.equal(result.reason, "production");
  } finally {
    process.env.NODE_ENV = origNodeEnv;
  }
});

test("ensureDevOpenRouterCredential returns disabled when env key missing", () => {
  const origKey = process.env.OPENROUTER_API_KEY;
  delete process.env.OPENROUTER_API_KEY;
  try {
    const result = ensureDevOpenRouterCredential("user_1");
    assert.equal(result.enabled, false);
    assert.equal(result.reason, "missing_env_key");
  } finally {
    process.env.OPENROUTER_API_KEY = origKey;
  }
});

test("ensureDevOpenRouterCredential creates credential when env key present", () => {
  const origKey = process.env.OPENROUTER_API_KEY;
  process.env.OPENROUTER_API_KEY = "sk-or-v1-test-env-key-123";
  resetStoreForTests(makeEmptyStore());

  try {
    const result = ensureDevOpenRouterCredential("user_1");
    assert.equal(result.enabled, true);
    assert.equal(result.createdCredential, true);

    // Should have created a credential and set it as active
    const creds = listCredentials("user_1");
    assert.equal(creds.length, 1);
    assert.equal(creds[0].provider, "openrouter");

    const prefs = getPreferences("user_1");
    assert.equal(prefs.activeProfileId, creds[0].id);
  } finally {
    process.env.OPENROUTER_API_KEY = origKey;
  }
});

// ============================================================================
// getProviderCatalog
// ============================================================================

test("getProviderCatalog returns provider list", () => {
  const catalog = getProviderCatalog();
  assert.ok(Array.isArray(catalog));
  assert.ok(catalog.length > 0);
  const providers = catalog.map((p: { id: string }) => p.id);
  assert.ok(providers.includes("openai"));
});
