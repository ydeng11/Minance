import type {
  AnomalyItem,
  AssistantQuery,
  AuthResponse,
  Category,
  CommitImportResponse,
  Credential,
  AiTrainingStatus,
  HeatmapItem,
  ImportDetailsResponse,
  ImportJob,
  ImportProcessedRowsResponse,
  MigrationRun,
  OverviewResponse,
  ProcessedRow,
  ProcessedSummary,
  Provider,
  ProviderPreferences,
  SavedView,
  Transaction,
  TransactionsResponse,
  User
} from "@/lib/api/types";

export type ApiRequest = <T>(path: string, options?: {
  method?: string;
  auth?: boolean;
  body?: BodyInit | Record<string, unknown> | null;
}) => Promise<T>;

function buildQuery(params: Record<string, string | number | boolean | null | undefined>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === "") {
      continue;
    }
    query.set(key, String(value));
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

export const aiApi = {
  providers: (request: ApiRequest) => request<{ providers: Provider[] }>("/v1/ai/providers"),
  credentials: (request: ApiRequest) =>
    request<{ credentials: Credential[]; preferences: ProviderPreferences }>("/v1/ai/credentials"),
  trainingStatus: (request: ApiRequest) =>
    request<{ training: AiTrainingStatus }>("/v1/ai/training-status"),
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
  reprocess: (request: ApiRequest, id: string) =>
    request<{ total: number; summary: ProcessedSummary }>(`/v1/imports/${id}/reprocess`, { method: "POST" }),
  commit: (request: ApiRequest, id: string) =>
    request<CommitImportResponse>(`/v1/imports/${id}/commit`, { method: "POST" })
};

export const transactionsApi = {
  list: (
    request: ApiRequest,
    params: {
      query?: string;
      category?: string;
      range?: string;
      needs_category_review?: boolean;
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
  update: (request: ApiRequest, id: string, body: Partial<Transaction>) =>
    request<{ transaction: Transaction }>(`/v1/transactions/${id}`, { method: "PUT", body }),
  remove: (request: ApiRequest, id: string) =>
    request<null>(`/v1/transactions/${id}`, { method: "DELETE" })
};

export const analyticsApi = {
  overview: (request: ApiRequest, params: { range?: string; start?: string; end?: string }) =>
    request<OverviewResponse>(`/v1/analytics/overview${buildQuery(params)}`),
  categories: (request: ApiRequest, params: { range?: string; start?: string; end?: string }) =>
    request<{ items: Array<{ category: string; amount: number }> }>(`/v1/analytics/categories${buildQuery(params)}`),
  merchants: (request: ApiRequest, params: { range?: string; start?: string; end?: string }) =>
    request<{ items: Array<{ merchant: string; amount: number; share: number; rank: number; concentrationIndex: number }> }>(
      `/v1/analytics/merchants${buildQuery(params)}`
    ),
  heatmap: (request: ApiRequest, params: { range?: string; start?: string; end?: string }) =>
    request<{ items: HeatmapItem[] }>(`/v1/analytics/heatmap${buildQuery(params)}`),
  anomalies: (request: ApiRequest, params: { range?: string; start?: string; end?: string }) =>
    request<{ items: AnomalyItem[] }>(`/v1/analytics/anomalies${buildQuery(params)}`)
};

export const assistantApi = {
  ask: (request: ApiRequest, question: string) =>
    request<{ query: AssistantQuery }>("/v1/assistant/query", {
      method: "POST",
      body: { question }
    })
};

export const categoriesApi = {
  list: (request: ApiRequest) => request<{ categories: Category[] }>("/v1/categories"),
  add: (request: ApiRequest, name: string) =>
    request<{ category: Category }>("/v1/categories", { method: "POST", body: { name } }),
  addRule: (request: ApiRequest, body: { pattern: string; category: string; type?: string; priority?: number }) =>
    request<{ rule: Record<string, unknown> }>("/v1/category-rules", { method: "POST", body })
};

export const savedViewsApi = {
  list: (request: ApiRequest) => request<{ items: SavedView[] }>("/v1/saved-views"),
  create: (request: ApiRequest, name: string, filters: Record<string, unknown>) =>
    request<{ view: SavedView }>("/v1/saved-views", { method: "POST", body: { name, filters } }),
  remove: (request: ApiRequest, id: string) => request<null>(`/v1/saved-views/${id}`, { method: "DELETE" })
};

export const migrationApi = {
  run: (
    request: ApiRequest,
    body:
      | {
          sqlitePath: string;
        }
      | {
          fileName: string;
          sqliteBase64: string;
        }
  ) => request<{ migration: MigrationRun }>("/v1/migrations/minance/sqlite", { method: "POST", body })
};
