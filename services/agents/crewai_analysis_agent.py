#!/usr/bin/env python3
import json
import os
import re
import sys
from typing import Any, Dict, Optional


def emit(payload: Dict[str, Any]) -> None:
  sys.stdout.write(json.dumps(payload))
  sys.stdout.flush()


def parse_json_object(text: str) -> Optional[Dict[str, Any]]:
  raw = (text or "").strip()
  if not raw:
    return None

  try:
    value = json.loads(raw)
    if isinstance(value, dict):
      return value
    return None
  except Exception:
    pass

  start = raw.find("{")
  end = raw.rfind("}")
  if start < 0 or end <= start:
    return None

  try:
    value = json.loads(raw[start : end + 1])
    if isinstance(value, dict):
      return value
  except Exception:
    return None

  return None


def sanitize_filters(value: Any) -> Dict[str, str]:
  if not isinstance(value, dict):
    return {}

  out: Dict[str, str] = {}
  for key in ("start", "end", "range", "category", "merchant"):
    if key in value and value[key] is not None and str(value[key]).strip():
      out[key] = str(value[key]).strip()
  return out


def choose_model() -> str:
  explicit = os.getenv("CREWAI_MODEL")
  if explicit:
    return explicit

  if os.getenv("OPENROUTER_API_KEY"):
    return "openrouter/openai/gpt-4.1-mini"
  return "gpt-4.1-mini"


def build_agent_payload(payload: Dict[str, Any]) -> Dict[str, Any]:
  deterministic = payload.get("deterministicResult") or {}
  transactions = payload.get("transactions") or []
  summary = payload.get("summary") or {}

  return {
    "question": payload.get("question"),
    "plan": payload.get("plan"),
    "deterministic_result": {
      "answer": deterministic.get("answer"),
      "numbers": deterministic.get("numbers"),
      "filters": deterministic.get("filters"),
      "confidence": deterministic.get("confidence"),
      "details": deterministic.get("details"),
    },
    "summary": summary,
    "transactions_sample": transactions[:250],
  }


def run_crewai(payload: Dict[str, Any]) -> Dict[str, Any]:
  try:
    from crewai import Agent, Crew, Process, Task
  except Exception:
    return {"ok": False, "reason": "crewai_not_installed"}

  llm_model = choose_model()
  analysis_packet = build_agent_payload(payload)
  packet_json = json.dumps(analysis_packet, ensure_ascii=True)

  planner = Agent(
    role="Finance Query Planner",
    goal=(
      "Identify the best way to answer the user question using only the provided data packet. "
      "Never invent numbers."
    ),
    backstory=(
      "You design explainable finance analysis plans and choose filters that map directly to"
      " transaction data."
    ),
    llm=llm_model,
    allow_delegation=False,
    verbose=False,
  )

  analyst = Agent(
    role="Transaction Analyst",
    goal=(
      "Analyze imported transaction context and deterministic result, then produce a concise,"
      " accurate answer with highlights."
    ),
    backstory=(
      "You are strict about numeric fidelity and focus on user-meaningful spending insights."
    ),
    llm=llm_model,
    allow_delegation=False,
    verbose=False,
  )

  writer = Agent(
    role="Insight Synthesizer",
    goal=(
      "Return valid JSON only with answer, highlights, drill_down_filters, and confidence. "
      "Keep the answer concise."
    ),
    backstory=(
      "You transform technical analysis into a precise end-user response while preserving values."
    ),
    llm=llm_model,
    allow_delegation=False,
    verbose=False,
  )

  planning_task = Task(
    description=(
      "Given this analysis packet, produce a compact plan and key data points:\n"
      f"{packet_json}\n"
      "Output JSON with keys: plan_summary, key_points, suggested_filters."
    ),
    expected_output="JSON object with plan summary and suggested filters",
    agent=planner,
  )

  analysis_task = Task(
    description=(
      "Use the planning output plus the analysis packet to derive the best grounded answer.\n"
      "Output JSON with keys: answer_draft, highlights, confidence, suggested_filters."
    ),
    expected_output="JSON object with grounded answer draft",
    agent=analyst,
    context=[planning_task],
  )

  synthesis_task = Task(
    description=(
      "Return final JSON only with this exact schema:\n"
      '{"answer":"<string>","highlights":["<string>"],'
      '"drill_down_filters":{"start":null,"end":null,"range":null,"category":null,"merchant":null},'
      '"confidence":0.0}\n'
      "Use only the provided context and keep answer under 70 words."
    ),
    expected_output="JSON object matching output schema",
    agent=writer,
    context=[planning_task, analysis_task],
  )

  try:
    crew = Crew(
      agents=[planner, analyst, writer],
      tasks=[planning_task, analysis_task, synthesis_task],
      process=Process.sequential,
      verbose=False,
    )
    result = crew.kickoff()
  except Exception as exc:
    return {"ok": False, "reason": f"crewai_execution_failed:{exc}"}

  raw_output = getattr(result, "raw", None)
  if raw_output is None:
    raw_output = str(result)

  parsed = parse_json_object(raw_output)
  if not parsed:
    return {"ok": False, "reason": "crewai_unparseable_output"}

  answer = str(parsed.get("answer") or "").strip()
  if not answer:
    return {"ok": False, "reason": "crewai_empty_answer"}

  highlights_raw = parsed.get("highlights")
  if isinstance(highlights_raw, list):
    highlights = [str(item).strip() for item in highlights_raw if str(item).strip()][:5]
  else:
    highlights = []

  confidence_raw = parsed.get("confidence")
  try:
    confidence = float(confidence_raw)
  except Exception:
    confidence = None
  if confidence is not None:
    confidence = max(0.0, min(1.0, confidence))

  return {
    "ok": True,
    "answer": answer,
    "highlights": highlights,
    "drill_down_filters": sanitize_filters(parsed.get("drill_down_filters")),
    "confidence": confidence,
  }


def main() -> None:
  raw = sys.stdin.read()
  if not raw.strip():
    emit({"ok": False, "reason": "missing_input"})
    return

  payload = parse_json_object(raw)
  if not payload:
    emit({"ok": False, "reason": "invalid_input"})
    return

  result = run_crewai(payload)
  emit(result)


if __name__ == "__main__":
  main()
