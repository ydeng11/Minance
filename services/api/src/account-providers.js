import { normalizeText } from "./utils.js";

const ACCOUNT_PROVIDER_ACTIONS = {
  begin_link_session: "begin_link_session",
  refresh_connection: "refresh_connection"
};

const ACCOUNT_PROVIDER_CATALOG = [
  {
    id: "manual_csv",
    name: "Manual + CSV",
    status: "active",
    source: "self_hosted",
    selfHostDefault: true,
    capabilities: {
      manualAccountCreate: true,
      csvImport: true,
      directAggregation: false,
      institutionLookup: false,
      backgroundSync: false,
      reconnect: false
    },
    actions: {
      begin_link_session: false,
      refresh_connection: false
    },
    adapter: {
      key: "manual_csv_adapter",
      ingestRoute: "/v1/imports",
      manualEntryRoute: "/v1/transactions"
    },
    fallback: {
      strategy: "manual_or_csv",
      remediation:
        "Direct aggregation is unavailable in self-host mode. Use manual account entry or CSV import.",
      recommendedSteps: [
        "Create accounts through manual transaction entry",
        "Upload account CSV files via /v1/imports"
      ]
    }
  }
];

function normalizeProviderId(value) {
  return normalizeText(value).replace(/[-\s]+/g, "_");
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function toProviderSummary(provider) {
  return {
    id: provider.id,
    name: provider.name,
    status: provider.status,
    source: provider.source,
    selfHostDefault: provider.selfHostDefault,
    capabilities: clone(provider.capabilities),
    fallback: clone(provider.fallback)
  };
}

function findProvider(providerId) {
  const normalizedId = normalizeProviderId(providerId);
  return ACCOUNT_PROVIDER_CATALOG.find((entry) => normalizeProviderId(entry.id) === normalizedId) || null;
}

export function listAccountProviders() {
  return ACCOUNT_PROVIDER_CATALOG.map(toProviderSummary);
}

export function getDefaultAccountProviderId() {
  const preferred = ACCOUNT_PROVIDER_CATALOG.find((entry) => entry.selfHostDefault);
  return preferred ? preferred.id : ACCOUNT_PROVIDER_CATALOG[0]?.id || null;
}

export function getAccountProvider(providerId) {
  const provider = findProvider(providerId);
  if (!provider) {
    throw new Error("Unknown account provider");
  }
  return clone(provider);
}

export function beginAccountProviderLinkSession(providerId) {
  const provider = getAccountProvider(providerId);
  if (!provider.actions[ACCOUNT_PROVIDER_ACTIONS.begin_link_session]) {
    const error = new Error(`Unsupported action for provider ${provider.id}: begin_link_session`);
    error.code = "ACCOUNT_PROVIDER_ACTION_UNSUPPORTED";
    error.providerId = provider.id;
    error.action = ACCOUNT_PROVIDER_ACTIONS.begin_link_session;
    error.remediation = provider.fallback.remediation;
    throw error;
  }

  return {
    providerId: provider.id,
    status: "ready",
    linkUrl: null,
    expiresAt: null
  };
}
