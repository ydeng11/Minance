import crypto from "node:crypto";
import { AI_SECRET } from "./config.js";
import { loadStore, saveStore, addAuditEvent } from "./store.js";
import { AI_PROVIDERS } from "../../../packages/domain/src/constants.js";
import { nowIso, createId, maskKey } from "./utils.js";

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

export function listCredentials(userId) {
  const store = loadStore();
  return store.aiProviderCredentials
    .filter((entry) => entry.userId === userId)
    .map((entry) => ({
      id: entry.id,
      provider: entry.provider,
      label: entry.label,
      maskedKey: entry.maskedKey,
      status: entry.status,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      lastValidatedAt: entry.lastValidatedAt
    }));
}

export function addCredential(userId, provider, apiKey, label = "") {
  const validation = validateProviderKey(provider, apiKey);
  if (!validation.ok) {
    throw new Error(validation.reason);
  }

  const store = loadStore();
  const encrypted = encrypt(apiKey);
  const now = nowIso();

  const credential = {
    id: createId("cred"),
    userId,
    provider,
    label: String(label || AI_PROVIDERS[provider].name),
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

  return {
    id: credential.id,
    provider: credential.provider,
    label: credential.label,
    maskedKey: credential.maskedKey,
    status: credential.status,
    createdAt: credential.createdAt,
    updatedAt: credential.updatedAt,
    lastValidatedAt: credential.lastValidatedAt
  };
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

  return {
    id: credential.id,
    provider: credential.provider,
    label: credential.label,
    maskedKey: credential.maskedKey,
    status: credential.status,
    createdAt: credential.createdAt,
    updatedAt: credential.updatedAt,
    lastValidatedAt: credential.lastValidatedAt
  };
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

  const prefs = store.aiProviderPreferences.find((entry) => entry.userId === userId);
  if (prefs) {
    if (prefs.defaultProvider && !hasActiveCredentialForProvider(store, userId, prefs.defaultProvider)) {
      prefs.defaultProvider = null;
      prefs.defaultModel = null;
    }
    prefs.failoverProviders = (prefs.failoverProviders || []).filter((provider) =>
      hasActiveCredentialForProvider(store, userId, provider)
    );
  }

  saveStore(store);
  addAuditEvent(userId, "ai.credential.delete", { credentialId });

  return true;
}

function hasActiveCredentialForProvider(store, userId, provider) {
  return store.aiProviderCredentials.some(
    (entry) => entry.userId === userId && entry.provider === provider && entry.status === "active"
  );
}

export function getPreferences(userId) {
  const store = loadStore();
  const existing = store.aiProviderPreferences.find((entry) => entry.userId === userId);
  if (existing) {
    return existing;
  }

  return {
    userId,
    defaultProvider: null,
    defaultModel: null,
    failoverProviders: [],
    featureOverrides: {},
    updatedAt: null
  };
}

export function updatePreferences(userId, payload) {
  const store = loadStore();
  let existing = store.aiProviderPreferences.find((entry) => entry.userId === userId);

  const defaultProvider = payload.defaultProvider || null;
  const defaultModel = payload.defaultModel || null;
  const failoverProviders = Array.isArray(payload.failoverProviders)
    ? payload.failoverProviders.filter((provider) => AI_PROVIDERS[provider])
    : [];
  const featureOverrides = payload.featureOverrides && typeof payload.featureOverrides === "object"
    ? payload.featureOverrides
    : {};

  if (defaultProvider && !AI_PROVIDERS[defaultProvider]) {
    throw new Error("Unsupported default provider");
  }

  if (defaultProvider && !hasActiveCredentialForProvider(store, userId, defaultProvider)) {
    throw new Error("Default provider has no active credential");
  }

  for (const provider of failoverProviders) {
    if (!hasActiveCredentialForProvider(store, userId, provider)) {
      throw new Error(`Failover provider ${provider} has no active credential`);
    }
  }

  if (!existing) {
    existing = {
      userId,
      defaultProvider,
      defaultModel,
      failoverProviders,
      featureOverrides,
      updatedAt: nowIso()
    };
    store.aiProviderPreferences.push(existing);
  } else {
    existing.defaultProvider = defaultProvider;
    existing.defaultModel = defaultModel;
    existing.failoverProviders = failoverProviders;
    existing.featureOverrides = featureOverrides;
    existing.updatedAt = nowIso();
  }

  saveStore(store);
  addAuditEvent(userId, "ai.preferences.update", {
    defaultProvider,
    defaultModel,
    failoverProviders,
    featureOverrides
  });

  return existing;
}

export function resolveProviderForFeature(userId, feature = "general") {
  const store = loadStore();
  const credentials = store.aiProviderCredentials.filter(
    (entry) => entry.userId === userId && entry.status === "active"
  );

  if (credentials.length === 0) {
    return {
      ok: false,
      reason: "No AI credential configured"
    };
  }

  const prefs = store.aiProviderPreferences.find((entry) => entry.userId === userId) || {
    defaultProvider: null,
    defaultModel: null,
    failoverProviders: [],
    featureOverrides: {}
  };

  const featureOverride = prefs.featureOverrides?.[feature] || null;

  const candidates = [];
  if (featureOverride?.provider) {
    candidates.push({
      provider: featureOverride.provider,
      model: featureOverride.model || null
    });
  }
  if (prefs.defaultProvider) {
    candidates.push({
      provider: prefs.defaultProvider,
      model: prefs.defaultModel || null
    });
  }

  for (const provider of prefs.failoverProviders || []) {
    candidates.push({ provider, model: null });
  }

  for (const credential of credentials) {
    if (!candidates.some((entry) => entry.provider === credential.provider)) {
      candidates.push({ provider: credential.provider, model: null });
    }
  }

  for (const candidate of candidates) {
    const credential = credentials.find((entry) => entry.provider === candidate.provider);
    if (!credential) {
      continue;
    }

    let resolvedModel = candidate.model;
    if (!resolvedModel) {
      resolvedModel = AI_PROVIDERS[candidate.provider]?.models?.[0] || null;
    }

    return {
      ok: true,
      provider: candidate.provider,
      model: resolvedModel,
      credentialId: credential.id,
      apiKey: decrypt(credential.encrypted)
    };
  }

  return {
    ok: false,
    reason: "No active AI credential available for selected providers"
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
      encrypted: encrypt(apiKey),
      maskedKey: maskKey(apiKey),
      status: "active",
      createdAt: now,
      updatedAt: now,
      lastValidatedAt: now
    };
    store.aiProviderCredentials.push(existingCredential);
    createdCredential = true;
  }

  let preferences = store.aiProviderPreferences.find((entry) => entry.userId === userId);
  let updatedPreferences = false;
  if (!preferences) {
    preferences = {
      userId,
      defaultProvider: "openrouter",
      defaultModel: AI_PROVIDERS.openrouter.models[0] || null,
      failoverProviders: [],
      featureOverrides: {},
      updatedAt: now
    };
    store.aiProviderPreferences.push(preferences);
    updatedPreferences = true;
  } else {
    const openrouterDefaultModel = AI_PROVIDERS.openrouter.models[0] || null;
    const hasOpenrouterModel = AI_PROVIDERS.openrouter.models.includes(preferences.defaultModel || "");
    if (preferences.defaultProvider !== "openrouter" || !hasOpenrouterModel) {
      preferences.defaultProvider = "openrouter";
      preferences.defaultModel = openrouterDefaultModel;
      preferences.updatedAt = now;
      updatedPreferences = true;
    }
  }

  if (updatedPreferences && preferences.updatedAt !== now) {
    preferences.updatedAt = now;
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
      defaultProvider: preferences.defaultProvider,
      defaultModel: preferences.defaultModel
    });
  }

  return {
    enabled: true,
    createdCredential,
    updatedPreferences
  };
}
