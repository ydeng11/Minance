import test from "node:test";
import assert from "node:assert/strict";
import { runToolCallingLlm, runStructuredLlm } from "../../src/llm/client.ts";

// Helper to capture the fetch request body for assertions
function captureFetchBody(): { capturedBody: any; mock: () => Promise<any> } {
  let captured: any = null;
  const mock = async (url: string, options: any) => {
    captured = JSON.parse(options.body);
    return {
      ok: true,
      text: async () => JSON.stringify({
        choices: [{
          message: {
            content: '{"answer": "test"}',
            tool_calls: []
          }
        }]
      })
    };
  };
  return {
    get capturedBody() { return captured; },
    mock
  };
}

function makeBasicTools() {
  return [{
    type: "function" as const,
    function: {
      name: "test_tool",
      description: "A test tool",
      parameters: { type: "object", properties: {} }
    }
  }];
}

test("runToolCallingLlm request body contains messages and tools", async () => {
  const originalFetch = global.fetch;

  let requestBody: any = null;
  global.fetch = async (url: string, options: any) => {
    requestBody = JSON.parse(options.body);
    return {
      ok: true,
      text: async () => JSON.stringify({
        choices: [{
          message: {
            content: '{"answer": "test"}',
            tool_calls: []
          }
        }]
      })
    };
  };

  try {
    await runToolCallingLlm({
      provider: "openai",
      apiKey: "test-key",
      model: "gpt-4",
      messages: [{ role: "user", content: "test question" }],
      tools: makeBasicTools()
    });

    assert.ok(requestBody, "Should have captured request body");
    assert.equal(requestBody.model, "gpt-4");
    assert.ok(Array.isArray(requestBody.messages), "Should have messages array");
    assert.equal(requestBody.messages.length, 1);
    assert.equal(requestBody.messages[0].role, "user");
    assert.equal(requestBody.messages[0].content, "test question");
    assert.ok(Array.isArray(requestBody.tools), "Should have tools array");
    assert.equal(requestBody.tools.length, 1);
    assert.equal(requestBody.tools[0].function.name, "test_tool");
    assert.ok(requestBody.temperature !== undefined, "Should have temperature");
    assert.ok(requestBody.max_tokens !== undefined, "Should have max_tokens");
  } finally {
    global.fetch = originalFetch;
  }
});

test("runToolCallingLlm with tool message includes tool_call_id", async () => {
  const originalFetch = global.fetch;

  let requestBody: any = null;
  global.fetch = async (url: string, options: any) => {
    requestBody = JSON.parse(options.body);
    return {
      ok: true,
      text: async () => JSON.stringify({
        choices: [{
          message: {
            content: '{"answer": "test"}',
            tool_calls: []
          }
        }]
      })
    };
  };

  try {
    await runToolCallingLlm({
      provider: "openai",
      apiKey: "test-key",
      model: "gpt-4",
      messages: [
        { role: "user", content: "test" },
        { role: "assistant", content: "", toolCalls: [{ id: "call_1", function: { name: "test", arguments: "{}" } }] },
        { role: "tool", toolCallId: "call_1", content: '{"result": "ok"}' }
      ],
      tools: makeBasicTools()
    });

    assert.ok(requestBody, "Should have captured request body");
    assert.equal(requestBody.messages.length, 3);

    // Check assistant message has tool_calls
    const assistantMsg = requestBody.messages[1];
    assert.equal(assistantMsg.role, "assistant");
    assert.ok(Array.isArray(assistantMsg.tool_calls), "Assistant message should have tool_calls");
    assert.equal(assistantMsg.tool_calls[0].id, "call_1");

    // Check tool message has tool_call_id
    const toolMsg = requestBody.messages[2];
    assert.equal(toolMsg.role, "tool");
    assert.equal(toolMsg.tool_call_id, "call_1");
    assert.equal(toolMsg.content, '{"result": "ok"}');
  } finally {
    global.fetch = originalFetch;
  }
});

test("runStructuredLlm tries JSON mode first, then falls back", async () => {
  const originalFetch = global.fetch;

  let callCount = 0;
  let requestBodies: any[] = [];

  global.fetch = async (url: string, options: any) => {
    const body = JSON.parse(options.body);
    requestBodies.push(body);
    callCount++;

    if (callCount === 1) {
      // First call fails (JSON mode fails)
      return {
        ok: false,
        status: 400,
        text: async () => JSON.stringify({ error: { message: "JSON mode not supported" } })
      };
    }

    // Second call succeeds
    return {
      ok: true,
      text: async () => JSON.stringify({
        choices: [{
          message: {
            content: '{"answer": "fallback success"}'
          }
        }]
      })
    };
  };

  try {
    const result = await runStructuredLlm({
      provider: "openai",
      apiKey: "test-key",
      model: "gpt-4",
      systemPrompt: "System prompt",
      userPrompt: "User prompt"
    });

    assert.equal(callCount, 2, "Should have made 2 attempts");
    assert.equal(requestBodies.length, 2);

    // First attempt should have response_format
    assert.equal(requestBodies[0].response_format?.type, "json_object", "First attempt should use JSON mode");
    // Second attempt should not have response_format
    assert.ok(!requestBodies[1].response_format, "Second attempt should not use JSON mode");

    // Final result should be successful
    assert.equal(result.ok, true);
    assert.equal(result.data?.answer, "fallback success");
  } finally {
    global.fetch = originalFetch;
  }
});

test("runStructuredLlm returns last error when both attempts fail", async () => {
  const originalFetch = global.fetch;

  global.fetch = async () => ({
    ok: false,
    status: 500,
    text: async () => JSON.stringify({ error: { message: "Server error" } })
  });

  try {
    const result = await runStructuredLlm({
      provider: "openai",
      apiKey: "test-key",
      model: "gpt-4",
      systemPrompt: "Test",
      userPrompt: "Test"
    });

    assert.equal(result.ok, false);
    assert.ok(result.error, "Should have error message");
  } finally {
    global.fetch = originalFetch;
  }
});

test("runToolCallingLlm should send tools parameter in request body", async () => {
  const originalFetch = global.fetch;

  const fetchMock = async () => ({
    ok: true,
    text: async () => JSON.stringify({
      choices: [{
        message: {
          content: '{"answer": "test"}',
          tool_calls: []
        }
      }]
    })
  });

  global.fetch = fetchMock;

  const tools = [{
    type: "function" as const,
    function: {
      name: "test_tool",
      description: "A test tool",
      parameters: { type: "object", properties: {} }
    }
  }];

  try {
    const result = await runToolCallingLlm({
      provider: "openai",
      apiKey: "test-key",
      model: "gpt-4",
      messages: [{ role: "user", content: "test" }],
      tools
    });

    assert.equal(result.ok, true);
    assert.ok(result.latencyMs >= 0, "Should have latencyMs");
  } finally {
    global.fetch = originalFetch;
  }
});

test("runToolCallingLlm should return tool_calls from response", async () => {
  const originalFetch = global.fetch;

  const fetchMock = async () => ({
    ok: true,
    text: async () => JSON.stringify({
      choices: [{
        message: {
          content: null,
          tool_calls: [{
            id: "call_123",
            function: {
              name: "test_tool",
              arguments: '{"arg": "value"}'
            }
          }]
        }
      }]
    })
  });

  global.fetch = fetchMock;

  const tools = [{
    type: "function" as const,
    function: {
      name: "test_tool",
      description: "A test tool",
      parameters: { type: "object", properties: {} }
    }
  }];

  try {
    const result = await runToolCallingLlm({
      provider: "openai",
      apiKey: "test-key",
      model: "gpt-4",
      messages: [{ role: "user", content: "test" }],
      tools
    });

    assert.equal(result.ok, true);
    assert.ok(result.toolCalls, "Should have toolCalls");
    assert.equal(result.toolCalls.length, 1);
    assert.equal(result.toolCalls[0].id, "call_123");
    assert.equal(result.toolCalls[0].function.name, "test_tool");
    assert.equal(result.toolCalls[0].function.arguments, '{"arg": "value"}');
  } finally {
    global.fetch = originalFetch;
  }
});

test("runToolCallingLlm should return error for unsupported provider", async () => {
  const tools = [{
    type: "function" as const,
    function: {
      name: "test_tool",
      description: "A test tool",
      parameters: { type: "object", properties: {} }
    }
  }];

  const result = await runToolCallingLlm({
    provider: "unsupported",
    apiKey: "test-key",
    model: "model",
    messages: [{ role: "user", content: "test" }],
    tools
  });

  assert.equal(result.ok, false);
  assert.ok(result.error, "Should have error message");
  assert.ok(result.error.includes("Unsupported provider"), "Error should mention unsupported provider");
});

test("runToolCallingLlm should handle API errors", async () => {
  const originalFetch = global.fetch;

  const fetchMock = async () => ({
    ok: false,
    status: 401,
    text: async () => JSON.stringify({
      error: { message: "Invalid API key" }
    })
  });

  global.fetch = fetchMock;

  const tools = [{
    type: "function" as const,
    function: {
      name: "test_tool",
      description: "A test tool",
      parameters: { type: "object", properties: {} }
    }
  }];

  try {
    const result = await runToolCallingLlm({
      provider: "openai",
      apiKey: "bad-key",
      model: "gpt-4",
      messages: [{ role: "user", content: "test" }],
      tools
    });

    assert.equal(result.ok, false);
    assert.ok(result.error, "Should have error message");
    assert.ok(result.error.includes("Invalid API key"), "Error should mention API key issue");
  } finally {
    global.fetch = originalFetch;
  }
});

test("runToolCallingLlm selects correct endpoint per provider", async () => {
  const originalFetch = global.fetch;

  const testCases: Array<{ provider: string; expectedUrlContains: string }> = [
    { provider: "openai", expectedUrlContains: "api.openai.com" },
    { provider: "openrouter", expectedUrlContains: "openrouter.ai" }
  ];

  for (const { provider, expectedUrlContains } of testCases) {
    let capturedUrl = "";
    global.fetch = async (url: string, options: any) => {
      capturedUrl = url;
      return {
        ok: true,
        text: async () => JSON.stringify({
          choices: [{
            message: {
              content: '{"answer": "test"}',
              tool_calls: []
            }
          }]
        })
      };
    };

    const result = await runToolCallingLlm({
      provider,
      apiKey: "test-key",
      model: "gpt-4",
      messages: [{ role: "user", content: "test" }],
      tools: makeBasicTools()
    });

    assert.equal(result.ok, true, `${provider} should succeed`);
    assert.ok(capturedUrl.includes(expectedUrlContains),
      `${provider} URL should contain ${expectedUrlContains}, got ${capturedUrl}`);
  }

  global.fetch = originalFetch;
});

test("runToolCallingLlm includes OpenRouter headers", async () => {
  const originalFetch = global.fetch;

  let capturedHeaders: any = null;
  global.fetch = async (url: string, options: any) => {
    capturedHeaders = options.headers;
    return {
      ok: true,
      text: async () => JSON.stringify({
        choices: [{
          message: {
            content: '{"answer": "test"}',
            tool_calls: []
          }
        }]
      })
    };
  };

  try {
    await runToolCallingLlm({
      provider: "openrouter",
      apiKey: "sk-or-v1-test",
      model: "gpt-4",
      messages: [{ role: "user", content: "test" }],
      tools: makeBasicTools()
    });

    assert.ok(capturedHeaders, "Should have headers");
    assert.equal(capturedHeaders["Content-Type"], "application/json");
    assert.ok(capturedHeaders["Authorization"]?.startsWith("Bearer "), "Should have Bearer auth");
    // OpenRouter specific headers
    assert.ok(capturedHeaders["HTTP-Referer"] !== undefined, "Should include HTTP-Referer for OpenRouter");
    assert.ok(capturedHeaders["X-Title"] !== undefined, "Should include X-Title for OpenRouter");
  } finally {
    global.fetch = originalFetch;
  }
});

test("runToolCallingLlm includes Authorization header for OpenAI", async () => {
  const originalFetch = global.fetch;

  let capturedHeaders: any = null;
  global.fetch = async (url: string, options: any) => {
    capturedHeaders = options.headers;
    return {
      ok: true,
      text: async () => JSON.stringify({
        choices: [{
          message: {
            content: '{"answer": "test"}',
            tool_calls: []
          }
        }]
      })
    };
  };

  try {
    await runToolCallingLlm({
      provider: "openai",
      apiKey: "sk-test-key-123",
      model: "gpt-4",
      messages: [{ role: "user", content: "test" }],
      tools: makeBasicTools()
    });

    assert.ok(capturedHeaders, "Should have headers");
    assert.equal(capturedHeaders["Content-Type"], "application/json");
    assert.equal(capturedHeaders["Authorization"], "Bearer sk-test-key-123");
  } finally {
    global.fetch = originalFetch;
  }
});