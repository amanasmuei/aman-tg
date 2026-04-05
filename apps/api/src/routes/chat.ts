import { Hono } from "hono";
import { streamText } from "hono/streaming";
import Anthropic from "@anthropic-ai/sdk";
import { AGENTS } from "@aman-tg/shared";
import {
  upsertUser,
  getUser,
  getOrCreateConversation,
  createNewConversation,
  getMessages,
  saveMessage,
  checkAndIncrementUsage,
} from "../db.js";
import { loadMemoryContext, extractAndStoreMemories } from "../memory.js";

const app = new Hono();

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is required");
  return new Anthropic({ apiKey });
}

// POST /chat — send message to agent with streaming + persistence
app.post("/", async (c) => {
  const body = await c.req.json();
  const { agentId, message, telegramId, firstName, lastName, username, attachment } = body as {
    agentId: string;
    message: string;
    telegramId?: number;
    firstName?: string;
    lastName?: string;
    username?: string;
    newConversation?: boolean;
    attachment?: {
      type: "image" | "file";
      name: string;
      base64: string;
      mediaType: string;
    };
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

  // Gate premium agents behind Pro plan
  if (agent.premium && userId) {
    const user = getUser(userId);
    if (user && user.plan === "free") {
      return c.json({
        error: "Premium agent requires Pro plan",
        agent: agent.name,
        plan: "free",
      }, 403);
    }
  }

  // Get or create conversation
  let conversation = null;
  if (userId) {
    if (body.newConversation) {
      conversation = createNewConversation(userId, agentId);
    } else {
      conversation = getOrCreateConversation(userId, agentId);
    }
  }

  // Load history from DB (last 20 messages for context)
  let history: Array<{ role: "user" | "assistant"; content: string }> = [];
  if (conversation) {
    const dbMessages = getMessages(conversation.id, 20);
    history = dbMessages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));
  }

  // Save user message to DB (with attachment info if present)
  if (conversation) {
    const savedContent = attachment
      ? `${attachment.type === "image" ? "📷" : "📎"} ${attachment.name}${message ? `\n${message}` : ""}`
      : message;
    saveMessage(conversation.id, "user", savedContent);
  }

  // Build messages for Claude
  // For messages with attachments, use content blocks format
  let userContent: Anthropic.Messages.ContentBlockParam[] | string = message;

  if (attachment && attachment.type === "image") {
    userContent = [
      {
        type: "image" as const,
        source: {
          type: "base64" as const,
          media_type: attachment.mediaType as "image/png" | "image/jpeg" | "image/gif" | "image/webp",
          data: attachment.base64,
        },
      },
      {
        type: "text" as const,
        text: message || "What's in this image?",
      },
    ];
  } else if (attachment && attachment.type === "file") {
    try {
      const fileContent = Buffer.from(attachment.base64, "base64").toString("utf-8");
      const truncated = fileContent.length > 10000
        ? fileContent.slice(0, 10000) + "\n\n[... truncated]"
        : fileContent;
      userContent = `[File: ${attachment.name}]\n\`\`\`\n${truncated}\n\`\`\`\n\n${message || "Analyze this file."}`;
    } catch {
      userContent = message || "I attached a file but it couldn't be read.";
    }
  }

  const messages: Anthropic.Messages.MessageParam[] = [
    ...history,
    { role: "user" as const, content: userContent },
  ];

  // Build system prompt with user context + memories
  let systemPrompt = agent.systemPrompt;
  if (firstName) {
    systemPrompt += `\n\nThe user's name is ${firstName}. Address them naturally.`;
  }

  // Inject persistent memories (cross-agent, cross-session)
  if (userId) {
    const memoryContext = await loadMemoryContext(userId, agentId, message);
    if (memoryContext) {
      systemPrompt += memoryContext;
    }

    // Extract memories from user message (async, non-blocking)
    extractAndStoreMemories(userId, message, agentId);
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
