import { loadStore, saveStore, addAuditEvent } from "./store.js";
import { requireAiFeature } from "./ai.js";
import { filterUserTransactions, getAnomalies } from "./analytics.js";
import { createId, nowIso, parseDate } from "./utils.js";
import { synthesizeAssistantAnswerWithLlm } from "./llm/assistant.js";
import { runCrewAiAnalysis } from "./agents.js";

const monthLookup = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12
};

function localDateYmd(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function parseRangeFromQuestion(question) {
  const normalized = question.toLowerCase();
  const now = new Date();

  if (normalized.includes("past 60 days") || normalized.includes("last 60 days")) {
    const start = new Date(now);
    start.setDate(start.getDate() - 60);
    return {
      start: localDateYmd(start),
      end: localDateYmd(now)
    };
  }

  if (normalized.includes("last month")) {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    return {
      start: localDateYmd(start),
      end: localDateYmd(end)
    };
  }

  if (normalized.includes("this month")) {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      start: localDateYmd(start),
      end: localDateYmd(now)
    };
  }

  if (normalized.includes("this quarter")) {
    const quarter = Math.floor(now.getMonth() / 3);
    const start = new Date(now.getFullYear(), quarter * 3, 1);
    return {
      start: localDateYmd(start),
      end: localDateYmd(now)
    };
  }

  for (const [monthName, monthNumber] of Object.entries(monthLookup)) {
    if (normalized.includes(monthName)) {
      const yearMatch = normalized.match(/\b(20\d{2})\b/);
      const year = yearMatch ? Number(yearMatch[1]) : now.getFullYear();
      const start = new Date(year, monthNumber - 1, 1);
      const end = new Date(year, monthNumber, 0);
      return {
        start: localDateYmd(start),
        end: localDateYmd(end)
      };
    }
  }

  return {
    start: null,
    end: null,
    range: "90d"
  };
}

function detectIntent(question) {
  const normalized = question.toLowerCase();

  if (normalized.includes("what changed") || normalized.includes("changed the most")) {
    return "change_driver";
  }
  if (normalized.includes("unusual") || normalized.includes("anomal")) {
    return "anomalies";
  }
  if (normalized.includes("top") && normalized.includes("merchant")) {
    return "top_merchants";
  }
  if (normalized.includes("top") && normalized.includes("categor")) {
    return "top_categories";
  }
  if (normalized.includes("how much") || normalized.includes("total") || normalized.includes("spend")) {
    return "spend_total";
  }

  return "spend_total";
}

function extractCategory(question, categories) {
  const normalized = question.toLowerCase();
  const matched = categories
    .filter((category) => normalized.includes(category.name.toLowerCase()))
    .sort((a, b) => b.name.length - a.name.length)[0];

  return matched ? matched.name : null;
}

function buildDrillDownUrl(filters) {
  const params = new URLSearchParams();
  if (filters.start) params.set("start", filters.start);
  if (filters.end) params.set("end", filters.end);
  if (filters.category) params.set("category", filters.category);
  if (filters.merchant) params.set("merchant", filters.merchant);
  return `/transactions?${params.toString()}`;
}

function sumSpend(transactions) {
  return transactions
    .filter((txn) => txn.direction === "debit")
    .reduce((sum, txn) => sum + Number(txn.amount || 0), 0);
}

function formatMoney(value) {
  return `$${(Math.round(value * 100) / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

function shiftMonth(dateText, deltaMonths) {
  const parsed = parseDate(dateText);
  if (!parsed) {
    return null;
  }
  const date = new Date(`${parsed}T12:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + deltaMonths);
  return localDateYmd(date);
}

function runQueryPlan(userId, plan) {
  if (plan.intent === "anomalies") {
    const anomalies = getAnomalies(userId, plan.filters);
    if (!anomalies.length) {
      return {
        answer: "No unusual transactions were found in the selected period.",
        numbers: { anomalyCount: 0 },
        confidence: 0.88,
        filters: plan.filters,
        details: []
      };
    }

    const top = anomalies.slice(0, 3).map((entry) => `${entry.merchant} (${formatMoney(entry.amount)})`);
    return {
      answer: `I found ${anomalies.length} unusual transactions. Largest signals: ${top.join(", ")}.`,
      numbers: { anomalyCount: anomalies.length },
      confidence: 0.84,
      filters: plan.filters,
      details: anomalies
    };
  }

  if (plan.intent === "change_driver") {
    const thisMonth = {
      start: plan.filters.start || localDateYmd(new Date(new Date().getFullYear(), new Date().getMonth(), 1)),
      end: plan.filters.end || localDateYmd(new Date())
    };
    const previousMonth = {
      start: shiftMonth(thisMonth.start, -1),
      end: shiftMonth(thisMonth.end, -1)
    };

    const current = filterUserTransactions(userId, thisMonth).filter((txn) => txn.direction === "debit");
    const previous = filterUserTransactions(userId, previousMonth).filter((txn) => txn.direction === "debit");

    const currentByCategory = groupAmount(current, (txn) => txn.category_final);
    const previousByCategory = groupAmount(previous, (txn) => txn.category_final);

    const categories = new Set([...Object.keys(currentByCategory), ...Object.keys(previousByCategory)]);
    const deltas = Array.from(categories).map((category) => ({
      category,
      delta: (currentByCategory[category] || 0) - (previousByCategory[category] || 0)
    }));

    deltas.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
    const topDelta = deltas[0];

    if (!topDelta) {
      return {
        answer: "Not enough data to identify change drivers.",
        numbers: {},
        confidence: 0.55,
        filters: plan.filters,
        details: []
      };
    }

    const direction = topDelta.delta >= 0 ? "increased" : "decreased";

    return {
      answer: `${topDelta.category} ${direction} the most vs the previous month by ${formatMoney(
        Math.abs(topDelta.delta)
      )}.`,
      numbers: {
        category: topDelta.category,
        delta: Math.round(topDelta.delta * 100) / 100
      },
      confidence: 0.82,
      filters: {
        ...thisMonth,
        category: topDelta.category
      },
      details: deltas.slice(0, 5)
    };
  }

  if (plan.intent === "top_merchants") {
    const txns = filterUserTransactions(userId, plan.filters).filter((txn) => txn.direction === "debit");
    const grouped = groupAmount(txns, (txn) => txn.merchant_normalized);
    const top = Object.entries(grouped)
      .map(([merchant, amount]) => ({ merchant, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    if (!top.length) {
      return {
        answer: "No debit transactions found for this period.",
        numbers: {},
        confidence: 0.65,
        filters: plan.filters,
        details: []
      };
    }

    const summary = top.map((entry) => `${entry.merchant}: ${formatMoney(entry.amount)}`).join(", ");
    return {
      answer: `Top merchants are ${summary}.`,
      numbers: { topMerchants: top },
      confidence: 0.9,
      filters: plan.filters,
      details: top
    };
  }

  if (plan.intent === "top_categories") {
    const txns = filterUserTransactions(userId, plan.filters).filter((txn) => txn.direction === "debit");
    const grouped = groupAmount(txns, (txn) => txn.category_final);
    const top = Object.entries(grouped)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    if (!top.length) {
      return {
        answer: "No category data found for this period.",
        numbers: {},
        confidence: 0.65,
        filters: plan.filters,
        details: []
      };
    }

    const summary = top.map((entry) => `${entry.category}: ${formatMoney(entry.amount)}`).join(", ");
    return {
      answer: `Top spending categories are ${summary}.`,
      numbers: { topCategories: top },
      confidence: 0.9,
      filters: plan.filters,
      details: top
    };
  }

  const txns = filterUserTransactions(userId, plan.filters);
  const spend = sumSpend(txns);

  return {
    answer: `You spent ${formatMoney(spend)} in the selected period.`,
    numbers: {
      totalSpend: Math.round(spend * 100) / 100,
      transactionCount: txns.length
    },
    confidence: plan.filters.category ? 0.91 : 0.87,
    filters: plan.filters,
    details: []
  };
}

function groupAmount(transactions, keySelector) {
  const grouped = {};
  for (const txn of transactions) {
    const key = keySelector(txn);
    grouped[key] = (grouped[key] || 0) + Number(txn.amount || 0);
  }
  return grouped;
}

function buildAnalysisDataset(userId, filters) {
  const scoped = filterUserTransactions(userId, filters);
  const imported = scoped.filter((entry) => entry.source_type === "imported");
  const selected = (imported.length > 0 ? imported : scoped)
    .slice(-320)
    .map((entry) => ({
      transaction_date: entry.transaction_date,
      merchant: entry.merchant_normalized,
      amount: entry.amount,
      direction: entry.direction,
      category: entry.category_final,
      source_type: entry.source_type
    }));

  const debit = selected.filter((entry) => entry.direction === "debit");
  const credit = selected.filter((entry) => entry.direction === "credit");
  const topCategories = Object.entries(groupAmount(debit, (entry) => entry.category || "Uncategorized"))
    .map(([category, amount]) => ({ category, amount: Math.round(amount * 100) / 100 }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8);

  return {
    scope: imported.length > 0 ? "imported" : "all",
    transactions: selected,
    summary: {
      transactionCount: selected.length,
      importedCount: imported.length,
      totalSpend: Math.round(sumSpend(debit) * 100) / 100,
      totalIncome: Math.round(
        credit.reduce((sum, entry) => sum + Number(entry.amount || 0), 0) * 100
      ) / 100,
      topCategories
    }
  };
}

export async function runAssistantQuery(userId, question) {
  if (!question || String(question).trim().length < 3) {
    throw new Error("Question is required");
  }

  const aiContext = requireAiFeature(userId, "assistant");
  const store = loadStore();
  const categories = store.categories.filter((entry) => entry.userId === userId);

  const range = parseRangeFromQuestion(question);
  const category = extractCategory(question, categories);
  const intent = detectIntent(question);

  const plan = {
    intent,
    filters: {
      start: range.start,
      end: range.end,
      range: range.range,
      category
    }
  };

  const deterministic = runQueryPlan(userId, plan);

  let result = deterministic;
  let synthesisStatus = "not_attempted";
  let analysisAgentStatus = "not_attempted";
  const analysisDataset = buildAnalysisDataset(userId, plan.filters);
  const crewAnalysis = await runCrewAiAnalysis({
    question,
    plan,
    deterministicResult: deterministic,
    transactions: analysisDataset.transactions,
    summary: analysisDataset.summary
  });

  if (crewAnalysis.ok) {
    analysisAgentStatus = "applied";
    synthesisStatus = "crewai_applied";

    result = {
      ...deterministic,
      answer: crewAnalysis.answer,
      highlights: crewAnalysis.highlights,
      confidence: crewAnalysis.confidence ?? deterministic.confidence,
      filters: {
        ...deterministic.filters,
        ...(crewAnalysis.drillDownFilters || {})
      },
      analysisAgent: crewAnalysis.agent
    };
  } else {
    analysisAgentStatus = crewAnalysis.reason || "not_applied";
    const synthesis = await synthesizeAssistantAnswerWithLlm({
      userId,
      question,
      plan,
      deterministicResult: deterministic
    });
    if (synthesis.ok) {
      synthesisStatus = "applied";
      const synthesizedFilters = {
        ...deterministic.filters,
        ...(synthesis.drillDownFilters || {})
      };

      result = {
        ...deterministic,
        answer: synthesis.answer,
        highlights: synthesis.highlights,
        filters: synthesizedFilters,
        synthesisProvider: synthesis.provider,
        synthesisModel: synthesis.model
      };
    } else {
      synthesisStatus = synthesis.reason || "not_applied";
    }
  }

  const record = {
    id: createId("asst"),
    userId,
    question,
    plan,
    result: {
      ...result,
      drillDownUrl: buildDrillDownUrl(result.filters),
      provider: aiContext.provider,
      model: aiContext.model,
      synthesisStatus,
      analysisAgentStatus,
      analysisDataScope: analysisDataset.scope
    },
    createdAt: nowIso()
  };

  store.assistantQueries.push(record);
  saveStore(store);
  addAuditEvent(userId, "assistant.query", {
    assistantQueryId: record.id,
    provider: aiContext.provider,
    model: aiContext.model,
    synthesisStatus,
    analysisAgentStatus
  });

  return record;
}

export function getAssistantQuery(userId, queryId) {
  const store = loadStore();
  const query = store.assistantQueries.find((entry) => entry.id === queryId && entry.userId === userId);
  if (!query) {
    throw new Error("Assistant query not found");
  }
  return query;
}
