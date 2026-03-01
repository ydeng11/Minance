const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

function endpointForProvider(provider) {
  if (provider === "openai") {
    return OPENAI_URL;
  }
  if (provider === "openrouter") {
    return OPENROUTER_URL;
  }
  return null;
}

function headersForProvider(provider, apiKey) {
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`
  };

  if (provider === "openrouter") {
    headers["HTTP-Referer"] = process.env.OPENROUTER_APP_URL || "http://localhost:3000";
    headers["X-Title"] = process.env.OPENROUTER_APP_NAME || "Minance Next";
  }

  return headers;
}

function extractMessageText(responseJson) {
  const content = responseJson?.choices?.[0]?.message?.content;
  if (typeof content === "string") {
    return content;
  }
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") {
          return part;
        }
        if (part?.type === "text" && typeof part.text === "string") {
          return part.text;
        }
        return "";
      })
      .join("")
      .trim();
  }
  return "";
}

function parseJsonFromText(text) {
  const raw = String(text || "").trim();
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(raw.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

async function callChatCompletion({
  provider,
  apiKey,
  model,
  systemPrompt,
  userPrompt,
  maxTokens,
  temperature,
  useResponseFormat
}) {
  const startedAt = Date.now();
  const endpoint = endpointForProvider(provider);
  if (!endpoint) {
    return {
      ok: false,
      error: `Unsupported LLM provider for chat completions: ${provider}`,
      latencyMs: Date.now() - startedAt
    };
  }

  const controller = new AbortController();
  const timeoutMs = Number(process.env.AI_LLM_TIMEOUT_MS || 16000);
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const body = {
    model,
    temperature,
    max_tokens: maxTokens,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ]
  };
  if (useResponseFormat) {
    body.response_format = { type: "json_object" };
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: headersForProvider(provider, apiKey),
      body: JSON.stringify(body),
      signal: controller.signal
    });

    const rawText = await response.text();
    const payload = rawText ? JSON.parse(rawText) : null;
    if (!response.ok) {
      const message = payload?.error?.message || payload?.message || `Provider request failed (${response.status})`;
      return {
        ok: false,
        status: response.status,
        error: message,
        latencyMs: Date.now() - startedAt
      };
    }

    const content = extractMessageText(payload);
    const parsed = parseJsonFromText(content);
    if (!parsed || typeof parsed !== "object") {
      return {
        ok: false,
        error: "LLM response was not valid JSON",
        rawText: content,
        latencyMs: Date.now() - startedAt
      };
    }

    return {
      ok: true,
      data: parsed,
      rawText: content,
      latencyMs: Date.now() - startedAt
    };
  } catch (error) {
    return {
      ok: false,
      error: error?.name === "AbortError" ? "LLM request timed out" : String(error?.message || error),
      latencyMs: Date.now() - startedAt
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function runStructuredLlm({
  provider,
  apiKey,
  model,
  systemPrompt,
  userPrompt,
  maxTokens = 500,
  temperature = 0.1
}) {
  // Try once with JSON mode, then fallback to plain text mode with JSON instruction.
  const attempts = [
    { useResponseFormat: true },
    { useResponseFormat: false }
  ];

  let lastError = null;
  for (const attempt of attempts) {
    const result = await callChatCompletion({
      provider,
      apiKey,
      model,
      systemPrompt,
      userPrompt,
      maxTokens,
      temperature,
      useResponseFormat: attempt.useResponseFormat
    });
    if (result.ok) {
      return result;
    }
    lastError = result;
  }

  return {
    ok: false,
    error: lastError?.error || "LLM request failed"
  };
}
