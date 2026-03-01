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

export const AI_LLM_CATEGORIZATION_ENABLED = readFlag("AI_LLM_CATEGORIZATION_ENABLED", true);
export const AI_LLM_ASSISTANT_SYNTHESIS_ENABLED = readFlag("AI_LLM_ASSISTANT_SYNTHESIS_ENABLED", true);
export const IMPORT_PROCESSED_EDITOR_ENABLED = readFlag("IMPORT_PROCESSED_EDITOR_ENABLED", true);
export const IMPORT_PROCESSING_LOGS_ENABLED = readFlag("IMPORT_PROCESSING_LOGS_ENABLED", false);
export const IMPORT_DIRECTION_INFERENCE_ENABLED = readFlag("IMPORT_DIRECTION_INFERENCE_ENABLED", true);
export const IMPORT_DIRECTION_LLM_ENABLED = readFlag("IMPORT_DIRECTION_LLM_ENABLED", true);
