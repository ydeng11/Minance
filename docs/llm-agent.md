# LLM Tool-Calling Agent

## Overview

The LLM agent uses OpenAI/OpenRouter function calling to intelligently query and process financial data. Unlike the previous hardcoded approach, the agent decides which tools to call and with what parameters based on the user's natural language query.

## Modes

### Q&A Mode
Interactive assistant for answering questions about spending, income, and trends. Supports multi-turn conversations with result references.

**Available tools:**
- `get_data_bounds` - Understand available data range
- `get_overview` - Spending/income summary
- `get_category_breakdown` - Spending by category
- `get_merchant_breakdown` - Spending by merchant
- `get_anomalies` - Unusual transactions
- `list_transactions` - Search transactions
- `reference_previous` - Fetch results from a previous turn
- `compare_results` - Compare two result sets
- `ask_clarification` - When query is ambiguous

### Categorization Mode
History-first approach for assigning categories to transactions.

**Available tools:**
- `get_categories` - Get all available categories
- `get_merchant_history` - Check merchant history for category
- `assign_category` - Assign the decided category

**Flow:**
1. Check user rules first
2. Check merchant memory
3. Check training data
4. If no match, use agent to infer
5. Fallback to keyword model on failure

### Recurring Mode
Detects subscription patterns with pre-filter heuristics.

**Available tools:**
- `get_merchant_transactions_6_months` - Get transaction history
- `create_recurring_suggestion` - Create suggestion for user review

**Pre-filter heuristics:**
- Skip negative/zero amounts
- Skip known one-time merchants (gas stations, restaurants, etc.)

### Import Mode
Batch processing for CSV imports with history lookup.

**Available tools:**
- `get_categories` - Get all available categories
- `get_merchant_history` - Check merchant history
- `assign_results` - Assign category and direction for batch

**Batch size:** 15 transactions per agent call.

## Configuration

Set `AI_TOOL_CALLING_AGENT_ENABLED=false` to disable and use legacy pipeline.

## Conversation Sessions

Sessions are stored in-memory with 1-hour TTL. Use `POST /v1/assistant/conversations` to create a session.

**API Endpoints:**
- `POST /v1/assistant/conversations` - Create conversation
- `GET /v1/assistant/conversations/:id` - Get conversation with history
- `POST /v1/assistant/conversations/:id/query` - Ask question in conversation

## Error Handling

- Tool execution errors are returned to the LLM for retry
- LLM failure falls back to legacy pipeline (Q&A) or leaves uncategorized (other modes)
- Timeout: 20s per call, 30s total for agent loop