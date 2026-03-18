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

export interface Account {
  id: string;
  userId: string;
  displayName: string;
  sourceInstitution: string | null;
  accountType: string;
  currency: string;
  initialBalance: number;
  version: number;
  status: "active" | "hidden" | "closed";
  includeInCharts: boolean;
  hidden: boolean;
  closed: boolean;
  closedAt: string | null;
  normalizedKey: string;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface AccountProviderCapabilities {
  manualAccountCreate: boolean;
  csvImport: boolean;
  directAggregation: boolean;
  institutionLookup: boolean;
  backgroundSync: boolean;
  reconnect: boolean;
}

export interface AccountProviderFallback {
  strategy: string;
  remediation: string;
  recommendedSteps: string[];
}

export interface AccountProviderSummary {
  id: string;
  name: string;
  status: string;
  source: string;
  selfHostDefault: boolean;
  capabilities: AccountProviderCapabilities;
  fallback: AccountProviderFallback;
}

export interface AccountProvider extends AccountProviderSummary {
  actions: {
    begin_link_session: boolean;
    refresh_connection: boolean;
  };
  adapter: {
    key: string;
    ingestRoute: string;
    manualEntryRoute: string;
  };
}

export interface AccountLinkSession {
  providerId: string;
  status: string;
  linkUrl: string | null;
  expiresAt: string | null;
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
  sourceFormat?: "csv" | "ofx_qfx";
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
    amountMode: "single_amount" | "split_outflow_inflow";
    signConvention: "negative_is_outflow" | "positive_is_outflow" | "split_columns";
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
    direction: "outflow" | "inflow";
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

export interface ImportReconciliationRecommendation {
  type: string;
  message: string;
  amountDelta?: number;
}

export interface ImportReconciliationAccount {
  accountKey: string;
  accountName: string;
  accountId: string | null;
  status: "balanced" | "needs_review" | "account_missing" | "no_data";
  totalRows: number;
  includedValidRows: number;
  invalidRows: number;
  duplicateRows: number;
  excludedRows: number;
  lowDirectionConfidenceRows: number;
  importedNet: number;
  existingWindowNet: number;
  discrepancyAmount: number;
  existingWindowCount: number;
  matchedExistingCount: number;
  unmatchedImportedCount: number;
  dateBounds: {
    start: string | null;
    end: string | null;
  };
  recommendations: ImportReconciliationRecommendation[];
}

export interface ImportReconciliationResponse {
  importId: string;
  importStatus: string;
  generatedAt: string;
  summary: {
    accountsTotal: number;
    balancedAccounts: number;
    needsReviewAccounts: number;
    missingAccounts: number;
    unresolvedRows: number;
    importedNet: number;
    existingWindowNet: number;
    discrepancyAmount: number;
    actionRequired: boolean;
  };
  accounts: ImportReconciliationAccount[];
}

export interface ImportReconciliationResolutionResponse {
  resolution: {
    action: string;
    accountId: string;
    adjustment: {
      id: string;
      accountId: string;
      userId: string;
      amountDelta: number;
      effectiveAt: string;
      reason: string;
      note: string | null;
      createdAt: string;
      createdByUserId: string;
      expectedVersion: number;
    };
  };
  reconciliation: ImportReconciliationResponse;
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
  direction: "outflow" | "inflow";
  transaction_type: "expense" | "income" | "transfer";
  category_raw: string | null;
  category_final: string;
  category_coarse?: string | null;
  category_coarse_key?: string | null;
  category_emoji?: string;
  category_coarse_emoji?: string;
  category_confidence: number;
  category_strategy: string | null;
  needs_category_review: boolean;
  review_status: "reviewed" | "needs_review";
  tags: string[];
  recurring_rule_id: string | null;
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
  amountBounds?: {
    min: number;
    max: number;
  };
  availableTags?: string[];
}

export interface TransactionsResponse {
  total: number;
  items: Transaction[];
  meta: AnalyticsMeta;
}

export interface InvestmentHolding {
  id: string;
  user_id: string;
  holding_key: string;
  account_name: string;
  symbol: string;
  asset_name: string;
  asset_class: string;
  quantity: number;
  average_cost: number;
  market_price: number;
  previous_close_price: number | null;
  currency: string;
  as_of_date: string;
  source_type: "manual" | "csv";
  source_file_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvestmentPosition extends InvestmentHolding {
  market_value: number;
  cost_basis: number;
  unrealized_gain: number;
  unrealized_return_pct: number;
  day_change_value: number;
  day_change_pct: number;
}

export interface InvestmentAllocation {
  asset_class: string;
  market_value: number;
  share_pct: number;
}

export interface InvestmentAccountSummary {
  account_name: string;
  market_value: number;
  cost_basis: number;
  unrealized_gain: number;
  day_change_value: number;
  day_change_pct: number;
  position_count: number;
  latest_as_of_date: string | null;
}

export interface InvestmentPerformancePoint {
  date: string;
  total_market_value: number;
  day_change_value: number;
  day_change_pct: number;
}

export interface InvestmentOverviewResponse {
  timeframe: string;
  summary: {
    total_market_value: number;
    total_cost_basis: number;
    unrealized_gain: number;
    day_change_value: number;
    unrealized_return_pct: number;
    day_change_pct: number;
    position_count: number;
  };
  allocations: InvestmentAllocation[];
  accounts: InvestmentAccountSummary[];
  positions: InvestmentPosition[];
  featured_security: InvestmentPosition | null;
  performance: {
    timeframe: string;
    portfolio: InvestmentPerformancePoint[];
    security: InvestmentPerformancePoint[];
    featured_symbol: string | null;
  };
  meta: {
    as_of_date: string | null;
    total_holdings: number;
    total_positions: number;
    filtered_positions: number;
  };
}

export interface RecurringRule {
  id: string;
  user_id: string;
  name: string;
  cadence: "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly";
  amount: number;
  direction: "outflow" | "inflow" | null;
  category_final: string | null;
  account_id: string | null;
  merchant_pattern: string | null;
  status: "active" | "paused" | "archived";
  next_run_at: string | null;
  linked_transaction_ids: string[];
  linked_transaction_count: number;
  last_evaluated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RecurringMatch {
  id: string;
  transaction_date: string;
  merchant_raw: string;
  amount: number;
  direction: "outflow" | "inflow";
  account_id: string | null;
  category_final: string;
  recurring_rule_id: string | null;
}

export interface RecurringEvaluation {
  rule: RecurringRule;
  matches: RecurringMatch[];
  match_count: number;
  attached_count: number;
  detached_count: number;
  linked_transaction_ids: string[];
}

export interface RecurringSuggestion {
  id: string;
  user_id: string;
  merchant_pattern: string;
  amount: number;
  detected_at: string;
  occurrence_count: number;
  transaction_ids: string[];
}

export interface DismissedRecurringSuggestion {
  id: string;
  user_id: string;
  merchant_pattern: string;
  amount: number;
  dismissed_at: string;
  dismissed_reason: "user_dismissed" | "rule_deleted";
  cooldown_until: string | null;
}

export interface TransactionsBulkUpdateRequest {
  transaction_ids: string[];
  operation?: "update" | "delete";
  category_final?: string;
  tags?: string[] | null;
  review_status?: "reviewed" | "needs_review";
  needs_category_review?: boolean;
}

export interface TransactionsBulkUpdateResult {
  updated: number;
  transactions: Transaction[];
  meta: {
    transaction_ids: string[];
  };
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

export interface ExplorerSummaryDeltaValue {
  delta: number;
  percent: number | null;
}

export interface ExplorerCategoryCompositionItem {
  category: string;
  amount: number;
  share: number;
  emoji?: string;
}

export interface ExplorerTrendItem {
  month: string;
  spend: number;
  income: number;
  net: number;
  spendComposition: ExplorerCategoryCompositionItem[];
  incomeComposition: ExplorerCategoryCompositionItem[];
}

export interface ExplorerAccountTrendItem {
  month: string;
  outflow: number;
  inflow: number;
  net: number;
}

export interface ExplorerAccountItem {
  accountId: string | null;
  accountKey: string;
  accountName: string;
  sourceInstitution: string | null;
  outflow: number;
  inflow: number;
  net: number;
  transactionCount: number;
  share: number;
  trend: ExplorerAccountTrendItem[];
}

export interface ExplorerCategoryItem {
  category: string;
  amount: number;
  count?: number;
  share?: number;
  emoji?: string;
  coarseKey?: string;
  excluded?: boolean;
  spend: number;
  income: number;
  net: number;
  transactionCount: number;
  spendShare: number;
  incomeShare: number;
}

export interface ExplorerSummaryDelta {
  totalSpend: ExplorerSummaryDeltaValue;
  totalIncome: ExplorerSummaryDeltaValue;
  netFlow: ExplorerSummaryDeltaValue;
  recurringSpend: ExplorerSummaryDeltaValue;
  transactionCount: ExplorerSummaryDeltaValue;
}

export interface ExplorerSummarySparklinePoint {
  date: string;
  spend: number;
  income: number;
  net: number;
}

export interface ExplorerWeekdaySummaryItem {
  weekday: number;
  amount: number;
  count: number;
}

export interface ExplorerCategoryWeekdayHeatmapCell {
  weekday: number;
  amount: number;
  count: number;
}

export interface ExplorerCategoryWeekdayHeatmapRow {
  category: string;
  emoji?: string;
  coarseKey?: string;
  totalSpend: number;
  transactionCount: number;
  cells: ExplorerCategoryWeekdayHeatmapCell[];
}

export interface ExplorerAnalyticsResponse {
  summary: {
    current: OverviewResponse["summary"];
    previous: OverviewResponse["summary"] | null;
    delta: ExplorerSummaryDelta | null;
    sparkline: ExplorerSummarySparklinePoint[];
  };
  comparison: {
    enabled: boolean;
    current: OverviewResponse["summary"];
    previous: OverviewResponse["summary"] | null;
    delta: ExplorerSummaryDelta | null;
  };
  trend: {
    items: ExplorerTrendItem[];
  };
  categories: {
    items: ExplorerCategoryItem[];
  };
  accounts: {
    items: ExplorerAccountItem[];
    totals: {
      accounts: number;
      outflow: number;
    };
  };
  merchants: {
    items: OverviewResponse["topMerchants"];
  };
  weekdaySummary: {
    items: ExplorerWeekdaySummaryItem[];
  };
  categoryWeekdayHeatmap: {
    items: ExplorerCategoryWeekdayHeatmapRow[];
  };
  heatmap: {
    items: HeatmapItem[];
  };
  anomalies: {
    items: AnomalyItem[];
  };
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
  type?: "expense" | "income" | "transfer" | null;
  budget?: {
    amount: number;
    cadence: "weekly" | "monthly" | "yearly";
    currency: string;
    rollover: boolean;
  } | null;
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

export interface SqliteFoundationStatus {
  backend: "json" | "sqlite";
  jsonFilePath: string;
  sqliteFilePath: string;
  sqliteSchemaPath: string;
  autoInit: boolean;
  initializeAttempted: boolean;
  sqliteCliAvailable: boolean;
  schemaFileExists: boolean;
  sqliteFileExists: boolean;
  schemaVersion: string | null;
  migrationsApplied: number;
  ready: boolean;
  lastError: string | null;
}

export interface StorageStatusResponse {
  storage: {
    backend: "json" | "sqlite";
    sqlite: SqliteFoundationStatus;
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
