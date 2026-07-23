"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Edit3, KeyRound, Loader2, Plus, Sparkles, Trash2, X } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { useApi } from "@/hooks/useApi";
import type { Profile, Provider, ProviderPreferences } from "@/lib/api/types";
import { StatusMessage } from "@/components/feedback/StatusMessage";
import { SettingsMenu } from "@/components/settings/SettingsMenu";

const PANEL_CLASS =
  "rounded-[24px] border border-border-subtle bg-surface-panel/85 p-4 shadow-panel";

const FIELD_CLASS =
  "rounded-lg border border-border-subtle bg-surface-field px-3 py-2 text-text-primary outline-none transition focus:border-accent focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg";

const LABEL_CLASS = "grid gap-1 text-sm text-text-secondary";

const MODEL_LIST_ID = "ai-model-datalist";

export default function AiSettingsPage() {
  const api = useApi();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [preferences, setPreferences] = useState<ProviderPreferences | null>(null);

  // Add / edit form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formProvider, setFormProvider] = useState("");
  const [formModel, setFormModel] = useState("");
  const [formKey, setFormKey] = useState("");

  // Rotate key state
  const [rotatingId, setRotatingId] = useState<string | null>(null);
  const [rotateKey, setRotateKey] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  const providerModelOptions = useMemo(() => {
    const provider = providers.find((p) => p.id === formProvider);
    return provider?.models || [];
  }, [formProvider, providers]);

  const activeProfileId = preferences?.activeProfileId ?? null;

  async function loadSettings() {
    try {
      const [providerData, credentialData] = await Promise.all([
        api.ai.providers(),
        api.ai.credentials()
      ]);

      setProviders(providerData.providers);
      setProfiles(credentialData.credentials);
      setPreferences(credentialData.preferences);
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Failed to load AI settings.");
    }
  }

  useEffect(() => {
    void loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetForm() {
    setEditingId(null);
    setFormName("");
    setFormProvider("");
    setFormModel("");
    setFormKey("");
  }

  function startEdit(profile: Profile) {
    setEditingId(profile.id);
    setFormName(profile.label);
    setFormProvider(profile.provider);
    setFormModel(profile.model ?? "");
    setFormKey(""); // never pre-fill the key
  }

  async function saveProfile() {
    if (!formName.trim() || !formProvider) {
      setMessage("Name and provider are required.");
      return;
    }

    setIsSaving(true);
    setMessage("");

    try {
      if (editingId) {
        // Update existing profile metadata
        await api.ai.updateCredentialMeta(editingId, {
          label: formName.trim(),
          model: formModel || undefined
        });
      } else {
        // Create new profile
        if (!formKey.trim()) {
          setMessage("API key is required for a new profile.");
          setIsSaving(false);
          return;
        }
        await api.ai.addCredential({
          provider: formProvider,
          label: formName.trim(),
          apiKey: formKey.trim(),
          model: formModel || undefined
        });
      }

      setMessage(editingId ? "Profile updated." : "Profile created.");
      resetForm();
      await loadSettings();
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Failed to save profile.");
    } finally {
      setIsSaving(false);
    }
  }

  async function activateProfile(profileId: string) {
    try {
      await api.ai.activateProfile(profileId);
      setMessage("Profile activated.");
      await loadSettings();
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Failed to activate profile.");
    }
  }

  async function replaceKey(profileId: string) {
    if (!rotateKey.trim()) {
      return;
    }

    setIsSaving(true);
    setMessage("");

    try {
      await api.ai.rotateCredential(profileId, { apiKey: rotateKey.trim() });
      setMessage("Key replaced.");
      setRotatingId(null);
      setRotateKey("");
      await loadSettings();
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Failed to replace key.");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteProfile(profileId: string) {
    try {
      await api.ai.deleteCredential(profileId);
      setMessage("Profile deleted.");
      await loadSettings();
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Failed to delete profile.");
    }
  }

  const isFormOpen = editingId !== null || formProvider !== "" || formName !== "" || formKey !== "";

  return (
    <div className="space-y-6" data-testid="ai-settings-page">
      <header>
        <h2 className="text-3xl font-semibold tracking-tight text-text-primary">AI Settings</h2>
        <p className="text-text-secondary">
          Manage AI profiles with provider, model, and API key. Activate one profile at a time.
        </p>
      </header>

      <SettingsMenu />

      {message ? (
        <StatusMessage>{message}</StatusMessage>
      ) : null}

      {/* Profile list */}
      <section className={PANEL_CLASS} data-testid="profile-list">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-medium text-text-primary">AI Profiles</h3>
          <span className="inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent-soft px-2 py-1 text-[11px] text-accent">
            <Sparkles className="h-3 w-3" />
            {activeProfileId ? "Active profile set" : "No active profile"}
          </span>
        </div>

        {profiles.length === 0 && !isFormOpen ? (
          <p className="text-sm text-text-muted">No profiles yet. Add one to get started.</p>
        ) : null}

        <div className="space-y-2">
          {profiles.map((profile) => {
            const isActive = profile.id === activeProfileId;
            return (
              <div
                key={profile.id}
                data-testid={`profile-${profile.id}`}
                className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-surface-field px-3 py-2 ${
                  isActive
                    ? "border-accent/40 ring-1 ring-accent/20"
                    : "border-border-subtle"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <strong className="truncate text-sm text-text-primary">{profile.label}</strong>
                    {isActive && (
                      <span
                        className="inline-flex items-center gap-0.5 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent"
                        data-testid={`active-badge-${profile.id}`}
                      >
                        <Check className="h-3 w-3" aria-hidden="true" />
                        Active
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-text-muted">
                    {profile.provider}
                    {profile.model ? ` · ${profile.model}` : ""} · {profile.maskedKey}
                  </p>
                </div>

                <div className="flex shrink-0 gap-1.5">
                  {!isActive && (
                    <button
                      type="button"
                      onClick={() => void activateProfile(profile.id)}
                      data-testid={`activate-profile-${profile.id}`}
                      className="rounded-md border border-accent/30 bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent transition hover:bg-accent-soft/80"
                    >
                      Use
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      startEdit(profile);
                      setRotatingId(null);
                      setRotateKey("");
                    }}
                    data-testid={`edit-profile-${profile.id}`}
                    className="rounded-md border border-border-subtle bg-surface-elevated px-2.5 py-1 text-xs text-text-primary transition hover:bg-surface-panel"
                    aria-label={`Edit ${profile.label}`}
                  >
                    <Edit3 className="h-3 w-3" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRotatingId(rotatingId === profile.id ? null : profile.id);
                      setRotateKey("");
                    }}
                    data-testid={`rotate-key-${profile.id}`}
                    className="rounded-md border border-border-subtle bg-surface-elevated px-2.5 py-1 text-xs text-text-primary transition hover:bg-surface-panel"
                    aria-label={`Replace key for ${profile.label}`}
                  >
                    <KeyRound className="h-3 w-3" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void deleteProfile(profile.id)}
                    data-testid={`delete-profile-${profile.id}`}
                    className="rounded-md border border-border-subtle bg-surface-elevated px-2.5 py-1 text-xs text-text-primary transition hover:bg-surface-panel"
                    aria-label={`Delete ${profile.label}`}
                  >
                    <Trash2 className="h-3 w-3" aria-hidden="true" />
                  </button>
                </div>

                {/* Inline key replacement form */}
                {rotatingId === profile.id && (
                  <div className="flex w-full items-center gap-2 pt-2">
                    <input
                      type="password"
                      value={rotateKey}
                      onChange={(e) => setRotateKey(e.target.value)}
                      placeholder="Enter new API key"
                      data-testid={`rotate-key-input-${profile.id}`}
                      className={`${FIELD_CLASS} flex-1 text-sm`}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => void replaceKey(profile.id)}
                      disabled={!rotateKey.trim() || isSaving}
                      data-testid={`rotate-key-confirm-${profile.id}`}
                      className="rounded-md border border-accent/35 bg-accent-soft px-3 py-1.5 text-xs font-semibold text-accent transition hover:bg-accent-soft/80 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save Key"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRotatingId(null);
                        setRotateKey("");
                      }}
                      className="rounded-md border border-border-subtle bg-surface-elevated px-2 py-1.5 text-xs text-text-muted transition hover:bg-surface-panel"
                      aria-label="Cancel"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Add / Edit profile form */}
      <section className={PANEL_CLASS} data-testid="profile-form">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-medium text-text-primary">
            {editingId ? "Edit Profile" : "Add Profile"}
          </h3>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-md border border-border-subtle bg-surface-elevated px-2 py-1 text-xs text-text-muted transition hover:bg-surface-panel"
            >
              Cancel
            </button>
          )}
        </div>

        <div className="grid gap-3">
          <label className={LABEL_CLASS}>
            Name
            <input
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. My OpenAI key"
              data-testid="profile-name-input"
              className={FIELD_CLASS}
              required
            />
          </label>

          <label className={LABEL_CLASS}>
            Provider
            <select
              value={formProvider}
              onChange={(e) => {
                setFormProvider(e.target.value);
                // Auto-select first model when provider changes
                const provider = providers.find((p) => p.id === e.target.value);
                if (provider?.models?.length && !formModel) {
                  setFormModel(provider.models[0]);
                }
              }}
              data-testid="profile-provider-select"
              className={FIELD_CLASS}
            >
              <option value="">Select a provider</option>
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>

          <label className={LABEL_CLASS}>
            Model
            <input
              value={formModel}
              onChange={(e) => setFormModel(e.target.value)}
              placeholder={providerModelOptions.length ? "Select or type a model" : "No models available"}
              data-testid="profile-model-input"
              list={MODEL_LIST_ID}
              className={FIELD_CLASS}
            />
            <datalist id={MODEL_LIST_ID}>
              {providerModelOptions.map((model) => (
                <option key={model} value={model} />
              ))}
            </datalist>
          </label>

          {!editingId && (
            <label className={LABEL_CLASS}>
              API key
              <input
                type="password"
                value={formKey}
                onChange={(e) => setFormKey(e.target.value)}
                placeholder="sk-..."
                data-testid="profile-key-input"
                className={FIELD_CLASS}
              />
            </label>
          )}

          <button
            type="button"
            onClick={() => void saveProfile()}
            data-testid="profile-save-btn"
            disabled={!formName.trim() || !formProvider || (editingId ? false : !formKey.trim()) || isSaving}
            className="inline-flex w-fit items-center gap-2 rounded-lg border border-accent/35 bg-accent-soft px-4 py-2 text-sm font-semibold text-accent transition hover:bg-accent-soft/80 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : editingId ? (
              <Check className="h-4 w-4" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {editingId ? "Update Profile" : "Add Profile"}
          </button>
        </div>
      </section>
    </div>
  );
}
