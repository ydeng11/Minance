"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, Save, Sparkles } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { useApi } from "@/hooks/useApi";
import type { AiTrainingStatus, Credential, Provider, ProviderPreferences } from "@/lib/api/types";
import { SettingsMenu } from "@/components/settings/SettingsMenu";

export default function AiSettingsPage() {
  const api = useApi();

  const [providers, setProviders] = useState<Provider[]>([]);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [preferences, setPreferences] = useState<ProviderPreferences | null>(null);
  const [trainingStatus, setTrainingStatus] = useState<AiTrainingStatus | null>(null);

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

  async function loadSettings() {
    try {
      const [providerData, credentialData, trainingData] = await Promise.all([
        api.ai.providers(),
        api.ai.credentials(),
        api.ai.trainingStatus()
      ]);

      setProviders(providerData.providers);
      setCredentials(credentialData.credentials);
      setPreferences(credentialData.preferences);
      setTrainingStatus(trainingData.training);

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

  useEffect(() => {
    if (!providerModelOptions.length) {
      setDefaultModel("");
      return;
    }
    if (!providerModelOptions.includes(defaultModel)) {
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
        <h2 className="text-3xl font-semibold tracking-tight">AI Settings</h2>
        <p className="text-neutral-400">Configure provider keys and model preferences.</p>
      </header>

      <SettingsMenu />

      {message ? (
        <p className="rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-sm text-neutral-300" data-testid="global-message">
          {message}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-neutral-900 bg-neutral-950/70 p-4">
          <h3 className="text-sm font-medium text-neutral-300">Add Provider Key</h3>
          <div className="mt-3 grid gap-2">
            <label className="grid gap-1 text-sm text-neutral-300">
              Provider
              <select
                value={providerSelect}
                onChange={(event) => setProviderSelect(event.target.value)}
                data-testid="ai-provider-select"
                className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-200"
              >
                {providers.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm text-neutral-300">
              Label
              <input
                value={providerLabel}
                onChange={(event) => setProviderLabel(event.target.value)}
                data-testid="ai-provider-label"
                className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-200"
              />
            </label>
            <label className="grid gap-1 text-sm text-neutral-300">
              API key
              <input
                type="password"
                value={providerKey}
                onChange={(event) => setProviderKey(event.target.value)}
                data-testid="ai-provider-key"
                className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-200"
              />
            </label>
            <button
              type="button"
              onClick={() => void addProviderKey()}
              data-testid="ai-provider-save"
              disabled={!providerSelect || !providerKey.trim() || isSavingKey}
              className="inline-flex w-fit items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-neutral-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSavingKey ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Key
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-neutral-900 bg-neutral-950/70 p-4">
          <h3 className="text-sm font-medium text-neutral-300">Preferences &amp; Failover</h3>
          <div className="mt-3 grid gap-2">
            <label className="grid gap-1 text-sm text-neutral-300">
              Default provider
              <select
                value={defaultProvider}
                onChange={(event) => setDefaultProvider(event.target.value)}
                data-testid="ai-pref-provider"
                className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-200"
              >
                <option value="">None</option>
                {providers.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1 text-sm text-neutral-300">
              Default model
              <select
                value={defaultModel}
                onChange={(event) => setDefaultModel(event.target.value)}
                data-testid="ai-pref-model"
                disabled={!providerModelOptions.length}
                className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-200 disabled:opacity-60"
              >
                {providerModelOptions.length ? null : <option value="">No models available</option>}
                {providerModelOptions.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1 text-sm text-neutral-300">
              Failover providers
              <select
                multiple
                size={4}
                value={failoverProviders}
                onChange={(event) =>
                  setFailoverProviders(Array.from(event.target.selectedOptions).map((entry) => entry.value))
                }
                data-testid="ai-pref-failover"
                className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-200"
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
              className="inline-flex w-fit items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm text-neutral-200 transition hover:bg-neutral-800 disabled:opacity-60"
            >
              {isSavingPreferences ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Save Preferences
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-neutral-900 bg-neutral-950/70 p-4 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium text-neutral-300">Configured Keys</h3>
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-300">
              <Sparkles className="h-3 w-3" />
              {preferences?.updatedAt ? "Preferences configured" : "Configure your provider"}
            </span>
          </div>
          <div className="space-y-2" data-testid="credential-list">
            {credentials.length === 0 ? <p className="text-sm text-neutral-500">No keys configured.</p> : null}
            {credentials.map((credential) => (
              <div key={credential.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-neutral-900 px-3 py-2">
                <div>
                  <strong className="text-sm text-neutral-100">{credential.provider}</strong>
                  <p className="text-xs text-neutral-500">{credential.label} · {credential.maskedKey}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void rotateCredential(credential.id)}
                    data-testid={`rotate-credential-${credential.id}`}
                    className="rounded-md border border-neutral-700 bg-neutral-800 px-3 py-1 text-xs text-neutral-200"
                  >
                    Rotate
                  </button>
                  <button
                    type="button"
                    onClick={() => void removeCredential(credential.id)}
                    data-testid={`delete-credential-${credential.id}`}
                    className="rounded-md border border-neutral-700 bg-neutral-800 px-3 py-1 text-xs text-neutral-200"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-neutral-900 bg-neutral-950/70 p-4 lg:col-span-2" data-testid="ai-training-status">
          <h3 className="text-sm font-medium text-neutral-300">Categorization Training</h3>
          {!trainingStatus ? (
            <p className="mt-2 text-sm text-neutral-500">Training profile unavailable.</p>
          ) : (
            <div className="mt-3 space-y-2 text-sm">
              <p className={trainingStatus.enabled ? "text-emerald-300" : "text-amber-300"}>
                {trainingStatus.enabled
                  ? "Training profile loaded from backup data."
                  : `Training profile not loaded (${trainingStatus.reason || "unknown_reason"}).`}
              </p>
              <p className="text-neutral-400">
                Raw category mappings: <strong className="text-neutral-200">{trainingStatus.rawCategoryMappings}</strong>
                {" · "}
                Merchant exemplars: <strong className="text-neutral-200">{trainingStatus.merchantExemplars}</strong>
              </p>
              <p className="text-neutral-500">
                {trainingStatus.enabled && trainingStatus.merchantExemplars < 120
                  ? "Training data is usable, but adding more labeled merchant rows will improve recall further."
                  : "Current profile has enough breadth for baseline recall improvements."}
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
