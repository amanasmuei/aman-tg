/**
 * Ollama Cloud agent loop — handles tool_use responses from Ollama-hosted models.
 *
 * Uses the Ollama native API (https://ollama.com/api/chat) with streaming.
 * Supports tool calling in OpenAI-compatible format.
 */

import { OLLAMA_TOOLS, executeTool } from "./tools.js";

const MAX_TOOL_TURNS = 5;
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "https://ollama.com/api";

interface OllamaMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_calls?: Array<{
    function: { name: string; arguments: Record<string, unknown> };
  }>;
}

interface OllamaStreamChunk {
  model: string;
  message: {
    role: string;
    content: string;
    tool_calls?: Array<{
      function: { name: string; arguments: Record<string, unknown> };
    }>;
  };
  done: boolean;
  done_reason?: string;
}

interface OllamaAgentOptions {
  model: string;
  systemPrompt: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  maxTokens?: number;
  onText: (text: string) => Promise<void>;
  onToolUse?: (toolName: string) => void;
}

/**
 * Run the Ollama agent loop with streaming.
 * Returns the full assistant response text.
 */
export async function runOllamaAgentLoop(opts: OllamaAgentOptions): Promise<string> {
  const { model, systemPrompt, maxTokens = 2048, onText, onToolUse } = opts;
  const apiKey = process.env.OLLAMA_API_KEY;
  if (!apiKey) throw new Error("OLLAMA_API_KEY is required");

  // Build message history in Ollama format
  const messages: OllamaMessage[] = [
    { role: "system", content: systemPrompt },
    ...opts.messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
  ];

  let fullResponse = "";
  let toolTurns = 0;

  while (toolTurns < MAX_TOOL_TURNS) {
    const res = await fetch(`${OLLAMA_BASE_URL}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        tools: OLLAMA_TOOLS,
        stream: true,
        options: {
          num_predict: maxTokens,
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "Unknown error");
      throw new Error(`Ollama API error ${res.status}: ${errText}`);
    }

    if (!res.body) throw new Error("No response body from Ollama");

    // Parse NDJSON stream
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let turnText = "";
    let toolCalls: Array<{ function: { name: string; arguments: Record<string, unknown> } }> = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process complete lines
      const lines = buffer.split("\n");
      buffer = lines.pop() || ""; // Keep incomplete line in buffer

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        let chunk: OllamaStreamChunk;
        try {
          chunk = JSON.parse(trimmed);
        } catch {
          continue; // Skip malformed chunks
        }

        // Stream text content
        if (chunk.message?.content) {
          turnText += chunk.message.content;
          fullResponse += chunk.message.content;
          await onText(chunk.message.content);
        }

        // Collect tool calls (usually in the final chunk)
        if (chunk.message?.tool_calls && chunk.message.tool_calls.length > 0) {
          toolCalls = chunk.message.tool_calls;
        }
      }
    }

    // Process any remaining buffer
    if (buffer.trim()) {
      try {
        const chunk: OllamaStreamChunk = JSON.parse(buffer.trim());
        if (chunk.message?.content) {
          turnText += chunk.message.content;
          fullResponse += chunk.message.content;
          await onText(chunk.message.content);
        }
        if (chunk.message?.tool_calls && chunk.message.tool_calls.length > 0) {
          toolCalls = chunk.message.tool_calls;
        }
      } catch {
        // Ignore
      }
    }

    // No tool calls — we're done
    if (toolCalls.length === 0) {
      break;
    }

    // Execute tools
    toolTurns++;

    // Add assistant message with tool calls
    messages.push({
      role: "assistant",
      content: turnText,
      tool_calls: toolCalls,
    });

    // Execute each tool and add results
    for (const call of toolCalls) {
      onToolUse?.(call.function.name);

      const result = await executeTool(call.function.name, call.function.arguments);
      messages.push({
        role: "tool",
        content: result.is_error ? `Error: ${result.content}` : result.content,
      });
    }
  }

  return fullResponse;
}
