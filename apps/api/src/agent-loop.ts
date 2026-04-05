/**
 * Agent loop — handles tool_use responses from Claude.
 *
 * When Claude wants to use a tool (fetch_url, calculate, etc.),
 * this loop executes the tool and feeds the result back until
 * Claude provides a final text response.
 */

import Anthropic from "@anthropic-ai/sdk";
import { TOOLS, executeTool } from "./tools.js";

const MAX_TOOL_TURNS = 5;

interface AgentStreamOptions {
  client: Anthropic;
  model: string;
  systemPrompt: string;
  messages: Anthropic.Messages.MessageParam[];
  maxTokens?: number;
  onText: (text: string) => Promise<void>;
  onToolUse?: (toolName: string) => void;
}

/**
 * Run the agent loop with streaming.
 *
 * Streams text to `onText` callback. If Claude uses tools,
 * executes them and continues until a final text response.
 *
 * Returns the full assistant response text.
 */
export async function runAgentLoop(opts: AgentStreamOptions): Promise<string> {
  const { client, model, systemPrompt, maxTokens = 2048, onText, onToolUse } = opts;
  const messages = [...opts.messages]; // Don't mutate original
  let fullResponse = "";
  let toolTurns = 0;

  // Convert our tool definitions to Anthropic format
  const tools: Anthropic.Messages.Tool[] = TOOLS.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.input_schema as Anthropic.Messages.Tool["input_schema"],
  }));

  while (toolTurns < MAX_TOOL_TURNS) {
    let turnText = "";
    const toolUseBlocks: Array<{ id: string; name: string; inputJson: string }> = [];
    let currentBlockType: "text" | "tool_use" | null = null;

    // Stream the response
    const stream = await client.messages.create({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages,
      tools,
      stream: true,
    });

    let stopReason = "";

    for await (const event of stream) {
      if (event.type === "content_block_start") {
        if (event.content_block.type === "text") {
          currentBlockType = "text";
        } else if (event.content_block.type === "tool_use") {
          currentBlockType = "tool_use";
          toolUseBlocks.push({
            id: event.content_block.id,
            name: event.content_block.name,
            inputJson: "",
          });
        }
      } else if (event.type === "content_block_delta") {
        if (currentBlockType === "text" && event.delta.type === "text_delta") {
          turnText += event.delta.text;
          fullResponse += event.delta.text;
          await onText(event.delta.text);
        } else if (currentBlockType === "tool_use" && event.delta.type === "input_json_delta") {
          const lastTool = toolUseBlocks[toolUseBlocks.length - 1];
          if (lastTool) {
            lastTool.inputJson += event.delta.partial_json;
          }
        }
      } else if (event.type === "content_block_stop") {
        currentBlockType = null;
      } else if (event.type === "message_delta") {
        stopReason = event.delta.stop_reason || "";
      }
    }

    // If no tool use, we're done
    if (toolUseBlocks.length === 0 || stopReason !== "tool_use") {
      break;
    }

    // Execute tools and build the next messages
    toolTurns++;

    // Add assistant message with tool_use blocks
    const assistantContent: Anthropic.Messages.ContentBlockParam[] = [];
    if (turnText) {
      assistantContent.push({ type: "text", text: turnText });
    }
    for (const block of toolUseBlocks) {
      let input: Record<string, unknown> = {};
      if (block.inputJson) {
        try { input = JSON.parse(block.inputJson); }
        catch { console.error(`[AGENT] Failed to parse tool input for ${block.name}:`, block.inputJson); }
      }
      assistantContent.push({
        type: "tool_use",
        id: block.id,
        name: block.name,
        input,
      });
    }
    messages.push({ role: "assistant", content: assistantContent });

    // Execute each tool and collect results
    const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];
    for (const block of toolUseBlocks) {
      let input: Record<string, unknown> = {};
      if (block.inputJson) {
        try { input = JSON.parse(block.inputJson); }
        catch { console.error(`[AGENT] Failed to parse tool input for ${block.name}:`, block.inputJson); }
      }
      onToolUse?.(block.name);

      const result = await executeTool(block.name, input as Record<string, unknown>);
      toolResults.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: result.content,
        is_error: result.is_error,
      });
    }

    // Add tool results as user message
    messages.push({ role: "user", content: toolResults });
  }

  return fullResponse;
}
