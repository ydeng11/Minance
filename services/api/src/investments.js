import { loadStore, saveStore, addAuditEvent } from "./store.js";
import { parseCsv } from "./csv.js";
import { parseDate, toDecimal, normalizeText, createId, nowIso, stableHash } from "./utils.js";

const MAX_TEXT_LENGTH = 120;
const MAX_SYMBOL_LENGTH = 32;
const SUPPORTED_SOURCE_TYPES = new Set(["manual", "csv"]);
const REQUIRED_CSV_FIELDS = ["account_name", "symbol", "quantity", "average_cost", "market_price"];
const SUPPORTED_TIMEFRAMES = new Set(["1D", "1W", "1M", "3M", "YTD", "1Y", "ALL"]);

const COLUMN_ALIASES = {
  account_name: ["account", "account name", "broker", "institution", "portfolio"],
  symbol: ["symbol", "ticker", "security", "asset symbol"],
  asset_name: ["asset name", "name", "security name", "description"],
  asset_class: ["asset class", "class", "type", "category"],
  quantity: ["quantity", "shares", "units", "position"],
  average_cost: ["average cost", "avg cost", "cost basis", "avg price", "book cost"],
  market_price: ["market price", "price", "last price", "current price", "mark"],
  previous_close_price: ["previous close", "prev close", "close", "prior close"],
  currency: ["currency", "ccy"],
  as_of_date: ["as of", "as_of", "date", "valuation date"]
};

function normalizeTextField(rawValue, fallback = "") {
  const value = String(rawValue ?? fallback).trim();
  if (!value) {
    return "";
  }
  if (value.length > MAX_TEXT_LENGTH) {
    throw new Error("Invalid investments payload");
  }
  return value;
}

function normalizeCurrency(rawValue, fallback = "USD") {
  const value = String(rawValue ?? fallback).trim().toUpperCase() || fallback;
  if (!/^[A-Z]{3}$/.test(value)) {
    throw new Error("Invalid investments payload");
  }
  return value;
}

function normalizeDecimal(rawValue, fieldName, { min = 0 } = {}) {
  const value = toDecimal(rawValue);
  if (value == null || !Number.isFinite(value) || value < min) {
    throw new Error(`Invalid ${fieldName}`);
  }
  return value;
}

function normalizeSymbol(rawValue) {
  const symbol = String(rawValue || "").trim().toUpperCase();
  if (!symbol || symbol.length > MAX_SYMBOL_LENGTH || !/^[A-Z0-9._-]+$/.test(symbol)) {
    throw new Error("Invalid symbol");
  }
  return symbol;
}

function normalizeAsOfDate(rawValue) {
  const parsed = parseDate(rawValue || nowIso().slice(0, 10));
  if (!parsed) {
    throw new Error("Invalid as_of_date");
  }
  return parsed;
}

function normalizeSourceType(rawValue) {
  const sourceType = String(rawValue || "manual").trim().toLowerCase();
  if (!SUPPORTED_SOURCE_TYPES.has(sourceType)) {
    throw new Error("Invalid source_type");
  }
  return sourceType;
}

function normalizeSourceFileId(rawValue) {
  if (rawValue == null) {
    return null;
  }
  const value = String(rawValue).trim();
  return value || null;
}

function normalizeAssetClass(rawValue, fallback = "equity") {
  const normalized = normalizeText(rawValue || fallback).replace(/\s+/g, "_");
  return normalized || "equity";
}

function normalizeHoldingKey(accountName, symbol, asOfDate) {
  return stableHash([normalizeText(accountName), normalizeText(symbol), asOfDate].join("|"));
}

function resolveUserId(record) {
  if (!record || typeof record !== "object") {
    return null;
  }
  if (record.user_id != null && String(record.user_id).trim() !== "") {
    return String(record.user_id).trim();
  }
  if (record.userId != null && String(record.userId).trim() !== "") {
    return String(record.userId).trim();
  }
  return null;
}

function resolveHoldingKey(record) {
  if (!record || typeof record !== "object") {
    return null;
  }
  if (record.holding_key != null && String(record.holding_key).trim() !== "") {
    return String(record.holding_key).trim();
  }

  const accountName = String(
    record.account_name ?? record.accountName ?? record.account ?? record.account_id ?? record.accountId ?? ""
  ).trim();
  const symbol = String(record.symbol ?? record.ticker ?? "").trim().toUpperCase();
  const asOfDate = parseDate(record.as_of_date ?? record.asOfDate ?? record.date);

  if (!accountName || !symbol || !asOfDate) {
    return null;
  }

  return normalizeHoldingKey(accountName, symbol, asOfDate);
}

function ensureInvestmentCollection(store) {
  if (!Array.isArray(store.investmentHoldings)) {
    store.investmentHoldings = [];
  }
  return store.investmentHoldings;
}

function normalizeStoredHolding(record) {
  const userId = resolveUserId(record);
  if (!userId) {
    throw new Error("Invalid holding user");
  }

  const normalized = normalizeInvestmentHoldingInput(
    {
      account_name:
        record.account_name ??
        record.accountName ??
        record.account ??
        record.account_id ??
        record.accountId,
      symbol: record.symbol ?? record.ticker,
      asset_name: record.asset_name ?? record.assetName ?? record.name,
      asset_class: record.asset_class ?? record.assetClass ?? record.class,
      quantity: record.quantity,
      average_cost:
        record.average_cost ??
        record.avg_cost ??
        record.avgCost ??
        record.cost_basis ??
        record.costBasis,
      market_price: record.market_price ?? record.marketPrice ?? record.price,
      previous_close_price:
        record.previous_close_price ??
        record.previousClosePrice ??
        record.prev_close ??
        record.prevClose,
      currency: record.currency,
      as_of_date: record.as_of_date ?? record.asOfDate ?? record.date,
      source_type: record.source_type ?? record.sourceType,
      source_file_id: record.source_file_id ?? record.sourceFileId
    },
    {
      sourceType: record.source_type ?? record.sourceType ?? "manual",
      sourceFileId: record.source_file_id ?? record.sourceFileId ?? null
    }
  );

  const holdingKey = String(
    record.holding_key ||
      normalizeHoldingKey(normalized.account_name, normalized.symbol, normalized.as_of_date)
  );
  const id = String(record.id || `invhold_${holdingKey.slice(0, 16)}`);
  const createdAt = String(record.created_at ?? record.createdAt ?? nowIso());
  const updatedAt = String(record.updated_at ?? record.updatedAt ?? createdAt);

  return {
    id,
    user_id: userId,
    holding_key: holdingKey,
    ...normalized,
    created_at: createdAt,
    updated_at: updatedAt
  };
}

function normalizeStoredHoldingSafe(record) {
  try {
    return normalizeStoredHolding(record);
  } catch {
    return null;
  }
}

function findColumn(headers, aliases = []) {
  const byNormalizedHeader = new Map(
    headers.map((header) => [normalizeText(header).replace(/\s+/g, " "), header])
  );

  for (const alias of aliases) {
    const normalizedAlias = normalizeText(alias).replace(/\s+/g, " ");
    if (byNormalizedHeader.has(normalizedAlias)) {
      return byNormalizedHeader.get(normalizedAlias);
    }
  }

  return null;
}

function buildColumnMapping(headers) {
  const mapping = {};
  for (const [fieldName, aliases] of Object.entries(COLUMN_ALIASES)) {
    const matchedHeader = findColumn(headers, aliases);
    if (matchedHeader) {
      mapping[fieldName] = matchedHeader;
    }
  }
  return mapping;
}

function readMappedValue(row, mapping, fieldName) {
  const header = mapping[fieldName];
  if (!header) {
    return null;
  }
  return row[header];
}

function compareHoldingRecency(left, right) {
  if (left.as_of_date !== right.as_of_date) {
    return left.as_of_date.localeCompare(right.as_of_date);
  }

  const leftUpdated = String(left.updated_at || left.created_at || "");
  const rightUpdated = String(right.updated_at || right.created_at || "");
  return leftUpdated.localeCompare(rightUpdated);
}

function selectLatestHoldings(holdings = []) {
  const latestByPositionKey = new Map();

  for (const holding of holdings) {
    const key = `${normalizeText(holding.account_name)}|${holding.symbol}`;
    const current = latestByPositionKey.get(key);
    if (!current || compareHoldingRecency(current, holding) < 0) {
      latestByPositionKey.set(key, holding);
    }
  }

  return Array.from(latestByPositionKey.values());
}

function normalizeTimeframe(rawValue) {
  const candidate = String(rawValue || "3M").trim().toUpperCase();
  if (!SUPPORTED_TIMEFRAMES.has(candidate)) {
    return "3M";
  }
  return candidate;
}

function toUtcDate(rawValue) {
  const parsed = parseDate(rawValue);
  if (!parsed) {
    return null;
  }
  const candidate = new Date(`${parsed}T12:00:00Z`);
  if (Number.isNaN(candidate.getTime())) {
    return null;
  }
  return candidate;
}

function shiftDate(rawValue, days) {
  const date = toUtcDate(rawValue);
  if (!date) {
    return null;
  }
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function resolveTimeframeStartDate(latestDate, timeframe) {
  if (!latestDate || timeframe === "ALL") {
    return null;
  }
  if (timeframe === "1D") {
    return shiftDate(latestDate, -1);
  }
  if (timeframe === "1W") {
    return shiftDate(latestDate, -7);
  }
  if (timeframe === "1M") {
    return shiftDate(latestDate, -30);
  }
  if (timeframe === "3M") {
    return shiftDate(latestDate, -90);
  }
  if (timeframe === "1Y") {
    return shiftDate(latestDate, -365);
  }
  if (timeframe === "YTD") {
    const date = toUtcDate(latestDate);
    if (!date) {
      return null;
    }
    return `${date.getUTCFullYear()}-01-01`;
  }
  return null;
}

function buildHistoricalPortfolioSeries(holdings = [], timeframe = "3M") {
  if (!holdings.length) {
    return [];
  }

  const holdingsByDate = new Map();
  for (const holding of holdings) {
    const date = holding.as_of_date;
    if (!date) {
      continue;
    }
    const bucket = holdingsByDate.get(date);
    if (bucket) {
      bucket.push(holding);
    } else {
      holdingsByDate.set(date, [holding]);
    }
  }

  const orderedDates = Array.from(holdingsByDate.keys()).sort();
  if (!orderedDates.length) {
    return [];
  }

  const latestDate = orderedDates[orderedDates.length - 1];
  const startDate = resolveTimeframeStartDate(latestDate, timeframe);
  const activeByPosition = new Map();
  const points = [];

  for (const date of orderedDates) {
    for (const holding of holdingsByDate.get(date) || []) {
      const key = `${normalizeText(holding.account_name)}|${holding.symbol}`;
      activeByPosition.set(key, holding);
    }

    if (startDate && date < startDate) {
      continue;
    }

    const snapshot = computePortfolioSnapshot(Array.from(activeByPosition.values()));
    points.push({
      date,
      total_market_value: snapshot.summary.total_market_value,
      day_change_value: snapshot.summary.day_change_value,
      day_change_pct: snapshot.summary.day_change_pct
    });
  }

  return points;
}

function filterPositionsByQuery(positions = [], rawQuery = "") {
  const query = normalizeText(rawQuery);
  if (!query) {
    return positions;
  }

  return positions.filter((position) => {
    const fields = [
      position.symbol,
      position.asset_name,
      position.asset_class,
      position.account_name
    ];
    return fields.some((value) => normalizeText(value).includes(query));
  });
}

function buildAccountSummaryRows(positions = []) {
  const byAccount = new Map();

  for (const position of positions) {
    const key = position.account_name || "Portfolio";
    const current = byAccount.get(key) || {
      account_name: key,
      market_value: 0,
      cost_basis: 0,
      unrealized_gain: 0,
      day_change_value: 0,
      position_count: 0,
      latest_as_of_date: null
    };

    current.market_value += position.market_value;
    current.cost_basis += position.cost_basis;
    current.unrealized_gain += position.unrealized_gain;
    current.day_change_value += position.day_change_value;
    current.position_count += 1;

    if (!current.latest_as_of_date || position.as_of_date > current.latest_as_of_date) {
      current.latest_as_of_date = position.as_of_date;
    }

    byAccount.set(key, current);
  }

  return Array.from(byAccount.values())
    .map((entry) => {
      const marketValue = Number(entry.market_value.toFixed(2));
      const previousMarketValue = Number((entry.market_value - entry.day_change_value).toFixed(2));
      const dayChangePct =
        previousMarketValue > 0
          ? Number(((entry.day_change_value / previousMarketValue) * 100).toFixed(4))
          : 0;

      return {
        account_name: entry.account_name,
        market_value: marketValue,
        cost_basis: Number(entry.cost_basis.toFixed(2)),
        unrealized_gain: Number(entry.unrealized_gain.toFixed(2)),
        day_change_value: Number(entry.day_change_value.toFixed(2)),
        day_change_pct: dayChangePct,
        position_count: entry.position_count,
        latest_as_of_date: entry.latest_as_of_date
      };
    })
    .sort((left, right) => right.market_value - left.market_value);
}

function buildPerformancePayload(holdings = [], timeframe, symbol = null) {
  const normalizedTimeframe = normalizeTimeframe(timeframe);
  const featuredSymbol = symbol ? String(symbol).trim().toUpperCase() : null;

  const portfolio = buildHistoricalPortfolioSeries(holdings, normalizedTimeframe);
  const security = featuredSymbol
    ? buildHistoricalPortfolioSeries(
        holdings.filter((holding) => holding.symbol === featuredSymbol),
        normalizedTimeframe
      )
    : [];

  return {
    timeframe: normalizedTimeframe,
    portfolio,
    security,
    featured_symbol: featuredSymbol
  };
}

function upsertInvestmentHolding(store, userId, payload, options = {}) {
  const holdings = ensureInvestmentCollection(store);
  const normalized = normalizeInvestmentHoldingInput(payload, {
    sourceType: options.sourceType,
    sourceFileId: options.sourceFileId
  });

  const key = normalizeHoldingKey(normalized.account_name, normalized.symbol, normalized.as_of_date);
  const existing = holdings.find(
    (entry) => resolveUserId(entry) === userId && resolveHoldingKey(entry) === key
  );
  const currentTimestamp = nowIso();

  if (existing) {
    Object.assign(existing, {
      user_id: userId,
      holding_key: key,
      ...normalized,
      created_at: existing.created_at ?? existing.createdAt ?? currentTimestamp,
      updated_at: currentTimestamp
    });
    return {
      holding: normalizeStoredHolding(existing),
      created: false
    };
  }

  const created = {
    id: createId("invhold"),
    user_id: userId,
    holding_key: key,
    ...normalized,
    created_at: currentTimestamp,
    updated_at: currentTimestamp
  };
  holdings.push(created);

  return {
    holding: created,
    created: true
  };
}

export function normalizeInvestmentHoldingInput(payload = {}, options = {}) {
  const source = payload && typeof payload === "object" ? payload : {};
  const accountName = normalizeTextField(
    source.account_name ??
      source.account ??
      source.accountName ??
      source.account_id ??
      source.accountId ??
      ""
  );
  if (!accountName) {
    throw new Error("account_name is required");
  }

  const symbol = normalizeSymbol(source.symbol ?? source.ticker);
  const quantity = normalizeDecimal(source.quantity, "quantity");
  const averageCost = normalizeDecimal(
    source.average_cost ?? source.avg_cost ?? source.avgCost ?? source.cost_basis ?? source.costBasis ?? source.cost,
    "average_cost"
  );
  const marketPrice = normalizeDecimal(source.market_price ?? source.marketPrice ?? source.price, "market_price");
  const previousClosePriceRaw =
    source.previous_close_price ?? source.previousClosePrice ?? source.prev_close ?? null;
  const previousClosePrice =
    previousClosePriceRaw == null || String(previousClosePriceRaw).trim() === ""
      ? null
      : normalizeDecimal(previousClosePriceRaw, "previous_close_price");
  const asOfDate = normalizeAsOfDate(source.as_of_date ?? source.asOfDate ?? source.date);

  const sourceType = normalizeSourceType(options.sourceType ?? source.source_type ?? source.sourceType);
  const sourceFileId = normalizeSourceFileId(
    options.sourceFileId ?? source.source_file_id ?? source.sourceFileId
  );

  const assetName = normalizeTextField(source.asset_name ?? source.assetName ?? source.name ?? symbol, symbol);
  const assetClass = normalizeAssetClass(source.asset_class ?? source.assetClass ?? source.class ?? "equity");
  const currency = normalizeCurrency(source.currency || "USD");

  return {
    account_name: accountName,
    symbol,
    asset_name: assetName || symbol,
    asset_class: assetClass,
    quantity,
    average_cost: averageCost,
    market_price: marketPrice,
    previous_close_price: previousClosePrice,
    currency,
    as_of_date: asOfDate,
    source_type: sourceType,
    source_file_id: sourceFileId
  };
}

export function computePositionMetrics(holding) {
  const quantity = Number(toDecimal(holding?.quantity) || 0);
  const averageCost = Number(toDecimal(holding?.average_cost) || 0);
  const marketPrice = Number(toDecimal(holding?.market_price) || 0);
  const previousClosePrice =
    holding?.previous_close_price == null ? null : Number(toDecimal(holding.previous_close_price) || 0);

  const marketValue = Number((quantity * marketPrice).toFixed(2));
  const costBasis = Number((quantity * averageCost).toFixed(2));
  const unrealizedGain = Number((marketValue - costBasis).toFixed(2));
  const unrealizedReturnPct = costBasis > 0 ? Number(((unrealizedGain / costBasis) * 100).toFixed(4)) : 0;

  const dayChangeValue =
    previousClosePrice == null
      ? 0
      : Number((quantity * (marketPrice - previousClosePrice)).toFixed(2));
  const previousMarketValue =
    previousClosePrice == null ? marketValue : Number((quantity * previousClosePrice).toFixed(2));
  const dayChangePct =
    previousMarketValue > 0 ? Number(((dayChangeValue / previousMarketValue) * 100).toFixed(4)) : 0;

  return {
    market_value: marketValue,
    cost_basis: costBasis,
    unrealized_gain: unrealizedGain,
    unrealized_return_pct: unrealizedReturnPct,
    day_change_value: dayChangeValue,
    day_change_pct: dayChangePct
  };
}

export function computePortfolioSnapshot(holdings = []) {
  const positions = holdings
    .map(normalizeStoredHoldingSafe)
    .filter(Boolean)
    .map((holding) => {
      const metrics = computePositionMetrics(holding);
      return {
        ...holding,
        ...metrics
      };
    });

  positions.sort((left, right) => {
    if (left.market_value === right.market_value) {
      return left.symbol.localeCompare(right.symbol);
    }
    return right.market_value - left.market_value;
  });

  const summary = positions.reduce(
    (accumulator, position) => {
      accumulator.total_market_value += position.market_value;
      accumulator.total_cost_basis += position.cost_basis;
      accumulator.unrealized_gain += position.unrealized_gain;
      accumulator.day_change_value += position.day_change_value;
      return accumulator;
    },
    {
      total_market_value: 0,
      total_cost_basis: 0,
      unrealized_gain: 0,
      day_change_value: 0
    }
  );

  summary.total_market_value = Number(summary.total_market_value.toFixed(2));
  summary.total_cost_basis = Number(summary.total_cost_basis.toFixed(2));
  summary.unrealized_gain = Number(summary.unrealized_gain.toFixed(2));
  summary.day_change_value = Number(summary.day_change_value.toFixed(2));
  summary.unrealized_return_pct =
    summary.total_cost_basis > 0
      ? Number(((summary.unrealized_gain / summary.total_cost_basis) * 100).toFixed(4))
      : 0;
  const previousMarketValue = summary.total_market_value - summary.day_change_value;
  summary.day_change_pct =
    previousMarketValue > 0
      ? Number(((summary.day_change_value / previousMarketValue) * 100).toFixed(4))
      : 0;
  summary.position_count = positions.length;

  const allocationMap = new Map();
  for (const position of positions) {
    const key = position.asset_class || "other";
    const current = allocationMap.get(key) || 0;
    allocationMap.set(key, current + position.market_value);
  }

  const allocations = Array.from(allocationMap.entries())
    .map(([asset_class, marketValue]) => ({
      asset_class,
      market_value: Number(marketValue.toFixed(2)),
      share_pct:
        summary.total_market_value > 0
          ? Number(((marketValue / summary.total_market_value) * 100).toFixed(4))
          : 0
    }))
    .sort((left, right) => right.market_value - left.market_value);

  return {
    summary,
    allocations,
    positions
  };
}

export function listInvestmentHoldings(userId) {
  const store = loadStore();
  const holdings = ensureInvestmentCollection(store)
    .filter((entry) => resolveUserId(entry) === userId)
    .map(normalizeStoredHoldingSafe)
    .filter(Boolean)
    .sort((left, right) => {
      if (left.as_of_date === right.as_of_date) {
        if (left.symbol === right.symbol) {
          return left.account_name.localeCompare(right.account_name);
        }
        return left.symbol.localeCompare(right.symbol);
      }
      return right.as_of_date.localeCompare(left.as_of_date);
    });

  return {
    items: holdings
  };
}

export function createManualInvestmentHolding(userId, payload) {
  const store = loadStore();
  const result = upsertInvestmentHolding(store, userId, payload, { sourceType: "manual" });
  saveStore(store);
  addAuditEvent(
    userId,
    result.created ? "investments.holding.manual.create" : "investments.holding.manual.upsert",
    { holdingId: result.holding.id }
  );
  return result.holding;
}

export function importInvestmentHoldingsFromCsv(userId, csvText, options = {}) {
  const parsed = parseCsv(csvText);
  const mapping = buildColumnMapping(parsed.headers || []);

  for (const requiredField of REQUIRED_CSV_FIELDS) {
    if (!mapping[requiredField]) {
      throw new Error(`CSV is missing required investments column: ${requiredField}`);
    }
  }

  const store = loadStore();
  const sourceFileId = normalizeSourceFileId(options.sourceFileId);
  const asOfDateOverride = options.asOfDate ? normalizeAsOfDate(options.asOfDate) : null;
  const imported = [];
  const updated = [];

  for (const rowEntry of parsed.rows || []) {
    const source = {
      account_name: readMappedValue(rowEntry.row, mapping, "account_name"),
      symbol: readMappedValue(rowEntry.row, mapping, "symbol"),
      asset_name: readMappedValue(rowEntry.row, mapping, "asset_name"),
      asset_class: readMappedValue(rowEntry.row, mapping, "asset_class"),
      quantity: readMappedValue(rowEntry.row, mapping, "quantity"),
      average_cost: readMappedValue(rowEntry.row, mapping, "average_cost"),
      market_price: readMappedValue(rowEntry.row, mapping, "market_price"),
      previous_close_price: readMappedValue(rowEntry.row, mapping, "previous_close_price"),
      currency: readMappedValue(rowEntry.row, mapping, "currency"),
      as_of_date: readMappedValue(rowEntry.row, mapping, "as_of_date") || asOfDateOverride
    };

    const result = upsertInvestmentHolding(store, userId, source, {
      sourceType: "csv",
      sourceFileId
    });

    if (result.created) {
      imported.push(result.holding.id);
    } else {
      updated.push(result.holding.id);
    }
  }

  saveStore(store);
  addAuditEvent(userId, "investments.holding.csv.import", {
    imported: imported.length,
    updated: updated.length,
    source_file_id: sourceFileId
  });

  return {
    imported,
    updated,
    total_rows: parsed.rows?.length || 0
  };
}

export function getInvestmentPortfolio(userId) {
  const holdings = listInvestmentHoldings(userId).items;
  const latestHoldings = selectLatestHoldings(holdings);
  return computePortfolioSnapshot(latestHoldings);
}

export function listInvestmentPositions(userId, options = {}) {
  const portfolio = getInvestmentPortfolio(userId);
  const items = filterPositionsByQuery(portfolio.positions, options.query || "");
  return {
    items,
    total: items.length
  };
}

export function listInvestmentAccounts(userId) {
  const portfolio = getInvestmentPortfolio(userId);
  return {
    items: buildAccountSummaryRows(portfolio.positions)
  };
}

export function getInvestmentPerformance(userId, options = {}) {
  const portfolio = getInvestmentPortfolio(userId);
  const topSymbol = portfolio.positions[0]?.symbol || null;
  const symbol = options.symbol ? String(options.symbol).trim().toUpperCase() : topSymbol;
  const holdings = listInvestmentHoldings(userId).items;
  return buildPerformancePayload(holdings, options.timeframe, symbol);
}

export function getInvestmentOverview(userId, options = {}) {
  const holdings = listInvestmentHoldings(userId).items;
  const portfolio = getInvestmentPortfolio(userId);
  const positions = filterPositionsByQuery(portfolio.positions, options.query || "");
  const featuredSecurity = positions[0] || portfolio.positions[0] || null;
  const performance = buildPerformancePayload(
    holdings,
    options.timeframe,
    featuredSecurity?.symbol || null
  );
  const accounts = buildAccountSummaryRows(portfolio.positions);
  const latestAsOfDate = portfolio.positions.reduce((latest, position) => {
    if (!latest || position.as_of_date > latest) {
      return position.as_of_date;
    }
    return latest;
  }, null);

  return {
    timeframe: performance.timeframe,
    summary: portfolio.summary,
    allocations: portfolio.allocations,
    accounts,
    positions,
    featured_security: featuredSecurity,
    performance,
    meta: {
      as_of_date: latestAsOfDate,
      total_holdings: holdings.length,
      total_positions: portfolio.positions.length,
      filtered_positions: positions.length
    }
  };
}
