import { Hono } from "hono";
import { getOrCreateConversation, createNewConversation, getMessages, listConversations } from "../db.js";

const app = new Hono();

// GET /conversations — list user's conversations
app.get("/", (c) => {
  const telegramId = Number(c.req.query("telegramId"));
  if (!telegramId) return c.json({ error: "telegramId required" }, 400);

  const conversations = listConversations(telegramId);
  return c.json({ conversations });
});

// GET /conversations/:agentId — get conversation history for a specific agent
app.get("/:agentId", (c) => {
  const telegramId = Number(c.req.query("telegramId"));
  const agentId = c.req.param("agentId");
  if (!telegramId) return c.json({ error: "telegramId required" }, 400);

  const conversation = getOrCreateConversation(telegramId, agentId);
  const messages = getMessages(conversation.id, 50);

  return c.json({
    conversation: {
      id: conversation.id,
      agentId: conversation.agent_id,
      title: conversation.title,
      createdAt: conversation.created_at,
      updatedAt: conversation.updated_at,
    },
    messages: messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      timestamp: m.created_at,
      agentId,
    })),
  });
});

// POST /conversations/new — create a new conversation
app.post("/new", async (c) => {
  const body = await c.req.json();
  const { telegramId, agentId } = body as { telegramId: number; agentId: string };
  if (!telegramId || !agentId) return c.json({ error: "telegramId and agentId required" }, 400);

  const conversation = createNewConversation(telegramId, agentId);
  return c.json({
    conversation: {
      id: conversation.id,
      agentId: conversation.agent_id,
      title: conversation.title,
      createdAt: conversation.created_at,
      updatedAt: conversation.updated_at,
    },
  });
});

export default app;
