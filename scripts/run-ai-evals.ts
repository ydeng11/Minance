#!/usr/bin/env tsx
/**
 * AI Assistant Behavior Eval Runner
 *
 * Opt-in eval harness that tests the real AI assistant with actual LLM calls.
 * Requires AI_EVALS=1 and valid AI credentials.
 *
 * Usage:
 *   env AI_EVALS=1 tsx scripts/run-ai-evals.ts
 *
 * When credentials are absent, the script prints a skip message and exits 0.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const EVALS_ENABLED = process.env.AI_EVALS === "1";
const FIXTURE_USER_ID = "usr_fixture_001";
const EVAL_PROMPT_VERSION = "1";

if (!EVALS_ENABLED) {
  console.log("[SKIPPED] AI_EVALS not set. Pass AI_EVALS=1 to run live AI evals.");
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Load baselines
// ---------------------------------------------------------------------------
const BASELINES_PATH = path.resolve(
  import.meta.dirname,
  "../services/api/test/evals/assistant-baselines.json"
);

interface BaselineEntry {
  id: string;
  description: string;
  mode?: "qa" | "categorization" | "recurring" | "import";
  prompts: string[];
  recommendedTools?: string[];
  reasonableTools?: string[];
  forbiddenTools?: string[];
  modelTurnsMax?: number;
  toolCallsMax?: number;
  judgeRubric: Record<string, number>;
  judgeMinScore: number;
  isMultiTurn?: boolean;
}

interface ParaphraseResult {
  baselineId: string;
  paraphraseIndex: number;
  prompt: string;
  passed: boolean;
  trace: unknown[];
  answer: string;
  scores: Record<string, number>;
  weightedScore: number;
  errors: string[];
}

interface BaselineSummary {
  baselineId: string;
  description: string;
  mode: string;
  total: number;
  passed: number;
  meanScore: number;
  minScore: number;
  maxScore: number;
  stddev: number;
  allPassed: boolean;
}

let baselines: BaselineEntry[];
try {
  baselines = JSON.parse(fs.readFileSync(BASELINES_PATH, "utf-8"));
} catch (err) {
  console.error(`[ERROR] Failed to load baselines from ${BASELINES_PATH}:`, err);
  process.exit(1);
}

console.log(`[EVAL] Loaded ${baselines.length} baselines`);

// ---------------------------------------------------------------------------
// Compute fixture hash for reproducibility tracking
// ---------------------------------------------------------------------------
const FIXTURE_PATH = path.resolve(
  import.meta.dirname,
  "../services/api/test/fixtures/deterministic-financial-store.json"
);
let fixtureHash = "unknown";
try {
  const fixtureRaw = fs.readFileSync(FIXTURE_PATH, "utf-8");
  fixtureHash = crypto.createHash("sha256").update(fixtureRaw).digest("hex").substring(0, 12);
} catch {
  // fixture will be loaded later
}

// ---------------------------------------------------------------------------
// AI setup
// ---------------------------------------------------------------------------
async function getAiContext(): Promise<{
  provider: string;
  model: string;
  apiKey: string;
}> {
  try {
    const { requireAiFeature } = await import("../services/api/src/ai.ts");
    const ctx = requireAiFeature("eval_user", "assistant");
    return { provider: ctx.provider, model: ctx.model, apiKey: ctx.apiKey };
  } catch {
    const apiKey = process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY;
    const provider = process.env.OPENAI_API_KEY ? "openai" : "openrouter";
    const model = process.env.AI_EVAL_MODEL || "gpt-4.1-mini";

    if (!apiKey) {
      throw new Error(
        "No AI credentials found. Set OPENAI_API_KEY or OPENROUTER_API_KEY, " +
          "or configure an AI credential in the app."
      );
    }

    return { provider, model, apiKey };
  }
}

// ---------------------------------------------------------------------------
// Compute weighted score from rubric scores and weights
// ---------------------------------------------------------------------------
function computeWeightedScore(
  scores: Record<string, number>,
  rubric: Record<string, number>
): number {
  let weightedSum = 0;
  let totalWeight = 0;

  for (const [key, weight] of Object.entries(rubric)) {
    const score = scores[key];
    if (score !== undefined && typeof score === "number" && !Number.isNaN(score)) {
      weightedSum += Math.max(0, Math.min(1, score)) * weight;
    }
    totalWeight += weight;
  }

  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

// ---------------------------------------------------------------------------
// Validate judge response scores
// ---------------------------------------------------------------------------
function validateJudgeScores(
  scores: Record<string, number>,
  rubric: Record<string, number>
): string[] {
  const errors: string[] = [];
  for (const [key, _weight] of Object.entries(rubric)) {
    const score = scores[key];
    if (score === undefined || score === null) {
      errors.push(`Missing rubric score: "${key}"`);
    } else if (typeof score !== "number" || Number.isNaN(score)) {
      errors.push(`Non-numeric score for "${key}": ${JSON.stringify(score)}`);
    } else if (score < 0 || score > 1) {
      errors.push(`Score out of range [0,1] for "${key}": ${score}`);
    }
  }
  return errors;
}

// ---------------------------------------------------------------------------
// Judge LLM
// ---------------------------------------------------------------------------
async function judgeResponse(
  rubric: Record<string, number>,
  prompt: string,
  trace: unknown[],
  answer: string
): Promise<{
  scores: Record<string, number>;
  weightedScore: number;
  validationErrors: string[];
  reason: string;
}> {
  const judgeModel = process.env.AI_JUDGE_MODEL || "gpt-4.1-mini";
  const aiCtx = await getAiContext();

  const rubricEntries = Object.entries(rubric)
    .map(([key, weight]) => `  - ${key}: ${weight} (weight)`)
    .join("\n");

  const judgePrompt = [
    "You are evaluating an AI finance assistant's response. Score each rubric item from 0.0 to 1.0.",
    "",
    "The user asked:",
    `"${prompt}"`,
    "",
    "Observable trace (tool calls and execution):",
    JSON.stringify(trace, null, 2),
    "",
    "The assistant's answer:",
    answer,
    "",
    "Scoring rubric:",
    rubricEntries,
    "",
    "Return ONLY valid JSON with these keys:",
    '{"scores": {"rubric_item": score}, "totalScore": float (average, included for reference), "reason": "brief explanation"}',
    "",
    "Scoring guidelines:",
    "- 1.0 = fully meets criteria",
    "- 0.5 = partially meets",
    "- 0.0 = does not meet",
    "- Be strict about hallucinated numbers",
    "- Score 0 for noHallucinatedNumbers if ANY number in the answer cannot be traced back to tool results"
  ].join("\n");

  const { runStructuredLlm } = await import("../services/api/src/llm/client.ts");
  const result = await runStructuredLlm({
    provider: aiCtx.provider,
    apiKey: aiCtx.apiKey,
    model: judgeModel,
    systemPrompt: "You are a strict evaluator of AI assistant responses. Return JSON only.",
    userPrompt: judgePrompt,
    maxTokens: 500,
    temperature: 0
  });

  if (!result.ok || !result.data) {
    return {
      scores: {},
      weightedScore: 0,
      validationErrors: [`Judge LLM failed: ${result.error || "unknown error"}`],
      reason: ""
    };
  }

  // Parse the judge response — it may be a nested object or directly the data
  const rawScores: Record<string, number> =
    (result.data as Record<string, unknown>).scores as Record<string, number> || {};

  // Fill missing rubric keys with 0
  const scores: Record<string, number> = {};
  for (const key of Object.keys(rubric)) {
    const v = rawScores[key];
    scores[key] = v !== undefined && typeof v === "number" && !Number.isNaN(v)
      ? Math.max(0, Math.min(1, v))
      : 0;
  }

  // Compute weighted score ourselves (don't trust judge's totalScore)
  const weightedScore = computeWeightedScore(scores, rubric);

  // Validate scores
  const validationErrors = validateJudgeScores(scores, rubric);

  return {
    scores,
    weightedScore,
    validationErrors,
    reason: String((result.data as Record<string, unknown>).reason || "")
  };
}

// ---------------------------------------------------------------------------
// Run a single baseline evaluation
// ---------------------------------------------------------------------------
async function evaluateBaseline(
  baseline: BaselineEntry,
  aiCtx: { provider: string; model: string; apiKey: string },
  judgeModel: string,
  overrideDate: string
): Promise<ParaphraseResult[]> {
  const { runToolCallingAgent, createConversationId } = await import(
    "../services/api/src/llm/agent.ts"
  );

  const results: ParaphraseResult[] = [];
  const mode = baseline.mode ?? "qa";
  let conversationId: string | undefined;

  if (baseline.isMultiTurn) {
    conversationId = createConversationId();
  }

  for (let i = 0; i < baseline.prompts.length; i++) {
    const prompt = baseline.prompts[i];
    const errors: string[] = [];

    try {
      const agentInput: Record<string, unknown> = {
        mode,
        userId: FIXTURE_USER_ID,
        _testAiContext: aiCtx,
        _collectTrace: true,
        _overrideDate: overrideDate
      };

      if (mode === "qa") {
        agentInput.question = prompt;
        if (baseline.isMultiTurn) {
          agentInput.conversationId = conversationId;
        }
      } else if (mode === "categorization") {
        agentInput.transaction = {
          merchant: prompt,
          amount: -25.0,
          description: prompt
        };
      } else if (mode === "recurring") {
        agentInput.transaction = {
          merchant: prompt,
          amount: -9.99
        };
      } else if (mode === "import") {
        agentInput.transactions = [
          { id: "eval_txn_1", merchant: prompt, amount: -50.0 }
        ];
      }

      const agentResult = await runToolCallingAgent(
        agentInput as Parameters<typeof runToolCallingAgent>[0]
      );

      if (!agentResult.ok) {
        errors.push(`Agent returned error: ${agentResult.error || "unknown"}`);
      }

      const answer = agentResult.answer || "";

      // Extract tool trace
      const traceTools = (agentResult._trace || [])
        .filter((e) => e.type === "tool_execution")
        .map((e) => e.toolName)
        .filter(Boolean) as string[];

      // Forbidden tools — hard errors
      if (baseline.forbiddenTools) {
        for (const tool of baseline.forbiddenTools) {
          if (traceTools.includes(tool)) {
            errors.push(`Forbidden tool "${tool}" was called.`);
          }
        }
      }

      // Max tool calls check — hard error
      if (baseline.toolCallsMax !== undefined && agentResult.toolCallsMade > baseline.toolCallsMax) {
        errors.push(
          `Tool calls (${agentResult.toolCallsMade}) exceed max (${baseline.toolCallsMax})`
        );
      }

      // Run judge evaluation
      const judgeResult = await judgeResponse(
        baseline.judgeRubric,
        prompt,
        agentResult._trace || [],
        answer
      );

      errors.push(...judgeResult.validationErrors);

      const passed = errors.length === 0 && judgeResult.weightedScore >= baseline.judgeMinScore;

      results.push({
        baselineId: baseline.id,
        paraphraseIndex: i,
        prompt,
        passed,
        trace: agentResult._trace || [],
        answer,
        scores: judgeResult.scores,
        weightedScore: judgeResult.weightedScore,
        errors
      });
    } catch (err) {
      results.push({
        baselineId: baseline.id,
        paraphraseIndex: i,
        prompt,
        passed: false,
        trace: [],
        answer: "",
        scores: {},
        weightedScore: 0,
        errors: [`Exception: ${err instanceof Error ? err.message : String(err)}`]
      });
    }

    console.log(
      `  [${results[i].passed ? "PASS" : "FAIL"}] "${prompt.substring(0, 60)}..." ` +
        `score=${results[i].weightedScore.toFixed(2)}/${baseline.judgeMinScore.toFixed(2)} ` +
        `errors=${results[i].errors.length}`
    );
  }

  return results;
}

// ---------------------------------------------------------------------------
// Statistical helpers
// ---------------------------------------------------------------------------
function stddev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const sqDiffs = values.map((v) => (v - mean) ** 2);
  return Math.sqrt(sqDiffs.reduce((a, b) => a + b, 0) / (values.length - 1));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log("[EVAL] Starting AI assistant behavior evaluation");
  console.log("");

  let aiCtx: { provider: string; model: string; apiKey: string };
  try {
    aiCtx = await getAiContext();
    console.log(`[EVAL] Assistant: provider=${aiCtx.provider} model=${aiCtx.model}`);
  } catch (err) {
    console.error(`[ERROR] ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }

  const judgeModel = process.env.AI_JUDGE_MODEL || "gpt-4.1-mini";
  console.log(`[EVAL] Judge:      model=${judgeModel}`);
  console.log(`[EVAL] Fixture:    hash=${fixtureHash}`);
  console.log(`[EVAL] Prompt ver: v${EVAL_PROMPT_VERSION}`);

  // Freeze "today" for reproducible date-relative prompts
  const overrideDate = process.env.AI_EVAL_OVERRIDE_DATE || "2026-07-01";
  console.log(`[EVAL] Override dt: ${overrideDate}`);
  console.log("");

  // Load base fixture data
  try {
    const fixtureData = JSON.parse(fs.readFileSync(FIXTURE_PATH, "utf-8"));
    const { resetStoreForTests } = await import("../services/api/src/store.ts");
    resetStoreForTests(fixtureData);
    const txnCount = (fixtureData.transactions || []).length;
    console.log(`[EVAL] Loaded deterministic fixture: ${txnCount} transactions`);
  } catch (err) {
    console.error(`[ERROR] Failed to load fixture from ${FIXTURE_PATH}:`, err);
    process.exit(1);
  }

  // Load eval supplemental fixture (benefits, budget targets, suggestions)
  const EVAL_FIXTURE_PATH = path.resolve(
    import.meta.dirname,
    "../services/api/test/fixtures/eval-fixture.json"
  );
  try {
    const evalFixtureData = JSON.parse(fs.readFileSync(EVAL_FIXTURE_PATH, "utf-8"));

    // Seed card benefits
    const { seedBenefits } = await import("../services/api/src/llm/benefits-store.ts");
    if (evalFixtureData.cardBenefits) {
      seedBenefits(FIXTURE_USER_ID, evalFixtureData.cardBenefits);
      console.log(`[EVAL] Seeded ${evalFixtureData.cardBenefits.length} card benefits`);
    }

    // Seed budget targets in store
    if (evalFixtureData.budgetTargets) {
      const { loadStore, saveStore } = await import("../services/api/src/store.ts");
      const store = loadStore();
      (store as Record<string, unknown>).budgetTargets = evalFixtureData.budgetTargets;
      saveStore(store);
      const targetCount = Object.keys(evalFixtureData.budgetTargets).length;
      console.log(`[EVAL] Seeded ${targetCount} budget targets`);
    }

    // Seed recurring suggestions
    if (evalFixtureData.recurringSuggestions?.length) {
      const { loadStore, saveStore } = await import("../services/api/src/store.ts");
      const store = loadStore();
      store.recurringSuggestions = evalFixtureData.recurringSuggestions;
      saveStore(store);
      console.log(`[EVAL] Seeded ${evalFixtureData.recurringSuggestions.length} recurring suggestions`);
    }
  } catch (err) {
    console.warn(`[WARN] Failed to load supplemental eval fixture: ${err instanceof Error ? err.message : String(err)}`);
  }
  console.log("");

  const allResults: ParaphraseResult[] = [];
  const baselineSummaries: BaselineSummary[] = [];

  for (const baseline of baselines) {
    console.log(`[EVAL] Baseline: ${baseline.id} ("${baseline.description}")`);
    const results = await evaluateBaseline(baseline, aiCtx, judgeModel, overrideDate);
    allResults.push(...results);

    const scores = results.map((r) => r.weightedScore);
    const meanScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const passedCount = results.filter((r) => r.passed).length;
    const failedCount = results.filter((r) => !r.passed).length;
    const minScore = Math.min(...scores);
    const maxScore = Math.max(...scores);
    const sd = stddev(scores);

    // Aggregated pass/fail for the baseline:
    // Pass if >=80% of paraphrases pass (the planned 80% threshold)
    const passThreshold = 0.8;
    const baselinePassed = results.length > 0
      ? (passedCount / results.length) >= passThreshold
      : false;

    baselineSummaries.push({
      baselineId: baseline.id,
      description: baseline.description,
      mode: baseline.mode ?? "qa",
      total: results.length,
      passed: passedCount,
      meanScore,
      minScore,
      maxScore,
      stddev: sd,
      allPassed: baselinePassed
    });

    console.log(
      `  -> ${passedCount}/${results.length} passed (${failedCount} failed)` +
        `  mean=${meanScore.toFixed(2)} sd=${sd.toFixed(2)}` +
        `  range=[${minScore.toFixed(2)},${maxScore.toFixed(2)}]` +
        `  baseline=${baselinePassed ? "PASS" : "FAIL"}`
    );
    console.log("");
  }

  // Summary
  const totalPassed = allResults.filter((r) => r.passed).length;
  const totalFailed = allResults.filter((r) => !r.passed).length;
  const baselineFailures = baselineSummaries.filter((s) => !s.allPassed);

  console.log("=".repeat(60));
  console.log("[EVAL] Summary");
  console.log(`  Baselines:          ${baselines.length}`);
  console.log(`  Paraphrases:        ${allResults.length}`);
  console.log(`  Paraphrase pass:    ${totalPassed}/${allResults.length} (${((totalPassed / allResults.length) * 100).toFixed(1)}%)`);
  console.log(`  Baseline pass:      ${baselines.length - baselineFailures.length}/${baselines.length}`);
  console.log(`  Assistant model:    ${aiCtx.model}`);
  console.log(`  Judge model:        ${judgeModel}`);
  console.log(`  Fixture hash:       ${fixtureHash}`);
  console.log(`  Prompt version:     v${EVAL_PROMPT_VERSION}`);
  console.log(`  Override date:      ${overrideDate}`);
  console.log("");

  if (baselineFailures.length > 0) {
    console.log("[EVAL] Baseline failures (>=80% paraphrases must pass):");
    for (const s of baselineFailures) {
      console.log(`  - ${s.baselineId} ("${s.description}")  ${s.passed}/${s.total} passed  mean=${s.meanScore.toFixed(2)}`);
    }
    console.log("");

    console.log("[EVAL] Failed paraphrases:");
    for (const r of allResults.filter((r) => !r.passed)) {
      console.log(`  - [${r.baselineId}] "${r.prompt.substring(0, 60)}..."`);
      console.log(`    score=${r.weightedScore.toFixed(2)}`);
      for (const err of r.errors) {
        console.log(`    error: ${err}`);
      }
    }
    console.log("");

    console.log("[EVAL] Some baselines failed.");
    process.exit(1);
  }

  console.log("[EVAL] All baselines passed!");
  process.exit(0);
}

main().catch((err) => {
  console.error("[EVAL] Fatal error:", err);
  process.exit(1);
});
