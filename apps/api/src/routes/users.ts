import { Hono } from "hono";
import { getUser, upsertUser, updateSelectedAgent } from "../db.js";

const app = new Hono();

// GET /users/me — get user profile
app.get("/me", (c) => {
  const telegramId = Number(c.req.query("telegramId"));
  if (!telegramId) return c.json({ error: "telegramId required" }, 400);

  const user = getUser(telegramId);
  if (!user) return c.json({ error: "User not found" }, 404);

  const today = new Date().toISOString().slice(0, 10);
  const messagesUsed = user.messages_date === today ? user.messages_today : 0;

  return c.json({
    telegramId: user.telegram_id,
    firstName: user.first_name,
    username: user.username,
    selectedAgentId: user.selected_agent_id,
    plan: user.plan,
    messagesUsed,
    messagesLimit: user.plan === "free" ? 30 : -1,
    createdAt: user.created_at,
  });
});

// PUT /users/me/agent — update selected agent
app.put("/me/agent", async (c) => {
  const body = await c.req.json();
  const { telegramId, agentId } = body as { telegramId: number; agentId: string };
  if (!telegramId || !agentId) return c.json({ error: "telegramId and agentId required" }, 400);

  updateSelectedAgent(telegramId, agentId);
  return c.json({ ok: true });
});

export default app;
