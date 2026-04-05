import { Hono } from "hono";
import { streamText } from "hono/streaming";
import Anthropic from "@anthropic-ai/sdk";
import { AGENTS } from "@aman-tg/shared";
import {
  upsertUser,
  getOrCreateConversation,
  getMessages,
  saveMessage,
  checkAndIncrementUsage,
} from "../db.js";

const app = new Hono();

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is required");
  return new Anthropic({ apiKey });
}

// POST /chat — send message to agent with streaming + persistence
app.post("/", async (c) => {
  const body = await c.req.json();
  const { agentId, message, telegramId, firstName, lastName, username } = body as {
    agentId: string;
    message: string;
    telegramId?: number;
    firstName?: string;
    lastName?: string;
    username?: string;
  };

  const agent = AGENTS.find((a) => a.id === agentId);
  if (!agent) return c.json({ error: "Agent not found" }, 404);

  // Upsert user if telegram context provided
  let userId = telegramId;
  if (userId && firstName) {
    upsertUser(userId, firstName, lastName, username);
  }

  // Check usage limits
  if (userId) {
    const usage = checkAndIncrementUsage(userId);
    if (!usage.allowed) {
      return c.json({
        error: "Daily message limit reached",
        used: usage.used,
        limit: usage.limit,
        plan: usage.plan,
      }, 429);
    }
  }

  // Get or create conversation
  const conversation = userId
    ? getOrCreateConversation(userId, agentId)
    : null;

  // Load history from DB (last 20 messages for context)
  let history: Array<{ role: "user" | "assistant"; content: string }> = [];
  if (conversation) {
    const dbMessages = getMessages(conversation.id, 20);
    history = dbMessages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));
  }

  // Save user message to DB
  if (conversation) {
    saveMessage(conversation.id, "user", message);
  }

  // Build messages for Claude
  const messages: Array<{ role: "user" | "assistant"; content: string }> = [
    ...history,
    { role: "user", content: message },
  ];

  // Build system prompt with user context
  let systemPrompt = agent.systemPrompt;
  if (firstName) {
    systemPrompt += `\n\nThe user's name is ${firstName}. Address them naturally.`;
  }

  const client = getClient();
  const model = process.env.CLAUDE_MODEL || "claude-sonnet-4-6";

  return streamText(c, async (stream) => {
    let fullResponse = "";
    try {
      const response = await client.messages.create({
        model,
        max_tokens: 2048,
        system: systemPrompt,
        messages,
        stream: true,
      });

      for await (const event of response) {
        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          fullResponse += event.delta.text;
          await stream.write(event.delta.text);
        }
      }

      // Save assistant response to DB after streaming completes
      if (conversation && fullResponse) {
        saveMessage(conversation.id, "assistant", fullResponse);
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "LLM error";
      await stream.write(`\n\n[Error: ${errMsg}]`);
    }
  });
});

export default app;
