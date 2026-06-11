"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, Save, Sparkles } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { useApi } from "@/hooks/useApi";
import type { Credential, Provider, ProviderPreferences } from "@/lib/api/types";
import { StatusMessage } from "@/components/feedback/StatusMessage";
import { SettingsMenu } from "@/components/settings/SettingsMenu";

const SETTINGS_PANEL_CLASS_NAME =
  "rounded-[24px] border border-border-subtle bg-surface-panel/85 p-4 shadow-panel";

const SETTINGS_FIELD_CLASS_NAME =
  "rounded-lg border border-border-subtle bg-surface-field px-3 py-2 text-text-primary outline-none transition focus:border-accent focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg";

const SETTINGS_LABEL_CLASS_NAME = "grid gap-1 text-sm text-text-secondary";

export default function AiSettingsPage() {
  const api = useApi();

  const [providers, setProviders] = useState<Provider[]>([]);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [preferences, setPreferences] = useState<ProviderPreferences | null>(null);

  const [providerSelect, setProviderSelect] = useState("");
  const [providerLabel, setProviderLabel] = useState("Personal key");
  const [providerKey, setProviderKey] = useState("");

  const [defaultProvider, setDefaultProvider] = useState<string>("");
  const [defaultModel, setDefaultModel] = useState<string>("");
  const [failoverProviders, setFailoverProviders] = useState<string[]>([]);

  const [isSavingKey, setIsSavingKey] = useState(false);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);
  const [message, setMessage] = useState("");

  const providerModelOptions = useMemo(() => {
    const provider = providers.find((entry) => entry.id === defaultProvider);
    return provider?.models || [];
  }, [defaultProvider, providers]);

  const modelListId = useMemo(() => "ai-model-datalist", []);

  async function loadSettings() {
    try {
      const [providerData, credentialData] = await Promise.all([
        api.ai.providers(),
        api.ai.credentials()
      ]);

      setProviders(providerData.providers);
      setCredentials(credentialData.credentials);
      setPreferences(credentialData.preferences);

      const preferredProvider =
        credentialData.preferences.defaultProvider ||
        credentialData.credentials[0]?.provider ||
        providerData.providers[0]?.id ||
        "";

      setProviderSelect((prev) => prev || providerData.providers[0]?.id || "");
      setDefaultProvider(preferredProvider);
      setDefaultModel(
        credentialData.preferences.defaultModel ||
          providerData.providers.find((entry) => entry.id === preferredProvider)?.models[0] ||
          ""
      );
      setFailoverProviders(credentialData.preferences.failoverProviders || []);
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Failed to load AI settings.");
    }
  }

  useEffect(() => {
    void loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Seed initial model from provider defaults only when no model is set
  useEffect(() => {
    if (!defaultModel && providerModelOptions.length) {
      setDefaultModel(providerModelOptions[0]);
    }
  }, [defaultModel, providerModelOptions]);

  async function addProviderKey() {
    if (!providerSelect || !providerKey.trim()) {
      setMessage("Provider and API key are required.");
      return;
    }

    setIsSavingKey(true);
    setMessage("");

    try {
      await api.ai.addCredential({
        provider: providerSelect,
        label: providerLabel || "Personal key",
        apiKey: providerKey.trim()
      });
      setProviderKey("");
      setMessage("Credential saved.");
      await loadSettings();
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Failed to save credential.");
    } finally {
      setIsSavingKey(false);
    }
  }

  async function rotateCredential(credentialId: string) {
    const apiKey = window.prompt("Enter new key");
    if (!apiKey) {
      return;
    }

    try {
      await api.ai.rotateCredential(credentialId, { apiKey });
      setMessage("Credential rotated.");
      await loadSettings();
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Failed to rotate credential.");
    }
  }

  async function removeCredential(credentialId: string) {
    try {
      await api.ai.deleteCredential(credentialId);
      setMessage("Credential deleted.");
      await loadSettings();
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Failed to delete credential.");
    }
  }

  async function savePreferences() {
    setIsSavingPreferences(true);
    setMessage("");

    try {
      await api.ai.savePreferences({
        defaultProvider: defaultProvider || null,
        defaultModel: defaultModel || null,
        failoverProviders
      });
      setMessage("Preferences saved.");
      await loadSettings();
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Failed to save preferences.");
    } finally {
      setIsSavingPreferences(false);
    }
  }

  return (
    <div className="space-y-6" data-testid="ai-settings-page">
      <header>
        <h2 className="text-3xl font-semibold tracking-tight text-text-primary">AI Settings</h2>
        <p className="text-text-secondary">Configure provider keys, model preferences, and failover behavior.</p>
      </header>

      <SettingsMenu />

      {message ? (
        <StatusMessage>{message}</StatusMessage>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className={SETTINGS_PANEL_CLASS_NAME}>
          <h3 className="text-sm font-medium text-text-primary">Add Provider Key</h3>
          <div className="mt-3 grid gap-2">
            <label className={SETTINGS_LABEL_CLASS_NAME}>
              Provider
              <select
                value={providerSelect}
                onChange={(event) => setProviderSelect(event.target.value)}
                data-testid="ai-provider-select"
                className={SETTINGS_FIELD_CLASS_NAME}
              >
                {providers.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.name}
                  </option>
                ))}
              </select>
            </label>
            <label className={SETTINGS_LABEL_CLASS_NAME}>
              Label
              <input
                value={providerLabel}
                onChange={(event) => setProviderLabel(event.target.value)}
                data-testid="ai-provider-label"
                className={SETTINGS_FIELD_CLASS_NAME}
              />
            </label>
            <label className={SETTINGS_LABEL_CLASS_NAME}>
              API key
              <input
                type="password"
                value={providerKey}
                onChange={(event) => setProviderKey(event.target.value)}
                data-testid="ai-provider-key"
                className={SETTINGS_FIELD_CLASS_NAME}
              />
            </label>
            <button
              type="button"
              onClick={() => void addProviderKey()}
              data-testid="ai-provider-save"
              disabled={!providerSelect || !providerKey.trim() || isSavingKey}
              className="inline-flex w-fit items-center gap-2 rounded-lg border border-accent/35 bg-accent-soft px-4 py-2 text-sm font-semibold text-accent transition hover:bg-accent-soft/80 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSavingKey ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Key
            </button>
          </div>
        </section>

        <section className={SETTINGS_PANEL_CLASS_NAME}>
          <h3 className="text-sm font-medium text-text-primary">Preferences &amp; Failover</h3>
          <div className="mt-3 grid gap-2">
            <label className={SETTINGS_LABEL_CLASS_NAME}>
              Default provider
              <select
                value={defaultProvider}
                onChange={(event) => setDefaultProvider(event.target.value)}
                data-testid="ai-pref-provider"
                className={SETTINGS_FIELD_CLASS_NAME}
              >
                <option value="">None</option>
                {providers.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.name}
                  </option>
                ))}
              </select>
            </label>

            <label className={SETTINGS_LABEL_CLASS_NAME}>
              Default model
              <input
                value={defaultModel}
                onChange={(event) => setDefaultModel(event.target.value)}
                placeholder={providerModelOptions.length ? "Select or type a model" : "No models available"}
                data-testid="ai-pref-model"
                list={modelListId}
                className={SETTINGS_FIELD_CLASS_NAME}
              />
              <datalist id={modelListId}>
                {providerModelOptions.map((model) => (
                  <option key={model} value={model} />
                ))}
              </datalist>
            </label>

            <label className={SETTINGS_LABEL_CLASS_NAME}>
              Failover providers
              <select
                multiple
                size={4}
                value={failoverProviders}
                onChange={(event) =>
                  setFailoverProviders(Array.from(event.target.selectedOptions).map((entry) => entry.value))
                }
                data-testid="ai-pref-failover"
                className={SETTINGS_FIELD_CLASS_NAME}
              >
                {providers.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.name}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={() => void savePreferences()}
              data-testid="ai-save-preferences"
              disabled={isSavingPreferences}
              className="inline-flex w-fit items-center gap-2 rounded-lg border border-border-subtle bg-surface-field px-4 py-2 text-sm text-text-primary transition hover:bg-surface-elevated disabled:opacity-60"
            >
              {isSavingPreferences ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Save Preferences
            </button>
          </div>
        </section>

        <section className={`${SETTINGS_PANEL_CLASS_NAME} lg:col-span-2`}>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium text-text-primary">Configured Keys</h3>
            <span className="inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent-soft px-2 py-1 text-[11px] text-accent">
              <Sparkles className="h-3 w-3" />
              {preferences?.updatedAt ? "Preferences configured" : "Configure your provider"}
            </span>
          </div>
          <div className="space-y-2" data-testid="credential-list">
            {credentials.length === 0 ? <p className="text-sm text-text-muted">No keys configured.</p> : null}
            {credentials.map((credential) => (
              <div key={credential.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border-subtle bg-surface-field px-3 py-2">
                <div>
                  <strong className="text-sm text-text-primary">{credential.provider}</strong>
                  <p className="text-xs text-text-muted">{credential.label} · {credential.maskedKey}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void rotateCredential(credential.id)}
                    data-testid={`rotate-credential-${credential.id}`}
                    className="rounded-md border border-border-subtle bg-surface-elevated px-3 py-1 text-xs text-text-primary transition hover:bg-surface-panel"
                  >
                    Rotate
                  </button>
                  <button
                    type="button"
                    onClick={() => void removeCredential(credential.id)}
                    data-testid={`delete-credential-${credential.id}`}
                    className="rounded-md border border-border-subtle bg-surface-elevated px-3 py-1 text-xs text-text-primary transition hover:bg-surface-panel"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
