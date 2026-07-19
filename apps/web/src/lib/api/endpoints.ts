import type {
  Account,
  AccountLinkSession,
  AccountProvider,
  AccountProviderSummary,
  AnomalyItem,
  AssistantQuery,
  AuthResponse,
  Category,
  CategoryStrategy,
  CommitImportResponse,
  Credential,
  ExplorerAnalyticsResponse,
  HeatmapItem,
  ImportDetailsResponse,
  ImportDatabaseBackupResponse,
  ImportJob,
  ImportProcessedRowsUpdateResponse,
  ImportReconciliationResolutionResponse,
  ImportReconciliationResponse,
  InvestmentAccountSummary,
  InvestmentHolding,
  InvestmentOverviewResponse,
  InvestmentPerformancePoint,
  InvestmentPosition,
  ImportProcessedRowsResponse,
  OverviewResponse,
  ProcessedRow,
  ProcessedSummary,
  Provider,
  ProviderPreferences,
  RecurringEvaluation,
  RecurringRule,
  RecurringSuggestion,
  SavedView,
  StorageStatusResponse,
  Transaction,
  TransactionsBulkUpdateRequest,
  TransactionsBulkUpdateResult,
  TransactionsResponse,
  User,
  DatabaseBackupsResponse,
  CreateDatabaseBackupResponse,
  RestoreDatabaseBackupResponse
} from "@/lib/api/types";

export type ApiRequest = <T>(path: string, options?: {
  method?: string;
  auth?: boolean;
  body?: BodyInit | object | null;
  responseType?: "json" | "blob";
  headers?: Record<string, string>;
}) => Promise<T>;

type QueryValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | Array<string | number | boolean | null | undefined>;

function buildQuery(params: Record<string, QueryValue>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item !== null && item !== undefined && item !== "") {
          query.append(key, String(item));
        }
      }
    } else if (value !== null && value !== undefined && value !== "") {
      query.set(key, String(value));
    }
  }
  const result = query.toString();
  return result ? `?${result}` : "";
}

export const authApi = {
  signup: (request: ApiRequest, email: string, password: string) =>
    request<AuthResponse>("/v1/auth/signup", { method: "POST", auth: false, body: { email, password } }),
  login: (request: ApiRequest, email: string, password: string) =>
    request<AuthResponse>("/v1/auth/login", { method: "POST", auth: false, body: { email, password } }),
  me: (request: ApiRequest) => request<{ user: User }>("/v1/users/me"),
  deleteMe: (request: ApiRequest) => request<null>("/v1/users/me", { method: "DELETE" })
};

export const systemApi = {
  storage: (request: ApiRequest) => request<StorageStatusResponse>("/v1/system/storage"),
  listBackups: (request: ApiRequest) =>
    request<DatabaseBackupsResponse>("/v1/system/backups"),
  createBackup: (request: ApiRequest) =>
    request<CreateDatabaseBackupResponse>("/v1/system/backups", { method: "POST" }),
  importBackupArchive: (request: ApiRequest, file: File) =>
    request<ImportDatabaseBackupResponse>("/v1/system/backups/import", {
      method: "POST",
      body: file,
      headers: {
        "Content-Type": "application/gzip",
        "X-Minance-Backup-Filename": file.name
      }
    }),
  exportBackupArchive: (request: ApiRequest, id: string) =>
    request<Blob>(`/v1/system/backups/${encodeURIComponent(id)}/archive`, { responseType: "blob" }),
  restoreBackup: (request: ApiRequest, id: string, confirmation: string) =>
    request<RestoreDatabaseBackupResponse>(`/v1/system/backups/${encodeURIComponent(id)}/restore`, {
      method: "POST",
      body: { confirmation }
    })
};

export const aiApi = {
  providers: (request: ApiRequest) => request<{ providers: Provider[] }>("/v1/ai/providers"),
  credentials: (request: ApiRequest) =>
    request<{ credentials: Credential[]; preferences: ProviderPreferences }>("/v1/ai/credentials"),
  addCredential: (request: ApiRequest, body: { provider: string; label: string; apiKey: string }) =>
    request<{ credential: Credential }>("/v1/ai/credentials", { method: "POST", body }),
  rotateCredential: (request: ApiRequest, id: string, body: { apiKey: string }) =>
    request<{ credential: Credential }>(`/v1/ai/credentials/${id}`, { method: "PUT", body }),
  deleteCredential: (request: ApiRequest, id: string) =>
    request<null>(`/v1/ai/credentials/${id}`, { method: "DELETE" }),
  savePreferences: (
    request: ApiRequest,
    body: {
      defaultProvider: string | null;
      defaultModel: string | null;
      failoverProviders: string[];
      featureOverrides?: Record<string, unknown>;
    }
  ) => request<{ preferences: ProviderPreferences }>("/v1/ai/preferences", { method: "PUT", body })
};

export const importsApi = {
  create: (request: ApiRequest, body: { fileName: string; csvText: string }) =>
    request<{ importJob: ImportJob; previewRows: Array<{ rowIndex: number; row: Record<string, string> }>; processedSummary: ProcessedSummary }>(
      "/v1/imports",
      {
        method: "POST",
        body
      }
    ),
  list: (request: ApiRequest) => request<{ imports: ImportJob[] }>("/v1/imports"),
  getById: (request: ApiRequest, id: string) => request<ImportDetailsResponse>(`/v1/imports/${id}`),
  saveMapping: (request: ApiRequest, id: string, mapping: Record<string, string | null>) =>
    request<{ importJob: ImportJob }>(`/v1/imports/${id}/mapping`, { method: "POST", body: { mapping } }),
  listProcessedRows: (request: ApiRequest, id: string, params: { status?: string; limit?: number; offset?: number }) =>
    request<ImportProcessedRowsResponse>(`/v1/imports/${id}/processed-rows${buildQuery(params)}`),
  updateProcessedRow: (request: ApiRequest, id: string, rowId: string, body: Partial<ProcessedRow["normalized"]> & { include?: boolean }) =>
    request<{ row: ProcessedRow | null; summary: ProcessedSummary }>(`/v1/imports/${id}/processed-rows/${rowId}`, {
      method: "PATCH",
      body
    }),
  updateProcessedRows: (
    request: ApiRequest,
    id: string,
    body: {
      rowIds: string[];
      updates: Partial<ProcessedRow["normalized"]> & { include?: boolean };
    }
  ) =>
    request<ImportProcessedRowsUpdateResponse>(`/v1/imports/${id}/processed-rows`, {
      method: "PATCH",
      body
    }),
  getReconciliation: (request: ApiRequest, id: string) =>
    request<ImportReconciliationResponse>(`/v1/imports/${id}/reconciliation`),
  resolveReconciliation: (
    request: ApiRequest,
    id: string,
    body: {
      action: "create_manual_adjustment";
      accountId: string;
      amountDelta: number;
      reason?: string;
      note?: string;
      effectiveAt?: string;
    }
  ) =>
    request<ImportReconciliationResolutionResponse>(`/v1/imports/${id}/reconciliation/resolve`, {
      method: "POST",
      body
    }),
  commit: (request: ApiRequest, id: string) =>
    request<CommitImportResponse>(`/v1/imports/${id}/commit`, { method: "POST" })
};

export const accountsApi = {
  listProviders: (request: ApiRequest) =>
    request<{ providers: AccountProviderSummary[]; defaultProviderId: string | null }>("/v1/accounts/providers"),
  getProvider: (request: ApiRequest, providerId: string) =>
    request<{ provider: AccountProvider }>(`/v1/accounts/providers/${encodeURIComponent(providerId)}`),
  createLinkSession: (request: ApiRequest, providerId: string) =>
    request<{ linkSession: AccountLinkSession }>(`/v1/accounts/providers/${encodeURIComponent(providerId)}/link-session`, {
      method: "POST"
    }),
  supportedAccountTypes: (request: ApiRequest) =>
    request<{ accountTypes: string[] }>("/v1/accounts/supported-account-types"),
  list: (request: ApiRequest) => request<{ accounts: Account[] }>("/v1/accounts"),
  create: (
    request: ApiRequest,
    body: {
      displayName: string;
      sourceInstitution?: string | null;
      accountType: string;
      currency?: string;
      initialBalance: number;
    }
  ) => request<{ account: Account }>("/v1/accounts", { method: "POST", body }),
  update: (
    request: ApiRequest,
    id: string,
    body: Partial<{
      displayName: string;
      sourceInstitution: string | null;
      accountType: string;
      currency: string;
      initialBalance: number;
      includeInCharts: boolean;
      hidden: boolean;
      closed: boolean;
      status: "active" | "hidden" | "closed";
      expectedVersion: number;
    }>
  ) => request<{ account: Account }>(`/v1/accounts/${id}`, { method: "PUT", body }),
  updateSettings: (
    request: ApiRequest,
    id: string,
    body: Partial<{
      includeInCharts: boolean;
      hidden: boolean;
      closed: boolean;
      status: "active" | "hidden" | "closed";
      expectedVersion: number;
    }>
  ) => request<{ account: Account }>(`/v1/accounts/${id}/settings`, { method: "PUT", body }),
  remove: (request: ApiRequest, id: string) => request<null>(`/v1/accounts/${id}`, { method: "DELETE" })
};

export const transactionsApi = {
  list: (
    request: ApiRequest,
    params: {
      start?: string;
      end?: string;
      query?: string;
      category?: string[];
      account?: string[];
      min_amount?: number;
      max_amount?: number;
      range?: string;
      category_view?: "granular" | "coarse";
      needs_category_review?: boolean;
      review_status?: "reviewed" | "needs_review";
      transaction_type?: Array<"expense" | "income" | "transfer">;
      tag?: string;
      recurring_rule_id?: string;
      sort_direction?: string;
      limit?: number;
      offset?: number;
    }
  ) =>
    request<TransactionsResponse>(`/v1/transactions${buildQuery({
      ...params,
      needs_category_review: params.needs_category_review ? "true" : undefined
    })}`),
  create: (request: ApiRequest, body: Partial<Transaction>) =>
    request<{ transaction: Transaction }>("/v1/transactions", { method: "POST", body }),
  bulkUpdate: (request: ApiRequest, body: TransactionsBulkUpdateRequest) =>
    request<{ result: TransactionsBulkUpdateResult }>("/v1/transactions/bulk", { method: "POST", body }),
  update: (request: ApiRequest, id: string, body: Partial<Transaction>) =>
    request<{ transaction: Transaction }>(`/v1/transactions/${id}`, { method: "PUT", body }),
  remove: (request: ApiRequest, id: string) =>
    request<null>(`/v1/transactions/${id}`, { method: "DELETE" }),
  restore: (request: ApiRequest, id: string) =>
    request<{ transaction: Transaction }>(`/v1/transactions/${id}/restore`, { method: "POST", body: {} })
};

export const investmentsApi = {
  overview: (
    request: ApiRequest,
    params: {
      timeframe?: "1D" | "1W" | "1M" | "3M" | "YTD" | "1Y" | "ALL";
      query?: string;
    }
  ) =>
    request<{ overview: InvestmentOverviewResponse }>(
      `/v1/investments/overview${buildQuery(params)}`
    ),
  holdings: (request: ApiRequest) =>
    request<{ items: InvestmentHolding[] }>("/v1/investments/holdings"),
  createHolding: (
    request: ApiRequest,
    body: Partial<InvestmentHolding> & {
      account_name: string;
      symbol: string;
      quantity: number;
      average_cost: number;
      market_price: number;
    }
  ) =>
    request<{ holding: InvestmentHolding }>("/v1/investments/holdings", {
      method: "POST",
      body
    }),
  importCsv: (
    request: ApiRequest,
    body: {
      csvText: string;
      sourceFileId?: string | null;
      asOfDate?: string | null;
    }
  ) =>
    request<{ result: { imported: string[]; updated: string[]; total_rows: number } }>(
      "/v1/investments/holdings/import-csv",
      {
        method: "POST",
        body
      }
    ),
  positions: (request: ApiRequest, params: { query?: string }) =>
    request<{ items: InvestmentPosition[]; total: number }>(
      `/v1/investments/positions${buildQuery(params)}`
    ),
  accounts: (request: ApiRequest) =>
    request<{ items: InvestmentAccountSummary[] }>("/v1/investments/accounts"),
  performance: (
    request: ApiRequest,
    params: {
      timeframe?: "1D" | "1W" | "1M" | "3M" | "YTD" | "1Y" | "ALL";
      symbol?: string;
    }
  ) =>
    request<{
      timeframe: string;
      portfolio: InvestmentPerformancePoint[];
      security: InvestmentPerformancePoint[];
      featured_symbol: string | null;
    }>(`/v1/investments/performance${buildQuery(params)}`)
};

export const recurringsApi = {
  list: (
    request: ApiRequest,
    params: {
      status?: "active" | "paused" | "archived";
    } = {}
  ) =>
    request<{ items: RecurringRule[] }>(`/v1/recurrings${buildQuery(params)}`),
  getById: (request: ApiRequest, id: string) =>
    request<{ recurring: RecurringRule }>(`/v1/recurrings/${id}`),
  create: (
    request: ApiRequest,
    body: {
      name: string;
      cadence: "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly";
      amount: number;
      direction?: "outflow" | "inflow";
      category_final?: string | null;
      account_id?: string | null;
      merchant_pattern?: string | null;
    }
  ) =>
    request<{ recurring: RecurringRule }>("/v1/recurrings", {
      method: "POST",
      body
    }),
  update: (request: ApiRequest, id: string, body: Partial<RecurringRule>) =>
    request<{ recurring: RecurringRule }>(`/v1/recurrings/${id}`, {
      method: "PUT",
      body
    }),
  evaluate: (
    request: ApiRequest,
    id: string,
    body: {
      start?: string;
      end?: string;
    } = {}
  ) =>
    request<{ evaluation: RecurringEvaluation }>(`/v1/recurrings/${id}/evaluate`, {
      method: "POST",
      body
    }),
  pause: (request: ApiRequest, id: string) =>
    request<{ recurring: RecurringRule }>(`/v1/recurrings/${id}/pause`, { method: "POST" }),
  resume: (request: ApiRequest, id: string) =>
    request<{ recurring: RecurringRule }>(`/v1/recurrings/${id}/resume`, { method: "POST" }),
  archive: (request: ApiRequest, id: string) =>
    request<{ recurring: RecurringRule }>(`/v1/recurrings/${id}/archive`, { method: "POST" }),
  remove: (request: ApiRequest, id: string) =>
    request<{ result: { deleted: boolean; detached_count: number } }>(`/v1/recurrings/${id}`, {
      method: "DELETE"
    }),
  getSuggestions: (request: ApiRequest, params?: { count_only?: boolean }) =>
    request<{ items: RecurringSuggestion[] } | { count: number }>(
      `/v1/recurrings/suggestions${buildQuery(params || {})}`
    ),
  dismissSuggestion: (request: ApiRequest, id: string, reason?: "user_dismissed" | "rule_deleted") =>
    request<{ dismissed: boolean }>(`/v1/recurrings/suggestions/${id}/dismiss`, {
      method: "POST",
      body: { reason: reason || "user_dismissed" }
    }),
  createRuleFromSuggestion: (request: ApiRequest, id: string, body: { name?: string; cadence?: string }) =>
    request<{ recurring: RecurringRule }>(`/v1/recurrings/suggestions/${id}/create-rule`, {
      method: "POST",
      body
    })
};

export const analyticsApi = {
  overview: (request: ApiRequest, params: { range?: string; start?: string; end?: string; category_view?: "granular" | "coarse" }) =>
    request<OverviewResponse>(`/v1/analytics/overview${buildQuery(params)}`),
  explorer: (
    request: ApiRequest,
    params: {
      range?: string;
      start?: string;
      end?: string;
      category_view?: "granular" | "coarse";
      perspective?: "overview" | "category" | "account";
      compare?: "previous";
      account?: string;
      category?: string[];
      merchant?: string;
      query?: string;
      direction?: "outflow" | "inflow";
      transaction_type?: Array<"expense" | "income" | "transfer">;
      tag?: string;
      recurring_rule_id?: string;
      review_status?: "reviewed" | "needs_review";
      min_amount?: number;
      max_amount?: number;
    }
  ) => request<ExplorerAnalyticsResponse>(`/v1/analytics/explorer${buildQuery(params)}`),
  categories: (request: ApiRequest, params: { range?: string; start?: string; end?: string; category_view?: "granular" | "coarse" }) =>
    request<{ items: Array<{ category: string; amount: number }> }>(`/v1/analytics/categories${buildQuery(params)}`),
  merchants: (request: ApiRequest, params: { range?: string; start?: string; end?: string; category_view?: "granular" | "coarse" }) =>
    request<{ items: Array<{ merchant: string; amount: number; share: number; rank: number; concentrationIndex: number }> }>(
      `/v1/analytics/merchants${buildQuery(params)}`
    ),
  heatmap: (request: ApiRequest, params: { range?: string; start?: string; end?: string; category_view?: "granular" | "coarse" }) =>
    request<{ items: HeatmapItem[] }>(`/v1/analytics/heatmap${buildQuery(params)}`),
  anomalies: (request: ApiRequest, params: { range?: string; start?: string; end?: string; category_view?: "granular" | "coarse" }) =>
    request<{ items: AnomalyItem[] }>(`/v1/analytics/anomalies${buildQuery(params)}`)
};

export const assistantApi = {
  ask: (request: ApiRequest, question: string) =>
    request<{ query: AssistantQuery }>("/v1/assistant/query", {
      method: "POST",
      body: { question }
    }),
  createConversation: (request: ApiRequest) =>
    request<{ conversationId: string }>("/v1/assistant/conversations", {
      method: "POST"
    }),
  askInConversation: (request: ApiRequest, conversationId: string, question: string) =>
    request<{ query: AssistantQuery }>(`/v1/assistant/conversations/${encodeURIComponent(conversationId)}/query`, {
      method: "POST",
      body: { question }
    })
};

export const categoriesApi = {
  list: (request: ApiRequest) => request<{ categories: Category[] }>("/v1/categories"),
  getStrategy: (request: ApiRequest) => request<{ strategy: CategoryStrategy }>("/v1/category-strategy"),
  saveStrategy: (
    request: ApiRequest,
    strategy: {
      coarseCategories?: CategoryStrategy["coarseCategories"];
      granularCategories?: CategoryStrategy["granularCategories"];
    }
  ) => request<{ strategy: CategoryStrategy }>("/v1/category-strategy", { method: "PUT", body: strategy }),
  add: (
    request: ApiRequest,
    body: {
      name: string;
      emoji?: string;
      coarseKey?: string;
      type?: "expense" | "income" | "transfer";
      budget?: Category["budget"];
    }
  ) =>
    request<{ category: Category }>("/v1/categories", { method: "POST", body }),
  update: (
    request: ApiRequest,
    id: string,
    body: Partial<{
      name: string;
      emoji: string;
      coarseKey: string;
      type: "expense" | "income" | "transfer";
      budget: Category["budget"];
    }>
  ) => request<{ category: Category }>(`/v1/categories/${id}`, { method: "PUT", body }),
  remove: (request: ApiRequest, id: string) =>
    request<null>(`/v1/categories/${id}`, { method: "DELETE" }),
  addRule: (request: ApiRequest, body: { pattern: string; category: string; type?: string; priority?: number }) =>
    request<{ rule: Record<string, unknown> }>("/v1/category-rules", { method: "POST", body })
};

export const savedViewsApi = {
  list: (request: ApiRequest) => request<{ items: SavedView[] }>("/v1/saved-views"),
  create: (request: ApiRequest, name: string, filters: Record<string, unknown>) =>
    request<{ view: SavedView }>("/v1/saved-views", { method: "POST", body: { name, filters } }),
  update: (request: ApiRequest, id: string, name: string, filters: Record<string, unknown>) =>
    request<{ view: SavedView }>(`/v1/saved-views/${id}`, { method: "PUT", body: { name, filters } }),
  remove: (request: ApiRequest, id: string) => request<null>(`/v1/saved-views/${id}`, { method: "DELETE" })
};
