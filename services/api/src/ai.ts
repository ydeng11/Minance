import crypto from "node:crypto";
import { AI_SECRET } from "./config.ts";
import { loadStore, saveStore, addAuditEvent } from "./store.ts";
import { AI_PROVIDERS } from "../../../packages/domain/src/constants.ts";
import { nowIso, createId, maskKey } from "./utils.ts";

const ENCRYPTION_KEY = crypto.createHash("sha256").update(AI_SECRET).digest();

function encrypt(text) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    iv: iv.toString("base64"),
    ciphertext: encrypted.toString("base64"),
    tag: tag.toString("base64")
  };
}

function decrypt(payload) {
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    ENCRYPTION_KEY,
    Buffer.from(payload.iv, "base64")
  );
  decipher.setAuthTag(Buffer.from(payload.tag, "base64"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, "base64")),
    decipher.final()
  ]);

  return decrypted.toString("utf8");
}

export function getProviderCatalog() {
  return Object.values(AI_PROVIDERS);
}

export function validateProviderKey(provider, apiKey) {
  const key = String(apiKey || "").trim();
  if (!AI_PROVIDERS[provider]) {
    return { ok: false, reason: "Unsupported provider" };
  }
  if (!key) {
    return { ok: false, reason: "API key required" };
  }

  if (provider === "openai" && !key.startsWith("sk-")) {
    return { ok: false, reason: "OpenAI key must start with sk-" };
  }
  if (provider === "openrouter" && !key.startsWith("sk-or-v1-")) {
    return { ok: false, reason: "OpenRouter key must start with sk-or-v1-" };
  }
  if (provider === "anthropic" && !key.startsWith("sk-ant-")) {
    return { ok: false, reason: "Anthropic key must start with sk-ant-" };
  }
  if (provider === "google" && key.length < 20) {
    return { ok: false, reason: "Google API key appears invalid" };
  }

  return { ok: true };
}

function credentialToProfile(entry) {
  return {
    id: entry.id,
    provider: entry.provider,
    label: entry.label,
    model: entry.model || null,
    maskedKey: entry.maskedKey,
    status: entry.status,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    lastValidatedAt: entry.lastValidatedAt
  };
}

export function listCredentials(userId) {
  const store = loadStore();
  return store.aiProviderCredentials
    .filter((entry) => entry.userId === userId)
    .map(credentialToProfile);
}

export function addCredential(userId, provider, apiKey, label = "", model = null) {
  const validation = validateProviderKey(provider, apiKey);
  if (!validation.ok) {
    throw new Error(validation.reason);
  }

  const store = loadStore();
  const encrypted = encrypt(apiKey);
  const now = nowIso();
  const resolvedModel = model || AI_PROVIDERS[provider]?.models?.[0] || null;

  const credential = {
    id: createId("cred"),
    userId,
    provider,
    label: String(label || AI_PROVIDERS[provider].name),
    model: resolvedModel,
    encrypted,
    maskedKey: maskKey(apiKey),
    status: "active",
    createdAt: now,
    updatedAt: now,
    lastValidatedAt: now
  };

  store.aiProviderCredentials.push(credential);
  saveStore(store);
  addAuditEvent(userId, "ai.credential.create", { provider, credentialId: credential.id });

  // Auto-activate first profile
  const prefs = getPreferences(userId);
  if (!prefs.activeProfileId) {
    activateProfile(userId, credential.id);
  }

  return credentialToProfile(credential);
}

export function updateCredentialMeta(userId, credentialId, updates) {
  const store = loadStore();
  const credential = store.aiProviderCredentials.find(
    (entry) => entry.id === credentialId && entry.userId === userId
  );
  if (!credential) {
    throw new Error("Credential not found");
  }

  if (updates.label !== undefined) {
    credential.label = String(updates.label);
  }
  if (updates.model !== undefined) {
    const providerModels = AI_PROVIDERS[credential.provider]?.models || [];
    const resolvedModel = updates.model || providerModels[0] || null;
    credential.model = resolvedModel;
  }

  credential.updatedAt = nowIso();
  saveStore(store);
  addAuditEvent(userId, "ai.credential.update", { credentialId, updates });

  return credentialToProfile(credential);
}

export function rotateCredential(userId, credentialId, apiKey) {
  const store = loadStore();
  const credential = store.aiProviderCredentials.find(
    (entry) => entry.id === credentialId && entry.userId === userId
  );
  if (!credential) {
    throw new Error("Credential not found");
  }

  const validation = validateProviderKey(credential.provider, apiKey);
  if (!validation.ok) {
    throw new Error(validation.reason);
  }

  credential.encrypted = encrypt(apiKey);
  credential.maskedKey = maskKey(apiKey);
  credential.updatedAt = nowIso();
  credential.lastValidatedAt = nowIso();

  saveStore(store);
  addAuditEvent(userId, "ai.credential.rotate", {
    provider: credential.provider,
    credentialId: credential.id
  });

  return credentialToProfile(credential);
}

export function deleteCredential(userId, credentialId) {
  const store = loadStore();
  const before = store.aiProviderCredentials.length;
  store.aiProviderCredentials = store.aiProviderCredentials.filter(
    (entry) => !(entry.userId === userId && entry.id === credentialId)
  );

  if (before === store.aiProviderCredentials.length) {
    throw new Error("Credential not found");
  }

  // If the deleted credential was the active profile, auto-activate first remaining
  const prefs = store.aiProviderPreferences.find((entry) => entry.userId === userId);
  if (prefs && prefs.activeProfileId === credentialId) {
    const remaining = store.aiProviderCredentials.filter((entry) => entry.userId === userId);
    prefs.activeProfileId = remaining.length > 0 ? remaining[0].id : null;
    prefs.updatedAt = nowIso();
  }

  saveStore(store);
  addAuditEvent(userId, "ai.credential.delete", { credentialId });

  return true;
}

export function getPreferences(userId) {
  const store = loadStore();
  const existing = store.aiProviderPreferences.find((entry) => entry.userId === userId);
  if (existing) {
    return existing;
  }

  return {
    userId,
    activeProfileId: null,
    updatedAt: null
  };
}

export function activateProfile(userId, profileId) {
  const store = loadStore();
  const credential = store.aiProviderCredentials.find(
    (entry) => entry.id === profileId && entry.userId === userId
  );
  if (!credential) {
    throw new Error("Profile not found");
  }

  let existing = store.aiProviderPreferences.find((entry) => entry.userId === userId);
  if (!existing) {
    existing = {
      userId,
      activeProfileId: profileId,
      updatedAt: nowIso()
    };
    store.aiProviderPreferences.push(existing);
  } else {
    existing.activeProfileId = profileId;
    existing.updatedAt = nowIso();
  }

  saveStore(store);
  addAuditEvent(userId, "ai.profile.activate", { profileId });

  return { activeProfileId: profileId };
}

export function updatePreferences(userId, payload) {
  // Deprecated — kept for compatibility; delegates to activateProfile if defaultProvider changes
  if (payload.defaultProvider && !payload.activeProfileId) {
    const store = loadStore();
    const credential = store.aiProviderCredentials.find(
      (entry) => entry.userId === userId && entry.provider === payload.defaultProvider && entry.status === "active"
    );
    if (credential) {
      return activateProfile(userId, credential.id);
    }
  }
  if (payload.activeProfileId) {
    return activateProfile(userId, payload.activeProfileId);
  }
  return getPreferences(userId);
}

export function resolveProviderForFeature(userId, _feature = "general") {
  const store = loadStore();
  const prefs = store.aiProviderPreferences.find((entry) => entry.userId === userId);

  // Resolve model fallback, then build the resolved credential result
  function resolveCredential(credential) {
    const model = credential.model || AI_PROVIDERS[credential.provider]?.models?.[0] || null;
    return {
      ok: true,
      provider: credential.provider,
      model,
      credentialId: credential.id,
      apiKey: decrypt(credential.encrypted)
    };
  }

  // Use active profile
  if (prefs?.activeProfileId) {
    const credential = store.aiProviderCredentials.find(
      (entry) => entry.id === prefs.activeProfileId && entry.userId === userId && entry.status === "active"
    );
    if (credential) {
      return resolveCredential(credential);
    }
  }

  // Fallback: use first available credential
  const credentials = store.aiProviderCredentials.filter(
    (entry) => entry.userId === userId && entry.status === "active"
  );
  if (credentials.length > 0) {
    return resolveCredential(credentials[0]);
  }

  return {
    ok: false,
    reason: "No AI credential configured"
  };
}

export function requireAiFeature(userId, feature) {
  const resolved = resolveProviderForFeature(userId, feature);
  if (!resolved.ok) {
    const error = new Error(resolved.reason || "AI setup required");
    error.code = "AI_SETUP_REQUIRED";
    throw error;
  }
  return resolved;
}

export function ensureDevOpenRouterCredential(userId) {
  if (process.env.NODE_ENV === "production") {
    return { enabled: false, reason: "production" };
  }

  const apiKey = String(process.env.OPENROUTER_API_KEY || "").trim();
  if (!apiKey) {
    return { enabled: false, reason: "missing_env_key" };
  }

  const validation = validateProviderKey("openrouter", apiKey);
  if (!validation.ok) {
    return { enabled: false, reason: validation.reason || "invalid_key" };
  }

  const store = loadStore();
  const now = nowIso();
  const defaultModel = AI_PROVIDERS.openrouter.models[0] || null;

  let existingCredential = store.aiProviderCredentials.find(
    (entry) =>
      entry.userId === userId &&
      entry.provider === "openrouter" &&
      entry.status === "active"
  );

  let createdCredential = false;
  if (!existingCredential) {
    existingCredential = {
      id: createId("cred"),
      userId,
      provider: "openrouter",
      label: "Dev OpenRouter (.env.local)",
      model: defaultModel,
      encrypted: encrypt(apiKey),
      maskedKey: maskKey(apiKey),
      status: "active",
      createdAt: now,
      updatedAt: now,
      lastValidatedAt: now
    };
    store.aiProviderCredentials.push(existingCredential);
    createdCredential = true;
  } else if (!existingCredential.model) {
    // Migrate: set model on existing credential that lacks it
    existingCredential.model = defaultModel;
    existingCredential.updatedAt = now;
  }

  let preferences = store.aiProviderPreferences.find((entry) => entry.userId === userId);
  let updatedPreferences = false;
  if (!preferences) {
    preferences = {
      userId,
      activeProfileId: existingCredential.id,
      updatedAt: now
    };
    store.aiProviderPreferences.push(preferences);
    updatedPreferences = true;
  } else if (!preferences.activeProfileId || !store.aiProviderCredentials.some(
    (c) => c.id === preferences.activeProfileId && c.userId === userId
  )) {
    // Set active if missing or pointing to deleted credential
    preferences.activeProfileId = existingCredential.id;
    preferences.updatedAt = now;
    updatedPreferences = true;
  }

  if (!createdCredential && !updatedPreferences) {
    return {
      enabled: true,
      createdCredential: false,
      updatedPreferences: false
    };
  }

  saveStore(store);
  if (createdCredential) {
    addAuditEvent(userId, "ai.credential.seed_dev_env", {
      provider: "openrouter",
      credentialId: existingCredential.id
    });
  }
  if (updatedPreferences) {
    addAuditEvent(userId, "ai.preferences.seed_dev_env", {
      activeProfileId: preferences.activeProfileId
    });
  }

  return {
    enabled: true,
    createdCredential,
    updatedPreferences
  };
}
