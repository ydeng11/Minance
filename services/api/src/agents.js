import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { ROOT_DIR } from "./config.js";

const AGENT_SCRIPT_PATH = path.join(ROOT_DIR, "services/agents/crewai_analysis_agent.py");

function readFlag(name, defaultValue) {
  const value = process.env[name];
  if (value == null || value === "") {
    return defaultValue;
  }
  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }
  return defaultValue;
}

function sanitizeFilters(value) {
  if (!value || typeof value !== "object") {
    return {};
  }

  const out = {};
  for (const key of ["start", "end", "range", "category", "merchant"]) {
    if (value[key] != null && value[key] !== "") {
      out[key] = String(value[key]);
    }
  }
  return out;
}

function parseAgentOutput(raw) {
  const text = String(raw || "").trim();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

export async function runCrewAiAnalysis(payload) {
  if (!readFlag("AI_CREW_ANALYSIS_ENABLED", true)) {
    return { ok: false, reason: "disabled" };
  }

  if (!fs.existsSync(AGENT_SCRIPT_PATH)) {
    return { ok: false, reason: "script_not_found" };
  }

  const pythonBin = process.env.CREWAI_PYTHON_BIN || "python3";
  const timeoutMs = Number(process.env.AI_CREW_ANALYSIS_TIMEOUT_MS || 8000);

  return new Promise((resolve) => {
    const child = spawn(pythonBin, [AGENT_SCRIPT_PATH], {
      stdio: ["pipe", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });

    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });

    child.on("error", (error) => {
      clearTimeout(timeout);
      resolve({ ok: false, reason: `spawn_error:${error.message}` });
    });

    child.on("close", () => {
      clearTimeout(timeout);
      if (timedOut) {
        resolve({ ok: false, reason: "timeout" });
        return;
      }

      const parsed = parseAgentOutput(stdout);
      if (!parsed || typeof parsed !== "object") {
        resolve({
          ok: false,
          reason: stderr ? `invalid_output:${stderr.slice(0, 200)}` : "invalid_output"
        });
        return;
      }

      if (!parsed.ok) {
        resolve({ ok: false, reason: parsed.reason || "agent_failed" });
        return;
      }

      const answer = String(parsed.answer || "").trim();
      if (!answer) {
        resolve({ ok: false, reason: "empty_answer" });
        return;
      }

      const highlights = Array.isArray(parsed.highlights)
        ? parsed.highlights.map((entry) => String(entry)).filter(Boolean).slice(0, 5)
        : [];

      resolve({
        ok: true,
        answer,
        highlights,
        drillDownFilters: sanitizeFilters(parsed.drill_down_filters),
        confidence: Number(parsed.confidence || 0) || null,
        agent: "crewai"
      });
    });

    try {
      child.stdin.write(JSON.stringify(payload));
      child.stdin.end();
    } catch {
      clearTimeout(timeout);
      child.kill("SIGKILL");
      resolve({ ok: false, reason: "stdin_write_failed" });
    }
  });
}
