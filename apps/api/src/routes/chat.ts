import { Hono } from "hono";
import { streamText } from "hono/streaming";
import Anthropic from "@anthropic-ai/sdk";
import { AGENTS } from "@aman-tg/shared";
import { runAgentLoop } from "../agent-loop.js";
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
    languageHint?: string;
    attachment?: {
      type: "image" | "file";
      name: string;
      base64: string;
      mediaType: string;
    };
  };

  // Input validation
  if (!agentId || typeof agentId !== "string") {
    return c.json({ error: "agentId is required" }, 400);
  }
  const trimmedMessage = (message || "").trim();
  if (!trimmedMessage && !attachment) {
    return c.json({ error: "Message or attachment required" }, 400);
  }
  if (trimmedMessage.length > 10000) {
    return c.json({ error: "Message too long (max 10,000 characters)" }, 400);
  }
  if (attachment) {
    if (!attachment.base64 || !attachment.mediaType || !attachment.name) {
      return c.json({ error: "Invalid attachment" }, 400);
    }
    if (attachment.base64.length > 10_000_000) {
      return c.json({ error: "Attachment too large (max ~7.5MB)" }, 400);
    }
    if (attachment.type === "image") {
      const validTypes = ["image/png", "image/jpeg", "image/gif", "image/webp"];
      if (!validTypes.includes(attachment.mediaType)) {
        return c.json({ error: "Unsupported image type" }, 400);
      }
    }
  }

  // Sanitize user fields
  const safeName = (firstName || "").slice(0, 100);
  const safeLastName = (lastName || "").slice(0, 100);
  const safeUsername = (username || "").slice(0, 100);

  const agent = AGENTS.find((a) => a.id === agentId);
  if (!agent) return c.json({ error: "Agent not found" }, 404);

  // Upsert user if telegram context provided
  let userId = telegramId;
  if (userId && safeName) {
    upsertUser(userId, safeName, safeLastName, safeUsername);
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
  if (agent.premium) {
    const user = userId ? getUser(userId) : null;
    if (!user || user.plan === "free") {
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

  // Track if first message for welcome instruction
  const isFirstMessage = history.length === 0;

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
  if (safeName) {
    systemPrompt += `\n\nThe user's name is ${safeName}. Address them naturally.`;
  }

  // Tone and language
  systemPrompt += `\n\nIMPORTANT: Always respond with a polite, humble, and respectful tone. Be warm and approachable. Use "please", "thank you", and considerate language. Never be arrogant or dismissive.`;

  // First message — warm welcome
  if (isFirstMessage) {
    systemPrompt += `\n\nThis is your FIRST interaction with this user. Start with a warm, brief welcome. Introduce yourself in 1-2 sentences, then address their message. Don't list everything you can do — just be helpful and friendly.`;
  }

  const languageHint = (body.languageHint || "").slice(0, 200);
  if (languageHint) {
    systemPrompt += `\n\n${languageHint}`;
  }

  // Inject persistent memories (cross-agent, cross-session)
  if (userId) {
    const memoryContext = await loadMemoryContext(userId, agentId, message);
    if (memoryContext) {
      systemPrompt += memoryContext;
    }

    // Extract memories from user message (async, non-blocking)
    extractAndStoreMemories(userId, trimmedMessage, agentId);
  }

  const client = getClient();
  // Pro users get Sonnet (better quality), free users get Haiku (faster)
  const userRecord = userId ? getUser(userId) : null;
  const isPro = userRecord?.plan === "pro" || userRecord?.plan === "team";
  const model = isPro
    ? (process.env.CLAUDE_MODEL_PRO || "claude-sonnet-4-6")
    : (process.env.CLAUDE_MODEL || "claude-haiku-4-5-20251001");

  return streamText(c, async (stream) => {
    try {
      const fullResponse = await runAgentLoop({
        client,
        model,
        systemPrompt,
        messages,
        maxTokens: 2048,
        onText: async (text) => {
          await stream.write(text);
        },
        onToolUse: (toolName) => {
          console.log(`[TOOL] ${toolName} called by ${agentId} for user ${userId}`);
        },
      });

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
