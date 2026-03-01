export interface Tokens {
  accessToken: string;
  accessExpiresAt: string;
  refreshToken: string;
  refreshExpiresAt?: string;
}

export interface User {
  id: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: User;
  tokens: Tokens;
}

export interface Provider {
  id: string;
  name: string;
  models: string[];
}

export interface Credential {
  id: string;
  provider: string;
  label: string;
  maskedKey: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  lastValidatedAt: string | null;
}

export interface ProviderPreferences {
  userId: string;
  defaultProvider: string | null;
  defaultModel: string | null;
  failoverProviders: string[];
  featureOverrides: Record<string, { provider?: string; model?: string }>;
  updatedAt: string | null;
}

export interface AiTrainingStatus {
  enabled: boolean;
  reason: string | null;
  dbPath: string | null;
  rawCategoryMappings: number;
  merchantExemplars: number;
}

export interface ImportJob {
  id: string;
  userId: string;
  fileName: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  rowCount: number;
  delimiter: string;
  hasHeader: boolean;
  headers: string[];
  mapping: Record<string, string | null>;
  mappingConfidence: Record<string, number>;
  mappingAverageConfidence: number;
  warnings: string[];
  aiSuggested: boolean;
  directionInference?: {
    amountMode: "single_amount" | "split_debit_credit";
    signConvention: "negative_is_debit" | "positive_is_debit" | "split_columns";
    strategy: string;
    confidence: number;
    warnings: string[];
  };
  commitSummary: CommitImportResponse["summary"] | null;
}

export interface RawPreviewRow {
  rowIndex: number;
  row: Record<string, string>;
}

export interface ProcessedRow {
  rowId: string;
  importId: string;
  rowIndex: number;
  include: boolean;
  status: "valid" | "invalid" | "duplicate" | "excluded";
  issues: string[];
  source: {
    transaction_date: string;
    merchant_raw: string;
    description: string;
    amount: string;
    currency: string;
    account_name: string;
    category_raw: string | null;
    memo: string | null;
  };
  normalized: {
    transaction_date: string | null;
    merchant_raw: string;
    merchant_normalized: string | null;
    description: string;
    amount: number | null;
    direction: "debit" | "credit";
    direction_confidence?: number;
    direction_strategy?: string | null;
    needs_direction_review?: boolean;
    currency: string;
    account_name: string;
    category_raw: string | null;
    category_final: string | null;
    memo: string | null;
    dedupe_fingerprint: string | null;
    category_confidence: number;
    category_strategy: string | null;
    needs_category_review: boolean;
  };
  overrides: Record<string, unknown>;
  editedAt: string | null;
  updatedAt: string;
}

export interface ProcessedSummary {
  all: number;
  valid: number;
  invalid: number;
  duplicate: number;
  excluded: number;
  included: number;
}

export interface ImportDetailsResponse {
  importJob: ImportJob;
  previewRows: RawPreviewRow[];
  diagnostics: Array<{ rowIndex: number; type: string; message: string }>;
  processedPreview: ProcessedRow[];
  processedSummary: ProcessedSummary;
}

export interface ImportProcessedRowsResponse {
  total: number;
  offset: number;
  limit: number;
  items: ProcessedRow[];
  summary: ProcessedSummary;
}

export interface Transaction {
  id: string;
  user_id: string;
  account_id: string | null;
  account_key: string;
  source_type: string;
  source_file_id: string | null;
  transaction_date: string;
  post_date: string | null;
  merchant_raw: string;
  merchant_normalized: string;
  description: string;
  amount: number;
  currency: string;
  direction: "debit" | "credit";
  category_raw: string | null;
  category_final: string;
  category_coarse?: string | null;
  category_coarse_key?: string | null;
  category_emoji?: string;
  category_coarse_emoji?: string;
  category_confidence: number;
  category_strategy: string | null;
  needs_category_review: boolean;
  memo: string | null;
  dedupe_fingerprint: string;
  created_at: string;
  updated_at: string;
}

export interface DateBoundsMeta {
  start: string | null;
  end: string | null;
  count?: number;
}

export interface AppliedRangeMeta {
  range: string;
  start: string | null;
  end: string | null;
}

export interface AnalyticsMeta {
  appliedRange: AppliedRangeMeta;
  dataBounds: DateBoundsMeta;
  categoryView?: "granular" | "coarse";
}

export interface TransactionsResponse {
  total: number;
  items: Transaction[];
  meta: AnalyticsMeta;
}

export interface OverviewResponse {
  summary: {
    totalSpend: number;
    totalIncome: number;
    netFlow: number;
    recurringSpend: number;
    transactionCount: number;
  };
  trend: Array<{ month: string; spend: number; income: number; net: number }>;
  topCategories: Array<{
    category: string;
    amount: number;
    count?: number;
    share?: number;
    emoji?: string;
    coarseKey?: string;
    excluded?: boolean;
  }>;
  topMerchants: Array<{ merchant: string; amount: number; share: number; rank: number; concentrationIndex: number }>;
  meta: AnalyticsMeta;
}

export interface HeatmapItem {
  week: number;
  weekday: number;
  amount: number;
  count: number;
}

export interface AnomalyItem {
  transactionId: string;
  transactionDate: string;
  merchant: string;
  amount: number;
  category: string;
  categoryGranular?: string;
  categoryCoarse?: string;
  emoji?: string;
  reason: string;
}

export interface AssistantQuery {
  id: string;
  userId: string;
  question: string;
  plan: {
    intent: string;
    filters: {
      start: string | null;
      end: string | null;
      range?: string;
      category?: string | null;
      merchant?: string | null;
    };
  };
  result: {
    answer: string;
    highlights?: string[];
    confidence: number;
    numbers: Record<string, unknown>;
    filters: Record<string, unknown>;
    details: unknown[];
    drillDownUrl: string;
    provider: string;
    model: string;
    synthesisStatus: string;
    analysisAgentStatus?: string;
    analysisDataScope?: string;
  };
  createdAt: string;
}

export interface Category {
  id: string;
  userId: string;
  name: string;
  emoji?: string;
  coarseKey?: string | null;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryStrategyCoarse {
  key: string;
  name: string;
  emoji: string;
  isExcluded: boolean;
  order: number;
}

export interface CategoryStrategyGranular {
  name: string;
  emoji: string;
  coarseKey: string;
  aliases: string[];
  isSystem: boolean;
}

export interface CategoryStrategy {
  id: string;
  userId: string;
  sourceUrl: string;
  version: string;
  coarseCategories: CategoryStrategyCoarse[];
  granularCategories: CategoryStrategyGranular[];
  createdAt: string;
  updatedAt: string;
}

export interface SavedView {
  id: string;
  userId: string;
  name: string;
  filters: Record<string, unknown>;
  layout: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CommitImportResponse {
  importId: string;
  status: string;
  summary: {
    scanned: number;
    imported: number;
    duplicatesSkipped: number;
    invalidRows: number;
    excludedRows: number;
    lowConfidenceRows: number;
    lowDirectionConfidenceRows?: number;
    llmCategorization: {
      attempted: number;
      succeeded: number;
      failed: number;
      fallbackUsed: number;
    };
    llmDirectionInference?: {
      attempted: number;
      succeeded: number;
      failed: number;
      fallbackUsed: number;
    };
    processedTotals: ProcessedSummary;
    dateBounds: {
      start: string | null;
      end: string | null;
    };
  };
  dateBounds: {
    start: string | null;
    end: string | null;
  };
  processedTotals: ProcessedSummary;
}

export interface MigrationRun {
  id: string;
  userId: string;
  status: string;
  sqlitePath: string;
  createdAt: string;
  updatedAt: string;
  report: {
    scanned: number;
    imported: number;
    duplicatesSkipped: number;
    invalidRows: number;
    accountsImported: number;
    categoriesImported: number;
    rulesImported: number;
    warnings: string[];
  };
}

export interface ApiErrorPayload {
  error?: {
    message?: string;
    details?: {
      remediation?: string;
      code?: string;
    };
    code?: string;
  };
}
