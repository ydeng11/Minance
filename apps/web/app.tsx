// @ts-nocheck
const SESSION_STORAGE_KEY = "minance_legacy_session";
const ACTIVE_STATE_CLASSES = ["border-emerald-500/50", "bg-emerald-500/20", "text-white"];
const INACTIVE_STATE_CLASSES = ["border-neutral-700", "bg-neutral-900", "text-neutral-300"];

const elements = {
  authPanel: document.getElementById("auth-panel"),
  app: document.getElementById("app"),
  authMessage: document.getElementById("auth-message"),
  globalMessage: document.getElementById("global-message"),
  tabLogin: document.getElementById("tab-login"),
  tabSignup: document.getElementById("tab-signup"),
  loginForm: document.getElementById("login-form"),
  signupForm: document.getElementById("signup-form"),
  userEmail: document.getElementById("user-email"),
  logout: document.getElementById("logout"),
  refresh: document.getElementById("refresh-all")
};

const state = {
  mode: "login",
  tokens: null,
  user: null,
  activeView: "dashboard"
};

function parseStoredSession() {
  const raw = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
}

function persistSession() {
  if (!state.user || !state.tokens) {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    return;
  }

  localStorage.setItem(
    SESSION_STORAGE_KEY,
    JSON.stringify({
      user: state.user,
      tokens: state.tokens
    })
  );
}

function setButtonState(button, isActive) {
  if (!button) {
    return;
  }

  if (isActive) {
    button.classList.add(...ACTIVE_STATE_CLASSES);
    button.classList.remove(...INACTIVE_STATE_CLASSES);
    return;
  }

  button.classList.remove(...ACTIVE_STATE_CLASSES);
  button.classList.add(...INACTIVE_STATE_CLASSES);
}

function setAuthMode(mode) {
  state.mode = mode;

  if (elements.loginForm) {
    elements.loginForm.classList.toggle("hidden", mode !== "login");
  }
  if (elements.signupForm) {
    elements.signupForm.classList.toggle("hidden", mode !== "signup");
  }

  setButtonState(elements.tabLogin, mode === "login");
  setButtonState(elements.tabSignup, mode === "signup");
}

function setAuthMessage(message) {
  if (!elements.authMessage) {
    return;
  }
  elements.authMessage.textContent = message;
}

function setGlobalMessage(message) {
  if (!elements.globalMessage) {
    return;
  }
  elements.globalMessage.textContent = message;
}

function setSubmitting(form, isSubmitting) {
  const submitButton = form?.querySelector('button[type="submit"]');
  if (!submitButton) {
    return;
  }

  if (isSubmitting) {
    if (!submitButton.dataset.idleText) {
      submitButton.dataset.idleText = submitButton.textContent || "";
    }
    submitButton.textContent = "Working...";
    submitButton.disabled = true;
    return;
  }

  submitButton.textContent = submitButton.dataset.idleText || submitButton.textContent || "";
  submitButton.disabled = false;
}

function showAuthenticatedUI() {
  if (elements.authPanel) {
    elements.authPanel.classList.add("hidden");
  }
  if (elements.app) {
    elements.app.classList.remove("hidden");
  }
  if (elements.userEmail) {
    elements.userEmail.textContent = state.user?.email || "";
  }
}

function showUnauthenticatedUI() {
  if (elements.authPanel) {
    elements.authPanel.classList.remove("hidden");
  }
  if (elements.app) {
    elements.app.classList.add("hidden");
  }
  if (elements.userEmail) {
    elements.userEmail.textContent = "";
  }
}

function setView(nextView) {
  state.activeView = nextView;
  document.querySelectorAll(".view").forEach((view) => {
    view.classList.toggle("hidden", view.id !== `view-${nextView}`);
  });

  document.querySelectorAll("[data-view]").forEach((button) => {
    setButtonState(button, button.getAttribute("data-view") === nextView);
  });

  document.querySelectorAll("[data-mobile-view]").forEach((button) => {
    setButtonState(button, button.getAttribute("data-mobile-view") === nextView);
  });
}

async function readPayload(response) {
  if (response.status === 204) {
    return null;
  }
  return response.json().catch(() => null);
}

async function apiRequest(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const requestBody = options.body ? JSON.stringify(options.body) : undefined;

  if (requestBody) {
    headers.set("Content-Type", "application/json");
  }
  if (state.tokens?.accessToken) {
    headers.set("Authorization", `Bearer ${state.tokens.accessToken}`);
  }

  const response = await fetch(path, {
    method: options.method || "GET",
    headers,
    body: requestBody
  });

  const payload = await readPayload(response);

  if (!response.ok) {
    const message = payload?.error?.message || `Request failed (${response.status})`;
    throw new Error(message);
  }

  return payload;
}

async function authenticate(path, form) {
  const formData = new FormData(form);
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  if (!email || !password) {
    setAuthMessage("Email and password are required.");
    return;
  }

  setAuthMessage("");
  setSubmitting(form, true);

  try {
    const result = await apiRequest(path, {
      method: "POST",
      body: { email, password }
    });
    state.user = result?.user || null;
    state.tokens = result?.tokens || null;
    persistSession();
    showAuthenticatedUI();
    setView("dashboard");
  } catch (error) {
    setAuthMessage(error instanceof Error ? error.message : "Authentication failed.");
  } finally {
    setSubmitting(form, false);
  }
}

function clearSession() {
  state.user = null;
  state.tokens = null;
  persistSession();
  showUnauthenticatedUI();
  setAuthMode("login");
  setAuthMessage("");
  setGlobalMessage("");
}

async function restoreSession() {
  const saved = parseStoredSession();
  if (!saved?.tokens || !saved?.user) {
    clearSession();
    return;
  }

  state.tokens = saved.tokens;
  state.user = saved.user;

  try {
    const result = await apiRequest("/v1/users/me");
    state.user = result?.user || state.user;
    persistSession();
    showAuthenticatedUI();
    setView(state.activeView);
  } catch {
    clearSession();
  }
}

function bindNavigation() {
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => {
      const view = button.getAttribute("data-view");
      if (!view) {
        return;
      }
      setView(view);
    });
  });

  document.querySelectorAll("[data-mobile-view]").forEach((button) => {
    button.addEventListener("click", () => {
      const view = button.getAttribute("data-mobile-view");
      if (!view) {
        return;
      }
      setView(view);
    });
  });
}

function bindAuthForms() {
  if (elements.loginForm) {
    elements.loginForm.addEventListener("submit", (event) => {
      event.preventDefault();
      void authenticate("/v1/auth/login", elements.loginForm);
    });
  }

  if (elements.signupForm) {
    elements.signupForm.addEventListener("submit", (event) => {
      event.preventDefault();
      void authenticate("/v1/auth/signup", elements.signupForm);
    });
  }

  elements.tabLogin?.addEventListener("click", () => {
    setAuthMessage("");
    setAuthMode("login");
  });

  elements.tabSignup?.addEventListener("click", () => {
    setAuthMessage("");
    setAuthMode("signup");
  });
}

function bindGlobalActions() {
  elements.logout?.addEventListener("click", () => {
    clearSession();
  });

  elements.refresh?.addEventListener("click", () => {
    setGlobalMessage("Refreshed.");
    window.setTimeout(() => {
      setGlobalMessage("");
    }, 1200);
  });
}

function bootstrap() {
  bindAuthForms();
  bindNavigation();
  bindGlobalActions();
  setView("dashboard");
  setAuthMode("login");
  showUnauthenticatedUI();
  void restoreSession();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrap);
} else {
  bootstrap();
}
