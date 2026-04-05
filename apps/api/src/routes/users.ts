import { Hono } from "hono";
import { getUser, upsertUser, updateSelectedAgent, updateUserPlan } from "../db.js";

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

// POST /users/upgrade — upgrade user plan (called after Stars payment)
app.post("/upgrade", async (c) => {
  const body = await c.req.json();
  const { telegramId, plan, payload, chargeId, totalAmount } = body as {
    telegramId: number;
    plan: string;
    payload?: string;
    chargeId?: string;
    totalAmount?: number;
  };

  if (!telegramId || !plan) return c.json({ error: "telegramId and plan required" }, 400);

  const validPlans = ["free", "pro", "team"];
  if (!validPlans.includes(plan)) {
    return c.json({ error: "Invalid plan. Must be: free, pro, or team" }, 400);
  }

  updateUserPlan(telegramId, plan);

  // Log the payment (simple append to a JSON file for now)
  const logEntry = {
    telegramId,
    plan,
    payload,
    chargeId,
    totalAmount,
    timestamp: Date.now(),
  };
  console.log("[PAYMENT]", JSON.stringify(logEntry));

  return c.json({ ok: true, plan });
});

export default app;
