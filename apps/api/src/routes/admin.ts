import { Hono } from "hono";
import { getDb } from "../db.js";

const app = new Hono();

// GET /admin/stats — dashboard analytics
app.get("/stats", (c) => {
  const adminToken = process.env.ADMIN_TOKEN;
  if (adminToken && c.req.header("x-admin-token") !== adminToken) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const db = getDb();
  const now = Date.now();
  const today = new Date().toISOString().slice(0, 10);
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

  // Total users
  const totalUsers = (db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number }).count;

  // Active today (users who sent messages today)
  const dau = (db.prepare("SELECT COUNT(*) as count FROM users WHERE messages_date = ?").get(today) as { count: number }).count;

  // Messages today
  const messagesToday = (db.prepare(
    "SELECT COUNT(*) as count FROM messages WHERE created_at > ?",
  ).get(oneDayAgo) as { count: number }).count;

  // Messages this week
  const messagesWeek = (db.prepare(
    "SELECT COUNT(*) as count FROM messages WHERE created_at > ?",
  ).get(sevenDaysAgo) as { count: number }).count;

  // Total conversations
  const totalConversations = (db.prepare("SELECT COUNT(*) as count FROM conversations").get() as { count: number }).count;

  // Total messages
  const totalMessages = (db.prepare("SELECT COUNT(*) as count FROM messages").get() as { count: number }).count;

  // Pro users
  const proUsers = (db.prepare("SELECT COUNT(*) as count FROM users WHERE plan = 'pro'").get() as { count: number }).count;

  // Popular agents (by conversation count)
  const popularAgents = db.prepare(
    "SELECT agent_id, COUNT(*) as count FROM conversations GROUP BY agent_id ORDER BY count DESC LIMIT 10",
  ).all() as Array<{ agent_id: string; count: number }>;

  // New users today
  const newUsersToday = (db.prepare(
    "SELECT COUNT(*) as count FROM users WHERE created_at > ?",
  ).get(oneDayAgo) as { count: number }).count;

  return c.json({
    users: {
      total: totalUsers,
      dau,
      newToday: newUsersToday,
      pro: proUsers,
    },
    messages: {
      today: messagesToday,
      week: messagesWeek,
      total: totalMessages,
    },
    conversations: totalConversations,
    popularAgents,
    generatedAt: new Date().toISOString(),
  });
});

// GET /admin/users — list all users with activity
app.get("/users", (c) => {
  const adminToken = process.env.ADMIN_TOKEN;
  if (adminToken && c.req.header("x-admin-token") !== adminToken) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);

  const users = db.prepare(`
    SELECT
      u.telegram_id,
      u.first_name,
      u.last_name,
      u.username,
      u.language_code,
      u.selected_agent_id,
      u.plan,
      CASE WHEN u.messages_date = ? THEN u.messages_today ELSE 0 END as messages_today,
      u.created_at,
      u.updated_at,
      (SELECT COUNT(*) FROM messages m JOIN conversations c ON m.conversation_id = c.id WHERE c.telegram_id = u.telegram_id) as total_messages,
      (SELECT COUNT(*) FROM conversations c WHERE c.telegram_id = u.telegram_id) as total_conversations
    FROM users u
    ORDER BY u.updated_at DESC
  `).all(today) as Array<{
    telegram_id: number;
    first_name: string;
    last_name: string | null;
    username: string | null;
    language_code: string | null;
    selected_agent_id: string;
    plan: string;
    messages_today: number;
    created_at: number;
    updated_at: number;
    total_messages: number;
    total_conversations: number;
  }>;

  return c.json({
    users: users.map((u) => ({
      telegramId: u.telegram_id,
      name: [u.first_name, u.last_name].filter(Boolean).join(" "),
      username: u.username ? `@${u.username}` : null,
      language: u.language_code,
      plan: u.plan,
      currentAgent: u.selected_agent_id,
      messagesToday: u.messages_today,
      totalMessages: u.total_messages,
      totalConversations: u.total_conversations,
      joinedAt: new Date(u.created_at).toISOString(),
      lastActiveAt: new Date(u.updated_at).toISOString(),
    })),
    total: users.length,
  });
});

export default app;
