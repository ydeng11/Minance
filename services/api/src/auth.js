import { TOKEN_TTL_MS, REFRESH_TTL_MS } from "./config.js";
import { loadStore, saveStore, ensureDefaultCategoriesForUser, addAuditEvent } from "./store.js";
import { ensureDevOpenRouterCredential } from "./ai.js";
import {
  nowIso,
  createId,
  hashPassword,
  verifyPassword,
  randomToken,
  parseAuthToken
} from "./utils.js";

const DEFAULT_DEV_TEST_ACCOUNT_EMAIL = "dev@minance.local";
const DEFAULT_DEV_TEST_ACCOUNT_PASSWORD = "devpassword123";

function seedDevOpenRouterDefaults(userId) {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  const result = ensureDevOpenRouterCredential(userId);
  if (!result.enabled && result.reason && result.reason !== "missing_env_key" && result.reason !== "production") {
    console.warn(`Skipped dev OpenRouter seed for user ${userId}: ${result.reason}`);
  }
}

function sanitizeUser(user) {
  return {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

function generateSession(userId) {
  const now = Date.now();
  return {
    id: createId("session"),
    userId,
    accessToken: randomToken(),
    refreshToken: randomToken(),
    accessExpiresAt: new Date(now + TOKEN_TTL_MS).toISOString(),
    refreshExpiresAt: new Date(now + REFRESH_TTL_MS).toISOString(),
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
}

function pruneSessions(store) {
  const now = nowIso();
  store.sessions = store.sessions.filter((session) => session.refreshExpiresAt > now);
}

export function ensureDevTestAccount() {
  if (process.env.NODE_ENV === "production") {
    return { enabled: false, created: false, email: null, user: null };
  }
  if (process.env.MINANCE_SEED_TEST_ACCOUNT === "false") {
    return { enabled: false, created: false, email: null, user: null };
  }

  const email = String(process.env.DEV_TEST_ACCOUNT_EMAIL || DEFAULT_DEV_TEST_ACCOUNT_EMAIL)
    .trim()
    .toLowerCase();
  const password = String(process.env.DEV_TEST_ACCOUNT_PASSWORD || DEFAULT_DEV_TEST_ACCOUNT_PASSWORD);

  if (!email) {
    throw new Error("DEV_TEST_ACCOUNT_EMAIL must be set when seeding a dev/test account");
  }
  if (password.length < 8) {
    throw new Error("DEV_TEST_ACCOUNT_PASSWORD must be at least 8 characters");
  }

  const store = loadStore();
  const existing = store.users.find((entry) => entry.email === email);
  if (existing) {
    seedDevOpenRouterDefaults(existing.id);
    return {
      enabled: true,
      created: false,
      email,
      user: sanitizeUser(existing)
    };
  }

  const now = nowIso();
  const { passwordHash, salt } = hashPassword(password);
  const user = {
    id: createId("user"),
    email,
    passwordHash,
    passwordSalt: salt,
    createdAt: now,
    updatedAt: now
  };

  store.users.push(user);
  saveStore(store);

  ensureDefaultCategoriesForUser(user.id);
  seedDevOpenRouterDefaults(user.id);
  addAuditEvent(user.id, "user.seeded_dev_test", { email });

  return {
    enabled: true,
    created: true,
    email,
    user: sanitizeUser(user)
  };
}

export function signup(email, password) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail || !password) {
    throw new Error("Email and password are required");
  }
  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters");
  }

  const store = loadStore();
  if (store.users.some((entry) => entry.email === normalizedEmail)) {
    throw new Error("User already exists");
  }

  const now = nowIso();
  const { passwordHash, salt } = hashPassword(password);
  const user = {
    id: createId("user"),
    email: normalizedEmail,
    passwordHash,
    passwordSalt: salt,
    createdAt: now,
    updatedAt: now
  };

  const session = generateSession(user.id);

  store.users.push(user);
  store.sessions.push(session);
  pruneSessions(store);
  saveStore(store);

  ensureDefaultCategoriesForUser(user.id);
  seedDevOpenRouterDefaults(user.id);
  addAuditEvent(user.id, "user.signup", { email: normalizedEmail });

  return {
    user: sanitizeUser(user),
    tokens: {
      accessToken: session.accessToken,
      accessExpiresAt: session.accessExpiresAt,
      refreshToken: session.refreshToken,
      refreshExpiresAt: session.refreshExpiresAt
    }
  };
}

export function login(email, password) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const store = loadStore();
  const user = store.users.find((entry) => entry.email === normalizedEmail);
  if (!user) {
    throw new Error("Invalid credentials");
  }

  if (!verifyPassword(password || "", user.passwordHash, user.passwordSalt)) {
    throw new Error("Invalid credentials");
  }

  const session = generateSession(user.id);
  store.sessions.push(session);
  pruneSessions(store);
  saveStore(store);

  addAuditEvent(user.id, "user.login", {});

  return {
    user: sanitizeUser(user),
    tokens: {
      accessToken: session.accessToken,
      accessExpiresAt: session.accessExpiresAt,
      refreshToken: session.refreshToken,
      refreshExpiresAt: session.refreshExpiresAt
    }
  };
}

export function refresh(refreshToken) {
  const token = String(refreshToken || "").trim();
  if (!token) {
    throw new Error("Refresh token required");
  }

  const store = loadStore();
  const session = store.sessions.find((entry) => entry.refreshToken === token);
  if (!session) {
    throw new Error("Invalid refresh token");
  }
  if (session.refreshExpiresAt <= nowIso()) {
    throw new Error("Refresh token expired");
  }

  const now = Date.now();
  session.accessToken = randomToken();
  session.accessExpiresAt = new Date(now + TOKEN_TTL_MS).toISOString();
  session.updatedAt = nowIso();

  saveStore(store);

  return {
    accessToken: session.accessToken,
    accessExpiresAt: session.accessExpiresAt
  };
}

export function authenticateRequest(req) {
  const token = parseAuthToken(req);
  if (!token) {
    return null;
  }

  const store = loadStore();
  const session = store.sessions.find((entry) => entry.accessToken === token);
  if (!session) {
    return null;
  }
  if (session.accessExpiresAt <= nowIso()) {
    return null;
  }

  const user = store.users.find((entry) => entry.id === session.userId);
  if (!user) {
    return null;
  }

  return {
    user: sanitizeUser(user),
    session
  };
}

export function requireAuth(req) {
  const auth = authenticateRequest(req);
  if (!auth) {
    throw new Error("Unauthorized");
  }
  return auth;
}

export function deleteUser(userId) {
  const store = loadStore();

  store.users = store.users.filter((entry) => entry.id !== userId);
  store.sessions = store.sessions.filter((entry) => entry.userId !== userId);
  store.accounts = store.accounts.filter((entry) => entry.userId !== userId);
  store.transactions = store.transactions.filter((entry) => entry.userId !== userId);
  store.categories = store.categories.filter((entry) => entry.userId !== userId);
  store.categoryRules = store.categoryRules.filter((entry) => entry.userId !== userId);
  store.imports = store.imports.filter((entry) => entry.userId !== userId);
  const importIds = new Set(store.imports.map((entry) => entry.id));
  store.importRowsRaw = store.importRowsRaw.filter((entry) => importIds.has(entry.importId));
  store.importRowsProcessed = store.importRowsProcessed.filter((entry) => importIds.has(entry.importId));
  store.importRowDiagnostics = store.importRowDiagnostics.filter((entry) => importIds.has(entry.importId));
  store.aiProviderCredentials = store.aiProviderCredentials.filter((entry) => entry.userId !== userId);
  store.aiProviderPreferences = store.aiProviderPreferences.filter((entry) => entry.userId !== userId);
  store.assistantQueries = store.assistantQueries.filter((entry) => entry.userId !== userId);
  store.savedViews = store.savedViews.filter((entry) => entry.userId !== userId);
  store.migrationRuns = store.migrationRuns.filter((entry) => entry.userId !== userId);
  store.auditEvents = store.auditEvents.filter((entry) => entry.userId !== userId);

  saveStore(store);
}
